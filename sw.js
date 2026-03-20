// sw.js — Service Worker for Mason Navigator PWA
const CACHE = "mason-nav-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/why.html",
  "/style.css",
  "/theme.js",
  "/script.js",
  "/schoolGraph.js",
  "/pathfinding.js",
  "/displayRooms.js",
  "/A_Rooms.js",
  "/B_Rooms.js",
  "/C_Rooms.js",
  "/Z_Rooms.js",
  "/D_Rooms.js",
  "/E_Rooms.js",
  "/F_Rooms.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)),
  );
});
