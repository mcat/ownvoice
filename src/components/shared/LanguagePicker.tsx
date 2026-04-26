import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { LANGS } from "../../data/phrases";
import { canCloneForLocale } from "../../data/chatterboxLocales";
import { BottomSheet } from "./BottomSheet";

interface Props {
  /** Current locale code (e.g. "en"). */
  value: string;
  /**
   * Called when the user picks a language. The picker closes itself before
   * calling this — the caller decides whether to confirm and persist.
   * Tapping the already-selected language is a no-op (onChange is not fired).
   */
  onChange: (locale: string) => void;
  /** Visible label above the field; also used as the sheet's radiogroup aria-label. */
  fieldLabel: string;
  /** Optional helper paragraph below the label. */
  helper?: string;
  /** Sheet title. */
  pickerTitle: string;
  /** Trailing affordance + part of the button's accessible name (e.g. "Change language"). */
  changeLabel: string;
  t: ThemeTokens;
  isDark: boolean;
}

export function LanguagePicker({
  value,
  onChange,
  fieldLabel,
  helper,
  pickerTitle,
  changeLabel,
  t,
  isDark,
}: Props) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === value) ?? LANGS[0];

  function handlePick(code: string) {
    setOpen(false);
    if (code !== value) onChange(code);
  }

  return (
    <>
      <div style={labelStyle(t)}>{fieldLabel}</div>
      {helper && (
        <p style={{ fontSize: 13, color: t.muted, margin: "0 0 8px" }}>
          {helper}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${fieldLabel}: ${current.englishLabel}. ${changeLabel}`}
        style={fieldButtonStyle(isDark, t)}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>{current.flag}</span>
        <span style={fieldTextStyle}>
          <span style={{ fontWeight: 600, fontSize: 16, color: t.text }}>
            {current.englishLabel}
          </span>
          {current.englishLabel !== current.label && (
            <span style={{ fontSize: 13, color: t.muted }}>{current.label}</span>
          )}
        </span>
        <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>
          {changeLabel}
        </span>
        <span aria-hidden style={{ fontSize: 18, color: t.muted, lineHeight: 1 }}>
          {"›"}
        </span>
      </button>

      {open && (
        <BottomSheet onClose={() => setOpen(false)} t={t} heightVh="auto">
          <BottomSheet.Header>
            <BottomSheet.Title>{pickerTitle}</BottomSheet.Title>
            <BottomSheet.CloseButton />
          </BottomSheet.Header>
          <BottomSheet.Body>
            <div
              role="radiogroup"
              aria-label={fieldLabel}
              style={chipGridStyle}
            >
              {LANGS.map((l) => {
                const selected = l.code === value;
                // Languages outside Chatterbox Multilingual fall through
                // to the system Web Speech voice on tap; the cloned voice
                // is unused. Show users this up-front so picking, e.g.,
                // Vietnamese doesn't appear silently identical to picking
                // Spanish (which gets full cloned audio).
                const cloneable = canCloneForLocale(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handlePick(l.code)}
                    style={chipStyle(selected, isDark)}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{l.flag}</span>
                    <span style={chipTextStyle}>
                      <span style={{ fontWeight: selected ? 600 : 500, fontSize: 14 }}>
                        {l.englishLabel}
                      </span>
                      {l.englishLabel !== l.label && (
                        <span style={{ fontSize: 11, color: t.muted }}>
                          {l.label}
                        </span>
                      )}
                      {!cloneable && (
                        <span
                          style={{
                            fontSize: 10,
                            color: t.muted,
                            fontWeight: 500,
                            marginTop: 2,
                          }}
                        >
                          System voice only
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </BottomSheet.Body>
        </BottomSheet>
      )}
    </>
  );
}

function labelStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: t.sub,
    marginBottom: 6,
  };
}

function fieldButtonStyle(isDark: boolean, t: ThemeTokens): JSX.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
    cursor: "pointer",
    fontFamily: "inherit",
    color: t.text,
    minHeight: 64, // WCAG 2.5.5 AAA touch target
    textAlign: "start",
    boxSizing: "border-box",
  };
}

const fieldTextStyle: JSX.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

const chipGridStyle: JSX.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
};

const chipTextStyle: JSX.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

function chipStyle(selected: boolean, isDark: boolean): JSX.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "12px 14px",
    borderRadius: 12,
    border: selected
      ? `2px solid ${isDark ? "#60A5FA" : "#2563EB"}`
      : `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
    background: selected
      ? (isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF")
      : (isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF"),
    cursor: "pointer",
    fontSize: 16,
    color: isDark ? "#F3F4F6" : "#1A1A1A",
    fontFamily: "inherit",
    minHeight: 64,
  };
}
