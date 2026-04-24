import { PhraseButton } from "./PhraseButton";
import type { Phrase } from "../../types";
import type { PhraseKey } from "../../data/locales/en";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseGridProps {
  phrases: Phrase[];
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
}

/**
 * Pick a column count that keeps cells roughly in landscape aspect on an
 * iPad without leaving a lone orphan button on the last row.
 * Targets 2–3 rows for typical phrase counts.
 */
function pickColumns(n: number): number {
  if (n <= 3) return Math.max(1, n);
  if (n <= 6) return 3;
  if (n <= 12) return 4;
  if (n <= 20) return 5;
  return 6;
}

export function PhraseGrid({ phrases, onTap, t }: PhraseGridProps) {
  const cols = pickColumns(phrases.length);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(100px, 240px)",
        gap: 14,
        flex: 1,
        minHeight: 0,
        alignContent: "start",
      }}
    >
      {phrases.map((p) => (
        <PhraseButton key={p.text} phrase={p} onTap={onTap} t={t} />
      ))}
    </div>
  );
}
