// Mauri Service Worker v1
const CACHE_VERSION = 'mauri-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
];

// --- Install: pre-cache app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// --- Activate: clean up old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// --- Fetch strategies ---

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp|avif)(\?.*)?$/.test(url.pathname) ||
    url.pathname.startsWith('/_next/static/');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname;
}

// Network-first: try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation requests, return cached root page as fallback
    if (isNavigationRequest(request)) {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML pages): network-first
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // API / external requests: network-first
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Static assets (JS, CSS, fonts, images): stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});
