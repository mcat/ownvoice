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

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `ort/${subpath}`;
  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "ETag": object.httpEtag,
      // Probe header to confirm the Function is actually executing if we
      // see the wrong content-type again. Remove once we're confident.
      "X-Ov-Function": "ort",
    },
  });
};
