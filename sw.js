const CACHE_NAME = 'youkids-static-cache-v1';
const urlsToCache = [
  './', // Ruta raíz, importante para cachear el index.html
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

// Evento de instalación del Service Worker: cachea los recursos estáticos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando y cacheando recursos...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Error al cachear en la instalación:', error);
      })
  );
});

// Evento de 'fetch': intercepta las solicitudes de red
self.addEventListener('fetch', event => {
  // Solo cachear recursos HTTP/HTTPS, no chrome-extension:// ni otros esquemas
  if (event.request.url.startsWith('http')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Si el recurso está en caché, lo devuelve
          if (response) {
            console.log(`[Service Worker] Sirviendo desde caché: ${event.request.url}`);
            return response;
          }
          // Si no está en caché, intenta obtenerlo de la red
          return fetch(event.request)
            .then(networkResponse => {
              // Cachea la respuesta de la red si es válida (no error 404, etc.)
              if (networkResponse.ok && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
              console.log(`[Service Worker] Sirviendo desde red: ${event.request.url}`);
              return networkResponse;
            })
            .catch(error => {
              // Manejo de errores de red (por ejemplo, si no hay conexión)
              console.error(`[Service Worker] Error al obtener de la red: ${event.request.url}`, error);
              // Podrías devolver una página offline aquí si lo deseas
              // return caches.match('/offline.html');
            });
        })
    );
  }
});

// Evento de 'activación': elimina cachés antiguos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando y limpiando cachés antiguos...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
