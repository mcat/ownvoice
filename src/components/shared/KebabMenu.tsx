import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens } from "../../theme/tokens";

export interface KebabMenuItem {
  label: string;
  onSelect: () => void;
  /** "destructive" tints the label red. Defaults to neutral. */
  tone?: "neutral" | "destructive";
  /** When disabled, the item shows but is non-interactive. */
  disabled?: boolean;
  /** Visible under the disabled item — explains why it's disabled. */
  disabledHint?: string;
}

interface Props {
  /** aria-label for the trigger button (e.g. "Patient actions for Maria"). */
  ariaLabel: string;
  items: KebabMenuItem[];
  t: ThemeTokens;
  isDark: boolean;
}

/**
 * Three-dot trailing menu. Single tap, no long-press or drag — meets the
 * project's no-complex-gestures rule. Closes on outside-click, Escape, or
 * after an item is selected.
 */
export function KebabMenu({ ariaLabel, items, t, isDark }: Props) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the first enabled item when the menu opens. Run the focus call
  // synchronously inside the effect — refs are populated by this point
  // because the effect fires after the DOM is committed.
  useEffect(() => {
    if (!open) return;
    const firstEnabled = items.findIndex((it) => !it.disabled);
    const idx = firstEnabled >= 0 ? firstEnabled : 0;
    setFocusIdx(idx);
    itemRefs.current[idx]?.focus();
  }, [open, items]);

  function move(delta: 1 | -1) {
    const n = items.length;
    if (n === 0) return;
    let next = focusIdx;
    for (let step = 0; step < n; step++) {
      next = (next + delta + n) % n;
      if (!items[next].disabled) break;
    }
    setFocusIdx(next);
    itemRefs.current[next]?.focus();
  }

  function handleItemKey(e: JSX.TargetedKeyboardEvent<HTMLButtonElement>, item: KebabMenuItem) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!item.disabled) {
        setOpen(false);
        item.onSelect();
      }
    } else if (e.key === "Tab") {
      // Tab out closes the menu, leaves default tab order intact.
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((s) => !s)}
        style={triggerStyle(isDark, t)}
      >
        {"⋯"}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          style={menuStyle(isDark, t)}
        >
          {items.map((item, i) => {
            const color =
              item.tone === "destructive"
                ? item.disabled
                  ? t.muted
                  : "#DC2626"
                : item.disabled
                  ? t.muted
                  : t.text;
            return (
              <div key={i} role="none">
                <button
                  ref={(el) => { itemRefs.current[i] = el; }}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                  tabIndex={focusIdx === i ? 0 : -1}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect();
                  }}
                  onKeyDown={(e) => handleItemKey(e, item)}
                  style={itemStyle(item.disabled, color, isDark)}
                >
                  {item.label}
                </button>
                {item.disabled && item.disabledHint && (
                  <div style={hintStyle(t)}>{item.disabledHint}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function triggerStyle(isDark: boolean, t: ThemeTokens): JSX.CSSProperties {
  return {
    minWidth: 64,
    minHeight: 64,
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: t.muted,
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
  };
}

function menuStyle(isDark: boolean, t: ThemeTokens): JSX.CSSProperties {
  return {
    position: "absolute",
    top: "100%",
    insetInlineEnd: 0,
    marginTop: 4,
    minWidth: 180,
    background: isDark ? "#2C2C2E" : "#FFFFFF",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    padding: 4,
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };
}

function itemStyle(
  disabled: boolean | undefined,
  color: string,
  isDark: boolean,
): JSX.CSSProperties {
  return {
    display: "block",
    width: "100%",
    minHeight: 44,
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    // Disabled state via explicit color, never opacity (§4.2).
    color: disabled ? (isDark ? "#8A8F98" : "#9AA1AB") : color,
    fontSize: 15,
    fontWeight: 500,
    fontFamily: "inherit",
    textAlign: "start" as const,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function hintStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    padding: "0 14px 8px",
    fontSize: 12,
    color: t.muted,
    lineHeight: 1.3,
  };
}
