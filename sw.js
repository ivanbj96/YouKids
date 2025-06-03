const CACHE_NAME = 'youkids-minimal-cache-v1'; // Cambiado a v1 para esta nueva configuración
const urlsToCache = [
  './', // Ruta raíz, importante para cachear el index.html
  'index.html',
  'shorts.html',
  'style.css',
  'shorts.css',
  'app.js',
  'shorts.js',
  'manifest.json',
  'YouKids.svg' // Asegúrate de que este archivo esté en la raíz
];

// Evento de instalación: cachea los recursos básicos
self.addEventListener('install', event => {
  console.log('[SW] Instalando y cacheando recursos básicos...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[SW] Error al cachear en la instalación:', error);
      })
  );
});

// Evento de 'fetch': intercepta las solicitudes de red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el recurso de la caché si está disponible
        if (response) {
          return response;
        }
        // Si no está en caché, va a la red
        return fetch(event.request);
      })
      .catch(error => {
        console.error('[SW] Error en el fetch:', error);
        // Puedes agregar un fallback para páginas offline aquí si lo necesitas
        // Por ejemplo, devolver una página offline.html si la red falla
      })
  );
});

// Evento de 'activación': limpia cachés antiguos
self.addEventListener('activate', event => {
  console.log('[SW] Activando y limpiando cachés antiguos...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
