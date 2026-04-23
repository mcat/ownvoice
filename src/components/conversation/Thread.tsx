import { useRef, useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Message } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useActivePatient } from "../../stores/settingsStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { DualLocaleText } from "../shared/DualLocaleText";
import { Btn } from "../shared/Btn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ThreadProps {
  messages: Message[];
  t: ThemeTokens;
  onRepeat: (text: string, from: "patient" | "provider") => void;
}

/**
 * Scrollable conversation history with tap-to-repeat.
 *
 * Patient messages render right-aligned with blue background;
 * provider messages left-aligned with card background.
 * Tapping a bubble re-speaks the message without adding a duplicate.
 *
 * When a message carries a `gloss` that differs from `text`, the bubble
 * renders a secondary-locale line via `<DualLocaleText variant="transcript">`.
 */
export function Thread({ messages, t, onRepeat }: ThreadProps) {
  const active = useActivePatient();
  const patientLang = active?.patientLang ?? "en";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const endRef = useRef<HTMLDivElement>(null);
  const [repeatingIdx, setRepeatingIdx] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Auto-scroll to bottom whenever messages change.
  // The `behavior` JS option overrides CSS `scroll-behavior`, so the
  // `prefers-reduced-motion` media rule in app.css does NOT silence this
  // call — we must branch explicitly (WCAG 2.3.3 AAA).
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages.length, reducedMotion]);

  if (!messages || messages.length === 0) return null;

  const handleTap = (msg: Message, idx: number) => {
    onRepeat(msg.text, msg.from);
    setRepeatingIdx(idx);
    setTimeout(() => setRepeatingIdx(null), 600);
  };

  const wrapperStyle: JSX.CSSProperties = {
    marginBottom: 16,
    flexShrink: 0,
  };

  const scrollStyle: JSX.CSSProperties = {
    background: t.activeBg,
    borderRadius: 18,
    padding: "14px 16px",
    maxHeight: "min(160px, 22dvh)",
    overflowY: "auto",
    border: `1px solid ${t.border}`,
  };

  return (
    <div style={wrapperStyle}>
      <div style={scrollStyle}>
      {messages.map((msg, idx) => {
        const isPatient = msg.from === "patient";
        const isRepeating = repeatingIdx === idx;
        const showGloss = !!msg.gloss && msg.gloss !== msg.text;

        const bubbleStyle: JSX.CSSProperties = {
          display: "flex",
          justifyContent: isPatient ? "flex-end" : "flex-start",
          marginBottom: idx < messages.length - 1 ? 8 : 0,
        };

        const btnStyle: JSX.CSSProperties = {
          // #1E40AF is a darker shade of the patient-blue brand that passes
          // WCAG 1.4.6 AAA (7:1) against white text; #2563EB is only AA (5.16:1).
          // Thread bubbles persist, so AAA matters; transient "lit" states
          // elsewhere stay on the lighter brand color.
          background: isPatient
            ? isRepeating
              ? "#1E3A8A"
              : "#1E40AF"
            : t.card,
          color: isPatient ? "#FFFFFF" : t.text,
          border: isPatient ? "none" : `1px solid ${t.border}`,
          borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          maxWidth: "78%",
          textAlign: "left" as const,
          fontSize: 16,
          lineHeight: 1.4,
          boxShadow: isRepeating ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
          transition: "background 0.15s, box-shadow 0.15s",
        };

        // Determine locale pair for DualLocaleText
        const primaryLocale = isPatient ? patientLang : caregiverLang;
        const glossLocale = isPatient ? caregiverLang : patientLang;

        return (
          <div key={idx} style={bubbleStyle}>
            <Btn
              onClick={() => handleTap(msg, idx)}
              style={btnStyle}
              aria-label={resolvePhrase("ui.dual.thread.repeat_aria", patientLang).replace("{text}", msg.text)}
            >
              {showGloss ? (
                <DualLocaleText
                  variant="transcript"
                  primaryKey={"quick.yes" as never}
                  primaryLocale={primaryLocale}
                  glossLocale={glossLocale}
                  primaryText={msg.text}
                  glossText={msg.gloss}
                />
              ) : (
                msg.text
              )}
            </Btn>
          </div>
        );
      })}

      <div ref={endRef} />
      </div>
    </div>
  );
}
