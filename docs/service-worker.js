// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — BLDC Motor Simulator
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'bldc-motor-final-v10';

const urlsToCache = [
  './finalproject.html',
  './stylefinalproject.css',
  './script_finalproject.js',
  './bldc-helperfinalproject.js',
  './manifestfinalproject.json',
  './icon-192final.png',
  './icon-512final.png'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(error => console.error('Cache failed:', error))
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  // Abaikan request dari Chrome Extension, DevTools, dan skema selain http/https
  if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then(cache => {
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
