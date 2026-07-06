// Treenikirja — service worker (offline-tuki)
// Päivitä versionumeroa aina kun sovellus muuttuu, jotta välimuisti uusiutuu.
const CACHE = 'treenikirja-v8';
const ASSETS = ['./', './index.html'];

// Asennus: tallenna sovelluksen pohja välimuistiin
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Aktivointi: poista vanhat välimuistiversiot
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Haku: HTML verkko-ensin (tuoreus), muut resurssit välimuisti-ensin (nopeus + offline)
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Sivunavigointi: yritä verkkoa (ohittaen HTTP-välimuisti), kaadu välimuistiin (offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Muut GET-pyynnöt (esim. fontit): välimuisti ensin, sitten verkko
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
