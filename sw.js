'use strict';

const CACHE_VERSION = 'v3'; // bumped from v2
const CACHE_PREFIX = 'youbike-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/js/bottom-sheet.js',
  '/js/uuid.js',
  '/js/health.js',
  '/js/ota.js',
  '/js/common.js',
  '/js/ubike.js',
  '/app-config.json',
  '/manifest.webapp',
  '/favicon.ico'
];

const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ========== INSTALL ==========
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      ASSETS_TO_CACHE.map((url) => cache.add(url))
    );
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.warn('[SW] Some local assets failed to cache:', failed.length);
    }

    // Optional CDN caching (best-effort)
    await Promise.allSettled(
      CDN_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response) {
            await cache.put(url, response);
          }
        } catch (_) {
          console.warn('[SW] CDN asset failed:', url);
        }
      })
    );

    console.log('[SW] Install complete');
    self.skipWaiting();
  })());
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
    );
    await self.clients.claim();
    console.log('[SW] Activate complete');
  })());
});

// ========== FETCH ==========
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // version.json: always fetch fresh (no cache)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // index.html: network-first (ensure updates land)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Overpass API: stale-while-revalidate
  if (url.hostname.includes('overpass-api.de')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(async (r) => {
            if (r.ok) {
              try {
                await cache.put(req, r.clone());
              } catch (_) {}
            }
            return r;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // OpenStreetMap tiles: cache-first
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const r = await fetch(req);
          if (r.ok) {
            try {
              await cache.put(req, r.clone());
            } catch (_) {}
          }
          return r;
        } catch (err) {
          return new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Same-origin: cache-first with background update
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const response = await fetch(req);
          if (!response || !response.ok) return response;

          const responseToCache = response.clone();
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, responseToCache);
          } catch (err) {
            console.warn('[SW] Cache put failed:', err);
          }

          return response;
        } catch (err) {
          console.error('[SW] Fetch failed:', err);
          // Offline fallback for navigations
          if (req.mode === 'navigate') {
            const fallback = await caches.match('/index.html');
            if (fallback) return fallback;
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
  }
});

// Message handler for manual SW updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
  }
});
