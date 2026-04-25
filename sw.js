/* ═══════════════════════════════════════════════
   Coin Toss Pro — Service Worker
   Strategy: Cache-First with Network Fallback
═══════════════════════════════════════════════ */

const CACHE_NAME    = 'cointoss-pro-v1';
const OFFLINE_PAGE  = './index.html';

const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon.png',
];

/* ── INSTALL: pre-cache all core assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ── ACTIVATE: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key  => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())  // take control immediately
  );
});

/* ── FETCH: cache-first, fallback to network ── */
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Serve from cache instantly
          return cached;
        }

        // Not in cache — fetch from network
        return fetch(event.request)
          .then(response => {
            // Cache valid responses for future use
            if (
              response &&
              response.status === 200 &&
              response.type === 'basic'
            ) {
              const cloned = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, cloned));
            }
            return response;
          })
          .catch(() => {
            // Network failed — serve offline fallback
            return caches.match(OFFLINE_PAGE);
          });
      })
  );
});
