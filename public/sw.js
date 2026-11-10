// La web instalable (manifest.webmanifest): que el juego se abra también sin
// red. Siempre se pide primero a la red (así nunca se queda una versión vieja:
// el navegador sólo baja el archivo si ha cambiado) y lo que llega se guarda;
// sin red, lo guardado.
const CACHE = 'dawn-of-braga';
const CORE = ['./', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(r, copy));
        }
        return res;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === 'navigate' ? caches.match('./') : undefined)).then((m) => m || Response.error()))
  );
});
