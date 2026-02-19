const CACHE_NAME = "kidney-care-v9.3.1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./js/constants.js",
  "./js/utils.js",
  "./js/state.js",
  "./js/programs.js",
  "./js/tasks.js",
  "./js/db.js",
  "./js/diet.js",
  "./js/render.js",
  "./js/modals.js",
  "./js/export.js",
  "./js/ai.js",
  "./js/ui.js",
  "./js/app.js",
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
      // Network-first for HTML, cache-first for others
      const url = new URL(req.url);
      const isHTML = req.headers.get("accept")?.includes("text/html") || url.pathname.endsWith("/");
      if (isHTML) {
        // Bypass HTTP cache for navigations to reduce "stuck on old version" issues.
        const fetchReq = new Request(req, { cache: "no-store" });
        return fetch(fetchReq).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        }).catch(() => cached || caches.match("./index.html"));
      }
      return cached || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      });
    })
  );
});
