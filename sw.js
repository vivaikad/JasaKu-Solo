/* JasaKu Solo — Service Worker
   Tahap: Fondasi PWA (app-shell caching, offline fallback)
   Catatan: transaksi sensitif (order, payment, verifikasi) TIDAK boleh
   dilakukan secara offline — itu diatur di index.html, bukan di sini. */

const APP_VERSION = 'jasaku-v1.0.0';
const SHELL_CACHE = `${APP_VERSION}-shell`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('jasaku-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigation requests: network-first, fallback to cached shell (offline fallback)
// - Static app-shell assets: cache-first
// - Everything else (API calls to Supabase, etc.): always network, never cached here
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests. Let Supabase/API calls pass straight through.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (APP_SHELL.some((asset) => req.url.endsWith(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
