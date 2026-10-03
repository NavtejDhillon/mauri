// Retires the service worker an earlier build installed at this address. That worker cached
// pages, including clinical ones, for offline use. When a device that still has it checks for
// an update, it gets this file instead, which installs at once, deletes every cache, removes
// itself and reloads open pages so they load from the network. It has no fetch handler, so it
// never serves anything from a cache. Nothing in the app registers a service worker.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(windows.map((client) => client.navigate(client.url).catch(() => undefined)));
    })(),
  );
});
