/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function: serves any `/models/*` request from the R2 bucket
 * `ownvoice-static` at key `models/<...>`. Same caching strategy as
 * `/ort/*`. See ../ort/[[path]].ts for the rationale.
 */

interface Env {
  BUCKET: R2Bucket;
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
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
