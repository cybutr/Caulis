const CACHE = 'caulis-v176';
const SHELL = [
  './',
  './index.html',
  './caulis-core.jsx',
  './caulis-perenual.jsx',
  './caulis-firebase.jsx',
  './caulis-screens.jsx',
  './caulis-detail.jsx',
  './caulis-badges.jsx',
  './ios-frame.jsx',
  './app.jsx',
  './icon-192.png',
  './icon-512.png',
  './notif-watering.png',
  './notif-watering-badge.png',
  './notif-reminder.png',
  './notif-reminder-badge.png',
  './notif-digest.png',
  './notif-digest-badge.png',
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

// vibrate patterns give each push TYPE its own felt identity even though the
// Notifications API otherwise renders all three the same way on most
// platforms — a short double-tap for the daily watering nudge, a single
// longer buzz for a due custom reminder, and a gentle single pulse for the
// once-a-week digest (deliberately the calmest of the three, since it's a
// summary, not an ask). Chrome/Android honors this; iOS Safari has no web
// push vibration API at all and silently ignores the field — no crash, just
// no haptic, which is the graceful-degradation case documented in CLAUDE.md.
const VIBRATE_PATTERNS = {
  watering: [80, 40, 80],
  reminder: [160],
  digest: [60],
};

// one small branded glyph per push type — same forest-green rounded-square
// badge as the app's own home-screen icon, with a distinct white line glyph
// per kind (droplet / clock / calendar-check) so a watering ping, a custom
// reminder, and the weekly digest are visually distinguishable at a glance
// in the notification tray, not three identical leaf icons. `badge` is the
// small monochrome status-bar glyph Android silhouette-masks on its own
// (alpha channel only, no green background needed there).
const ICONS = {
  watering: { icon: './notif-watering.png', badge: './notif-watering-badge.png' },
  reminder: { icon: './notif-reminder.png', badge: './notif-reminder-badge.png' },
  digest:   { icon: './notif-digest.png',   badge: './notif-digest-badge.png' },
};

self.addEventListener('push', e => {
  let payload = { title: 'Caulis', body: 'You have a garden update.' };
  try { payload = e.data.json(); } catch (err) {}
  const type = payload.type || 'watering';
  const icons = ICONS[type] || ICONS.watering;
  // renotify + a stable per-TYPE tag (not per-notification) means a second
  // push of the same kind replaces the still-showing one on the lock screen
  // instead of stacking — the closest thing the Notifications API has to
  // "don't buzz me twice for the same kind of thing".
  e.waitUntil(self.registration.showNotification(payload.title || 'Caulis', {
    body: payload.body || '',
    icon: icons.icon,
    badge: icons.badge,
    // the one large "hero" touch Web Push actually allows on Chrome/Android
    // (no custom native layout, no Live Activity) — only ever a real https
    // species-photo URL from the server, never a user's own base64 photo
    // (see plantImageUrl() server-side for why); simply absent otherwise
    image: payload.image || undefined,
    tag: payload.tag || type,
    renotify: true,
    vibrate: VIBRATE_PATTERNS[type] || VIBRATE_PATTERNS.watering,
    data: { ...(payload.data || { url: payload.url || './' }), type },
    actions: payload.actions || [],
  }));
});

self.addEventListener('notificationclick', e => {
  const data = e.notification.data || {};
  const url = data.url || './';

  // action buttons (water / snooze 2 days / mark reminder done) all fire
  // straight from the notification, no app UI needed — record server-side
  // (idempotent, signed, single-purpose token per action) and only fall
  // through to opening the app if that request fails, so the user has a way
  // to see/fix it manually. One shared branch: each action just picks which
  // signed token it was minted with and which action string to send back.
  const ACTION_TOKENS = { water: 'actionToken', snooze: 'snoozeToken', 'schedule-done': 'actionToken' };
  const actionToken = data[ACTION_TOKENS[e.action]];
  if (actionToken) {
    e.notification.close();
    e.waitUntil((async () => {
      try {
        const r = await fetch('https://api.caulis.czeddaru.dev/api/push/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: actionToken, action: e.action }),
        });
        if (r.ok) return;
      } catch (err) {}
      // request failed (offline, expired token, server error) — the comment
      // above always described this fallback but the fetch's .catch(()=>{})
      // used to swallow it silently instead, so a failed tap looked identical
      // to a successful one: notification gone, nothing actually recorded.
      // Open the app deep-linked to the plant so the user can see it wasn't
      // recorded and act on it manually.
      const target = new URL(url, self.registration.scope).href;
      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        if ('navigate' in client) { try { await client.navigate(target); } catch (err) {} }
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })());
    return;
  }

  e.notification.close();
  const target = new URL(url, self.registration.scope).href;
  e.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientList) {
      if ('navigate' in client) { try { await client.navigate(target); } catch (err) {} }
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
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
