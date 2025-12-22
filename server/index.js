import express from 'express';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import url from 'url';
import net from 'net';
import dns from 'dns/promises';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as db from './db.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  console.error('[server] Missing required env: JWT_SECRET');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '24h';

const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set('trust proxy', trustProxy === 'true' ? 1 : trustProxy);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  }
}));
app.use(cors({
    origin: '*', // In production, replace with specific origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
const loginLimiterByAccount = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP+account to 10 failed login requests per windowMs
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const raw = req.body?.usernameOrEmail;
    const identity = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    return `${ip}:${identity || 'unknown'}`;
  },
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

const loginLimiterByIp = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  skipSuccessfulRequests: true,
  keyGenerator: ipKeyGenerator,
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/', apiLimiter);

// --- Helper Functions (from original server) ---

function normalizeUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    try {
      const u = new URL(`https://${trimmed}`);
      return u.toString();
    } catch {
      return null;
    }
  }
}

function classifyStatus(status) {
  if (status === 404 || status === 410) return 'dead';
  if (status === 401 || status === 403) return 'dead';
  if (status >= 500) return 'dead';
  if (status >= 200 && status < 400) return 'ok';
  return 'unknown';
}

async function checkTcpConnectivity(targetUrl, { timeoutMs = 2500 } = {}) {
  try {
    const u = new URL(targetUrl);
    const hostname = u.hostname;
    const port = u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 80);

    await dns.lookup(hostname);

    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const onError = (err) => {
        socket.destroy();
        reject(err);
      };

      socket.setTimeout(timeoutMs);
      socket.once('error', onError);
      socket.once('timeout', () => onError(new Error('timeout')));
      socket.connect(port, hostname, () => {
        socket.end();
        resolve();
      });
    });

    return { status: 'ok', port };
  } catch (e) {
    if ((e && e.code === 'ENOTFOUND') || (e && e.code === 'EAI_AGAIN')) return { status: 'dead', error: 'dns' };
    if (e?.message === 'timeout') return { status: 'dead', error: 'timeout' };
    return { status: 'dead', error: String(e?.message || e) };
  }
}

async function checkLinkHealth(urlToCheck, { timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    try {
      const resp = await fetch(urlToCheck, {
        method: 'HEAD',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal
      });
      const status = classifyStatus(resp.status);
      if (status !== 'unknown') {
        return { status, httpStatus: resp.status, finalUrl: resp.url };
      }
      if (resp.status === 405) throw new Error('HEAD not allowed');
      return { status: 'unknown', httpStatus: resp.status, finalUrl: resp.url };
    } catch {
      const resp = await fetch(urlToCheck, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal
      });
      const status = classifyStatus(resp.status);
      return { status, httpStatus: resp.status, finalUrl: resp.url };
    }
  } catch (e) {
    if (e?.name === 'AbortError') return { status: 'unknown', error: 'timeout' };
    return { status: 'dead', error: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

async function readBookmarks() {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const tryFiles = [
    path.join(__dirname, '..', 'bookmarks.filled.json'),
    path.join(__dirname, '..', 'test-bookmarks.json')
  ];
  for (const f of tryFiles) {
    try {
      const text = await readFile(f, { encoding: 'utf-8' });
      return JSON.parse(text);
    } catch { /* continue */ }
  }
  return [];
}

// --- Auth Routes ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  // Password complexity check
  if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const user = await db.createUser(username, email, password);
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', loginLimiterByIp, loginLimiterByAccount, async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    let user = await db.findUserByEmail(usernameOrEmail);
    if (!user) {
        user = await db.findUserByUsername(usernameOrEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Token Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Admins only' });
    }
};

// --- Admin Routes ---

app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        // Basic validation
        if (!username || !email || !password) return res.status(400).json({error: 'Missing fields'});
        const newUser = await db.createUserWithRole(username, email, password, role || 'user');
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        await db.updateUser(req.params.id, { username, email, password, role });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const userToDelete = await db.findUserById(req.params.id);
        if (!userToDelete) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (userToDelete.username === 'admin') {
            return res.status(403).json({ error: 'Cannot delete the super admin account' });
        }
        if (userToDelete.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await db.deleteUser(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Data Routes ---

// Get User Data
app.get('/api/user/data', verifyToken, async (req, res) => {
  try {
    const data = await db.getUserData(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync User Data
app.post('/api/user/sync', verifyToken, async (req, res) => {
  try {
    await db.syncUserData(req.user.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Fine-grained CRUD Routes (For better multi-device sync) ---

// Bookmarks
app.post('/api/bookmarks', verifyToken, async (req, res) => {
    try {
        await db.addBookmark(req.user.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookmarks/:id', verifyToken, async (req, res) => {
    try {
        await db.updateBookmark(req.user.id, req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookmarks/:id', verifyToken, async (req, res) => {
    try {
        await db.deleteBookmark(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Categories
app.post('/api/categories', verifyToken, async (req, res) => {
    try {
        await db.addCategory(req.user.id, req.body, req.body.sortOrder || 0);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id', verifyToken, async (req, res) => {
    try {
        await db.updateCategory(req.user.id, req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
    try {
        await db.deleteCategory(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Me (Get current user)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Existing API Routes ---

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/bookmarks', async (req, res) => {
  const data = await readBookmarks();
  res.json({ bookmarks: data });
});

app.get('/api/link-health', async (req, res) => {
  const target = req.query.url;
  const normalized = normalizeUrl(target);
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid url' });
  }
  const mode = (req.query.mode || 'auto').toLowerCase();
  const timeoutMsParam = Number(req.query.timeoutMs || '');
  const timeoutMs = Number.isFinite(timeoutMsParam) && timeoutMsParam > 0 ? timeoutMsParam : 6000;

  if (mode === 'tcp' || mode === 'ping') {
    const tcp = await checkTcpConnectivity(normalized, { timeoutMs: Math.min(timeoutMs, 3000) });
    return res.json({ url: normalized, mode: 'tcp', ...tcp });
  }

  const httpResult = await checkLinkHealth(normalized, { timeoutMs });
  if (mode === 'http') {
    return res.json({ url: normalized, mode: 'http', ...httpResult });
  }

  if (httpResult.status === 'unknown') {
    const tcp = await checkTcpConnectivity(normalized, { timeoutMs: Math.min(timeoutMs, 3000) });
    return res.json({ url: normalized, mode: 'auto', ...tcp, httpFallback: httpResult });
  }

  res.json({ url: normalized, mode: 'auto', ...httpResult });
});

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const clientBuildPath = path.join(__dirname, '../dist/client');

app.use(express.static(clientBuildPath));

app.all(/^\/api(\/|$).*/, (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.get(/^(?!\/api(\/|$)).*/, (req, res) => {
  const indexFile = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexFile, (err) => {
      if (err) {
          res.status(404).send("Client build not found. Please run 'npm run build' first.");
      }
  });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
