import { useRef, useCallback } from "preact/hooks";
import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";

interface DraftSentenceProps {
  text: string;
  index: number; // 0-based
  total: number;
  onEdit: (newText: string) => void;
  onDiscard: () => void;
  t: ThemeTokens;
}

export function DraftSentence({
  text,
  index,
  total,
  onEdit,
  onDiscard,
  t,
}: DraftSentenceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const number = index + 1;

  const commit = useCallback(() => {
    const next = ref.current?.textContent ?? "";
    if (next !== text) onEdit(next);
  }, [text, onEdit]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        minHeight: 64,
        borderBottom: `1px dotted ${t.border}`,
      }}
    >
      <div
        ref={ref}
        role="textbox"
        aria-label={`Edit sentence ${number} of ${total}`}
        contentEditable
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ref.current?.blur();
          }
        }}
        style={{
          flex: 1,
          fontSize: 16,
          lineHeight: 1.4,
          color: t.text,
          outline: "none",
          padding: "8px 10px",
          borderRadius: 6,
          background: t.card,
        }}
      >
        {text}
      </div>
      <button
        type="button"
        onClick={onDiscard}
        aria-label={`Discard sentence ${number}`}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: colors.urgent,
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}
