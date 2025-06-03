const CACHE_NAME = 'youkids-minimal-install-v1'; // Nuevo nombre de caché para forzar actualización
const urlsToCache = [
  './', // La ruta raíz
  'index.html',
  'shorts.html',
  'style.css',
  'shorts.css',
  'app.js',
  'shorts.js',
  'manifest.json',
  'YouKids.png' // Tu imagen PNG para el icono
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando y cacheando recursos esenciales...');
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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

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
