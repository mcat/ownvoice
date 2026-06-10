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
//   /assets/denoiserWorker-<hash>.js
// Guarded by src/__tests__/swWorkerBypass.test.ts — add new bundled
// worker entries BOTH here and there.
const WORKER_SCRIPT_PATTERN =
  /^\/(?:(?:stt|tts)-gpu-worker\.js|assets\/(?:stt|tts|denoiser)Worker-[A-Za-z0-9_-]+\.js)$/;

/**
 * Headers required to make `crossOriginIsolated === true`, which is the
 * prerequisite for SharedArrayBuffer and therefore for multi-threaded
 * WASM in ORT. Static hosts (e.g. GitHub Pages) can't set these, so the
 * SW injects them on every cached response. COEP credentialless is the
 * lighter variant — doesn't require CORP on every same-origin subresource.
 */
const CROSS_ORIGIN_ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  // require-corp (not credentialless) because iPadOS 26 Safari only enables
  // crossOriginIsolated for require-corp documents. The page now serves
  // require-corp via `_headers`; the SW must echo the same value on cached
  // subresources so worker-script responses match the parent's COEP — under
  // require-corp, a worker whose response declares credentialless is refused
  // ("Refused to load … worker because of Cross-Origin-Embedder-Policy").
  "Cross-Origin-Embedder-Policy": "require-corp",
};

/**
 * Return a new Response with the given body/init but with COOP+COEP
 * appended to the headers. Preserves status, statusText, and any
 * existing headers the origin set.
 */
function withIsolationHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
  // Safari iPadOS 26 does NOT enable `crossOriginIsolated` for navigation
  // responses that pass through `event.respondWith(new Response(...))` —
  // even when the wrapped response carries COOP=same-origin + COEP=credentialless.
  // The browser treats SW-constructed Response objects as "SW-mediated" for
  // isolation purposes and refuses to isolate, breaking every COEP-gated
  // fetch (workers, blob URLs, /models/*) afterward. CF returns the correct
  // headers natively, so we hand the raw network Response to the browser
  // untouched — its identity is the network's, isolation is enabled, and
  // subresource fetches that come later all pass their access-control checks.
  //
  // Trade-off: when the network is unreachable, we fall back to the cached
  // /app/ HTML wrapped with isolation headers. Safari still won't isolate
  // that response, so offline mode is degraded — but the page does load.
  // Online (the overwhelming majority of sessions) gets proper isolation.
  if (request.mode === "navigate") {
    const fresh = await networkPromise;
    if (fresh) return fresh;
    return cached
      ? withIsolationHeaders(cached)
      : new Response("offline", { status: 503 });
  }
  const served =
    cached || (await networkPromise) || new Response("offline", { status: 503 });
  return withIsolationHeaders(served);
}

async function cacheFirstImmutable(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return withIsolationHeaders(cached);
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return withIsolationHeaders(response);
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
          return new Response(file, {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": String(file.size),
              "cache-control": "no-store",
              ...CROSS_ORIGIN_ISOLATION_HEADERS,
            },
          });
        }
        // Not primed yet — fall through to network. SW does NOT cache this,
        // but we still attach isolation headers so the model fetch doesn't
        // break crossOriginIsolated for sibling responses.
        return withIsolationHeaders(await fetch(event.request));
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
