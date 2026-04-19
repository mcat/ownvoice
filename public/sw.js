// OwnVoice Service Worker
//
// Strategy map:
//   /models/*       → OPFS proxy (authoritative after primer runs); falls
//                      through to network if missing (pre-primer boot)
//   /, /index.html, /src/*, /models-manifest.json
//                   → stale-while-revalidate (ship bugfixes without
//                      re-downloading model bytes)
//   everything else (ORT WASM, fonts, manifest.json, static images)
//                   → cache-first-immutable
//
// Cache name bumps on every shipped SW change. Old caches are cleaned on activate.

const CACHE_NAME = "ownvoice-v3";
const SHELL_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Walk OPFS for a pathname like `/models/tts/a.onnx`. Returns the File or null. */
async function opfsLookup(pathname) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = pathname.split("/").filter(Boolean); // ["models","tts","a.onnx"]
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const handle = await dir.getFileHandle(parts[parts.length - 1]);
    return await handle.getFile();
  } catch {
    return null;
  }
}

function isShellAsset(url) {
  if (url.pathname === "/" || url.pathname === "/index.html") return true;
  if (url.pathname.startsWith("/src/")) return true;
  if (url.pathname === "/models-manifest.json") return true;
  return false;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("offline", { status: 503 });
}

async function cacheFirstImmutable(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass: resumableDownload sets cache: "no-store" so partial 2xx responses
  // can't poison the Cache API on spotty wifi. Let those hit the network directly.
  if (event.request.cache === "no-store") return;

  if (url.pathname.startsWith("/models/")) {
    event.respondWith(
      (async () => {
        const file = await opfsLookup(url.pathname);
        if (file) {
          return new Response(file, {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": String(file.size),
              "cache-control": "no-store",
            },
          });
        }
        // Not primed yet — fall through to network. SW does NOT cache this.
        return fetch(event.request);
      })(),
    );
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(cacheFirstImmutable(event.request));
});
