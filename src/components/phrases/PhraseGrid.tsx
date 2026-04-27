import { useState, useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import { PhraseButton } from "./PhraseButton";
import type { Phrase } from "../../types";
import type { PhraseKey } from "../../data/locales/en";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseGridProps {
  phrases: Phrase[];
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
  /** Accessible name for the grid container. Caller passes the active
   *  category label, e.g. "Comfort phrases". Required because
   *  `role="grid"` containers must be labelled. */
  ariaLabel: string;
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

/** Stop-at-edge arrow-key handler per WAI-ARIA grid pattern + spec §8.
 *  Returns the new flat active index, or null if the key isn't handled. */
function nextActiveIdx(
  cur: number,
  key: string,
  cols: number,
  total: number,
): number | null {
  const row = Math.floor(cur / cols);
  const rowStart = row * cols;
  const lastInRow = Math.min(rowStart + cols - 1, total - 1);
  switch (key) {
    case "ArrowRight": return Math.min(cur + 1, lastInRow);
    case "ArrowLeft":  return Math.max(cur - 1, rowStart);
    case "ArrowDown":  return Math.min(cur + cols, total - 1);
    case "ArrowUp":    return cur - cols >= 0 ? cur - cols : cur;
    case "Home":       return rowStart;
    case "End":        return lastInRow;
    case "PageDown":   return Math.min(cur + cols * 3, total - 1);
    case "PageUp":     return Math.max(cur - cols * 3, cur % cols);
    default: return null;
  }
}

export function PhraseGrid({ phrases, onTap, t, ariaLabel }: PhraseGridProps) {
  const cols = pickColumns(phrases.length);
  const [activeIdx, setActiveIdx] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  // Skip auto-focus on the very first render so opening the grid doesn't
  // steal focus from the page. Only re-focus when the user advances via
  // keyboard.
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const cells = gridRef.current?.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells?.[activeIdx]?.focus();
  }, [activeIdx]);

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    const next = nextActiveIdx(activeIdx, e.key, cols, phrases.length);
    if (next == null) return;
    e.preventDefault();
    setActiveIdx(next);
  };

  // Chunk phrases into rows of `cols`. Last row may have fewer cells.
  const rows: Phrase[][] = [];
  for (let i = 0; i < phrases.length; i += cols) {
    rows.push(phrases.slice(i, i + cols));
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
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
      {rows.map((row, rowIdx) => (
        // role="row" wrapper is structural for AT only. `display: contents`
        // means the row doesn't disrupt the parent CSS grid layout —
        // children flow into the parent's grid as if the row weren't there.
        // Verified support: Chrome 121+, Safari 17+ (well below our target
        // of iPadOS 26 / Safari 26).
        <div key={rowIdx} role="row" style={{ display: "contents" }}>
          {row.map((p, colIdx) => {
            const flatIdx = rowIdx * cols + colIdx;
            return (
              <PhraseButton
                key={p.text}
                phrase={p}
                onTap={onTap}
                t={t}
                role="gridcell"
                tabIndex={flatIdx === activeIdx ? 0 : -1}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
