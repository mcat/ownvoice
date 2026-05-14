/// <reference types="@cloudflare/workers-types" />

/**
 * Root middleware — currently a no-op pass-through. If this works
 * (the site serves normally), the earlier 404-everything failure was
 * specific to my mutation code. If it breaks, the issue is a more
 * fundamental incompatibility between `_middleware.ts` at the root
 * and our existing Pages setup.
 *
 * Replace with no-store override on worker scripts once verified.
 */
export const onRequest: PagesFunction = async (context) => {
  return context.next();
};
