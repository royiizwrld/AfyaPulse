// AfyaPulse service worker: makes the app installable and shows the app shell if the network drops.
// It never caches Supabase or any other cross-origin request, so patient/register data is always live.
const CACHE = 'afyapulse-shell-v1';
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // leave API calls alone
  if (req.mode === 'navigate') {
    // Network first so users always get the latest version; fall back to the cached shell offline.
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/', copy));
        return res;
      }).catch(() => caches.match('/'))
    );
    return;
  }
  // Static same-origin files (icons, manifest): cache first.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
