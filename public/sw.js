const CACHE_NAME = 'sosa-v3'; // Bumped version to invalidate old caches

// Static assets cached on installation for basic offline capability
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become the active service worker immediately
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Claim clients immediately so the new service worker takes over control without a reload
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin static assets (ignore Supabase API and other external requests)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Check if it's an HTML page/navigation request
  const isHtmlRequest = 
    event.request.mode === 'navigate' || 
    url.pathname.endsWith('.html') || 
    url.pathname.endsWith('/');

  if (isHtmlRequest) {
    // Strategy 1: Network-First for HTML/Navigation requests.
    // This guarantees online users always get the freshest index.html with the correct hashed asset URLs.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Strategy 2: Cache-First for all other assets (JS, CSS, images, JSON).
  // Vite builds hashed filenames (e.g. index-CD7xYz.js) which are immutable.
  // We can serve them instantly from cache, falling back to network and caching if not present.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch((err) => {
        console.error('SW: Fetch failed for asset:', event.request.url, err);
      });
    })
  );
});
