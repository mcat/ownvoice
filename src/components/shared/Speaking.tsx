import { useState, useEffect } from "preact/hooks";
import type { ThemeTokens } from "../../theme/tokens";
import { z } from "../../theme/z";

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
        top: 0,
        left: 0,
        right: 0,
        background: t.speakBg,
        color: "#F5F5F5",
        padding: "10px 32px",
        zIndex: z.speaking,
        animation: "slideDown 0.25s ease-out",
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 84,
        boxSizing: "border-box",
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
      <div style={{ minWidth: 0, flex: 1 }}>
        {isProvider && (
          <div
            class="font-sans"
            style={{
              fontSize: 13,
              color: "rgba(245,245,245,0.7)",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            Care Team
          </div>
        )}
        <div
          class="font-sans"
          style={{
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: `linear-gradient(90deg,${gc})`,
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
