import { useEffect, useState } from "preact/hooks";

/**
 * Returns the on-screen-keyboard's height in CSS pixels, derived from the
 * Visual Viewport API. Zero when no keyboard is visible.
 *
 * The layout viewport on iPadOS does not shrink when the keyboard slides
 * in; the visual viewport does. The delta between the two is what bottom-
 * anchored input fields need to lift by so the keyboard doesn't cover the
 * focused control.
 *
 * Implementation notes:
 *  - Subscribes to `resize` on `window.visualViewport`. Falls back to a
 *    constant 0 in environments without VisualViewport support.
 *  - Uses raf-coalesced updates: iPadOS fires resize at every frame of
 *    the keyboard's slide animation, and re-rendering the bound input on
 *    every one of those is wasteful. The rAF gate batches into one update
 *    per frame.
 *  - Only treats positive deltas above 60 px as a keyboard. The visual
 *    viewport also shrinks for tab-bar reveals and a few iOS quirks; the
 *    threshold avoids treating those as a "keyboard".
 */
export function useKeyboardInsets(): { keyboardHeight: number } {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    let rafHandle: number | null = null;

    const measure = (): void => {
      rafHandle = null;
      const layoutH = window.innerHeight;
      const visualH = vv.height;
      const delta = layoutH - visualH;
      // 60 px is the smallest plausible keyboard; below that it's UI
      // chrome. Negative deltas can occur during pinch-zoom on Safari
      // proper but should never happen inside the standalone PWA.
      const next = delta > 60 ? Math.round(delta) : 0;
      setKeyboardHeight((prev) => (prev === next ? prev : next));
    };

    const onResize = (): void => {
      if (rafHandle != null) return;
      rafHandle = requestAnimationFrame(measure);
    };

    measure();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);

    return () => {
      if (rafHandle != null) cancelAnimationFrame(rafHandle);
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return { keyboardHeight };
}
