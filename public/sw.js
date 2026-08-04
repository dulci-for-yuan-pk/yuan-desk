/* Yuan Desk service worker — the shell works even on a bad connection.
   His books are in localStorage, so the app opens and reads offline. */
const CACHE = 'yuan-desk-v3';
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;            // never cache his data or DULCi
  if (url.origin !== location.origin) return;              // fonts handle themselves

  // The shell is always fetched fresh when online, so a new deploy is seen
  // immediately; the cache is the fallback for a bad connection, not the default.
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit || caches.match('/index.html'));
      return hit || live;
    })
  );
});
