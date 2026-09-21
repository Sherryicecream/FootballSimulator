/* 足球生涯模拟器离线服务程序：缓存构建产物，离线时完整可玩（AI 叙事除外）。 */
const CACHE = 'football-sim-v1';
const APP_ROOT = new URL('./', self.registration.scope).pathname;
const APP_INDEX = new URL('index.html', self.registration.scope).pathname;
const APP_MANIFEST = new URL('manifest.webmanifest', self.registration.scope).pathname;
const APP_ICON = new URL('icon.svg', self.registration.scope).pathname;
const PRECACHE = [APP_ROOT, APP_INDEX, APP_MANIFEST, APP_ICON];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(APP_INDEX).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
