/**
 * Smart Campus AI - Progressive Web App (PWA) Service Worker
 * Provides offline asset caching, background sync preparation, and shell caching.
 */

const CACHE_NAME = 'smart-campus-v1.0';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/vendor/tailwind.css',
  '/vendor/font-awesome/css/all.min.css',
  '/manifest.json'
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for dynamic API routes, Cache-first / Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API or SSE streaming requests
  if (url.pathname.startsWith('/api') || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(req).then((networkRes) => {
      // Clone valid response to cache
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      }
      return networkRes;
    }).catch(() => {
      // Fallback to cache if network fails (offline support)
      return caches.match(req).then((cachedRes) => {
        if (cachedRes) return cachedRes;
        if (req.mode === 'navigate') return caches.match('/index.html');
        return new Response('Network offline and asset not cached.', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

