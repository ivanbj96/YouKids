self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('youkids-cache').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/shorts.html',
        '/style.css',
        '/app.js',
        '/shorts.js',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});