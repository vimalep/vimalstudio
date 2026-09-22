const CACHE_NAME = 'exam-arena-v5'; // Har naye update par version badal dein (v5, v6...)

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Exam_Arena.html',
  './manifest.json',
  './favicon.png'
];

// 1. Install Event: Naya worker aate hi turant activate hoga
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.log('Cache add warning:', err));
    })
  );
});

// 2. Activate Event: Purana saara kachra/cache ek second mein delete
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: "Strict Network First" (Disk cache bypass karke direct live server se lao)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Google Apps Script ya external APIs ko cache na karein (Hamesha 100% LIVE chalenge)
  if (url.origin !== self.location.origin) {
    return;
  }

  const isHtmlPage = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');

  event.respondWith(
    // { cache: 'no-cache' } se browser ka purana memory cache bypass ho jata hai
    fetch(event.request, isHtmlPage ? { cache: 'no-cache' } : {})
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline hone par hi cache se dikhayein
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (isHtmlPage) return caches.match('./index.html') || caches.match('./Exam_Arena.html');
        });
      })
  );
});
