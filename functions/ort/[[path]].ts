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
 * Honors `Range: bytes=N-`/`bytes=N-M`/`bytes=-N` so `resumableDownload`
 * can resume after a partial fetch. R2 parses the Range header directly
 * when given the request `Headers`.
 */

interface Env {
  BUCKET: R2Bucket;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  wasm: "application/wasm",
  mjs: "application/javascript",
  js: "application/javascript",
  json: "application/json",
  jinja: "text/plain; charset=utf-8",
  // ONNX model files: not a registered MIME type. octet-stream forces the
  // browser to treat as binary so streaming/range fetches don't text-decode.
  onnx: "application/octet-stream",
  onnx_data: "application/octet-stream",
};

function contentTypeForKey(key: string): string {
  // Match the LAST dot-separated component to handle names like
  // "model_q4.onnx_data" (extension is "onnx_data", not "data").
  const m = key.match(/\.([^./]+)$/);
  const ext = m?.[1]?.toLowerCase();
  return (ext && CONTENT_TYPE_BY_EXT[ext]) || "application/octet-stream";
}

function rangeBounds(
  range: R2Range,
  size: number,
): { start: number; end: number; length: number } {
  if ("suffix" in range) {
    const length = Math.min(range.suffix, size);
    return { start: size - length, end: size - 1, length };
  }
  const start = range.offset ?? 0;
  const length = range.length ?? size - start;
  return { start, end: start + length - 1, length };
}

export const onRequest: PagesFunction<Env> = async ({ params, env, request }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `ort/${subpath}`;

  const rangeHeader = request.headers.get("range");
  const object = await env.BUCKET.get(
    key,
    rangeHeader ? { range: request.headers } : undefined,
  );
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": contentTypeForKey(key),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Accept-Ranges": "bytes",
    "ETag": object.httpEtag,
  };

  if (rangeHeader && object.range) {
    const { start, end, length } = rangeBounds(object.range, object.size);
    headers["Content-Range"] = `bytes ${start}-${end}/${object.size}`;
    headers["Content-Length"] = String(length);
    return new Response(object.body, { status: 206, headers });
  }

  return new Response(object.body, { headers });
};
