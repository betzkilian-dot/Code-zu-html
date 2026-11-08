/* Service Worker: macht die App offline nutzbar.
   Bei jeder Änderung an den Dateien die Versionsnummer unten erhöhen,
   damit installierte Geräte die neuen Dateien holen. */
const VERSION = 'v1';
const CACHE = 'code-zu-html-' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'syntax.js',
  'app.js',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/familjen-grotesk-latin-400-normal.woff2',
  'fonts/familjen-grotesk-latin-500-normal.woff2',
  'fonts/familjen-grotesk-latin-600-normal.woff2',
  'fonts/familjen-grotesk-latin-700-normal.woff2',
  'fonts/jetbrains-mono-latin-400-normal.woff2',
  'fonts/jetbrains-mono-latin-500-normal.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Aus dem Cache antworten und im Hintergrund aktualisieren. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
      return cached || network;
    })
  );
});
