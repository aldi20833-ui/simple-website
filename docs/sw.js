const CACHE_NAME = 'bldc-sim-v1'; // Naikkan versi (v2, v3, dst.) jika kamu merilis pembaruan besar
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './bldc-helper.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Tahap Install: Simpan aset dasar ke dalam cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Mengamankan aset ke cache...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Paksa SW baru langsung aktif tanpa menunggu tab ditutup
});

// 2. Tahap Aktivasi: Bersihkan cache versi lama jika ada perubahan CACHE_NAME
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Menghapus cache usang:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // Langsung ambil kendali atas halaman web saat ini
});

// 3. Tahap Fetch: Menggunakan Strategi Network-First
// Mencari file terbaru ke server dulu, jika gagal/offline baru pakai cache lokal
self.addEventListener('fetch', e => {
  // Hanya tangani request HTTP/HTTPS (menghindari error ekstensi browser)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Jika sukses mendapat file terbaru dari server, sekalian update file di cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Jika jaringan putus/offline, ambil dari cache lokal
        return caches.match(e.request);
      })
  );
});