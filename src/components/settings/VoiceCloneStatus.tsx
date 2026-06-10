import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  useAudioCacheStore,
  type SpeakerKey,
} from "../../stores/audioCacheStore";
import { countCached, embeddingFingerprint } from "../../models/audioCache";
import * as audioCacheRunner from "../../models/audioCacheRunner";
import {
  getPatientSpokenPhrases,
  getPatientPainSentencesForSpeech,
  getProviderSpokenPhrases,
} from "../../data/phraseRegistry";
import type { AppSettings, FallbackVoice } from "../../types";
import type { SpeakerData, VoiceQualityResult } from "../../models/types";
import type { VoiceCloneStatus as ExtractionStatus } from "../shared/VoiceCapture";
import { Btn } from "../shared/Btn";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { useModels } from "../../hooks/useModels";
import { useThrottledText } from "../../hooks/useThrottledText";
import { labelFor } from "../shared/QualityBadge";

/**
 * Single source of truth for "what will the patient be heard as right now?".
 *
 * Subsumes the old CloneStatusBadge (in-flight extraction states) and
 * VoiceCacheProgress (per-speaker pre-gen state) into one row, and also
 * reconciles `audioCacheStore.runs` against OPFS on mount so steady-state
 * survives reload (the store is in-memory only by design — see
 * audioCacheStore.ts).
 *
 * State machine ordering (top wins):
 *   1. extracting  — embedding extraction in flight
 *   2. model-loading — TTS model still warming
 *   3. extraction-failed — clone unavailable, surfaces fallback voice + Retry
 *   4. run.failed — pre-gen failed for some phrases, Retry/Discard
 *   5. run.running / run.paused — progress bar with controls
 *   6. run.queued — waiting behind earlier speaker
 *   7. run.done — Voice clone ready · all N phrases · quality
 *   8. !run + reconciler all-cached → seed "done"
 *   9. !run + reconciler partial → seed paused, offer Resume
 *  10. otherwise → hidden
 */

interface Props {
  speakerKey: SpeakerKey;
  speakerLabel: string;
  /** Forwarded from VoiceCapture so we can show extraction-side states. */
  cloneStatus: ExtractionStatus;
  speakerData: SpeakerData | null;
  /** Web Speech voice that will be used while clone unavailable. */
  fallbackVoice: FallbackVoice | null;
  cfg: AppSettings;
  /** Which phrase corpus to reconcile against. */
  phraseCorpus: "patient-core" | "patient-pain" | "provider";
  /** Called when the Retry button is clicked in the extraction-failed state. */
  onRetryExtraction?: () => void;
}


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

const DISCARD_OUTLINE: JSX.CSSProperties = {
  ...CTRL_BTN,
  border: "1px solid #DC2626",
  color: "#DC2626",
};

function phrasesFor(
  corpus: Props["phraseCorpus"],
  cfg: AppSettings,
): string[] {
  const activePatient = cfg.activePatientId
    ? cfg.patients.find((p) => p.id === cfg.activePatientId)
    : null;
  switch (corpus) {
    case "patient-core":
      return getPatientSpokenPhrases(cfg.caregiverLang);
    case "patient-pain":
      return getPatientPainSentencesForSpeech(cfg.caregiverLang);
    case "provider":
      return getProviderSpokenPhrases(activePatient?.patientLang ?? "en");
  }
}

function qualitySuffix(
  quality: VoiceQualityResult | undefined,
  caregiverLang: string,
): string {
  if (!quality) return "";
  const label = resolvePhrase(
    `ui.voice_quality.label.${labelFor(quality.score)}` as never,
    caregiverLang,
  );
  return ` · ${resolvePhrase(
    "ui.provider.settings.voice_clone_status.quality_suffix",
    caregiverLang,
  ).replace("{label}", label)}`;
}

export function VoiceCloneStatus({
  speakerKey,
  speakerLabel,
  cloneStatus,
  speakerData,
  fallbackVoice,
  cfg,
  phraseCorpus,
  onRetryExtraction,
}: Props) {
  const run = useAudioCacheStore((s) => s.runs[speakerKey]);
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Model-loading countdown (mirrors what VoiceCapture used to show).
  const { isWarm, humanCountdown, isAlmostReady } = useModels();
  const ttsWarm = isWarm("tts");
  const ttsAlmost = isAlmostReady("tts");
  const countdown = humanCountdown("tts");
  const savingCategory =
    ttsWarm || ttsAlmost ? "almost" : countdown ? "saving-cd" : "saving";
  const savingText =
    ttsWarm || ttsAlmost
      ? resolvePhrase("ui.readiness.voice_capture.saving_almost", caregiverLang)
      : countdown
        ? resolvePhrase(
            "ui.readiness.voice_capture.saving_with_countdown",
            caregiverLang,
          ).replace("{countdown}", countdown)
        : resolvePhrase("ui.readiness.voice_capture.saving", caregiverLang);
  const announcedSavingText = useThrottledText(savingText, savingCategory);

  // ─── Reconciler ──────────────────────────────────────────────────────
  // Run once per (speakerKey, speakerData) when there's no run yet.
  // countCached is a single OPFS directory scan; safe to fire on mount.
  useEffect(() => {
    if (run) return;
    if (!speakerData) return;
    let cancelled = false;
    (async () => {
      const phrases = phrasesFor(phraseCorpus, cfg);
      if (phrases.length === 0) return;
      const cached = await countCached(phrases, speakerData);
      if (cancelled) return;
      const fp = embeddingFingerprint(speakerData);
      if (fp === "none") return;
      const store = useAudioCacheStore.getState();
      const locale = cfg.patients.find((p) => p.id === cfg.activePatientId)?.patientLang
        ?? cfg.caregiverLang;
      // Re-check that no run was created during the OPFS scan — the runner
      // may have kicked between mount and this point.
      if (store.runs[speakerKey]) return;
      if (cached === phrases.length) {
        store.queue(speakerKey, phrases.length, locale, fp);
        store.finish(speakerKey);
      } else if (cached > 0) {
        // Seed running first so pauseAllRuns picks it up; queued entries
        // are skipped by pauseAllRuns and would stay "queued" otherwise.
        store.start(speakerKey, phrases.length, locale, fp);
        store.progress(speakerKey, "", cached);
        store.pauseAllRuns();
      }
      // cached === 0: leave the row hidden; the runner will populate when
      // it kicks. If it never does, that's a runner bug, not a UI fallback.
    })();
    return () => {
      cancelled = true;
    };
    // phraseCorpus is stable for the component's lifetime; cfg is captured
    // by reference and we deliberately do NOT re-fire on every cfg keystroke.
  }, [run, speakerData, speakerKey, phraseCorpus]);

  const quality = speakerData?.quality;

  // ─── Discard confirm step ────────────────────────────────────────────
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
        <p style={{ fontSize: 15, fontWeight: 600, color: "#991B1B", margin: "0 0 8px" }}>
          {resolvePhrase("ui.provider.settings.voice_cache.discard_title", caregiverLang)
            .replace("{label}", speakerLabel)}
        </p>
        <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 16px", lineHeight: 1.5 }}>
          {resolvePhrase("ui.provider.settings.voice_cache.discard_body", caregiverLang)
            .replace("{current}", String(run?.current ?? 0))
            .replace("{total}", String(run?.total ?? 0))}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn
            onClick={() => setConfirmingDiscard(false)}
            aria-label={resolvePhrase("ui.provider.settings.voice_cache.cancel_aria", caregiverLang)}
            style={{ ...CTRL_BTN, border: "1px solid #6B7280", color: "#374151" }}
          >
            {resolvePhrase("ui.provider.settings.voice_cache.cancel", caregiverLang)}
          </Btn>
          <Btn
            onClick={() => {
              audioCacheRunner.discardRun(speakerKey);
              setConfirmingDiscard(false);
            }}
            aria-label={resolvePhrase("ui.provider.settings.voice_cache.discard_confirm_aria", caregiverLang)}
            style={{ ...CTRL_BTN, border: "none", background: "#DC2626", color: "#FFFFFF" }}
          >
            {resolvePhrase("ui.provider.settings.voice_cache.discard_confirm", caregiverLang)}
          </Btn>
        </div>
      </div>
    );
  }

  // ─── 1. Extracting ────────────────────────────────────────────────────
  if (cloneStatus === "extracting") {
    return (
      <BadgeRow
        kind="info"
        icon="⏳"
        text={resolvePhrase("ui.provider.voice_capture.creating", caregiverLang)}
      />
    );
  }

  // ─── 2. Model loading ─────────────────────────────────────────────────
  if (cloneStatus === "model-loading") {
    return (
      <BadgeRow
        kind="warn-soft"
        icon="⏳"
        text={savingText}
        announcement={announcedSavingText}
      />
    );
  }

  // ─── 3. Extraction failed → using backup ──────────────────────────────
  if (cloneStatus === "failed") {
    const fallbackName = fallbackVoice?.name ?? null;
    const text = resolvePhrase(
      "ui.provider.settings.voice_clone_status.extraction_failed",
      caregiverLang,
    ).replace("{fallback}", fallbackName ? ` · ${fallbackName}` : "");
    return (
      <BadgeRow
        kind="warn"
        icon="⚠️"
        text={text}
        action={
          onRetryExtraction
            ? {
                label: resolvePhrase("ui.provider.voice_capture.retry", caregiverLang),
                ariaLabel: resolvePhrase(
                  "ui.provider.settings.voice_clone_status.retry_extraction_aria",
                  caregiverLang,
                ),
                onClick: onRetryExtraction,
              }
            : undefined
        }
      />
    );
  }

  // ─── 4. Pre-gen failed ────────────────────────────────────────────────
  if (run && run.status === "failed") {
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
          <span aria-hidden="true">{"⚠️"}</span>{" "}
          {resolvePhrase("ui.provider.settings.voice_cache.failed", caregiverLang)
            .replace("{count}", String(run.failedPhrases.length))
            .replace("{plural}", run.failedPhrases.length === 1 ? "" : "s")
            .replace("{label}", speakerLabel)}
        </span>
        <Btn
          onClick={() => audioCacheRunner.retryFailed(cfg, speakerKey)}
          aria-label={resolvePhrase("ui.provider.settings.voice_cache.retry_aria", caregiverLang)}
          style={{ ...CTRL_BTN, border: "1px solid #DC2626", color: "#991B1B" }}
        >
          {resolvePhrase("ui.provider.settings.voice_cache.retry", caregiverLang)}
        </Btn>
        <Btn
          onClick={() => setConfirmingDiscard(true)}
          aria-label={resolvePhrase(
            "ui.provider.settings.voice_cache.discard_trigger_aria",
            caregiverLang,
          ).replace("{label}", speakerLabel)}
          style={DISCARD_OUTLINE}
        >
          {resolvePhrase("ui.provider.settings.voice_cache.discard_confirm", caregiverLang)}
        </Btn>
      </div>
    );
  }

  // ─── 5. Running / paused ──────────────────────────────────────────────
  if (run && (run.status === "running" || run.status === "paused")) {
    const paused = run.status === "paused";
    const pct = run.total > 0 ? Math.round((run.current / run.total) * 100) : 0;
    const palette = paused
      ? {
          bg: "#F3F4F6",
          border: "#D1D5DB",
          text: "#374151",
          track: "#E5E7EB",
          fill: "#6B7280",
          btnBorder: "#6B7280",
          btnText: "#374151",
          primaryBorder: "#1D4ED8",
          primaryText: "#1E3A8A",
        }
      : {
          bg: "#EFF6FF",
          border: "#BFDBFE",
          text: "#1E40AF",
          track: "#DBEAFE",
          fill: "#1D4ED8",
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
        <div style={{ fontSize: 14, fontWeight: 600, color: palette.text, marginBottom: 8 }}>
          {paused
            ? resolvePhrase("ui.provider.settings.voice_cache.paused", caregiverLang)
                .replace("{label}", speakerLabel)
                .replace("{current}", String(run.current))
                .replace("{total}", String(run.total))
            : resolvePhrase("ui.provider.settings.voice_cache.preparing", caregiverLang)
                .replace("{label}", speakerLabel)
                .replace("{current}", String(run.current))
                .replace("{total}", String(run.total))}
        </div>
        <div style={{ height: 8, borderRadius: 4, background: palette.track, overflow: "hidden" }}>
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
              onClick={() => audioCacheRunner.resumeAll(cfg)}
              aria-label={resolvePhrase("ui.provider.settings.voice_cache.resume_aria", caregiverLang)
                .replace("{label}", speakerLabel)}
              style={{
                ...CTRL_BTN,
                border: `1px solid ${palette.primaryBorder}`,
                color: palette.primaryText,
              }}
            >
              <span aria-hidden="true">{"▶"}</span>{" "}
              {resolvePhrase("ui.provider.settings.voice_cache.resume", caregiverLang)}
            </Btn>
          ) : (
            <Btn
              onClick={() => audioCacheRunner.pauseAll()}
              aria-label={resolvePhrase("ui.provider.settings.voice_cache.pause_aria", caregiverLang)
                .replace("{label}", speakerLabel)}
              style={{ ...CTRL_BTN, border: `1px solid ${palette.btnBorder}`, color: palette.btnText }}
            >
              <span aria-hidden="true">{"⏸"}</span>{" "}
              {resolvePhrase("ui.provider.settings.voice_cache.pause", caregiverLang)}
            </Btn>
          )}
          <Btn
            onClick={() => setConfirmingDiscard(true)}
            aria-label={resolvePhrase(
              "ui.provider.settings.voice_cache.discard_trigger_aria",
              caregiverLang,
            ).replace("{label}", speakerLabel)}
            style={DISCARD_OUTLINE}
          >
            {resolvePhrase("ui.provider.settings.voice_cache.discard_confirm", caregiverLang)}
          </Btn>
        </div>
      </div>
    );
  }

  // ─── 6. Queued ────────────────────────────────────────────────────────
  if (run && run.status === "queued") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: 10,
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 500,
          color: "#374151",
          background: "#F3F4F6",
          border: "1px solid #D1D5DB",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">{"⏳"}</span>
        {resolvePhrase("ui.provider.settings.voice_cache.queued", caregiverLang)
          .replace("{label}", speakerLabel)
          .replace("{total}", String(run.total))
          .replace("{plural}", run.total === 1 ? "" : "s")}
      </div>
    );
  }

  // ─── 7. Done ──────────────────────────────────────────────────────────
  if (run && run.status === "done") {
    return (
      <BadgeRow
        kind="success"
        icon="✅"
        text={
          resolvePhrase("ui.provider.settings.voice_cache.done", caregiverLang)
            .replace("{total}", String(run.total))
            .replace("{label}", speakerLabel) + qualitySuffix(quality, caregiverLang)
        }
      />
    );
  }

  // ─── 10. Hidden ───────────────────────────────────────────────────────
  return null;
}

interface BadgeRowProps {
  kind: "info" | "success" | "warn" | "warn-soft";
  icon: string;
  text: string;
  /** SR-only live announcement when set; renders a hidden role=status. */
  announcement?: string;
  action?: { label: string; ariaLabel: string; onClick: () => void };
}

function BadgeRow({ kind, icon, text, announcement, action }: BadgeRowProps) {
  const palette = {
    info: { bg: "#DBEAFE", border: "#BFDBFE", text: "#1E40AF" },
    success: { bg: "#D1FAE5", border: "#BBF7D0", text: "#065F46" },
    warn: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
    "warn-soft": { bg: "#FEF3C7", border: "#FDE68A", text: "#78350F" },
  }[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 10,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 600,
        color: palette.text,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span style={{ flex: 1, minWidth: 160 }}>{text}</span>
      {announcement && (
        <span
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {announcement}
        </span>
      )}
      {action && (
        <Btn
          onClick={action.onClick}
          aria-label={action.ariaLabel}
          style={{
            ...CTRL_BTN,
            border: `1px solid ${palette.border}`,
            color: palette.text,
          }}
        >
          {action.label}
        </Btn>
      )}
    </div>
  );
}
