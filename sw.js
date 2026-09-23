const CACHE_NAME = 'quiz-system-v1';
const CACHE_FILES = [
  './login.html', './dashboard.html',
  './css/style.css',
  './js/api.js', './js/auth.js', './js/app.js', './js/chart.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('script.google.com')) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./login.html'))));
});
