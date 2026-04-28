/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function: serves any `/ort/*` request from the R2 bucket
 * `ownvoice-static` at key `ort/<...>`. The function reads the object
 * via the `ASSETS` binding and streams the response with a long
 * immutable Cache-Control so Cloudflare's edge caches it across
 * requests.
 *
 * Asset paths are versioned (see `src/models/assetVersions.ts`), so
 * the URL never changes for the same bytes — `immutable` is safe.
 *
 * Range requests are not currently supported by the binding's `get()`
 * method; ORT loads the WASM as a single GET, so this is fine. If
 * future code uses Range, switch to `env.ASSETS.get(key, { range })`.
 */

interface Env {
  ASSETS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `ort/${subpath}`;
  const object = await env.ASSETS.get(key);
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // 1 year + immutable: paths are versioned, so the bytes never change
  // for a given URL.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // CORP cross-origin so a different scheme/origin in dev tools or
  // a hypothetical iframe can still load the asset.
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
