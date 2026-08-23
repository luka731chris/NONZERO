const CACHE = 'nonzero-v0.8.0';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/nonzero-icon-192.png',
  './assets/nonzero-icon-512.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put('./index.html', clone));
      return resp;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    if (req.method === 'GET' && resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
    }
    return resp;
  })));
});
