const CACHE_NAME = 'ledger-cache-v3';

// Pre-cache the app shell on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

self.addEventListener('install', (e) => {
  // Do NOT call skipWaiting() here — wait for user to click "Update"
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

// Only skip waiting when the user explicitly clicks the "Update" button
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (e) => {
  // Clean up old caches from previous versions
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests (skip Supabase API calls, external CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests (POST, DELETE, etc.)
  if (e.request.method !== 'GET') {
    return;
  }

  // For navigation requests (page loads), always serve cached index.html
  // This ensures the app shell loads even if the network is down or assets changed
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then((cached) => {
        return cached || fetch(e.request);
      })
    );
    return;
  }

  // For ALL other requests (JS, CSS, images, fonts):
  // Cache-first strategy: serve from cache if available, otherwise fetch from network and cache it
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        return cached;
      }

      // Not in cache — fetch from network, cache a copy, and return it
      return fetch(e.request).then((networkResponse) => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed and not in cache — nothing we can do
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
