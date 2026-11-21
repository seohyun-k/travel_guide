/* Hong Kong Trip 2026 — 오프라인 지원 서비스 워커 (하위 경로 배포 지원) */
const VERSION = "hk-trip-v2";
const SCOPE = new URL(self.registration.scope).pathname; // 예: "/" 또는 "/travel_guide/"
const SHELL = ["", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"].map((p) => SCOPE + p);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API 응답·Google 지도/사진은 캐시하지 않음 (경로·장소 데이터는 앱 저장소에 보관)
  if (url.pathname.includes("/api/") || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleusercontent.com")) return;

  // 페이지: 네트워크 우선, 실패 시 캐시
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || Response.error())),
    );
    return;
  }

  // 정적 자원(_next/static, 아이콘, 폰트, OSM 타일): 캐시 우선
  const cacheable = url.origin === self.location.origin || url.hostname === "cdn.jsdelivr.net" || url.hostname.endsWith("tile.openstreetmap.org");
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
