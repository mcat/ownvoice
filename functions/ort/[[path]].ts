/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function: serves any `/ort/*` request from the R2 bucket
 * `ownvoice-static` at key `ort/<...>`. The function reads the object
 * via the `BUCKET` binding and streams the response with a long
 * immutable Cache-Control so Cloudflare's edge caches it across
 * requests.
 *
 * Asset paths are versioned (see `src/models/assetVersions.ts`), so
 * the URL never changes for the same bytes — `immutable` is safe.
 *
 * Content-Type is set explicitly per file extension. We do NOT call
 * R2's writeHttpMetadata() because the upload script defaults R2's
 * stored Content-Type to text/html, which combined with Cloudflare's
 * nosniff header blocks WASM/ONNX from instantiating in the browser.
 *
 * IMPORTANT: this exports `onRequest` (any method), NOT
 * `onRequestGet`. In our deploys, `onRequestGet` did not reliably
 * bind to the catch-all route (`[[path]]`) — requests fell through
 * to Pages' SPA fallback (returning index.html). Using `onRequest`
 * fixes the binding.
 *
 * Honors `Range: bytes=N-`/`bytes=N-M`/`bytes=-N`. See ../_lib/serveR2.ts.
 */

import { serveR2 } from "../_lib/serveR2";

interface Env {
  BUCKET: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async ({ params, env, request }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  return serveR2(env.BUCKET, `ort/${subpath}`, request);
};
