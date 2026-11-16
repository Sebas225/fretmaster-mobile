/**
 * @fileoverview Service Worker Offline-First con precache completo de todos los módulos.
 */
'use strict';

const CACHE_NAME = 'fretmaster-mobile-v1.0.0';
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles/utilities.css",
  "./styles/tokens-and-theme.css",
  "./js/core/constants.js",
  "./js/core/theory.js",
  "./js/core/voicings.js",
  "./js/core/scales.js",
  "./js/core/detector.js",
  "./js/audio/synth-engine.js",
  "./js/state/store.js",
  "./js/ui/fretboard-view.js",
  "./js/ui/piano-view.js",
  "./js/ui/controls-view.js",
  "./js/platform/platform-bridge.js",
  "./js/app.js",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
