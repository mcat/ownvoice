import { useState, useEffect, useRef } from "preact/hooks";

/**
 * Returns `text` but only forwards updates at most once every
 * `throttleMs` — except when `category` changes, in which case the
 * update is immediate.
 *
 * Used by status pills inside `aria-live="polite"` regions to avoid
 * screen-reader spam when a numeric countdown re-renders every few
 * hundred milliseconds. The category lets state transitions (e.g.
 * "saving" → "almost ready" → "ready") still announce immediately.
 */
export function useThrottledText(
  text: string,
  category: string,
  throttleMs = 5_000,
): string {
  const [announced, setAnnounced] = useState(text);
  const lastCategoryRef = useRef(category);
  const lastUpdateRef = useRef(Date.now());
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const categoryChanged = category !== lastCategoryRef.current;
    const elapsed = now - lastUpdateRef.current;

    if (categoryChanged || elapsed >= throttleMs) {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      setAnnounced(text);
      lastCategoryRef.current = category;
      lastUpdateRef.current = now;
      return;
    }

    // Schedule a delayed update so the latest text reaches the live
    // region after the throttle window — without this, the very last
    // value before the user stops looking can be stale.
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    const wait = throttleMs - elapsed;
    pendingTimerRef.current = setTimeout(() => {
      setAnnounced(text);
      lastUpdateRef.current = Date.now();
      pendingTimerRef.current = null;
    }, wait);

    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [text, category, throttleMs]);

  return announced;
}
