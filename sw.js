// sw.js — Service Worker for Mason Navigator PWA
const CACHE = 'mason-nav-v2';
const ASSETS = [
  '/School-Map/',
  '/School-Map/index.html',
  '/School-Map/why.html',
  '/School-Map/style.css',
  '/School-Map/theme.js',
  '/School-Map/script.js',
  '/School-Map/schoolGraph.js',
  '/School-Map/pathfinding.js',
  '/School-Map/displayRooms.js',
  '/School-Map/A_Rooms.js',
  '/School-Map/B_Rooms.js',
  '/School-Map/C_Rooms.js',
  '/School-Map/Z_Rooms.js',
  '/School-Map/D_Rooms.js',
  '/School-Map/E_Rooms.js',
  '/School-Map/F_Rooms.js',
  '/School-Map/icons/icon-192x192.png',
  '/School-Map/icons/icon-512x512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).catch(() => caches.match('/School-Map/index.html')))
  );
});
