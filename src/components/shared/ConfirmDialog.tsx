import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

export interface ConfirmDialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "destructive" | "default";
}

type Pending = ConfirmDialogOptions & { resolve: (v: boolean) => void };

let pushDialog: ((p: Pending) => void) | null = null;

/** Show a confirmation dialog and return a promise resolving to the user's
 *  choice (true = confirm, false = cancel/escape). Requires
 *  <ConfirmDialogHost /> to be mounted somewhere in the tree. */
export function confirm(opts: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushDialog) {
      console.warn("[ConfirmDialog] host not mounted, resolving false");
      resolve(false);
      return;
    }
    pushDialog({ ...opts, resolve });
  });
}

/** Mount this once near the app root so confirm() works globally. */
export function ConfirmDialogHost() {
  const [queue, setQueue] = useState<Pending[]>([]);
  useEffect(() => {
    pushDialog = (p) => setQueue((q) => [...q, p]);
    return () => { pushDialog = null; };
  }, []);
  if (queue.length === 0) return null;
  const current = queue[0];
  return createPortal(
    <Dialog
      opts={current}
      onClose={(value) => {
        current.resolve(value);
        setQueue((q) => q.slice(1));
      }}
    />,
    document.body,
  );
}

function Dialog({
  opts, onClose,
}: { opts: ConfirmDialogOptions; onClose: (v: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Tab") {
        const focusables = [cancelRef.current, confirmRef.current].filter(
          (x): x is HTMLButtonElement => !!x,
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ov-confirm-title" style={overlay}>
      <div style={dialog}>
        <h2 id="ov-confirm-title" style={title}>{opts.title}</h2>
        <p style={body}>{opts.body}</p>
        <div style={buttonRow}>
          <button ref={cancelRef} onClick={() => onClose(false)} style={cancelButton}>
            {opts.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onClose(true)}
            style={opts.tone === "destructive" ? destructiveButton : confirmButton}
          >
            {opts.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: JSX.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999,
};
const dialog: JSX.CSSProperties = {
  background: "#FFFFFF", borderRadius: 14, padding: 24,
  width: "min(480px, 90vw)",
  fontFamily: "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
};
const title: JSX.CSSProperties = { fontSize: 20, fontWeight: 700, margin: 0, color: "#1A1A1A" };
const body: JSX.CSSProperties = { fontSize: 16, color: "#374151", margin: "12px 0 24px" };
const buttonRow: JSX.CSSProperties = { display: "flex", gap: 12, justifyContent: "flex-end" };
const cancelButton: JSX.CSSProperties = {
  background: "#FFFFFF", color: "#1A1A1A", border: "1px solid #D1D5DB",
  borderRadius: 10, padding: "12px 20px", fontSize: 16, minHeight: 48,
  fontFamily: "inherit", cursor: "pointer",
};
const confirmButton: JSX.CSSProperties = {
  background: "#2563EB", color: "#FFFFFF", border: "none",
  borderRadius: 10, padding: "12px 20px", fontSize: 16, fontWeight: 600, minHeight: 48,
  fontFamily: "inherit", cursor: "pointer",
};
const destructiveButton: JSX.CSSProperties = { ...confirmButton, background: "#DC2626" };
