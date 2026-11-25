// Service worker: caché para uso sin conexión (network-first para que los cambios del plan lleguen al momento)
const CACHE = "planning-v22";
const ASSETS = ["./", "index.html", "css/styles.css", "js/plan.js", "js/foods-db.js", "js/nutrition.js", "js/store.js", "js/strava.js", "js/app.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-180.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});

// Aviso diario (Web Push enviado desde GitHub Actions)
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Mi planning", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || "hoy", data: { url: d.url || "./#/hoy" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./#/hoy", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    if (cs.length) { const c = cs[0]; return c.focus().then(() => c.navigate && c.navigate(url)).catch(() => {}); }
    return self.clients.openWindow(url);
  }));
});
