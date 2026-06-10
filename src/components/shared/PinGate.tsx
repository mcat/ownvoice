import { useState, useEffect, useId } from "preact/hooks";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { Btn } from "./Btn";
import { useDialog } from "../../hooks/useDialog";

interface PinGateProps {
  pin: string;
  onSuccess: () => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

export function PinGate({ pin, onSuccess, onClose, t, theme }: PinGateProps) {
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);
  const isDark = theme === "dark";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

  useEffect(() => {
    if (entry.length === 4) {
      if (entry === pin) {
        onSuccess();
      } else {
        setError(true);
        const timer = setTimeout(() => {
          setEntry("");
          setError(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [entry, pin, onSuccess]);

  function press(key: string) {
    if (error) return;
    if (key === "del") {
      setEntry((prev) => prev.slice(0, -1));
    } else if (/^[0-9]$/.test(key)) {
      setEntry((prev) => (prev.length < 4 ? prev + key : prev));
    }
  }

  // Physical keyboard support: digits append, Backspace deletes, Escape closes.
  // Escape is handled in useDialog already; here we just cover input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (error) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        press("del");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [error]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: z.pin,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: t.card,
          borderRadius: 24,
          padding: "32px 28px 24px",
          width: 320,
          maxWidth: "90vw",
          textAlign: "center",
          fontFamily:
            "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title */}
        <h2
          id={titleId}
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: t.text,
            margin: "0 0 4px",
          }}
        >
          {resolvePhrase("ui.provider.pin_gate.title", caregiverLang)}
        </h2>
        <p style={{ fontSize: 14, color: t.muted, margin: "0 0 24px" }}>
          {resolvePhrase("ui.provider.pin_gate.subtitle", caregiverLang)}
        </p>

        {/* Dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 14,
            marginBottom: 8,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                // Empty state: solid tokens (never opacity-blended, §4.2)
                // holding 3:1 non-text contrast against the card —
                // #8A8F98 is 5.2:1 on #1C1C1E, #767C87 is 4.2:1 on #FFFFFF.
                background:
                  i < entry.length
                    ? error
                      ? "#DC2626"
                      : isDark
                        ? "#60A5FA"
                        : "#2563EB"
                    : isDark
                      ? "#8A8F98"
                      : "#767C87",
                transition: "background 0.15s",
              }}
            />
          ))}
        </div>

        {/* Error message — aria-live=assertive so screen readers announce a
            failed PIN immediately (it auto-resets after 800ms). */}
        <div
          role="alert"
          aria-live="assertive"
          style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {error && (
            <span style={{ fontSize: 14, color: "#DC2626", fontWeight: 500 }}>
              {resolvePhrase("ui.provider.pin_gate.incorrect", caregiverLang)}
            </span>
          )}
        </div>

        {/* Keypad */}
        <div
          role="group"
          aria-label={resolvePhrase("ui.provider.pin_gate.keypad_aria", caregiverLang)}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 4,
          }}
        >
          {KEYS.flat().map((key, i) => {
            if (key === "") {
              return <div key={i} />;
            }
            const isDel = key === "del";
            return (
              <Btn
                key={i}
                onClick={() => press(key)}
                disabled={error}
                aria-label={isDel ? resolvePhrase("ui.provider.pin_gate.delete_aria", caregiverLang) : resolvePhrase("ui.provider.pin_gate.digit_aria", caregiverLang).replace("{n}", key)}
                style={{
                  width: "100%",
                  height: 64,
                  borderRadius: 14,
                  border: "none",
                  background: isDel
                    ? "transparent"
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.04)",
                  color: isDel ? t.muted : t.text,
                  fontSize: isDel ? 18 : 26,
                  fontWeight: isDel ? 500 : 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDel ? "\u232B" : key}
              </Btn>
            );
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            background: "none",
            border: "none",
            color: t.muted,
            fontSize: 16,
            cursor: "pointer",
            padding: "8px 16px",
            fontFamily: "inherit",
          }}
        >
          {resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang)}
        </button>
      </div>
    </div>
  );
}
