const CACHE = 'caulis-v100';
const SHELL = [
  './',
  './index.html',
  './caulis-core.jsx',
  './caulis-perenual.jsx',
  './caulis-firebase.jsx',
  './caulis-screens.jsx',
  './caulis-detail.jsx',
  './ios-frame.jsx',
  './app.jsx',
  './icon-192.png',
  './icon-512.png',
];

// Caulis moved off GitHub Pages. A tab/PWA still on the old origin may be
// running whatever service worker + cached index.html it last saw — self-
// destruct here instead of serving stale offline content. Reload the old
// origin's own root (not the new domain directly): the unregister + cache
// wipe above means that reload hits the network fresh, picking up the
// current index.html, which is the one that actually gathers localStorage
// and carries it over — jumping straight to the new domain from inside the
// service worker would skip that step entirely.
if (self.location.hostname !== 'caulis.czeddaru.dev') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => {
    e.waitUntil((async () => {
      await self.registration.unregister();
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) client.navigate(self.registration.scope);
    })());
  });
} else {

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Never intercept navigations (document loads) — just let the browser
  // handle them natively. Safari/WebKit has a real bug where a service
  // worker manually re-fetching a navigation request (respondWith(fetch(...)))
  // throws "FetchEvent.respondWith received an error: TypeError: Load failed",
  // especially with a long URL like the migration link's ?_migrate= payload.
  // Sub-resources (scripts, images) below are unaffected and still cached.
  if (e.request.mode === 'navigate') return;

  // Network-first for CDN (React, Firebase, fonts) — fall back to cache
  // Cache-first for local app shell
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  if (isLocal) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});

}
