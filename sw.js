const CACHE_NAME = 'ynwa-chess-v5';
const CORE = [
  './','./index.html','./app.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png',
  // cdnjs primær
  'https://cdnjs.cloudflare.com/ajax/libs/chessboard.js/1.0.0/chessboard.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chessboard.js/1.0.0/chessboard.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE.map(u => new Request(u, {mode:'no-cors'})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k===CACHE_NAME ? Promise.resolve() : caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request, {ignoreSearch:true});
    try {
      const fresh = await fetch(event.request);
      const ok = (fresh.status === 200 || fresh.type === 'opaque');
      if (ok) caches.open(CACHE_NAME).then(c => c.put(event.request, fresh.clone()));
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
