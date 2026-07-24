// Service worker minimal : cache runtime "network-first, fallback cache".
// Suffit pour rendre le shell installable et disponible hors-ligne après
// une première visite. Une stratégie de precache viendra plus tard.
const CACHE = 'miaou-runtime-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
      }
    })(),
  );
});
