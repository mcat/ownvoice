import { PhraseButton } from "./PhraseButton";
import type { Phrase } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseGridProps {
  phrases: Phrase[];
  onTap: (text: string) => void;
  t: ThemeTokens;
}

/** Responsive grid: max 3 cols on 11" iPad. 12px gap between targets. */
export function PhraseGrid({ phrases, onTap, t }: PhraseGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
      }}
    >
      {phrases.map((p) => (
        <PhraseButton key={p.text} phrase={p} onTap={onTap} t={t} />
      ))}
    </div>
  );
}
