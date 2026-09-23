// ═══════════════════════════════════════════════════════
// SERVANA — Service Worker v1.0.0
// Strategy: Cache-first for assets, Network-first for pages
// ═══════════════════════════════════════════════════════

const APP_VERSION   = "servana-v1.0.0";
const STATIC_CACHE  = `${APP_VERSION}-static`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;
const OFFLINE_PAGE  = "./offline.html";

// ── Assets to pre-cache on install ──────────────────────
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./dashboard.html",
  "./seeker.html",
  "./provider.html",
  "./bookings.html",
  "./chat.html",
  "./profile.html",
  "./settings.html",
  "./category.html",
  "./admin.html",
  "./offline.html",
  "./manifest.json",
  "./assets/styles.css",
  "./assets/firebase.js",
  "./assets/cloudinary.js",
  "./assets/paystack.js",
  "./assets/email.js",
  "./assets/notifications.js",
  "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=DM+Sans:wght@400;500;600;700&display=swap"
];

// ── URLs that should NEVER be cached ────────────────────
const NEVER_CACHE = [
  "firebaseapp.com",
  "googleapis.com/identitytoolkit",
  "securetoken.googleapis.com",
  "api.cloudinary.com",
  "js.paystack.co",
  "emailjs.com",
  "onesignal.com"
];

// ── Max entries in dynamic cache ─────────────────────────
const MAX_DYNAMIC_ENTRIES = 60;

// ─────────────────────────────────────────────────────────
// INSTALL — pre-cache all static assets
// ─────────────────────────────────────────────────────────
self.addEventListener("install", event => {
  console.log("[SW] Installing…", APP_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log("[SW] Pre-caching static assets");
        // Cache individually so one failure doesn't block the whole install
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────
// ACTIVATE — clean up old caches
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", event => {
  console.log("[SW] Activating…", APP_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────
// FETCH — routing strategy
// ─────────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") return;

  // Skip never-cache URLs (auth, payment, external APIs)
  if (NEVER_CACHE.some(domain => request.url.includes(domain))) return;

  // Skip Firebase SDK CDN — always fetch fresh
  if (request.url.includes("gstatic.com/firebasejs")) return;

  // ── Strategy: Stale-While-Revalidate for Google Fonts ──
  if (request.url.includes("fonts.googleapis.com") || request.url.includes("fonts.gstatic.com")) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── Strategy: Cache-first for static assets (CSS, JS, images) ──
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Strategy: Network-first for HTML pages ──────────────
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // ── Strategy: Network-first for everything else ─────────
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ─────────────────────────────────────────────────────────
// STRATEGIES
// ─────────────────────────────────────────────────────────

// Cache-first: check cache → fallback to network → store in cache
async function cacheFirst(request, cacheName) {
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
    return new Response("Asset unavailable offline.", { status: 503 });
  }
}

// Network-first: try network → fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await trimCache(cache, MAX_DYNAMIC_ENTRIES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }
}

// Network-first for HTML with offline page fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page
    const offlinePage = await caches.match(OFFLINE_PAGE);
    return offlinePage || new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <title>Servana — You're Offline</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'DM Sans',sans-serif;background:#EEF2FF;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
          .card{background:#fff;border-radius:22px;padding:40px 32px;text-align:center;max-width:360px;box-shadow:0 16px 48px rgba(13,21,96,.18)}
          .icon{font-size:64px;margin-bottom:20px}
          h1{font-family:'Orbitron',sans-serif;font-size:20px;color:#1A237E;margin-bottom:10px}
          p{font-size:14px;color:#4A5880;line-height:1.6;margin-bottom:24px}
          button{padding:12px 28px;background:linear-gradient(135deg,#1A237E,#6C3CE1);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>Servana needs an internet connection to load. Please check your network and try again.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }
}

// Stale-while-revalidate: serve cached immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Trim old cache entries to avoid unbounded growth
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ─────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS (OneSignal will handle most of this,
// but this catches any direct Web Push events)
// ─────────────────────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "Servana", body: event.data.text() }; }

  const options = {
    body:    data.body    || "You have a new notification",
    icon:    data.icon    || "./assets/images/icon-192.png",
    badge:   data.badge   || "./assets/images/icon-72.png",
    image:   data.image,
    tag:     data.tag     || "servana-notif",
    data:    data.data    || { url: "./dashboard.html" },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Servana", options)
  );
});

// Notification click → open the relevant page
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "./dashboard.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────────────────────
// BACKGROUND SYNC (for offline booking submissions)
// ─────────────────────────────────────────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "sync-bookings") {
    event.waitUntil(syncPendingBookings());
  }
});

async function syncPendingBookings() {
  // IndexedDB would be used here in a full implementation
  // to replay any bookings made while offline
  console.log("[SW] Background sync: checking pending bookings…");
}

console.log("[SW] Servana Service Worker loaded:", APP_VERSION);
