// OwnVoice Service Worker — TOMBSTONE
//
// The SW is intentionally disabled. iPadOS 26 Safari has a WebKit bug
// where the *presence* of a Service Worker as the page's controller
// under COEP `require-corp` flips the loader into a stricter access-
// control mode that refuses:
//   - `new Worker(url, {type:"module"})` for bundled WASM workers
//   - `fetch(url, {cache: "no-store"})` from resumableDownload
//   - blob: URLs synthesized internally for OPFS File.text() / .slice()
//
// The bug is independent of what the SW does — discriminator B (drop
// the fetch handler entirely, keep SW as controller) reproduced the
// failure identically on the second refresh of the preview deploy.
// Discriminator C (unregister SW completely) was the only state where
// boot was clean. Bug summary: controller-presence is the trigger,
// not interception.
//
// What this file does on existing iPad installs:
//   1. Browser fetches this new sw.js as the registered SW update.
//   2. install handler calls skipWaiting() so v21 activates immediately.
//   3. activate handler claims existing tabs, then unregisters the SW,
//      then navigates each open tab to its own URL — forcing a reload
//      with no controller registered.
//   4. After that reload, the page picks up no SW (the <script> block
//      that registered it has been removed from app/index.html).
//
// New visitors (no prior SW): app/index.html no longer registers a SW.
// No SW is ever installed.
//
// What we lose: SW-based offline shell caching. CF's HTTP caching
// (max-age=14400, must-revalidate) covers ~4 hours of offline shell
// load. OPFS-cached model bytes are unaffected — modelManager reads
// them directly via the File API, not via fetch through the SW.
//
// What we'd need to do to re-enable a SW someday: ensure the SW does
// not become controller until WebKit fixes the require-corp + controller
// bug. Practically: register the SW only when `crossOriginIsolated`
// is NOT relied on (impossible for this app — we need SAB), OR wait
// for Apple to ship the fix. File the issue at bugs.webkit.org.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clear out everything the old SWs cached. After unregister these
      // would just be orphaned storage.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Best-effort cleanup; proceed regardless.
      }

      // Claim existing tabs so we can navigate them. Without this,
      // `clients.matchAll()` returns no clients (they're still
      // controlled by the previous SW version).
      try {
        await self.clients.claim();
      } catch {
        // Best-effort; proceed regardless.
      }

      // Unregister so the next navigation has no SW to attach to.
      try {
        await self.registration.unregister();
      } catch {
        // Best-effort; the page's reload below still helps.
      }

      // Force every controlled tab to reload so the controller binding
      // drops. After this, the page reloads cleanly with no SW.
      try {
        const windows = await self.clients.matchAll({ type: "window" });
        for (const client of windows) {
          try {
            await client.navigate(client.url);
          } catch {
            // Some embeddings refuse navigate; the user can refresh manually.
          }
        }
      } catch {
        // Best-effort; the user can refresh manually if this fails.
      }
    })(),
  );
});

// No fetch handler. No sync handler. This SW does nothing while alive —
// its only job is to die.
