/* Service worker — makes the app installable and usable offline (PRD 010).
 *
 * Deliberately conservative: the family data is live, so /api/* is NEVER
 * intercepted (the app already falls back to its bundled snapshot offline).
 *   - pages (navigations): network first, cached shell as the offline fallback
 *   - /assets/* (hashed, immutable): cache first
 *   - photos, avatars, fonts: stale-while-revalidate, capped
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = 'v1';
const SHELL = `vv-shell-${VERSION}`;
const ASSETS = `vv-assets-${VERSION}`;
const MEDIA = `vv-media-${VERSION}`;
const MEDIA_LIMIT = 150;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(['/', '/favicon.svg', '/icons/icon-192.png'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, ASSETS, MEDIA].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(k => cache.delete(k)));
}

const isMedia = url =>
  url.pathname.startsWith('/photos/') ||
  url.hostname.endsWith('.public.blob.vercel-storage.com') ||
  url.hostname === 'api.dicebear.com' ||
  url.hostname === 'fonts.gstatic.com' ||
  url.hostname === 'fonts.googleapis.com';

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch the API or auth flows.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Pages: network first so a new deploy is seen at once; cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put('/', copy)); return res; })
        .catch(() => caches.match('/').then(r => r || Response.error())),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then(c => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  // Photos, avatars, fonts: serve from cache, refresh in the background.
  if (isMedia(url)) {
    event.respondWith(
      caches.open(MEDIA).then(async cache => {
        const hit = await cache.match(req);
        const refresh = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()).then(() => trim(MEDIA, MEDIA_LIMIT)); }
          return res;
        }).catch(() => hit);
        return hit || refresh;
      }),
    );
  }
});
