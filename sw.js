/* ============================================================
   LOSHRIS Enterprise — Service Worker (sw.js)
   Cache-first untuk aset statis, Network-first untuk API
   ============================================================ */

const CACHE_NAME = 'loshris-v3.1';
const STATIC_ASSETS = [
  './Index.html',
  './icon.png',
  './manifest.json',
];

// ─── Install: Pre-cache static assets ───────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache failed (some assets may not be local):', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Strategy depends on request type ────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Google Apps Script API calls (always network-first)
  if (url.hostname.includes('script.google.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('drive.google.com')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(cacheFirst(event.request));
});

// ─── Cache-first strategy ───────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback();
  }
}

// ─── Network-first strategy ─────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

// ─── Offline Fallback Page ───────────────────────────────────
function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LOSHRIS — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 48px 36px;
      max-width: 380px;
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; }
    p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 32px; }
    button {
      background: #0b5cff;
      color: white;
      border: none;
      border-radius: 14px;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }
    button:hover { background: #0043cc; }
    .logo { font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 24px; font-weight: 700; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>LOSHRIS membutuhkan koneksi internet untuk sinkronisasi data dengan Google Sheets. Pastikan perangkat kamu terhubung ke internet.</p>
    <button onclick="window.location.reload()">🔄 Coba Lagi</button>
    <p class="logo">LOSHRIS ENTERPRISE</p>
  </div>
</body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 200,
    }
  );
}
