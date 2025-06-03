const CACHE_NAME = 'youkids-pwa-cache-v1.0.5'; // Incrementa la versión para forzar una nueva caché
const urlsToCache = [
  '/',
  '/index.html',
  '/shorts.html',
  '/style.css',
  '/shorts.css',
  '/app.js',
  '/shorts.js',
  '/YouKids.png', // Asegúrate de que esta imagen existe en tu raíz
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora las peticiones a la API de YouTube para que siempre se busquen en red
  if (event.request.url.includes('www.googleapis.com/youtube/v3/')) {
    return fetch(event.request);
  }

  // Para el resto de los recursos (HTML, CSS, JS, imágenes, fuentes)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devuelve el recurso de la caché si está disponible
        if (response) {
          return response;
        }
        // Si no está en caché, va a la red
        return fetch(event.request).then(
          (response) => {
            // Comprueba si hemos recibido una respuesta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la respuesta. Una respuesta es un stream y solo puede ser consumida una vez.
            // Necesitamos consumirla para el navegador y para la caché.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
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
