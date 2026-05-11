import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import type { Sentence } from "../../hooks/useListenSession";
import { DraftSentence } from "./DraftSentence";

interface DraftBubbleProps {
  sentences: Sentence[];
  transcribing: { done: number; total: number } | null;
  onEditSentence: (id: string, text: string) => void;
  onDiscardSentence: (id: string) => void;
  t: ThemeTokens;
}

export function DraftBubble({
  sentences,
  transcribing,
  onEditSentence,
  onDiscardSentence,
  t,
}: DraftBubbleProps) {
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
        Draft · {sentences.length} sentence{sentences.length === 1 ? "" : "s"}
      </div>
      {sentences.map((s, i) => (
        <DraftSentence
          key={s.id}
          text={s.text}
          index={i}
          total={sentences.length}
          onEdit={(text) => onEditSentence(s.id, text)}
          onDiscard={() => onDiscardSentence(s.id)}
          t={t}
        />
      ))}
      {transcribing && (
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            marginTop: 8,
            fontStyle: "italic",
          }}
          aria-live="polite"
        >
          Transcribing {transcribing.done}/{transcribing.total}…
        </div>
      )}
    </div>
  );
}
