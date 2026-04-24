import { useState, useEffect, useRef } from "preact/hooks";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore, useActivePatient } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import type { ThemeTokens } from "../../theme/tokens";
import { z } from "../../theme/z";

interface SpeakingProps {
  text: string;
  /** Opposite-locale gloss for co-read display. When present and distinct
   *  from `text`, rendered as a second muted line under the primary. */
  gloss?: string;
  isProvider: boolean;
  onDone: () => void;
  t: ThemeTokens;
}

/** Full-width overlay bar showing speech progress. Not a modal — no dead ends. */
export function Speaking({
  text,
  gloss,
  isProvider,
  onDone,
  t,
}: SpeakingProps) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const cfg = useSettingsStore((s) => s.cfg);
  const patientLang = useActivePatient()?.patientLang ?? "en";
  const activeProvIdx = useUIStore((s) => s.activeProvIdx);
  const activeProv = cfg?.providers?.[activeProvIdx] ?? cfg?.providers?.[0];

  const subLabel = isProvider
    ? activeProv
      ? `${activeProv.emoji ? activeProv.emoji + " " : ""}${activeProv.name}`
      : resolvePhrase("ui.dual.speaking.patient_voice", patientLang)
    : resolvePhrase("ui.dual.speaking.patient_voice", patientLang);

  // onDone is typically an inline arrow from the parent — a new reference
  // every render. Tracking it via a ref keeps the animation effect from
  // restarting on every unrelated parent re-render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const dur = Math.max(1400, text.length * 55);
    const start = Date.now();
    let raf: number;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - start) / dur);
      setProgress(elapsed);
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Trigger the exit slide-up, then hand off after the animation
        // finishes. If the effect is cleaned up mid-exit (e.g. a new
        // phrase arrives), clearTimeout keeps us from calling onDone
        // for a text that's no longer on screen.
        setExiting(true);
        doneTimer = setTimeout(() => onDoneRef.current(), 400);
      }
    };

    setProgress(0);
    setExiting(false);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (doneTimer != null) clearTimeout(doneTimer);
    };
  }, [text]);

  const gc = isProvider ? "#059669,#047857" : "#2563EB,#1D4ED8";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={resolvePhrase("ui.dual.speaking.aria_label", patientLang).replace("{text}", text)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: t.speakBg,
        color: "#F5F5F5",
        padding: "10px 32px",
        zIndex: z.speaking,
        animation: exiting
          ? "slideUp 0.4s ease-in forwards"
          : "slideDown 0.25s ease-out",
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
          {subLabel}
        </div>
        {(() => {
          // The Speaking bar is primarily read by the care team, so the
          // caregiverLang string is the one that should be prominent
          // regardless of which voice is speaking. For patient messages
          // text = patientLang and gloss = caregiverLang, so we swap;
          // for provider messages text is already caregiverLang.
          const hasGloss = gloss !== undefined && gloss !== text;
          const primary = !isProvider && hasGloss ? gloss! : text;
          const secondary = !isProvider && hasGloss
            ? text
            : hasGloss
              ? gloss
              : undefined;
          return (
            <>
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
                {primary}
              </div>
              {secondary && (
                <div
                  class="font-sans"
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "rgba(245,245,245,0.7)",
                    lineHeight: 1.3,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {secondary}
                </div>
              )}
            </>
          );
        })()}
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
