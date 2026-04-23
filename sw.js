const cacheName = 'v1';

const assets = [
  './',
  './index.html',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './localforage.min.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});