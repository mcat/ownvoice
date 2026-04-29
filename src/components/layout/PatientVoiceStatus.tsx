import type { JSX } from "preact";
import type { Patient } from "../../types";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useModels } from "../../hooks/useModels";
import { getModelManager } from "../../models/modelManager";

interface Props {
  patient: Patient;
}

export function PatientVoiceStatus({ patient }: Props): JSX.Element | null {
  const { isWarm, getError, humanCountdown } = useModels();

  // Only show when the patient has opted in to a voice clone but the
  // clone hasn't been computed yet.
  const needsClone = patient.hasVoice && !patient.speakerData;
  if (!needsClone) return null;

  const ttsWarm = isWarm("tts");
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
            getModelManager().getWorker("tts")?.postMessage({ type: "warmup" });
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

  const countdown = humanCountdown("tts");
  const message = ttsWarm
    ? resolvePhrase("ui.patient.header.voice_status.almost", lang)
    : resolvePhrase(
        "ui.patient.header.voice_status.not_ready",
        lang,
      ).replace("{countdown}", countdown);

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
    display: "inline-flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 999,
    color: variant === "error" ? "#991B1B" : "#1F2937",
    background: variant === "error" ? "#FEE2E2" : "#F3F4F6",
    minHeight: 32,
    maxWidth: 320,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
