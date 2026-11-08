// System Swiped offline cache (8611f2b038)
const CACHE = 'swiped-8611f2b038';
const FILES = ["./","OrbitControls.js","RoomEnvironment.js","RoundedBoxGeometry.js","apple-touch-icon.png","career.js","game.js","icon-192.png","icon-512.png","index.html","logo.png","manifest.webmanifest","mobile-shim.js","mobile-ui.js","mobile.css","renderer.js","rig3d.js","styles.css","three.module.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// network first (so updates show up right away), saved copy when offline or slow
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(e.request, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      return (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match('./'));
    }
  })());
});
