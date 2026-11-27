// Điều suy nghĩ — lưu đệm để mở nhanh & dùng khi mất mạng
const V = "dsn-v1";
const SHELL = ["./", "index.html", "style.css", "js/quotes.js", "js/store.js", "js/render.js", "js/music.js", "js/ai.js", "js/backgrounds.js", "js/ui.js", "js/video.js", "js/post.js", "js/app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (FONT_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(V).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }));
  } else if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(V).then(c => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
