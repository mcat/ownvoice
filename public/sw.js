// OwnVoice Service Worker
//
// Strategy map (SW is scoped to /app/; only fetches initiated by pages
// under /app/ pass through this worker):
//   /models/*       → OPFS proxy (authoritative after primer runs); falls
//                      through to network if missing (pre-primer boot)
//   /app/, /app/index.html, /src/*, /models-manifest.json
//                   → stale-while-revalidate (ship bugfixes without
//                      re-downloading model bytes)
//   everything else (ORT WASM, fonts, manifest.json, static images)
//                   → cache-first-immutable
//
// Cache name bumps on every shipped SW change. Old caches are cleaned on activate.

const CACHE_NAME = "ownvoice-v19";
const SHELL_ASSETS = ["/app/", "/app/index.html"];

// Vite-bundled WASM-fallback workers + the unbundled GPU workers. Both
// classes of worker need to bypass SW interception on iPad Safari (see
// fetch-handler note). Pattern matches:
//   /tts-gpu-worker.js
//   /stt-gpu-worker.js
//   /assets/sttWorker-<hash>.js
//   /assets/ttsWorker-<hash>.js
const WORKER_SCRIPT_PATTERN =
  /^\/(?:(?:stt|tts)-gpu-worker\.js|assets\/(?:stt|tts)Worker-[A-Za-z0-9_-]+\.js)$/;

// Historical note: this SW used to wrap every cached response with
// COOP+COEP via `new Response(body, …)` to make `crossOriginIsolated`
// work on hosts that don't set the headers themselves (e.g. GitHub
// Pages). On iPadOS 26 Safari, that re-wrapping is exactly what breaks
// boot — WebKit treats SW-constructed Response objects as low-trust
// for COEP-gated loads, so `new Worker()`, `fetch({cache:"no-store"})`,
// and OPFS-Blob reads from inside the bundle module fail with the
// generic "due to access control checks" error during initial page
// load. Discriminator-C (unregister SW, reload) made the errors vanish;
// the second reload with the SW back as controller made them return.
// CF Pages now serves COOP+COEP+CORP natively on every relevant path,
// so we no longer need the SW to inject them.

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
  if (url.pathname === "/app/" || url.pathname === "/app/index.html") return true;
  // Dev-mode module fetches: Vite serves /src/* unmolested; the SW (only
  // active for pages under /app/) still sees these requests because controlled
  // pages route all fetches through their controller, regardless of target.
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
  if (request.mode === "navigate") {
    const fresh = await networkPromise;
    return fresh ?? cached ?? new Response("offline", { status: 503 });
  }
  return cached ?? (await networkPromise) ?? new Response("offline", { status: 503 });
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

  // Bypass worker script fetches. WebKit (iPad Safari iPadOS 26) does not
  // honor SW-set COEP/CORP on responses delivered via
  // `event.respondWith(new Response(...))` for `new Worker()` script loads —
  // workers fail to instantiate with the generic "due to access control checks"
  // error even when the wrapper has set every required header. Same WebKit
  // mediation quirk as navigations (handled in staleWhileRevalidate). CF
  // returns the correct headers natively, so we step out of the fetch path
  // and let the browser handle the worker script request directly.
  //
  // The destination check catches `/tts-gpu-worker.js` and `/stt-gpu-worker.js`
  // (constructed with `new Worker("/...js", {type:"module"})`, destination
  // "worker"). The URL-pattern check catches the Vite-bundled workers at
  // `/assets/{stt,tts}Worker-*.js` (constructed with
  // `new Worker(new URL("./sttWorker.ts", import.meta.url), {type:"module"})`),
  // which WebKit appears to classify with destination "script" rather than
  // "worker" — diverging from the spec. The URL pattern is stable across
  // builds because Vite hashes the filename but the prefix/suffix don't move.
  if (event.request.destination === "worker") return;
  if (WORKER_SCRIPT_PATTERN.test(url.pathname)) return;

  if (url.pathname.startsWith("/models/")) {
    event.respondWith(
      (async () => {
        const file = await opfsLookup(url.pathname);
        if (file) {
          // OPFS-served response must be synthesized from a File handle;
          // there's no network response to pass through. CORP cross-origin
          // matches the `_headers` rule for `/models/*` and is the only
          // policy header subresources need under a require-corp document
          // (COOP/COEP apply to the document, not subresources).
          return new Response(file, {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": String(file.size),
              "cache-control": "no-store",
              "Cross-Origin-Resource-Policy": "cross-origin",
            },
          });
        }
        // Not primed yet — fall through to network. CF returns CORP
        // cross-origin natively for `/models/*` via the Pages Function.
        return await fetch(event.request);
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

// BackgroundSync: when the browser fires a sync event (connectivity restored),
// notify any open clients so they can re-run the opportunistic resume logic.
// On platforms without BackgroundSync (Safari today) this listener is never
// invoked — the visibilitychange fallback in offlineResume.ts handles those.
self.addEventListener("sync", (event) => {
  if (event.tag !== "resume-model-dl") return;

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((cs) => {
      console.log(
        `[OwnVoice SW] sync:resume-model-dl fired, notifying ${cs.length} client(s)`,
      );
      cs.forEach((c) => c.postMessage({ type: "resume-partials" }));
    }),
  );
});
