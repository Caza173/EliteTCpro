/**
 * EliteTC Service Worker
 * Production-grade PWA caching — safe for SaaS/auth apps
 * 
 * Strategy:
 *  - Static assets (JS/CSS/fonts): Cache First (long-lived)
 *  - Images:                       Cache First
 *  - Google Fonts:                 Stale While Revalidate
 *  - API / auth requests:          NEVER cached (network only)
 *  - Navigation (HTML):            Network First, fallback to offline.html
 */

const CACHE_VERSION = "elitetc-v4";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const FONT_CACHE    = `${CACHE_VERSION}-fonts`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon.svg",
];

// URL patterns that must NEVER be cached (auth, API, sensitive data)
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /base44\.com\/api/,
  /base44\.com\/auth/,
  /stripe\.com/,
  /skyslope/,
  /dotloop/,
  /dropboxsign/,
  /hellosign/,
  /googleapis\.com\/calendar/,
  /gmail/,
  /token/i,
  /session/i,
  /supabase/,
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Don't fail install if offline.html isn't available yet
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith("elitetc-") && !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s)
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // NEVER cache auth/API/sensitive patterns
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) {
    return; // fall through to network
  }

  // Google Fonts CSS: Stale While Revalidate
  if (url.hostname === "fonts.googleapis.com") {
    event.respondWith(staleWhileRevalidate(FONT_CACHE, request));
    return;
  }

  // Google Fonts files: Cache First (very long-lived)
  if (url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(FONT_CACHE, request));
    return;
  }

  // Static assets (JS, CSS, wasm)
  if (
    url.origin === self.location.origin &&
    (url.pathname.match(/\.(js|css|wasm)$/) || url.pathname.startsWith("/assets/"))
  ) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // Images (including CDN-hosted icons)
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|gif)$/) ||
    url.hostname === "media.base44.com"
  ) {
    event.respondWith(cacheFirst(IMAGE_CACHE, request));
    return;
  }

  // Navigation requests: Network First with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else: network only (safe default for SaaS)
});

// ─── Cache Strategies ──────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 503 });
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match("/offline.html");
    return offlinePage || new Response(
      "<h1>You're offline</h1><p>Please reconnect to continue using EliteTC.</p>",
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }
}

// ─── Version broadcast (triggers UI update notification) ─────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
