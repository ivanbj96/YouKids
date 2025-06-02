const CACHE_NAME = 'youkids-static-cache-v5'; // Versión 5 debido a los cambios en shorts.js
const urlsToCache = [
  './', // Ruta raíz, importante para cachear el index.html
  'index.html',
  'shorts.html',
  'style.css',
  'shorts.css',
  'app.js',
  'shorts.js', // shorts.js modificado
  'manifest.json',
  'YouKids.svg', // Tu archivo SVG en el directorio raíz
  // Iconos de la PWA (asegúrate de que existan)
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  // Fuentes de Google Icons
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IughzsK_FfPqCsA.woff2'
];

// Evento de instalación del Service Worker: cachea los recursos estáticos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando y cacheando recursos estáticos...');
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
  const requestUrl = new URL(event.request.url);

  // Estrategia Cache-First para recursos estáticos de la app y Google Fonts
  if (urlsToCache.includes(requestUrl.href) || urlsToCache.includes(requestUrl.pathname) || requestUrl.origin === 'https://fonts.googleapis.com' || requestUrl.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Estrategia Network-First con fallback a cache para la API de YouTube y otras solicitudes dinámicas
  // Esto es para que los datos estén siempre lo más actualizados posible (ej. resultados de búsqueda)
  if (requestUrl.host.includes('googleapis.com') || requestUrl.host.includes('youtube.com') || requestUrl.host.includes('ytimg.com')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Si la respuesta es exitosa, cachearla
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)) // Si falla la red, intenta el caché
    );
    return;
  }

  // Comportamiento por defecto (fetch de la red) para todo lo demás
  event.respondWith(fetch(event.request));
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
