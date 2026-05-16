/**
 * Shared test helper for driving `document.visibilityState` + dispatching
 * the corresponding `visibilitychange` event. jsdom keeps the property
 * read-only by default; this redefines it via `Object.defineProperty`
 * with `configurable: true` so repeated calls in the same test can
 * toggle state freely. See PR #311 / #312.
 */
export function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}
