// Service worker de RALIN Go: permite instalar la app y abrirla aunque falle la red.
// La API siempre va a la red (los datos son en tiempo real).
const CACHE = 'ralin-go-v1';
const ARCHIVOS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/icons/icono-192.png', '/icons/icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;

  // Primero la red (para ver siempre la última versión); si no hay red, la copia guardada.
  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  );
});
