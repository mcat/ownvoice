import type { JSX } from "preact";
import type { Patient } from "../../types";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useModels } from "../../hooks/useModels";
import { getModelManager } from "../../models/modelManager";

interface Props {
  patient: Patient;
}

export function PatientVoiceStatus({ patient }: Props): JSX.Element | null {
  const { getError } = useModels();

  // Only show when the patient has opted in to a voice clone but the
  // clone hasn't been computed yet.
  const needsClone = patient.hasVoice && !patient.speakerData;
  if (!needsClone) return null;

  const ttsError = getError("tts");
  const lang = patient.patientLang;

  if (ttsError) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginInlineStart: 12,
        }}
      >
        <span
          role="status"
          aria-live="polite"
          style={pillStyle("error")}
        >
          {resolvePhrase(
            "ui.patient.header.voice_status.failed_message",
            lang,
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            // Clear the error first so the click registers visually:
            // the pill flips from red error to the neutral "Using a
            // temporary voice" state on the same render. Without this,
            // `postMessage` is async and silent — the patient sees no
            // change and assumes the tap missed.
            const mgr = getModelManager();
            mgr.clearError("tts");
            mgr.getWorker("tts")?.postMessage({ type: "warmup" });
          }}
          style={recoveryButtonStyle()}
        >
          {resolvePhrase(
            "ui.patient.header.voice_status.failed_action",
            lang,
          )}
        </button>
      </div>
    );
  }

  // Patient-facing status: one steady message. No transitional
  // "Almost ready…" variant on this surface — text-length changes
  // resize the pill and reflow the header, which reads as visual
  // thrashing to the patient. The clinician contexts (Setup, Listen)
  // keep the transitional copy where active waiting is the point.
  const message = resolvePhrase(
    "ui.patient.header.voice_status.not_ready",
    lang,
  );

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        ...pillStyle("info"),
        marginInlineStart: 12,
      }}
    >
      {message}
    </span>
  );
}

function pillStyle(variant: "info" | "error"): JSX.CSSProperties {
  return {
    // No nowrap / no truncation — copy is short enough to fit naturally
    // and the parent flex container already wraps the pill onto a second
    // line on narrow widths if needed.
    display: "inline-flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 16,
    color: variant === "error" ? "#991B1B" : "#1F2937",
    background: variant === "error" ? "#FEE2E2" : "#F3F4F6",
    minHeight: 32,
    lineHeight: 1.3,
  };
}

function recoveryButtonStyle(): JSX.CSSProperties {
  return {
    minHeight: 44,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #DC2626",
    background: "#FFFFFF",
    color: "#991B1B",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
