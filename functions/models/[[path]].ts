/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function: serves any `/models/*` request from the R2 bucket
 * `ownvoice-static` at key `models/<...>`. Same caching strategy as
 * `/ort/*`. See ../ort/[[path]].ts for the rationale, including why
 * we override Content-Type per extension.
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
  onnx: "application/octet-stream",
  onnx_data: "application/octet-stream",
};

function contentTypeForKey(key: string): string {
  const m = key.match(/\.([^./]+)$/);
  const ext = m?.[1]?.toLowerCase();
  return (ext && CONTENT_TYPE_BY_EXT[ext]) || "application/octet-stream";
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `models/${subpath}`;
  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", contentTypeForKey(key));
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
