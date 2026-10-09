/* Dividend Tracker · service worker: funciona sin conexión */
const CACHE = "dividend-tracker-v7";
const SHELL = ["./", "index.html", "manifest.webmanifest", "vendor/chart.umd.min.js",
  "icons/logo.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* solo la propia app y las fuentes; la API de GitHub (sincronización) va siempre directa */
  const fuentes = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !fuentes) return;
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    /* la página: primero red (para recibir actualizaciones), si no hay conexión, la copia */
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put("index.html", c)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  /* resto (iconos, Chart.js, fuentes): copia guardada y, si no, red */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
    return r;
  })));
});
