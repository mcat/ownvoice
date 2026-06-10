import { createContext } from "preact";
import { useContext, useEffect, useId, useState } from "preact/hooks";
import type { ComponentChildren, JSX, RefObject } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { z as zScale } from "../../theme/z";
import { useDialog } from "../../hooks/useDialog";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useSettingsStore } from "../../stores/settingsStore";

interface BottomSheetContext {
  titleId: string;
  close: () => void;
  t: ThemeTokens;
}

const ctx = createContext<BottomSheetContext | null>(null);

function useBottomSheet(): BottomSheetContext {
  const v = useContext(ctx);
  if (!v) {
    throw new Error(
      "BottomSheet subcomponents must be rendered inside <BottomSheet>",
    );
  }
  return v;
}

export interface BottomSheetProps {
  onClose: () => void;
  t: ThemeTokens;
  /** Height of the sheet, in vh. Pass "auto" for content-sized sheets. */
  heightVh?: number | "auto";
  /** Stacking layer. Defaults to z.sheet. Use z.sheetStacked for nested sheets. */
  zIndex?: number;
  /** Override focus target; defaults to the dialog root. */
  initialFocusRef?: RefObject<HTMLElement>;
  children: ComponentChildren;
}

export function BottomSheet({
  onClose,
  t,
  heightVh = 88,
  zIndex = zScale.sheet,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  // When Assistive Input Mode is on, backdrop-click dismissal is suppressed
  // so a dwell-click cursor drifting across the backdrop doesn't
  // accidentally close the sheet. Escape and CloseButton remain.
  const assistiveInput = useSettingsStore((s) => s.cfg?.assistiveInput === true);
  const [closing, setClosing] = useState(false);
  // Start at final state if reduced motion; otherwise animate in on mount.
  const [entered, setEntered] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Single close path: all routes call handleClose → sets `closing`, and
  // transitionEnd on the card fires the caller's onClose. Reduced motion
  // fires the caller's onClose synchronously.
  function handleClose() {
    if (reducedMotion) {
      onClose();
      return;
    }
    setClosing(true);
  }

  // useDialog gets OUR handler, not the caller's — Escape must animate out
  // before unmounting.
  const { dialogRef } = useDialog({ onClose: handleClose, titleId });

  // Attach transitionend via addEventListener. Preact's JSX `onTransitionEnd`
  // binding doesn't fire under @testing-library/preact's synthetic events in
  // jsdom, so wire the listener imperatively.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const listener = (e: Event) => {
      const te = e as TransitionEvent;
      if (closing && te.propertyName === "transform") {
        onClose();
      }
    };
    el.addEventListener("transitionend", listener);
    return () => el.removeEventListener("transitionend", listener);
  }, [closing, onClose, dialogRef]);

  const open = entered && !closing;

  const overlay: JSX.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const backdrop: JSX.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    opacity: reducedMotion ? 1 : open ? 1 : 0,
    transition: reducedMotion ? undefined : "opacity 180ms ease-out",
  };

  const card: JSX.CSSProperties = {
    position: "relative",
    background: t.card,
    borderRadius: "20px 20px 0 0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: heightVh === "auto" ? undefined : `${heightVh}dvh`,
    maxHeight: heightVh === "auto" ? "92dvh" : undefined,
    paddingBottom: "var(--ov-safe-bottom)",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
    transform: reducedMotion
      ? "translateY(0)"
      : open
        ? "translateY(0)"
        : "translateY(100%)",
    transition: reducedMotion ? undefined : "transform 220ms cubic-bezier(.22,.61,.36,1)",
    willChange: "transform",
  };

  return (
    <div style={overlay}>
      {/* Backdrop — passive close surface. Escape and CloseButton are the
          keyboard/AT paths; no role or tabindex here.
          In Assistive Input Mode the backdrop does not dismiss, because a
          dwell-click cursor drifting across it would otherwise close the
          sheet by accident. */}
      <div
        data-testid="bottom-sheet-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={assistiveInput ? undefined : handleClose}
        style={backdrop}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={card}
      >
        <ctx.Provider value={{ titleId, close: handleClose, t }}>
          {children}
        </ctx.Provider>
      </div>
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────── */

function Header({ children }: { children: ComponentChildren }) {
  const { t } = useBottomSheet();
  const style: JSX.CSSProperties = {
    flexShrink: 0,
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${t.border}`,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  };
  return <div style={style}>{children}</div>;
}

function Title({ children }: { children: ComponentChildren }) {
  const { titleId } = useBottomSheet();
  return (
    <h2
      id={titleId}
      style={{
        fontSize: 22,
        fontWeight: 700,
        margin: 0,
        flex: 1,
        minWidth: 0,
      }}
    >
      {children}
    </h2>
  );
}

function CloseButton({
  children,
  ...rest
}: JSX.HTMLAttributes<HTMLButtonElement>) {
  const { close } = useBottomSheet();
  return (
    <button
      type="button"
      onClick={close}
      {...rest}
      style={{
        background: "none",
        border: "none",
        fontSize: 28,
        padding: 8,
        minWidth: 64,
        minHeight: 64,
        cursor: "pointer",
        fontFamily: "inherit",
        ...(rest.style as JSX.CSSProperties | undefined),
      }}
    >
      {children ?? "\u2715"}
    </button>
  );
}

interface BackButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  /** Label of the parent screen \u2014 rendered next to the chevron, iPadOS style. */
  parentLabel: string;
  /** Click handler. Typical pattern: close this overlay and re-open the parent. */
  onClick: () => void;
}

/**
 * iPadOS-style back button: a chevron + the previous screen's title. Lives
 * on the leading edge of `BottomSheet.Header`. Use instead of `CloseButton`
 * on sub-panels where the user navigated in from a parent screen \u2014 pairing
 * with a separate `Done` action (kept as the trailing element) preserves
 * the "Done dismisses everything; Back returns one level" iPadOS contract.
 */
function BackButton({ parentLabel, onClick, ...rest }: BackButtonProps) {
  const { t } = useBottomSheet();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Back to ${parentLabel}`}
      {...rest}
      style={{
        background: "none",
        border: "none",
        fontSize: 17,
        padding: "8px 12px 8px 8px",
        minWidth: 64,
        minHeight: 64,
        cursor: "pointer",
        color: t.muted,
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontWeight: 500,
        ...(rest.style as JSX.CSSProperties | undefined),
      }}
    >
      {/* SVG chevron \u2014 sized to match the label's cap height so it
          sits on the same baseline. Stroke uses currentColor so it
          tracks the button's text color in light/dark themes. The
          Unicode `\u2039` glyph rendered at a larger fontSize put the
          visual top of the chevron above the label's cap height. */}
      <svg
        aria-hidden="true"
        width="9"
        height="15"
        viewBox="0 0 9 15"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M7.5 1.5L1.5 7.5L7.5 13.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{parentLabel}</span>
    </button>
  );
}

function Body({ children }: { children: ComponentChildren }) {
  const style: JSX.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "16px 20px",
    // Keep focus rings on edge children from being clipped by the scroll
    // boundary (WCAG 2.4.11 / 2.4.13).
    scrollPaddingBottom: 96,
  };
  return <div style={style}>{children}</div>;
}

function Actions({ children }: { children: ComponentChildren }) {
  const { t } = useBottomSheet();
  const style: JSX.CSSProperties = {
    flexShrink: 0,
    display: "flex",
    gap: 12,
    padding: "12px 20px",
    borderTop: `1px solid ${t.border}`,
  };
  return <div style={style}>{children}</div>;
}

BottomSheet.Header = Header;
BottomSheet.Title = Title;
BottomSheet.CloseButton = CloseButton;
BottomSheet.BackButton = BackButton;
BottomSheet.Body = Body;
BottomSheet.Actions = Actions;
