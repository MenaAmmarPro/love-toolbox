"use strict";

/*
 * love-toolbox service worker.
 * Cache-first for local assets, with a versioned cache we bump on release.
 */

const CACHE = "mena-toolbox-v1";
const ASSETS = [
  ".",
  "index.html",
  "css/theme.css",
  "css/app.css",
  "js/theme-main.js",
  "js/effects.js",
  "js/app.js",
  "js/tools/calculator.js",
  "js/tools/units.js",
  "js/tools/dates.js",
  "js/tools/text.js",
  "js/tools/base.js",
  "js/tools/roman.js",
  "js/tools/colors.js",
  "manifest.webmanifest",
  "assets/favicon.svg",
  "assets/apple-touch-icon.png",
  "assets/og-image.png",
  "robots.txt",
  "sitemap.xml"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached || caches.match("index.html"));
    })
  );
});
