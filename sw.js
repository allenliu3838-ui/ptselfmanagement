const CACHE_NAME = "kidney-care-v9.11.0";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./js/constants.js?v=9.11",
  "./js/utils.js?v=9.11",
  "./js/state.js?v=9.11",
  "./js/programs.js?v=9.11",
  "./js/tasks.js?v=9.11",
  "./js/db.js?v=9.11",
  "./js/diet.js?v=9.11",
  "./js/render.js?v=9.11",
  "./js/modals.js?v=9.11",
  "./js/export.js?v=9.11",
  "./js/trends.js?v=9.11",
  "./js/premium.js?v=9.11",
  "./js/ocr.js?v=9.11",
  "./js/share.js?v=9.11",
  "./js/ai.js?v=9.11",
  "./js/ui.js?v=9.11",
  "./js/app.js?v=9.11",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
  "./icons/logo-full.png",
  "./icons/brand-96.png"
];

self.addEventListener("install", (event) => {
  // Force immediate activation — don't wait for old tabs to close
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Allow the page to trigger an update when a new SW is waiting.
self.addEventListener("message", (event) => {
  if(event?.data?.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Network-first for HTML and JS, cache-first for static assets
      const url = new URL(req.url);
      const isHTML = req.headers.get("accept")?.includes("text/html") || url.pathname.endsWith("/");
      const isJS = url.pathname.endsWith(".js");
      if (isHTML || isJS) {
        // Bypass HTTP cache to reduce "stuck on old version" issues.
        const fetchReq = new Request(req, { cache: "no-store" });
        return fetch(fetchReq).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        }).catch(() => cached || (isHTML ? caches.match("./index.html") : undefined));
      }
      return cached || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      });
    })
  );
});
