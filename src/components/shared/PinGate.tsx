import { useState, useEffect } from "preact/hooks";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { Btn } from "./Btn";

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
      setEntry(entry.slice(0, -1));
    } else if (entry.length < 4) {
      setEntry(entry + key);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
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
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: t.text,
            margin: "0 0 4px",
          }}
        >
          Enter PIN
        </h2>
        <p style={{ fontSize: 14, color: t.muted, margin: "0 0 24px" }}>
          Staff access only
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
                background:
                  i < entry.length
                    ? error
                      ? "#DC2626"
                      : isDark
                        ? "#60A5FA"
                        : "#2563EB"
                    : isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.08)",
                transition: "background 0.15s",
              }}
            />
          ))}
        </div>

        {/* Error message */}
        <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {error && (
            <span style={{ fontSize: 14, color: "#DC2626", fontWeight: 500 }}>
              Incorrect PIN
            </span>
          )}
        </div>

        {/* Keypad */}
        <div
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
          Cancel
        </button>
      </div>
    </div>
  );
}
