// Service worker: la app funciona sin conexión. Sube VERSION al publicar cambios.
const VERSION = 'ignacio-v1';
const FILES = [
  './', './index.html', './css/styles.css', './manifest.webmanifest', './firebase-config.js',
  './js/app.js', './js/ctx.js', './js/nav.js', './js/ui.js', './js/store.js', './js/sync.js',
  './js/nutrition.js', './js/gym.js', './js/v-food.js', './js/v-gym.js', './js/v-progreso.js', './js/v-ajustes.js',
  './js/data/foods.js', './js/data/exercises.js', './js/data/presets.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero red para los archivos propios (así ves los cambios), caché si no hay conexión.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
