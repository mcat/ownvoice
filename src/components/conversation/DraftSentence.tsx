import { useRef, useCallback } from "preact/hooks";
import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";

interface DraftSentenceProps {
  text: string;
  index: number; // 0-based
  total: number;
  onEdit: (newText: string) => void;
  onDiscard: () => void;
  locale: string;
  t: ThemeTokens;
}

export function DraftSentence({
  text,
  index,
  total,
  onEdit,
  onDiscard,
  locale,
  t,
}: DraftSentenceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const number = index + 1;

  const editAria = resolvePhrase("ui.thread.listen.sentence_edit_aria", locale)
    .replace("{n}", String(number))
    .replace("{total}", String(total));
  const discardAria = resolvePhrase("ui.thread.listen.sentence_discard_aria", locale).replace(
    "{n}",
    String(number),
  );

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
        aria-label={editAria}
        contentEditable
        // contentEditable already makes this focusable; the explicit
        // tabIndex states it for AT heuristics and jsx-a11y.
        tabIndex={0}
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
        aria-label={discardAria}
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
