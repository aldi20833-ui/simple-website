// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — BLDC Motor Simulator
// Untuk offline support dan caching
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'bldc-motor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script_modified.js',
  '/bldc-helper.js',
  '/manifest.json'
];

// ─────────────────────────────────────────────────────────────────
// INSTALL EVENT — Cache files
// ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────
// ACTIVATE EVENT — Clean old caches
// ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ─────────────────────────────────────────────────────────────────
// FETCH EVENT — Serve from cache, fallback to network
// ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Serve from cache if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            // Return offline page if fetch fails
            console.log('Fetch failed:', error);
            // You can return a custom offline page here if needed
          });
      })
  );
});

console.log('Service Worker loaded');
