self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("youkids-cache").then((cache) => {
      return cache.addAll([
        "/index.html",
        "/shorts.html",
        "/style.css",
        "/app.js",
        "/manifest.json"
      ]);
    })
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
