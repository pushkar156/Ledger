const CACHE_NAME = 'ledger-cache-v4';

// Only pre-cache files that return direct (non-redirect) responses
const SHELL_ASSETS = [
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
  var url = new URL(e.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || e.request.method !== 'GET') {
    return;
  }

  // For navigation requests (page loads / reloads), serve cached index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(function(cached) {
        if (cached) {
          return cached;
        }
        // Fallback: fetch from network with redirect following enabled
        return fetch(e.request.url, { redirect: 'follow' });
      })
    );
    return;
  }

  // For all other same-origin requests (JS, CSS, images, fonts):
  // Cache-first strategy
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        return cached;
      }

      // Not in cache — fetch from network, cache a copy, return it
      return fetch(e.request).then(function(networkResponse) {
        // Only cache successful, non-redirected, same-origin responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !networkResponse.redirected
        ) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
