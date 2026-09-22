const CACHE_NAME = 'exam-arena-v6'; // Jab bhi naya badlav karein, bas v6 ko v7 kar dein

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Exam_Arena.html',
  './manifest.json',
  './favicon.png'
];

// 1. Install Event: Purane worker ko bypass karke turant install hoga
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.log('Cache pre-fetch note:', err));
    })
  );
});

// 2. Activate Event: Purana sabhi cache turant delete karein
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

// 3. Fetch Event: Strict Network-First (Hamesha live server se fresh file layega)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Google Sheets API aur external links ko direct live chalne dein
  if (url.origin !== self.location.origin) {
    return;
  }

  const isHtmlPage = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');

  event.respondWith(
    // { cache: 'no-cache' } se Chrome disk memory bypass hokar seedhe GitHub se fresh code aayega
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
        // Offline hone par hi cache memory se page open karein
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (isHtmlPage) return caches.match('./index.html') || caches.match('./Exam_Arena.html');
        });
      })
  );
});
