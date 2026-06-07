// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — BLDC Motor Simulator
// Offline support and caching
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'bldc-motor-v2';

const urlsToCache = [
  './',
  './finalproject.html',
  './stylefinalproject.css',
  './script_finalproject.js',
  './bldc-helperfinalproject.js',
  './manifestfinalproject.json',
  './icon-192final.png',
  './icon-512final.png'
];

// ─────────────────────────────────────────────────────────────────
// INSTALL EVENT
// ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Cache failed:', error);
      })
  );

  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────
// ACTIVATE EVENT
// ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ─────────────────────────────────────────────────────────────────
// FETCH EVENT — Network first, then cache
// Cocok untuk development karena mengambil file terbaru dulu.
// ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

console.log('Service Worker loaded:', CACHE_NAME);
