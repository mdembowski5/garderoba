/* Service Worker – offline-first dla powłoki aplikacji.
 * __BUILD_ID__ jest podmieniany przy buildzie (vite.config.ts), co wymusza aktualizację cache. */
const CACHE = 'garderoba-__BUILD_ID__';
const CORE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      // Prekeszuj zasoby z hashami (JS/CSS) wskazane w index.html – offline działa od pierwszego uruchomienia.
      try {
        const html = await (await cache.match('/')).text();
        const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await cache.addAll(assets);
      } catch (_) {
        /* ignoruj – zasoby doładują się w runtime */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // API pogodowe / geokodowanie obsługuje aplikacja (własny cache w localStorage).
  if (url.origin !== self.location.origin) return;

  // Nawigacja: sieć najpierw, fallback do zapisanej powłoki.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Zasoby statyczne: cache-first + odświeżanie w tle.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
