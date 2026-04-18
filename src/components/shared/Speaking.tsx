import { useState, useEffect } from "preact/hooks";
import type { ThemeTokens } from "../../theme/tokens";

interface SpeakingProps {
  text: string;
  isProvider: boolean;
  onDone: () => void;
  t: ThemeTokens;
}

/** Full-width overlay bar showing speech progress. Not a modal — no dead ends. */
export function Speaking({
  text,
  isProvider,
  onDone,
  t,
}: SpeakingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const dur = Math.max(1400, text.length * 55);
    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - start) / dur);
      setProgress(elapsed);
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 400);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, onDone]);

  const gc = isProvider ? "#059669,#047857" : "#2563EB,#1D4ED8";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Speaking: ${text}`}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: t.speakBg,
        color: "#F5F5F5",
        padding: "22px 28px 28px",
        zIndex: 100,
        borderTop: `3px solid ${isProvider ? "#059669" : "#2563EB"}`,
        animation: "slideUp 0.25s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `linear-gradient(135deg,${gc})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            animation: "pulseGlow 1.5s ease-in-out infinite",
            flexShrink: 0,
          }}
        >
          {"\uD83D\uDD0A"}
        </div>
        <div style={{ minWidth: 0 }}>
          {isProvider && (
            <div
              class="font-sans"
              style={{
                fontSize: 13,
                color: "rgba(245,245,245,0.7)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Care Team
            </div>
          )}
          <div
            class="font-sans"
            style={{ fontSize: 20, fontWeight: 600, marginTop: isProvider ? 3 : 0, lineHeight: 1.4 }}
          >
            {text}
          </div>
        </div>
      </div>
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: `linear-gradient(90deg,${gc})`,
            width: `${progress * 100}%`,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}
