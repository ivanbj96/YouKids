const CACHE_NAME = 'youkids-pwa-cache-v2.0.5'; // ¡Nueva versión de caché!
const urlsToCache = [
  './', // Esto podría necesitar ser ajustado si la app se sirve desde una subcarpeta
  '/index.html', // Esto también podría necesitar ser ajustado a /YouKids/index.html
  '/shorts.html', // Lo mismo
  '/style.css',
  '/shorts.css',
  '/common.js',
  '/app.js',
  '/shorts.js',
  '/manifest.json',
  '/YouKids.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Para GitHub Pages con base tag, las URLs deben incluir el nombre del repo
        // Si tu repo es 'YouKids', las URLs en cache.addAll deberían ser:
        // const ghPagesUrlsToCache = urlsToCache.map(url => {
        //   if (url.startsWith('/')) return '/YouKids' + url;
        //   return url;
        // });
        // return cache.addAll(ghPagesUrlsToCache);
        // Por ahora, lo mantenemos simple asumiendo que el Service Worker se activa en el scope correcto.
        // La base tag en HTML ayudará a la resolución de rutas en el cliente.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to pre-cache assets during install:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('www.googleapis.com/youtube/v3/') || event.request.url.includes('youtube.com/iframe_api')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Failed to cache response:', error);
              });
            return response;
          }
        ).catch(error => {
          console.error('Fetch failed:', error);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
