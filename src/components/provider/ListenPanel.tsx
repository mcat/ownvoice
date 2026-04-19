import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { Btn } from "../shared/Btn";
import { useMicrophone } from "../../hooks/useMicrophone";
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

  const [editedTranscript, setEditedTranscript] = useState<string | null>(null);
  const transcript = editedTranscript !== null ? editedTranscript : sttTranscript;

  const provider = providers[activeProvIdx] ?? providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : "Provider";

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

  const shadowSpread = listening ? Math.round(16 + audioLevel * 12) : 0;
  const shadowAlpha = listening
    ? Math.round(0.2 * 255 + audioLevel * 0.35 * 255).toString(16).padStart(2, "0")
    : "00";

  const micBtnStyle: JSX.CSSProperties = {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: listening ? `3px solid ${blue}` : `2px solid ${t.border}`,
    background: listening
      ? theme === "dark"
        ? "rgba(96,165,250,0.15)"
        : "rgba(37,99,235,0.08)"
      : t.activeBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    color: listening ? blue : t.muted,
    transition: "border 0.2s, background 0.2s, color 0.2s",
    boxShadow: listening ? `0 0 ${shadowSpread}px ${blue}${shadowAlpha}` : "none",
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
        <BottomSheet.Title>Listen</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close panel" />
      </BottomSheet.Header>

      <BottomSheet.Body>
        {providers.length > 1 ? (
          <div style={chipRowStyle}>
            {providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx)}
                aria-label={`Select ${prov.name}`}
                aria-pressed={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        ) : (
          <div style={singleProvStyle}>
            {provider?.emoji ? `${provider.emoji} ` : ""}
            {provider?.name ?? "Provider"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <Btn
            onClick={() => {
              if (listening) {
                stopCapture();
              } else {
                setEditedTranscript(null);
                startCapture();
              }
            }}
            style={micBtnStyle}
            aria-label={listening ? "Stop listening" : "Tap to start listening"}
          >
            🎙
          </Btn>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 10 }}>
            {listening ? "Listening..." : transcribing ? "Transcribing..." : "Tap to start listening"}
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
        </div>

        <textarea
          style={textareaStyle}
          value={transcript}
          onInput={(e) => setEditedTranscript((e.target as HTMLTextAreaElement).value)}
          placeholder={listening ? "Listening for speech..." : transcribing ? "Transcribing speech..." : "Or type what was said..."}
          aria-label="Transcript"
        />

        <Btn
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={submitBtnStyle}
          aria-label={`Add to conversation as ${providerLabel}`}
        >
          Add to conversation as {providerLabel}
        </Btn>

        <div style={{ fontSize: 12, color: t.muted, textAlign: "center", marginTop: 14 }}>
          On-device &middot; Whisper &middot; no audio leaves this device
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
