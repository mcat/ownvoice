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
 * Range requests are not currently supported by the binding's `get()`
 * method; ORT loads the WASM as a single GET, so this is fine. If
 * future code uses Range, switch to `env.BUCKET.get(key, { range })`.
 *
 * Content-Type override: R2 stores whatever Content-Type was set at
 * upload time, and our upload script doesn't set one — so R2 defaults
 * to `text/html`. Combined with Cloudflare's default `nosniff` header,
 * browsers strictly refuse to interpret WASM bytes as HTML and fail
 * to instantiate. Override based on file extension before responding.
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
  // browser to treat as binary so streaming/range fetches don't try to
  // text-decode.
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
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", contentTypeForKey(key));
  headers.set("etag", object.httpEtag);
  // 1 year + immutable: paths are versioned, so the bytes never change
  // for a given URL.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // CORP cross-origin so a different scheme/origin in dev tools or
  // a hypothetical iframe can still load the asset.
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
