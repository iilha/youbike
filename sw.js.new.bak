'use strict';

const CACHE_VERSION = 'v2';
const CACHE_NAME = 'oil-' + CACHE_VERSION;
const API_CACHE = 'oil-api-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/js/bottom-sheet.js',
  '/js/uuid.js',
  '/js/health.js',
  '/js/ota.js',
  '/app-config.json',
  '/manifest.webapp',
  '/favicon.ico'
];

const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(ASSETS_TO_CACHE).catch(e => console.warn('[SW] Cache failed:', e));
      return Promise.all(
        CDN_ASSETS.map(url =>
          fetch(url, {mode:'cors'}).then(r => r.ok && cache.put(url, r)).catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith('oil-') && key !== CACHE_NAME && key !== API_CACHE)
           .map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // version.json: always fetch fresh (no cache)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // index.html: network-first (ensure updates land)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Overpass API: stale-while-revalidate
  if (url.hostname.includes('overpass-api.de')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(r => {
          if (r.ok) cache.put(event.request, r.clone());
          return r;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // OpenStreetMap tiles: cache-first
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const r = await fetch(event.request);
        if (r.ok) cache.put(event.request, r.clone());
        return r;
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
});
