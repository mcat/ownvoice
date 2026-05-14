/// <reference types="@cloudflare/workers-types" />

/**
 * Root middleware — runs for every Pages request. Currently has one
 * job: override `Cache-Control` to `no-store` on worker-script
 * responses to test the [WebKit #245346](https://bugs.webkit.org/show_bug.cgi?id=245346)
 * workaround [documented by predr.ag](https://predr.ag/blog/debugging-safari-if-at-first-you-succeed/).
 *
 * Why a middleware rather than `_headers`: per PR #131 / issue #127,
 * Cloudflare Pages unconditionally substitutes its default
 * (`public, max-age=14400, must-revalidate`) for static-asset
 * Cache-Control at serve time, ignoring `_headers`. Pages Functions
 * generate fresh responses and can set arbitrary headers, so this is
 * the only way to actually override Cache-Control for `/assets/*`.
 *
 * Pattern matches the four worker scripts that can fail with
 * "access control checks" on Safari reload:
 *   - `/assets/(stt|tts)Worker-<hash>.js` (Vite-bundled WASM workers)
 *   - `/(tts|stt)-gpu-worker.js` (unbundled WebGPU workers in /public/)
 *
 * Discardable if the test falsifies the workaround.
 */

const WORKER_SCRIPT_PATTERN =
  /^\/(?:(?:stt|tts)-gpu-worker\.js|assets\/(?:stt|tts)Worker-[A-Za-z0-9_-]+\.js)$/;

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const url = new URL(context.request.url);
  if (!WORKER_SCRIPT_PATTERN.test(url.pathname)) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
