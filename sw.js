// sw.js — Service Worker for Mason Navigator PWA
//
// Works on both GitHub Pages (/School-Map/) and Firebase Hosting (/) by
// detecting the base path from the service worker's own URL at runtime.

const VERSION = 'mason-nav-v3';

// Derive the base path so this works on any hosting path.
// GitHub Pages: self.location.pathname === '/School-Map/sw.js' → BASE = '/School-Map'
// Firebase:     self.location.pathname === '/sw.js'            → BASE = ''
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/why.html`,
  `${BASE}/style.css`,
  `${BASE}/theme.js`,
  `${BASE}/script.js`,
  `${BASE}/cloud.js`,
  `${BASE}/aiConfig.js`,
  `${BASE}/firebaseConfig.js`,
  `${BASE}/schoolGraph.js`,
  `${BASE}/pathfinding.js`,
  `${BASE}/displayRooms.js`,
  `${BASE}/A_Rooms.js`,
  `${BASE}/B_Rooms.js`,
  `${BASE}/C_Rooms.js`,
  `${BASE}/Z_Rooms.js`,
  `${BASE}/D_Rooms.js`,
  `${BASE}/E_Rooms.js`,
  `${BASE}/F_Rooms.js`,
  `${BASE}/icons/icon-192x192.png`,
  `${BASE}/icons/icon-512x512.png`,
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .catch(() => caches.match(`${BASE}/index.html`))
      )
  );
});
