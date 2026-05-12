import { useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { useListenSession } from "../../hooks/useListenSession";
import { useSpeakActions } from "../../hooks/useSpeakActions";
import { useSettingsStore } from "../../stores/settingsStore";
import { useModels } from "../../hooks/useModels";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { DraftBubble } from "./DraftBubble";
import { DraftActions } from "./DraftActions";
import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";

interface ListenPillProps {
  providerName: string;
  language: string;
  t: ThemeTokens;
  /** When provided, the draft block (DraftBubble + error + DraftActions)
   *  is rendered via portal into this target instead of inline below the
   *  pill. Thread.tsx passes a node inside the scrolling message list so
   *  the draft flows with messages instead of clipping at the bordered
   *  surface edge. */
  draftTarget?: Element | null;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ListenPill({ providerName, language, t, draftTarget }: ListenPillProps) {
  const session = useListenSession({ language });
  const { composeThread } = useSpeakActions();
  const locale = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  // Reactive readiness: `useModels` subscribes to the model manager's
  // progress events, so the pill flips enabled the moment STT warms up
  // without needing another unrelated re-render to flush the gate.
  const models = useModels();
  const sttReady = models.isWarm("stt");

  const idleLabel = resolvePhrase("ui.thread.listen.idle_label", locale);
  const recordingLabel = resolvePhrase("ui.thread.listen.recording_label", locale);
  const engineNotReadyHint = resolvePhrase(
    "ui.thread.listen.engine_not_ready",
    locale,
  );
  const tryAgainLabel = resolvePhrase("ui.thread.listen.try_again", locale);

  const onIdleTap = () => {
    if (!sttReady) return;
    void session.start();
  };
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

  // Auto-scroll the draft into view when the user stops recording.
  // Without this, a draft can land below the visible scroll area
  // (especially with multi-sentence captures) and the user has to
  // manually scroll to find it.
  useEffect(() => {
    if (session.state.phase === "draft" && draftTarget != null) {
      draftTarget.scrollIntoView?.({ block: "start", behavior: "smooth" });
    }
  }, [session.state.phase, draftTarget]);

  const draftBlock = session.state.phase === "draft" ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        marginTop: 8,
      }}
    >
      <DraftBubble
        sentences={session.state.sentences}
        transcribing={session.state.transcribing}
        onEditSentence={session.editSentence}
        onDiscardSentence={session.discardSentence}
        locale={locale}
        t={t}
      />
      {session.state.error != null && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 8,
            background: t.card,
            border: `1px solid ${colors.urgent}`,
            color: colors.urgent,
            fontSize: 12,
            fontWeight: 600,
            marginTop: 6,
          }}
        >
          <span style={{ flex: 1 }}>
            {resolvePhrase("ui.thread.listen.error_message", locale)}
          </span>
          <button
            type="button"
            onClick={() => session.tryAgain()}
            aria-label={tryAgainLabel}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${colors.urgent}`,
              background: "transparent",
              color: colors.urgent,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tryAgainLabel}
          </button>
        </div>
      )}
      <DraftActions
        providerName={providerName}
        addDisabled={session.state.transcribing != null || session.state.sentences.length === 0}
        onAdd={onAdd}
        onDiscard={onDiscardDraft}
        locale={locale}
        t={t}
      />
    </div>
  ) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
      }}
    >
      {/* Draft renders either via portal into a target inside the scroll
          content (so it flows with messages and stays inside the bordered
          surface), or inline below the pill as a fallback when no target
          is supplied (e.g., standalone usage in unit tests). */}
      {draftBlock != null && (draftTarget ? createPortal(draftBlock, draftTarget) : draftBlock)}

      {session.state.phase === "idle" && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onIdleTap}
            disabled={!sttReady}
            aria-disabled={!sttReady}
            aria-label={sttReady ? idleLabel : `${idleLabel} — ${engineNotReadyHint}`}
            title={sttReady ? undefined : engineNotReadyHint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 999,
              background: t.card,
              border: `2px solid ${sttReady ? colors.provider.light : t.muted}`,
              color: sttReady ? colors.provider.light : t.muted,
              fontSize: 14,
              fontWeight: 600,
              cursor: sttReady ? "pointer" : "not-allowed",
              opacity: sttReady ? 1 : 0.5,
            }}
          >
            🎤 {idleLabel}
          </button>
          {/* Only surface the not-ready hint when the pill is disabled
              — vertical space is at a premium and the privacy notice
              once shown alongside the ready pill added no signal. */}
          {!sttReady && (
            <span style={{ fontSize: 11, color: t.muted }}>
              {engineNotReadyHint}
            </span>
          )}
        </div>
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
