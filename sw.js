// System Swiped offline cache (702ba41fce)
const CACHE = 'swiped-702ba41fce';
const FILES = ["./","OrbitControls.js","RoomEnvironment.js","RoundedBoxGeometry.js","apple-touch-icon.png","career.js","game.js","icon-192.png","icon-512.png","index.html","logo.png","manifest.webmanifest","mobile-shim.js","mobile-ui.js","mobile.css","renderer.js","rig3d.js","styles.css","three.module.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./'))));
});
