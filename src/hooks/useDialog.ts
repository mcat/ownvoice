import { useEffect, useRef } from "preact/hooks";

/**
 * Wires up the modal-dialog ARIA pattern for an overlay:
 *   - Escape closes the dialog.
 *   - Focus moves into the dialog on open, and returns to the previously
 *     focused element on close.
 *   - The rest of the app (everything outside `#root`'s dialog) is marked
 *     `inert` so AT and keyboard users can't wander behind the overlay.
 *
 * Usage:
 *   const { dialogRef, titleId } = useDialog({ onClose });
 *   return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
 *            <h2 id={titleId}>Title</h2>…</div>;
 */
export function useDialog(opts: {
  onClose: () => void;
  /** Stable id for the heading (caller provides via useId from preact). */
  titleId: string;
}) {
  const { onClose, titleId } = opts;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose in a ref so the mount effect below can stay
  // deps-free. Callers typically pass inline closures (e.g.
  // `onClose={handleClose}` from BottomSheet) whose identity churns every
  // render; re-running the effect on each render yanked focus back to the
  // dialog root on every keystroke in child inputs.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Remember the element that had focus before the dialog opened.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Mark everything outside the dialog as inert. We walk the document body's
    // direct children and skip any ancestor of the dialog. This is simpler
    // than managing aria-hidden and avoids focus leaks.
    const inertSiblings: HTMLElement[] = [];
    const bodyChildren = Array.from(document.body.children) as HTMLElement[];
    const dialogNode = dialogRef.current;
    for (const el of bodyChildren) {
      if (dialogNode && el.contains(dialogNode)) continue;
      if (el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      inertSiblings.push(el);
    }

    // Move focus to the dialog on open (or to its first focusable descendant).
    const focusTarget =
      dialogNode?.querySelector<HTMLElement>(
        "[autofocus], [data-autofocus]",
      ) ?? dialogNode;
    focusTarget?.focus?.({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      for (const el of inertSiblings) el.removeAttribute("inert");
      // Restore focus to the element that originally triggered the dialog.
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  return { dialogRef, titleId };
}
