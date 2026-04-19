import { createContext } from "preact";
import { useContext, useId } from "preact/hooks";
import type { ComponentChildren, JSX, RefObject } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { z as zScale } from "../../theme/z";
import { useDialog } from "../../hooks/useDialog";

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
  heightVh = "auto",
  zIndex = zScale.sheet,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

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
  };

  const card: JSX.CSSProperties = {
    position: "relative",
    background: t.card,
    borderRadius: "20px 20px 0 0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: heightVh === "auto" ? undefined : `${heightVh}vh`,
    maxHeight: heightVh === "auto" ? "92vh" : undefined,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
  };

  return (
    <div style={overlay}>
      {/* Backdrop — passive close surface. Escape and CloseButton are the
          keyboard/AT paths; no role or tabindex here. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-testid="bottom-sheet-backdrop"
        onClick={onClose}
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
        <ctx.Provider value={{ titleId, close: onClose, t }}>
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

BottomSheet.Header = Header;
BottomSheet.Title = Title;
BottomSheet.CloseButton = CloseButton;
