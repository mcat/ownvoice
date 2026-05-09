import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";

export interface WarningToastProps {
  /** Seconds the toast remains visible before auto-dismiss. Default 60. */
  secondsTotal?: number;
  onExtend: () => void;
  onEndNow: () => void;
  onAutoDismiss: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function WarningToast({
  secondsTotal = 60,
  onExtend,
  onEndNow,
  onAutoDismiss,
  t: tokens,
  theme,
}: WarningToastProps) {
  const [remaining, setRemaining] = useState(secondsTotal);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAutoDismissRef = useRef(onAutoDismiss);
  onAutoDismissRef.current = onAutoDismiss;

  const locale = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Countdown interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Fire onAutoDismiss when countdown reaches 0
  useEffect(() => {
    if (remaining === 0) {
      onAutoDismissRef.current();
    }
  }, [remaining]);

  const title = resolvePhrase("ui.provider.staff_session.warning_title", locale);
  const body = resolvePhrase("ui.provider.staff_session.warning_body", locale).replace(
    "{n}",
    String(remaining),
  );
  const extendLabel = resolvePhrase("ui.provider.staff_session.extend", locale);
  const endNowLabel = resolvePhrase("ui.provider.staff_session.end_now", locale);

  const isDark = theme === "dark";

  const containerStyle: JSX.CSSProperties = {
    position: "fixed",
    top: "max(16px, var(--ov-safe-top))",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: z.toast,
    background: isDark ? "#1C1C1E" : "#FFFFFF",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
    borderRadius: 14,
    padding: "20px 24px",
    width: "min(460px, 90vw)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.6)"
      : "0 8px 32px rgba(0,0,0,0.15)",
    fontFamily:
      "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
    animation: prefersReducedMotion ? "none" : "ov-toast-in 300ms ease-out",
  };

  const titleStyle: JSX.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: tokens.text,
  };

  const bodyStyle: JSX.CSSProperties = {
    fontSize: 16,
    color: tokens.sub,
    margin: "8px 0 20px",
  };

  const buttonRowStyle: JSX.CSSProperties = {
    display: "flex",
    gap: 12,
  };

  const extendButtonStyle: JSX.CSSProperties = {
    flex: 1,
    minHeight: 64,
    minWidth: 64,
    background: isDark ? "#3B82F6" : "#2563EB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: 18,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  const endNowButtonStyle: JSX.CSSProperties = {
    flex: 1,
    minHeight: 64,
    minWidth: 64,
    background: isDark ? "#2A2A2C" : "#F3F4F6",
    color: tokens.sub,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "#D1D5DB"}`,
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: 18,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-modal="false"
      aria-label={title}
      style={containerStyle}
    >
      <h2 style={titleStyle}>{title}</h2>
      <p style={bodyStyle}>{body}</p>
      <div style={buttonRowStyle}>
        <button style={extendButtonStyle} onClick={onExtend}>
          {extendLabel}
        </button>
        <button style={endNowButtonStyle} onClick={onEndNow}>
          {endNowLabel}
        </button>
      </div>
    </div>
  );
}
