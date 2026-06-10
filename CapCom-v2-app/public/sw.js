/* global self, caches, fetch */

const APP_SHELL_CACHE_PREFIX = "capcom-v2-app-shell-";

async function clearAppShellCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(APP_SHELL_CACHE_PREFIX))
      .map((cacheName) => caches.delete(cacheName))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(clearAppShellCaches());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearAppShellCaches();
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});
