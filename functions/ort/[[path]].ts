/// <reference types="@cloudflare/workers-types" />

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

// Use onRequest (any method) so we can also see HEAD requests; was using
// onRequestGet which is GET-only.
export const onRequest: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("FN_REACHED_BUT_NO_PATH", {
      status: 404,
      headers: { "X-Ov-Function": "ort", "Content-Type": "text/plain" },
    });
  }
  const key = `ort/${subpath}`;
  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response(`FN_REACHED_NOT_FOUND key=${key}`, {
      status: 404,
      headers: { "X-Ov-Function": "ort", "Content-Type": "text/plain" },
    });
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "ETag": object.httpEtag,
      "X-Ov-Function": "ort",
    },
  });
};
