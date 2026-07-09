const CACHE_NAME = 'ledger-cache-v5';

// Pre-cache only direct non-redirect resources. We do not pre-cache '/' because Vercel/hosts redirect it.
const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting()) // Instantly skip waiting on new installs/activation to prevent half-state lockups
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (e) => {
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

// Network-First with Cache Fallback for navigation requests, Cache-First for assets.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || e.request.method !== 'GET') {
    return;
  }

  // Bypass service worker and fetch directly from network for SEO files
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    return;
  }

  // NAVIGATION REQUESTS (Page loads, refreshes, /)
  // Use Network-First: Try to get fresh content first. If offline/404, fall back to index.html from cache.
  // This prevents cache redirect errors (ERR_FAILED / redirected response follow errors) entirely.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // STATIC ASSETS (JS, CSS, images, etc.)
  // Cache-First strategy to ensure speed and offline capabilities.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(e.request).then((networkResponse) => {
        // Cache successful static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !networkResponse.redirected
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
