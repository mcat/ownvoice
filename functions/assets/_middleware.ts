/// <reference types="@cloudflare/workers-types" />

/**
 * Middleware scoped to `/assets/*`. Overrides `Cache-Control` on the
 * Vite-bundled worker scripts (`(stt|tts)Worker-<hash>.js`) to
 * `no-store`, leaving all other /assets/* responses untouched.
 *
 * Tests the workaround documented by predr.ag for WebKit #245346:
 * `Cache-Control: no-store` on the worker script response sidesteps
 * Safari's broken cache-revalidation path. Even though our 2026
 * occurrence reproduces with COEP off — different from the original
 * 245346 trigger — the same workaround might happen to bypass the
 * race we hit.
 *
 * Why not `_headers`: Cloudflare Pages substitutes its default
 * Cache-Control for static-asset responses, ignoring whatever
 * `_headers` specifies (PR #131, issue #127). Pages Function
 * middleware can override.
 *
 * Why scoped to `/assets/` rather than root: a root `_middleware.ts`
 * empirically breaks static-asset fallthrough — every URL 404s,
 * including paths the middleware doesn't touch. `context.next()`
 * from root does NOT chain to the static-asset handler in our
 * setup (verified 2026-05-14). Scoping to `/assets/` restricts the
 * blast radius to the path we need to test, and the static-asset
 * handler in this subtree happens to work with `next()`.
 *
 * Discardable. Revert if the 10-refresh test on desktop Safari
 * shows worker-spawn errors persist.
 */

const WORKER_SCRIPT_PATTERN =
  /^\/assets\/(?:stt|tts)Worker-[A-Za-z0-9_-]+\.js$/;

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
