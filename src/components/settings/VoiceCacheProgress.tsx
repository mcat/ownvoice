import { useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  useAudioCacheStore,
  type SpeakerKey,
} from "../../stores/audioCacheStore";
import * as audioCacheRunner from "../../models/audioCacheRunner";
import type { AppSettings } from "../../types";
import { Btn } from "../shared/Btn";

interface Props {
  speakerKey: SpeakerKey;
  speakerLabel: string;
  cfg: AppSettings;
  patientSpeakerData: unknown;
}

// Shared button styling — matches the 44px touch-target floor from
// VoiceCapture's `btnFloor` so every interactive control in Settings
// feels consistent under gloved or tremoring hands.
const CTRL_BTN: JSX.CSSProperties = {
  background: "none",
  minHeight: 44,
  minWidth: 44,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
};

// Destructive-outline style for the initial Discard trigger — matches
// the "Reset app for new patient" button in ResetSection so the visual
// language for dangerous actions stays consistent.
const DISCARD_OUTLINE: JSX.CSSProperties = {
  ...CTRL_BTN,
  border: "1px solid #DC2626",
  color: "#DC2626",
};

/**
 * Per-speaker pre-generation progress + controls.
 *
 * States:
 *  - running: progress bar, Pause, Discard (→ confirm step)
 *  - paused:  progress bar (muted), Resume, Discard (→ confirm step)
 *  - done:    success label
 *  - failed:  error label + Retry + Discard (→ confirm step)
 *
 * Discard shows an inline confirm card before actually wiping state —
 * voice prep takes minutes and losing it to a stray tap would frustrate
 * a caregiver who just spent time setting things up.
 */
export function VoiceCacheProgress({
  speakerKey,
  speakerLabel,
  cfg,
  patientSpeakerData,
}: Props) {
  const run = useAudioCacheStore((s) => s.runs[speakerKey]);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  if (!run) return null;

  const pct = run.total > 0 ? Math.round((run.current / run.total) * 100) : 0;

  // --- Confirm step (destructive action safety) ---
  if (confirmingDiscard) {
    return (
      <div
        role="alertdialog"
        aria-label={`Confirm discarding ${speakerLabel}'s voice preparation`}
        style={{
          marginTop: 10,
          padding: "16px 18px",
          background: "rgba(220,38,38,0.05)",
          border: "1px solid #DC2626",
          borderRadius: 10,
        }}
      >
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#991B1B",
            margin: "0 0 8px",
          }}
        >
          Discard {speakerLabel}'s voice preparation?
        </p>
        <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 16px", lineHeight: 1.5 }}>
          Progress ({run.current} / {run.total} phrases) will be lost. The
          recorded voice sample itself is kept — you can restart preparation
          later.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn
            onClick={() => setConfirmingDiscard(false)}
            aria-label="Cancel and keep voice preparation"
            style={{
              ...CTRL_BTN,
              border: "1px solid #6B7280",
              color: "#374151",
            }}
          >
            Cancel
          </Btn>
          <Btn
            onClick={() => {
              audioCacheRunner.discardRun(speakerKey);
              setConfirmingDiscard(false);
            }}
            aria-label="Confirm discard voice preparation"
            style={{
              ...CTRL_BTN,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
            }}
          >
            Discard
          </Btn>
        </div>
      </div>
    );
  }

  // --- Queued state (waiting for an earlier speaker's run to finish) ---
  // The runner processes speakers sequentially; a provider sits in "queued"
  // from the moment their voice is captured until the patient (and any
  // earlier providers) finish. Rendering this explicitly avoids a silent
  // empty row that looks like nothing is happening.
  if (run.status === "queued") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: 10,
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 500,
          color: "#374151", // gray-700 — ~11:1 on gray-100, AAA
          background: "#F3F4F6", // gray-100
          border: "1px solid #D1D5DB", // gray-300, 3.07:1 on bg (passes 3:1 non-text)
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">{"\u23F3"}</span>
        Queued — {speakerLabel}'s voice will prepare next ({run.total}{" "}
        phrase{run.total === 1 ? "" : "s"})
      </div>
    );
  }

  // --- Running / paused state (progress bar + controls) ---
  if (run.status === "running" || run.status === "paused") {
    const paused = run.status === "paused";
    // Blue family while running, neutral gray while paused — signals
    // "suspended" without red/error connotations.
    const palette = paused
      ? {
          bg: "#F3F4F6",     // gray-100
          border: "#D1D5DB", // gray-300 (3.07:1 on gray-100 for 3:1 non-text)
          text: "#374151",   // gray-700 (~11:1 on gray-100, AAA)
          track: "#E5E7EB",  // gray-200
          fill: "#6B7280",   // gray-500 (3.7:1 on gray-200 — passes 3:1)
          btnBorder: "#6B7280",
          btnText: "#374151",
          primaryBorder: "#1D4ED8", // blue-700 for Resume (primary affordance)
          primaryText: "#1E3A8A",   // blue-900
        }
      : {
          bg: "#EFF6FF",
          border: "#BFDBFE",
          text: "#1E40AF",
          track: "#DBEAFE",
          fill: "#1D4ED8",   // blue-700 — 5.0:1 on blue-100 track
          btnBorder: "#1D4ED8",
          btnText: "#1E3A8A",
          primaryBorder: "#1D4ED8",
          primaryText: "#1E3A8A",
        };

    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: 10,
          padding: "12px 16px",
          background: palette.bg,
          borderRadius: 10,
          border: `1px solid ${palette.border}`,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: palette.text,
            marginBottom: 8,
          }}
        >
          {paused ? "Paused — " : "Preparing "}
          {speakerLabel}'s voice… {run.current} / {run.total}
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: palette.track,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 4,
              background: palette.fill,
              transition: "width 200ms linear",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 12,
          }}
        >
          {paused ? (
            <Btn
              onClick={() =>
                audioCacheRunner.resumeAll(cfg, patientSpeakerData)
              }
              aria-label={`Resume preparing ${speakerLabel}'s voice`}
              style={{
                ...CTRL_BTN,
                border: `1px solid ${palette.primaryBorder}`,
                color: palette.primaryText,
              }}
            >
              <span aria-hidden="true">{"\u25B6"}</span> Resume
            </Btn>
          ) : (
            <Btn
              onClick={() => audioCacheRunner.pauseAll()}
              aria-label={`Pause preparing ${speakerLabel}'s voice`}
              style={{
                ...CTRL_BTN,
                border: `1px solid ${palette.btnBorder}`,
                color: palette.btnText,
              }}
            >
              <span aria-hidden="true">{"\u23F8"}</span> Pause
            </Btn>
          )}
          <Btn
            onClick={() => setConfirmingDiscard(true)}
            aria-label={`Discard preparing ${speakerLabel}'s voice`}
            style={DISCARD_OUTLINE}
          >
            Discard
          </Btn>
        </div>
      </div>
    );
  }

  // --- Done state ---
  if (run.status === "done") {
    return (
      <div
        style={{
          marginTop: 10,
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 600,
          color: "#065F46",
          background: "#D1FAE5",
          border: "1px solid #BBF7D0",
          borderRadius: 10,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">{"\u2705"}</span>
        Voice clone active — all {run.total} phrases ready in{" "}
        {speakerLabel}'s voice
      </div>
    );
  }

  // --- Failed state ---
  if (run.status === "failed") {
    return (
      <div
        role="alert"
        style={{
          marginTop: 10,
          padding: "12px 16px",
          background: "#FEF2F2",
          borderRadius: 10,
          border: "1px solid #FCA5A5",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#991B1B", flex: 1, minWidth: 180 }}>
          <span aria-hidden="true">{"\u26A0\uFE0F"}</span>{" "}
          {run.failedPhrases.length} phrase
          {run.failedPhrases.length === 1 ? "" : "s"} failed for {speakerLabel}
        </span>
        <Btn
          onClick={() => audioCacheRunner.retryFailed(cfg, patientSpeakerData, speakerKey)}
          aria-label="Retry failed voice cache phrases"
          style={{
            ...CTRL_BTN,
            // red-600 gives 4.41:1 on the red-50 card (passes 3:1 non-text).
            border: "1px solid #DC2626",
            color: "#991B1B",
          }}
        >
          Retry
        </Btn>
        <Btn
          onClick={() => setConfirmingDiscard(true)}
          aria-label={`Discard preparing ${speakerLabel}'s voice`}
          style={DISCARD_OUTLINE}
        >
          Discard
        </Btn>
      </div>
    );
  }

  return null;
}
