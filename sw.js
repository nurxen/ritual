// Service worker: permite instalar la app y abrirla rápido.
// Cambia VERSION cada vez que subas cambios para que los móviles se actualicen.
const VERSION = 'ritual-v9';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/store.js', './js/db.js', './js/ui.js', './js/data.js', './js/config.js',
  './js/care.js', './js/progress.js', './js/agenda.js', './js/mente.js', './js/settings.js', './js/plans.js', './js/timers.js', './icons/icon-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero para los archivos de la app (así siempre ves la última versión), caché si no hay conexión.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
