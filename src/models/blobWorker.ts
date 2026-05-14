/**
 * Spawn a Worker from an in-memory blob:URL instead of the original
 * HTTP URL. On Safari (desktop + iPadOS) post-manual-refresh, the
 * built-in `new Worker(httpUrl)` path triggers "Cannot load ... due to
 * access control checks" in WebKit's resource loader. The error fires
 * regardless of timing or prior user gesture (verified by 60s wait +
 * trusted System Events click — both failed to clear the state).
 *
 * `fetch()` to the same URLs succeeds during the same window (probed
 * 23/23 200 OK in PR #255 work). So the path is: main-thread fetch
 * → in-memory Blob → blob:URL → `new Worker(blob:)`. The worker's
 * own subresource fetches (ORT WASM, etc.) still go through the
 * normal network process and may or may not hit the same issue —
 * that's the next layer to address if this approach is partially
 * successful.
 *
 * For module workers: the script's `import` statements resolve
 * relative to the worker's source URL. Absolute paths (starting with
 * `/`) resolve from the page's origin and work fine. Relative imports
 * (`./foo`) WILL BREAK because the blob: URL has no path structure.
 * The bundled workers (Vite-emitted /assets/*Worker-*.js) and the
 * unbundled GPU workers (public/*-gpu-worker.js) both use absolute
 * import paths today, so this is safe — verified by grep.
 */
export async function spawnBlobWorker(
  url: string | URL,
  options?: WorkerOptions,
): Promise<Worker> {
  const urlStr = url instanceof URL ? url.href : url;
  const response = await fetch(urlStr, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `spawnBlobWorker: fetch ${urlStr} failed: ${response.status}`,
    );
  }
  const scriptText = await response.text();
  const blob = new Blob([scriptText], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  // Note: we don't revokeObjectURL — the worker holds a reference to it
  // for its lifetime, and revoking too early would break the worker.
  // GC will reclaim when the worker is terminated and the URL is
  // dereferenced.
  return new Worker(blobUrl, options);
}
