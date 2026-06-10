import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import type { Sentence } from "../../hooks/useListenSession";
import { DraftSentence } from "./DraftSentence";
import { t as resolvePhrase } from "../../data/phraseRegistry";

interface DraftBubbleProps {
  sentences: Sentence[];
  transcribing: { done: number; total: number } | null;
  onEditSentence: (id: string, text: string) => void;
  onDiscardSentence: (id: string) => void;
  locale: string;
  t: ThemeTokens;
}

export function DraftBubble({
  sentences,
  transcribing,
  onEditSentence,
  onDiscardSentence,
  locale,
  t,
}: DraftBubbleProps) {
  const count = sentences.length;
  const draftLabel =
    count === 1
      ? resolvePhrase("ui.thread.listen.draft_label_one", locale)
      : resolvePhrase("ui.thread.listen.draft_label", locale).replace(
          "{count}",
          String(count),
        );
  const transcribingLabel = transcribing
    ? resolvePhrase("ui.thread.listen.transcribing_label", locale)
        .replace("{done}", String(transcribing.done))
        .replace("{total}", String(transcribing.total))
    : "";

  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: "88%",
        background: "#F0FDF4",
        border: `2px dashed ${colors.provider.light}`,
        borderRadius: 14,
        borderBottomLeftRadius: 4,
        padding: "10px 12px",
      }}
      aria-label="Draft transcript"
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.provider.light,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {draftLabel}
      </div>
      {sentences.map((s, i) => (
        <DraftSentence
          key={s.id}
          text={s.text}
          index={i}
          total={sentences.length}
          onEdit={(text) => onEditSentence(s.id, text)}
          onDiscard={() => onDiscardSentence(s.id)}
          locale={locale}
          t={t}
        />
      ))}
      {transcribing && (
        <div
          // Patient-visible thread surface: ≥18px, never italic
          // (DESIGN_GUIDELINES §4.1 — italics are a legibility hazard
          // under opioid-blurred vision).
          style={{
            fontSize: 18,
            color: t.muted,
            marginTop: 8,
          }}
          aria-live="polite"
        >
          {transcribingLabel}
        </div>
      )}
    </div>
  );
}
