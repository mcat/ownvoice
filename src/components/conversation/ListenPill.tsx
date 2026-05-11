import { useListenSession } from "../../hooks/useListenSession";
import { useSpeakActions } from "../../hooks/useSpeakActions";
import { useSettingsStore } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { DraftBubble } from "./DraftBubble";
import { DraftActions } from "./DraftActions";
import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";

interface ListenPillProps {
  providerName: string;
  language: string;
  t: ThemeTokens;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ListenPill({ providerName, language, t }: ListenPillProps) {
  const session = useListenSession({ language });
  const { composeThread } = useSpeakActions();
  const locale = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  const idleLabel = resolvePhrase("ui.thread.listen.idle_label", locale);
  const privacyNotice = resolvePhrase("ui.thread.listen.privacy_notice", locale);
  const recordingLabel = resolvePhrase("ui.thread.listen.recording_label", locale);

  const onIdleTap = () => void session.start();
  const onRecordingTap = () => void session.stop();

  const onAdd = () => {
    if (session.state.phase !== "draft") return;
    for (const s of session.state.sentences) {
      const text = s.text.trim();
      if (!text) continue;
      composeThread(text, {
        from: "provider",
        providerLabel: providerName,
        via: "mic",
      });
    }
    session.reset();
  };

  const onDiscardDraft = () => session.reset();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "8px 12px",
        borderTop: `1px solid ${t.border}`,
        background: t.card,
      }}
    >
      {session.state.phase === "draft" && (
        <>
          <DraftBubble
            sentences={session.state.sentences}
            transcribing={session.state.transcribing}
            onEditSentence={session.editSentence}
            onDiscardSentence={session.discardSentence}
            locale={locale}
            t={t}
          />
          <DraftActions
            providerName={providerName}
            addDisabled={session.state.transcribing != null || session.state.sentences.length === 0}
            onAdd={onAdd}
            onDiscard={onDiscardDraft}
            locale={locale}
            t={t}
          />
        </>
      )}

      {session.state.phase === "idle" && (
        <>
          <button
            type="button"
            onClick={onIdleTap}
            aria-label={idleLabel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 999,
              background: t.card,
              border: `2px solid ${colors.provider.light}`,
              color: colors.provider.light,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🎤 {idleLabel}
          </button>
          <span style={{ fontSize: 11, color: t.muted }}>{privacyNotice}</span>
        </>
      )}

      {session.state.phase === "recording" && (
        <button
          type="button"
          onClick={onRecordingTap}
          aria-label={recordingLabel}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 999,
            background: colors.urgent,
            border: `2px solid ${colors.urgent}`,
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#FFFFFF",
              animation: "pulse 1s infinite",
            }}
          />
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
            {formatTime(session.state.elapsedMs)}
          </span>
          <span
            aria-hidden
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.3)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${Math.min(100, session.state.level * 100)}%`,
                background: "#FFFFFF",
                transition: "width 80ms linear",
              }}
            />
          </span>
          <span>{recordingLabel}</span>
        </button>
      )}

      {session.state.phase === "recording" &&
        session.state.silenceCountdownMs != null &&
        session.state.silenceCountdownMs <= 5000 && (
          <div
            role="status"
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              background: t.text,
              color: "#FBBF24",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {resolvePhrase("ui.thread.listen.silence_warning", locale).replace(
              "{countdown}",
              String(Math.ceil(session.state.silenceCountdownMs / 1000)),
            )}
          </div>
        )}
    </div>
  );
}
