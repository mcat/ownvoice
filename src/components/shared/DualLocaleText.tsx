import type { JSX } from "preact";
import { t } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/locales/en";

export interface DualLocaleTextProps {
  primaryKey: PhraseKey;
  primaryLocale: string;
  /** For patient-surface co-reading, pass cfg.caregiverLang. For Thread
   *  transcript bubbles, pass the listener's locale. */
  glossLocale: string;
  variant: "transcript" | "co-read";
  /** Optional override for the primary — use when the primary is a composed
   *  sentence rather than a single key. */
  primaryText?: string;
  /** Optional override for the gloss — same reason. */
  glossText?: string;
  style?: JSX.CSSProperties;
}

const SIZES = {
  transcript: { primary: 18, gloss: 14, primaryWeight: 500 },
  "co-read":  { primary: 24, gloss: 18, primaryWeight: 700 },
} as const;

export function DualLocaleText(props: DualLocaleTextProps) {
  const {
    primaryKey, primaryLocale, glossLocale, variant,
    primaryText, glossText, style,
  } = props;
  const sizes = SIZES[variant];
  const primary = primaryText ?? t(primaryKey, primaryLocale);
  const gloss = glossText ?? t(primaryKey, glossLocale);
  const showGloss = primaryLocale !== glossLocale;

  return (
    <div style={style}>
      <div
        data-dual-primary=""
        style={{ fontSize: sizes.primary, fontWeight: sizes.primaryWeight }}
      >
        {primary}
      </div>
      {showGloss && (
        <div
          data-dual-gloss=""
          style={{ fontSize: sizes.gloss, opacity: 0.72, marginTop: 4 }}
          aria-hidden={variant === "transcript"}
        >
          {gloss}
        </div>
      )}
    </div>
  );
}
