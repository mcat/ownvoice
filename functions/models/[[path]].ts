/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function: serves any `/models/*` request from the R2 bucket
 * `ownvoice-static` at key `models/<...>`. Same shape as `/ort/*` —
 * see ../ort/[[path]].ts for the rationale, including why we override
 * Content-Type per extension and why this exports `onRequest`.
 *
 * Honors `Range: bytes=N-`/`bytes=N-M`/`bytes=-N` so `resumableDownload`
 * can resume after a partial fetch instead of restarting from byte 0.
 * See ../_lib/serveR2.ts for the parsing/satisfiability logic.
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
  return serveR2(env.BUCKET, `models/${subpath}`, request);
};
