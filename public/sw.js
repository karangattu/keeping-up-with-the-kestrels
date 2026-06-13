const CACHE_NAME = "kestrels-game-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.png",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Helper to handle Range requests for cached audio/video
async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return cachedResponse;

  try {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    const bytes = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(bytes[0], 10);
    const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;

    if (start >= arrayBuffer.byteLength || end >= arrayBuffer.byteLength) {
      return new Response("", {
        status: 416,
        statusText: "Range Not Satisfiable",
        headers: new Headers({
          "Content-Range": `bytes */${arrayBuffer.byteLength}`,
        }),
      });
    }

    const slicedBuffer = arrayBuffer.slice(start, end + 1);
    const responseHeaders = new Headers({
      "Content-Type": cachedResponse.headers.get("Content-Type") || "video/mp4",
      "Content-Range": `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
      "Content-Length": slicedBuffer.byteLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    });

    return new Response(slicedBuffer, {
      status: 206,
      statusText: "Partial Content",
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(error.toString(), { status: 500 });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and Supabase API calls
  if (event.request.method !== "GET" || url.host.includes("supabase.co")) {
    return;
  }

  // Check if it's a static asset (assets/ folder, images, audio, video)
  const isStaticAsset =
    url.pathname.includes("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg");

  if (isStaticAsset) {
    // Cache-First strategy
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return handleRangeRequest(event.request, cachedResponse);
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 || networkResponse.status === 206) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // fallback
          return new Response("Offline resource not cached", { status: 503 });
        });
      })
    );
  } else {
    // Network-First strategy for HTML, Manifest, API, etc.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match("./index.html") || caches.match("./");
          });
        })
    );
  }
});
