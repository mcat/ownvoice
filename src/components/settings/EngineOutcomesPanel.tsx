import { useEffect, useState } from "preact/hooks";
import type { ThemeTokens } from "../../theme/tokens";
import {
  type EngineKind,
  type EngineOutcome,
  getOutcomes,
  subscribeOutcomes,
  clearOutcomes,
} from "../../models/engineOutcomes";
import { Btn } from "../shared/Btn";

/**
 * Live view of recent `speak()` engine outcomes — answers "what is the
 * patient actually being heard as right now?" complementing the
 * caregiver-facing readiness line in PatientInfoSection.
 *
 * Subscribes to the engineOutcomes ring buffer; renders the last 20
 * entries newest-first. Cleared on reload (the ring is in-memory only).
 */

interface Props {
  t: ThemeTokens;
}

const ENGINE_LABELS: Record<EngineKind, string> = {
  memory: "Voice clone (memory)",
  cache: "Voice clone (disk)",
  webspeech: "Backup voice (Web Speech)",
  tone: "Tone (no speech available)",
};

const ENGINE_BADGE_COLORS: Record<
  EngineKind,
  { bg: string; fg: string; border: string }
> = {
  memory: { bg: "#D1FAE5", fg: "#065F46", border: "#A7F3D0" },
  cache: { bg: "#DBEAFE", fg: "#1E40AF", border: "#BFDBFE" },
  webspeech: { bg: "#FEF3C7", fg: "#78350F", border: "#FDE68A" },
  tone: { bg: "#FEE2E2", fg: "#7F1D1D", border: "#FCA5A5" },
};

function useEngineOutcomes(): readonly EngineOutcome[] {
  const [outcomes, setOutcomes] = useState<readonly EngineOutcome[]>(
    () => getOutcomes(),
  );
  useEffect(() => subscribeOutcomes(setOutcomes), []);
  return outcomes;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EngineOutcomesPanel({ t }: Props) {
  const outcomes = useEngineOutcomes();
  // Newest first — matches the caregiver's mental model "what just played".
  const reversed = [...outcomes].reverse();

  if (reversed.length === 0) {
    return (
      <p style={{ margin: 0, color: t.muted, fontSize: 14 }}>
        No taps recorded yet. Speak a phrase from the patient or provider screen
        and it will appear here.
      </p>
    );
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", color: t.sub, fontSize: 13 }}>
        Last {reversed.length} {reversed.length === 1 ? "tap" : "taps"}, newest
        first. Cleared on reload.
      </p>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {reversed.map((o, idx) => {
          const palette = ENGINE_BADGE_COLORS[o.engine];
          return (
            <li
              key={`${o.ts}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: t.text,
              }}
            >
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 12,
                  fontWeight: 600,
                  color: palette.fg,
                  background: palette.bg,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 6,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                }}
                aria-label={ENGINE_LABELS[o.engine]}
              >
                {ENGINE_LABELS[o.engine]}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={o.text}
              >
                {o.text}
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 12,
                  color: t.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {o.actor === "provider" ? "🩺 " : ""}
                {formatTime(o.ts)}
              </span>
            </li>
          );
        })}
      </ol>
      <Btn
        onClick={() => clearOutcomes()}
        style={{
          marginTop: 12,
          minHeight: 36,
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: t.text,
          fontSize: 13,
          fontFamily: "inherit",
        }}
        aria-label="Clear recent engine outcomes"
      >
        Clear
      </Btn>
    </div>
  );
}
