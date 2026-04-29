import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { Btn } from "../shared/Btn";
import { useMicrophone } from "../../hooks/useMicrophone";
import { useModels } from "../../hooks/useModels";
import { getModelManager } from "../../models/modelManager";
import { BottomSheet } from "../shared/BottomSheet";

interface ListenPanelProps {
  onAddMessage: (text: string, providerLabel: string) => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
  providers: Provider[];
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

/**
 * Bottom-sheet for capturing provider speech.
 * Uses Whisper small (ONNX, on-device) for speech-to-text via useMicrophone hook.
 * Falls back to manual textarea entry when STT is unavailable.
 */
export function ListenPanel({
  onAddMessage,
  onClose,
  t,
  theme,
  providers,
  activeProvIdx,
  onSelectProvider,
}: ListenPanelProps) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  const {
    isListening: listening,
    transcript: sttTranscript,
    error: micError,
    audioLevel,
    transcribing,
    startCapture,
    stopCapture,
    clearTranscript,
  } = useMicrophone();

  const { isWarm, getError, humanCountdown, isAlmostReady } = useModels();
  const sttWarm = isWarm("stt");
  const sttError = getError("stt");
  const countdown = humanCountdown("stt");
  const sttAlmost = isAlmostReady("stt");

  // Phrase priority: error → almost-ready → with-countdown → not-ready
  // (no countdown estimate yet) → ready listening/start aria. Splicing
  // a fallback string like "One moment…" into the {countdown} template
  // produced awkward sentences ("Getting ready to listen — One moment…"),
  // so each branch picks a phrase that reads naturally on its own.
  const micLabel = sttError
    ? resolvePhrase("ui.readiness.listen.failed_message", caregiverLang)
    : !sttWarm
      ? sttAlmost
        ? resolvePhrase("ui.readiness.listen.almost", caregiverLang)
        : countdown
          ? resolvePhrase(
              "ui.readiness.listen.with_countdown",
              caregiverLang,
            ).replace("{countdown}", countdown)
          : resolvePhrase("ui.readiness.listen.not_ready", caregiverLang)
      : listening
        ? resolvePhrase("ui.provider.listen.stop_aria", caregiverLang)
        : resolvePhrase("ui.provider.listen.start_aria", caregiverLang);

  const micDisabled = !sttWarm || !!sttError;

  const [editedTranscript, setEditedTranscript] = useState<string | null>(null);
  const transcript = editedTranscript !== null ? editedTranscript : sttTranscript;

  const provider = providers[activeProvIdx] ?? providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : resolvePhrase("ui.provider.fallback_name", caregiverLang);

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const providerGreen = "#059669";
  const providerGreenText = theme === "dark" ? "#34D399" : "#065F46";

  const canSubmit = transcript.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddMessage(transcript.trim(), providerLabel);
    setEditedTranscript(null);
    clearTranscript();
  };

  const chipRowStyle: JSX.CSSProperties = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  };

  const chipStyle = (active: boolean): JSX.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    border: active ? `2px solid ${providerGreen}` : `1px solid ${t.border}`,
    background: active
      ? theme === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.04)"
      : "transparent",
    color: active ? providerGreen : t.sub,
    minHeight: 40,
  });

  const singleProvStyle: JSX.CSSProperties = {
    fontSize: 15,
    color: providerGreenText,
    fontWeight: 600,
    marginBottom: 18,
  };

  // Visual states:
  //   listening → blue ring, blue tint background, blue mic glyph
  //   ready (warm) → default border, regular background, muted glyph
  //   disabled (not warm or errored) → dashed border, faded background,
  //     ~40% opacity glyph. The dashed border is the strongest "not
  //     interactive yet" cue — solid borders read as primary affordance.
  const micBtnStyle: JSX.CSSProperties = {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: listening
      ? `3px solid ${blue}`
      : micDisabled
        ? `2px dashed ${t.border}`
        : `2px solid ${t.border}`,
    background: listening
      ? theme === "dark"
        ? "rgba(96,165,250,0.15)"
        : "rgba(37,99,235,0.08)"
      : micDisabled
        ? "transparent"
        : t.activeBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    color: listening ? blue : t.muted,
    opacity: micDisabled ? 0.45 : 1,
    transition: "border 0.2s, background 0.2s, color 0.2s, opacity 0.2s",
  };

  // Audio meter — visible only while listening. Width-matched to the textarea
  // so the meter feels like a deliberate part of the input area; smooth fill
  // tracks RMS audio level from useMicrophone (already throttled to ~15 fps).
  // Replaces the previous boxShadow pulse, which was barely visible from
  // arm's length on a bright iPad screen.
  const meterPct = listening ? Math.round(audioLevel * 100) : 0;
  const meterTrackStyle: JSX.CSSProperties = {
    width: "100%",
    maxWidth: 240,
    height: 14,
    borderRadius: 7,
    background: t.activeBg,
    border: `1px solid ${t.border}`,
    overflow: "hidden",
    marginTop: 14,
    position: "relative",
  };
  const meterFillStyle: JSX.CSSProperties = {
    width: `${meterPct}%`,
    height: "100%",
    background: blue,
    transition: "width 80ms linear",
  };

  // Pulsing red dot for the "Recording" status — universal recording semantics,
  // far stronger visual cue than a colored ring around the mic button.
  const recDotStyle: JSX.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#DC2626",
    display: "inline-block",
    animation: "ovListenRecPulse 1.5s ease-in-out infinite",
    flexShrink: 0,
  };

  const textareaStyle: JSX.CSSProperties = {
    width: "100%",
    minHeight: 80,
    borderRadius: 14,
    border: `1px solid ${t.border}`,
    background: t.activeBg,
    color: t.text,
    fontSize: 16,
    lineHeight: 1.45,
    padding: "12px 14px",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const submitBtnStyle: JSX.CSSProperties = {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    fontSize: 17,
    fontWeight: 600,
    border: "none",
    background: canSubmit ? providerGreen : t.activeBg,
    color: canSubmit ? "#FFFFFF" : t.muted,
    marginTop: 12,
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <BottomSheet onClose={onClose} t={t}>
      <BottomSheet.Header>
        <BottomSheet.Title>{resolvePhrase("ui.provider.listen.title", caregiverLang)}</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label={resolvePhrase("ui.provider.close_panel", caregiverLang)} />
      </BottomSheet.Header>

      <BottomSheet.Body>
        {providers.length > 1 ? (
          <div
            role="radiogroup"
            aria-label={resolvePhrase("ui.provider.speaking_as_aria", caregiverLang)}
            style={chipRowStyle}
          >
            {providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx)}
                aria-label={resolvePhrase("ui.provider.select_provider", caregiverLang).replace("{name}", prov.name)}
                role="radio"
                aria-checked={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        ) : (
          <div style={singleProvStyle}>
            {provider?.emoji ? `${provider.emoji} ` : ""}
            {provider?.name ?? resolvePhrase("ui.provider.fallback_name", caregiverLang)}
          </div>
        )}

        <div
          role="group"
          aria-label={resolvePhrase("ui.provider.listen.capture_aria", caregiverLang)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}
        >
          <Btn
            onClick={() => {
              if (micDisabled) return;
              if (listening) {
                stopCapture();
              } else {
                setEditedTranscript(null);
                startCapture();
              }
            }}
            disabled={micDisabled}
            style={micBtnStyle}
            aria-label={micLabel}
          >
            🎙
          </Btn>

          {listening && (
            <div
              role="meter"
              aria-label={resolvePhrase("ui.provider.listen.audio_level_aria", caregiverLang)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={meterPct}
              style={meterTrackStyle}
            >
              <div style={meterFillStyle} />
            </div>
          )}

          <div
            style={{
              fontSize: 14,
              color: listening ? t.text : t.muted,
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: listening ? 600 : 400,
            }}
          >
            {listening && <span style={recDotStyle} aria-hidden="true" />}
            {/* Visible label under the mic mirrors the button's aria-label
                so the "Tap to start listening" affordance never appears
                while the button is actually disabled. micLabel covers the
                error / not-ready / almost / countdown / ready states. */}
            {listening
              ? resolvePhrase("ui.provider.listen.listening", caregiverLang)
              : transcribing
                ? resolvePhrase("ui.provider.listen.transcribing", caregiverLang)
                : micLabel}
          </div>
          {micError && (
            <div
              style={{
                fontSize: 13,
                color: theme === "dark" ? "#FCA5A5" : "#DC2626",
                marginTop: 8,
                textAlign: "center" as const,
                maxWidth: 320,
              }}
              role="alert"
            >
              {micError}
            </div>
          )}
          {sttError && (
            <Btn
              onClick={() => {
                getModelManager().getWorker("stt")?.postMessage({ type: "warmup" });
              }}
              style={{
                marginTop: 8,
                padding: "10px 16px",
                borderRadius: 12,
                background: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                minHeight: 44,
              }}
            >
              {resolvePhrase("ui.readiness.listen.failed_action", caregiverLang)}
            </Btn>
          )}
        </div>

        <textarea
          style={textareaStyle}
          value={transcript}
          onInput={(e) => setEditedTranscript((e.target as HTMLTextAreaElement).value)}
          placeholder={listening ? resolvePhrase("ui.provider.listen.listening_placeholder", caregiverLang) : transcribing ? resolvePhrase("ui.provider.listen.transcribing_placeholder", caregiverLang) : resolvePhrase("ui.provider.listen.type_placeholder", caregiverLang)}
          aria-label={resolvePhrase("ui.provider.listen.transcript_aria", caregiverLang)}
        />

        <Btn
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={submitBtnStyle}
          aria-label={resolvePhrase("ui.provider.listen.add_as", caregiverLang).replace("{prov}", providerLabel)}
        >
          {resolvePhrase("ui.provider.listen.add_as", caregiverLang).replace("{prov}", providerLabel)}
        </Btn>

        <div style={{ fontSize: 12, color: t.muted, textAlign: "center", marginTop: 14 }}>
          {resolvePhrase("ui.provider.listen.privacy_notice", caregiverLang)}
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
