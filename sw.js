// Çevrimdışı çalışma için basit önbellek. Dosyaları değiştirince VERSION'ı artırın.
const VERSION = 'hk-v35';
const FILES = [
  './', 'index.html', 'styles.css', 'common.js', 'app.js', 'manifest.webmanifest',
  'fonts/nunitosans-latin.woff2', 'fonts/nunitosans-latin-ext.woff2',
  'img/acilis.jpg', 'img/avatar.jpg', 'img/banka.png', 'img/kripto.png', 'img/hediye.png',
  'img/ev.png', 'img/arac.png', 'img/seyahat.png',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-1024.png', 'icons/icon-maskable-512.png',
  // Halk Kripto (ikinci uygulama)
  'kripto/', 'kripto/index.html', 'kripto/app.css', 'kripto/app.js', 'kripto/manifest.webmanifest', 'kripto/img/logo.png',
  'kripto/icons/icon-180.png', 'kripto/icons/icon-192.png', 'kripto/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Önce ağ, olmazsa önbellek: güncellemeler hemen görünür, internet yoksa da açılır
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
