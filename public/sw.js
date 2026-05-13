// OwnVoice Service Worker — v20 (experiment B: no fetch interception)
//
// PR #248 ("stop wrapping responses") didn't fix the iPad bug, falsifying
// the hypothesis that `withIsolationHeaders(new Response(...))` was the
// trigger. The remaining hypothesis: just *being the controller* under
// iPadOS 26 Safari flips WebKit's loader into a stricter mode that
// refuses certain subresources under require-corp during boot — even
// when the SW doesn't intervene in any request.
//
// This version tests that hypothesis cheaply. The SW still installs,
// activates, and claims clients (so existing iPad registrations
// activate it), but it does NOT register a fetch handler. Every request
// goes direct to network from the browser's point of view. If iPad boot
// is still broken with this SW as controller, the bug is "SW present at
// all," not "SW intercepts," and the next step is to tombstone the SW.
//
// What we lose for now:
//   - SW Cache API offline shell (browser HTTP cache still provides
//     ~4 hours of offline shell via CF's `max-age=14400, must-revalidate`)
//   - SW-mediated OPFS proxy for /models/* (currently unused: GPU workers
//     fetch via SW today, but modelManager already reads OPFS directly
//     via the File API for the "loaded from OPFS cache" path. Need to
//     verify GPU worker fetches still hit OPFS — they may not without
//     the proxy. Documented as a known regression for this experiment.)
//
// Bump CACHE_NAME to invalidate the previous SW caches on activate.
const CACHE_NAME = "ownvoice-v20";

self.addEventListener("install", (event) => {
  // skipWaiting so this version activates immediately on the iPad,
  // replacing v18/v19 without waiting for tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// No fetch handler registered. Browser handles every request natively —
// CF Pages serves COOP/COEP/CORP from `_headers` on the paths that need
// them. Identical to "no SW registered" from the request-path POV, but
// the SW is still the controller. Discriminator that separates
// "controller-presence" from "respondWith-interception" as the cause.

// BackgroundSync handler stays so registerResumeSync() doesn't error
// out when offlineResume.ts registers it. Notifies open clients on
// connectivity restore so they can rerun opportunistic resume.
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
