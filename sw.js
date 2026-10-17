const CACHE_NAME = 'novum-os-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=2.0',
  './app.js',
  './manifest.json'
];

// Installation & Caching der statischen Dateien
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivierung & Veraltete Caches bereinigen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First Strategie für CSS / JS, damit Themes und Updates sofort ankommen
self.addEventListener('fetch', (event) => {
  // API Calls nicht abfangen oder cachen
  if (event.request.url.includes('api.openai.com') || 
      event.request.url.includes('google.serper.dev') || 
      event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Erfolgreicher Netzwerk-Fetch: Cache aktualisieren
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback auf Cache (z. B. wenn offline)
        return caches.match(event.request);
      })
  );
});
