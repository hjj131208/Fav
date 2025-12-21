import sqlite3 from 'sqlite3';
import path from 'path';
import url from 'url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'users.db');
const isProduction = process.env.NODE_ENV === 'production';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE,
              email TEXT UNIQUE,
              password TEXT,
              role TEXT DEFAULT 'user',
              is_active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
        if (!err) {
            // Check if admin exists, if not create one
            const sql = 'SELECT * FROM users WHERE role = ?';
            db.get(sql, ['admin'], async (err, row) => {
                if (!err && !row) {
                    const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
                    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
                    const defaultAdminPassword = isProduction
                      ? process.env.DEFAULT_ADMIN_PASSWORD
                      : (process.env.DEFAULT_ADMIN_PASSWORD || 'admin123');
                    if (!defaultAdminPassword) {
                      console.error('[server] Missing required env: DEFAULT_ADMIN_PASSWORD');
                      process.exit(1);
                    }

                    const hash = await bcrypt.hash(defaultAdminPassword, 10);
                    const insert = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
                    db.run(insert, [defaultAdminUsername, defaultAdminEmail, hash, 'admin']);
                    console.log(`Default admin account created: ${defaultAdminUsername}${isProduction ? '' : ` / ${defaultAdminPassword}`}`);
                }
            });
        }
    });

    // Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
              id TEXT,
              user_id INTEGER,
              name TEXT,
              icon TEXT,
              color TEXT,
              sort_order INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id, user_id),
              FOREIGN KEY(user_id) REFERENCES users(id)
            )`);

    // Bookmarks Table
    db.run(`CREATE TABLE IF NOT EXISTS bookmarks (
              id TEXT,
              user_id INTEGER,
              category_id TEXT,
              title TEXT,
              url TEXT,
              icon TEXT,
              description TEXT,
              is_pinned INTEGER DEFAULT 0,
              is_favorite INTEGER DEFAULT 0,
              visit_count INTEGER DEFAULT 0,
              tags TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id, user_id),
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(category_id) REFERENCES categories(id)
            )`);
  });
}

// User Functions
export const createUser = (username, email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const hash = await bcrypt.hash(password, 10);
      const sql = 'INSERT INTO users (username, email, password) VALUES (?,?,?)';
      db.run(sql, [username, email, hash], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username, email });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const findUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const findUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  };

export const findUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, username, email, role, created_at FROM users WHERE id = ?';
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Admin Functions
export const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT id, username, email, role, is_active, created_at FROM users';
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const updateUserRole = (id, role) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET role = ? WHERE id = ?';
        db.run(sql, [role, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const updateUser = (id, { username, email, password, role }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fields = [];
            const values = [];

            if (username !== undefined) { fields.push('username = ?'); values.push(username); }
            if (email !== undefined) { fields.push('email = ?'); values.push(email); }
            if (role !== undefined) { fields.push('role = ?'); values.push(role); }
            if (password !== undefined && password !== '') {
                const hash = await bcrypt.hash(password, 10);
                fields.push('password = ?');
                values.push(hash);
            }

            if (fields.length === 0) return resolve();

            const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            values.push(id);

            db.run(sql, values, (err) => {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                         reject(new Error('Username or email already exists'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve();
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const deleteUser = (id) => {
    return new Promise((resolve, reject) => {
        // Simple delete, cascading deletes handled by app logic or foreign keys if set
        // But sqlite foreign keys need enabling. 
        // Let's manually clean up for safety as in deleteCategory
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('DELETE FROM bookmarks WHERE user_id = ?', [id]);
            db.run('DELETE FROM categories WHERE user_id = ?', [id]);
            db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                } else {
                    db.run('COMMIT');
                    resolve();
                }
            });
        });
    });
};

export const createUserWithRole = (username, email, password, role = 'user') => {
    return new Promise(async (resolve, reject) => {
      try {
        const hash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)';
        db.run(sql, [username, email, hash, role], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, username, email, role });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };

// Data Functions (Bookmarks & Categories)
export const getUserData = (userId) => {
  return new Promise((resolve, reject) => {
    const categoriesSql = 'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order';
    const bookmarksSql = 'SELECT * FROM bookmarks WHERE user_id = ?';

    db.all(categoriesSql, [userId], (err, categories) => {
      if (err) return reject(err);
      db.all(bookmarksSql, [userId], (err, bookmarks) => {
        if (err) return reject(err);
        
        // Map DB fields back to frontend format if needed (snake_case to camelCase)
        const mappedCategories = categories.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color
        }));

        const mappedBookmarks = bookmarks.map(b => ({
            id: b.id,
            categoryId: b.category_id,
            title: b.title,
            url: b.url,
            favicon: b.icon,
            description: b.description,
            isPinned: !!b.is_pinned,
            isFavorite: !!b.is_favorite,
            visitCount: b.visit_count,
            tags: b.tags ? JSON.parse(b.tags) : [],
            createdAt: b.created_at
        }));

        resolve({ categories: mappedCategories, bookmarks: mappedBookmarks });
      });
    });
  });
};

export const syncUserData = (userId, { categories, bookmarks }) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Clear existing data for user (Simple sync strategy: overwrite)
      // For a more robust sync, we would need diffing, but overwrite is fine for this scope.
      db.run('DELETE FROM bookmarks WHERE user_id = ?', [userId]);
      db.run('DELETE FROM categories WHERE user_id = ?', [userId]);

      const catStmt = db.prepare('INSERT INTO categories (id, user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      categories.forEach((c, index) => {
        catStmt.run(c.id, userId, c.name, c.icon, c.color, index);
      });
      catStmt.finalize();

      const bookStmt = db.prepare('INSERT INTO bookmarks (id, user_id, category_id, title, url, icon, description, is_pinned, is_favorite, visit_count, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      bookmarks.forEach(b => {
        bookStmt.run(
            b.id, 
            userId, 
            b.categoryId, 
            b.title, 
            b.url, 
            b.favicon, 
            b.description, 
            b.isPinned ? 1 : 0, 
            b.isFavorite ? 1 : 0, 
            b.visitCount || 0, 
            JSON.stringify(b.tags || []),
            b.createdAt || new Date().toISOString()
        );
      });
      bookStmt.finalize();

      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

// CRUD Operations
export const addCategory = (userId, category, index) => {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO categories (id, user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(sql, [category.id, userId, category.name, category.icon, category.color, index], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const updateCategory = (userId, id, category) => {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?';
    db.run(sql, [category.name, category.icon, category.color, id, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const deleteCategory = (userId, id) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      // Delete bookmarks in category first
      db.run('DELETE FROM bookmarks WHERE category_id = ? AND user_id = ?', [id, userId]);
      // Delete category
      db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId], (err) => {
        if (err) {
            db.run('ROLLBACK');
            reject(err);
        } else {
            db.run('COMMIT');
            resolve();
        }
      });
    });
  });
};

export const addBookmark = (userId, bookmark) => {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO bookmarks (id, user_id, category_id, title, url, icon, description, is_pinned, is_favorite, visit_count, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [
        bookmark.id, 
        userId, 
        bookmark.categoryId, 
        bookmark.title, 
        bookmark.url, 
        bookmark.favicon, 
        bookmark.description, 
        bookmark.isPinned ? 1 : 0, 
        bookmark.isFavorite ? 1 : 0, 
        bookmark.visitCount || 0, 
        JSON.stringify(bookmark.tags || []),
        bookmark.createdAt || new Date().toISOString()
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const updateBookmark = (userId, id, bookmark) => {
    return new Promise((resolve, reject) => {
      // Dynamic update query
      const fields = [];
      const values = [];
      
      if (bookmark.title !== undefined) { fields.push('title = ?'); values.push(bookmark.title); }
      if (bookmark.url !== undefined) { fields.push('url = ?'); values.push(bookmark.url); }
      if (bookmark.categoryId !== undefined) { fields.push('category_id = ?'); values.push(bookmark.categoryId); }
      if (bookmark.favicon !== undefined) { fields.push('icon = ?'); values.push(bookmark.favicon); }
      if (bookmark.description !== undefined) { fields.push('description = ?'); values.push(bookmark.description); }
      if (bookmark.isPinned !== undefined) { fields.push('is_pinned = ?'); values.push(bookmark.isPinned ? 1 : 0); }
      if (bookmark.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(bookmark.isFavorite ? 1 : 0); }
      if (bookmark.visitCount !== undefined) { fields.push('visit_count = ?'); values.push(bookmark.visitCount); }
      
      if (fields.length === 0) return resolve();
  
      const sql = `UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
      values.push(id, userId);
  
      db.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

export const deleteBookmark = (userId, id) => {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM bookmarks WHERE id = ? AND user_id = ?';
    db.run(sql, [id, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export default db;
