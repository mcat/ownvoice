import { useEffect, useState } from "preact/hooks";

/**
 * Reactive read of `matchMedia("(pointer: fine)")`.
 *
 * Returns true when the system reports a precise pointing device as its
 * primary pointer (mouse, trackpad, trackball, pen, or AssistiveTouch
 * driving the pointer layer). On a plain iPad with finger-touch only,
 * this is false. It's the strongest platform signal that an external
 * pointing device is in play.
 *
 * Use only as a *hint* to suggest toggling Assistive Input Mode — the
 * clinician-set setting remains canonical. Never auto-enable on the
 * strength of this query.
 */
export function usePointerFine(): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(pointer: fine)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: fine)");
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    // Sync once on mount in case the query's current value changed before
    // the listener attached (e.g., user paired a mouse between initial
    // render and this effect running).
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return matches;
}
