import { getDomain } from '@/lib/utils';

// Convert a Blob to data URL
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Build CORS proxy URL via images.weserv.nl
function buildProxyUrl(url: string): string {
  try {
    // weserv expects URL without protocol. It will default to https
    const u = new URL(url);
    const hostAndPath = `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}${u.search}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(hostAndPath)}&w=64&h=64&fit=cover&we`; // we: with exif
  } catch {
    return url;
  }
}

// Fetch image as data URL with optional AbortSignal and per-request timeout
async function fetchImageAsDataUrl(imageUrl: string, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<string | null> {
  const controller = new AbortController();
  const signals: AbortSignal[] = [controller.signal];
  if (opts?.signal) signals.push(opts.signal);

  let timeoutId: number | null = null;
  const timeoutMs = opts?.timeoutMs ?? 8000; // default 8s per request
  const onAbort = () => controller.abort();
  opts?.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    if (timeoutMs > 0) {
      timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    }

    const resp = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (!blob || blob.size === 0) return null;
    return await blobToDataUrl(blob);
  } catch (e) {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    opts?.signal?.removeEventListener('abort', onAbort as any);
  }
}

// Try direct, then via proxy
async function tryFetch(url: string, signal?: AbortSignal): Promise<string | null> {
  // direct
  const direct = await fetchImageAsDataUrl(url, { signal });
  if (direct) return direct;
  // proxy
  const viaProxy = await fetchImageAsDataUrl(buildProxyUrl(url), { signal });
  if (viaProxy) return viaProxy;
  return null;
}

// Main public: fetch favicon for a URL, returning dataURL or null
export async function fetchFaviconForUrl(inputUrl: string, globalSignal?: AbortSignal): Promise<string | null> {
  // Normalize URL
  let targetUrl = inputUrl;
  try {
    const u = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
    targetUrl = u.toString();
  } catch {
    // If invalid, attempt to prepend https
    targetUrl = `https://${inputUrl}`;
  }

  // Derive domain
  let domain = '';
  try { domain = getDomain(targetUrl); } catch { /* ignore */ }
  if (!domain) return null;

  // Candidate sources
  const candidates: string[] = [];

  // 1) Well-known /favicon.ico
  candidates.push(`https://${domain}/favicon.ico`);
  // 2) icon.horse service
  candidates.push(`https://icon.horse/icon/${domain}`);
  // 3) bitwarden-like provider (real favicon grabber alternative)
  candidates.push(`https://icons.bitwarden.net/${domain}/icon.png`);
  // 4) google s2 (often blocked CORS, but we have proxy)
  candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);

  // 5) As a last resort, FaviconGrabber API -> get best URL, then fetch image through our tryFetch
  async function fromFaviconGrabber(): Promise<string | null> {
    try {
      const api = `https://favicongrabber.com/api/grab/${domain}`;
      const resp = await fetch(api, { method: 'GET', cache: 'no-store', signal: globalSignal });
      if (!resp.ok) return null;
      const data = await resp.json();
      const icons: Array<{src: string; sizes?: string}> = data?.icons || [];
      // pick largest
      const pick = icons.sort((a,b)=>{
        const as = parseInt((a.sizes||'').split('x')[0]||'0',10);
        const bs = parseInt((b.sizes||'').split('x')[0]||'0',10);
        return bs - as;
      })[0];
      if (pick?.src) {
        return await tryFetch(pick.src, globalSignal);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Try candidates sequentially
  for (const url of candidates) {
    const res = await tryFetch(url, globalSignal);
    if (res) return res;
  }

  // Last resort
  return await fromFaviconGrabber();
}
