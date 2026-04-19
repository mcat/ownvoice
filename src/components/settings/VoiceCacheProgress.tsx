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

/**
 * Per-speaker pre-generation progress. Shows a progress bar while
 * running, a compact success label when done, or a retry affordance
 * when one or more phrases failed.
 */
export function VoiceCacheProgress({
  speakerKey,
  speakerLabel,
  cfg,
  patientSpeakerData,
}: Props) {
  const run = useAudioCacheStore((s) => s.runs[speakerKey]);
  if (!run) return null;

  const pct = run.total > 0 ? Math.round((run.current / run.total) * 100) : 0;

  if (run.status === "running") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: 10,
          padding: "12px 16px",
          background: "#EFF6FF",
          borderRadius: 10,
          border: "1px solid #BFDBFE",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#1E40AF",
            marginBottom: 8,
          }}
        >
          Preparing {speakerLabel}'s voice… {run.current} / {run.total}
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "#DBEAFE",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 4,
              background: "#2563EB",
              transition: "width 200ms linear",
            }}
          />
        </div>
      </div>
    );
  }

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
        <span aria-hidden="true">{"\u2713"}</span>
        All {run.total} phrases ready in {speakerLabel}'s voice
      </div>
    );
  }

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
            background: "none",
            border: "1px solid #FCA5A5",
            minHeight: 44,
            minWidth: 44,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 600,
            color: "#991B1B",
            fontFamily: "inherit",
          }}
        >
          Retry
        </Btn>
      </div>
    );
  }

  return null;
}
