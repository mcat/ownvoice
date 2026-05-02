import { painColors } from "../../theme/tokens";
import { useTheme } from "../../hooks/useTheme";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/locales/en";
import type { VoiceQualityResult } from "../../models/types";

/**
 * Maps each non-special sub-score to its tip phrase key. spectralTilt is
 * routed via spectralTiltDirection (boomy/tinny) and pitchVariation has its
 * own constant — both handled in {@link tipKeyFor}, not via this map.
 */
const SUBSCORE_TIP_KEYS: Record<
  Exclude<keyof VoiceQualityResult["breakdown"], "spectralTilt" | "pitchVariation">,
  PhraseKey
> = {
  snr: "ui.voice_quality.tip.snr",
  clipping: "ui.voice_quality.tip.clipping",
  coverage: "ui.voice_quality.tip.coverage",
  voicedFraction: "ui.voice_quality.tip.voiced_fraction",
  loudnessConsistency: "ui.voice_quality.tip.loudness",
};

const PITCH_TIP_KEY: PhraseKey = "ui.voice_quality.tip.pitch_variation";

export type QualityLabel = "good" | "ok" | "poor";

/** Bucket a 0-100 score into a coarse label. */
export function labelFor(score: number): QualityLabel {
  if (score >= 80) return "good";
  if (score >= 50) return "ok";
  return "poor";
}

/**
 * Pick the best single tip for the user, or null when the score is good
 * enough that no tip is warranted. Selects the lowest non-null sub-score
 * and routes through the spectral-tilt direction when that sub-score wins.
 */
export function tipKeyFor(quality: VoiceQualityResult): PhraseKey | null {
  if (quality.score >= 80) return null;
  let lowestKey: keyof VoiceQualityResult["breakdown"] | null = null;
  let lowestVal = Infinity;
  for (const k of Object.keys(quality.breakdown) as (keyof VoiceQualityResult["breakdown"])[]) {
    const v = quality.breakdown[k];
    if (v === null || v === undefined) continue;
    if (v < lowestVal) {
      lowestVal = v;
      lowestKey = k;
    }
  }
  if (lowestKey === null) return null;
  if (lowestKey === "pitchVariation") return PITCH_TIP_KEY;
  if (lowestKey === "spectralTilt") {
    if (quality.spectralTiltDirection === "boomy") return "ui.voice_quality.tip.tilt_boomy";
    if (quality.spectralTiltDirection === "tinny") return "ui.voice_quality.tip.tilt_tinny";
    return null;
  }
  return SUBSCORE_TIP_KEYS[lowestKey];
}

interface QualityBadgeProps {
  quality: VoiceQualityResult;
  locale: string;
  /** When true, omit the actionable-tip line. Used in the compact saved-state
   *  card; the full preview screen leaves this off so the tip is shown. */
  compact?: boolean;
}

/**
 * Presentational badge for a {@link VoiceQualityResult}. Picks a single-hue
 * indigo background from the painColors ramp (per CLAUDE.md accessibility
 * convention: no red/green) and shows the score, the bucketed label, and
 * — unless compact — the most relevant improvement tip.
 */
export function QualityBadge({ quality, locale, compact }: QualityBadgeProps) {
  const label = labelFor(quality.score);
  const labelKey = `ui.voice_quality.label.${label}` as PhraseKey;
  const tipKey = tipKeyFor(quality);

  // Indigo ramp, three steps. painColors[0] is the lightest (washed-out =
  // poor), [3] is bright but not saturated (good), [5] is mid (ok).
  const bg =
    label === "good"
      ? painColors[3]
      : label === "ok"
        ? painColors[5]
        : painColors[0];

  const { t: theme } = useTheme();

  return (
    <div
      role="status"
      aria-label={`${resolvePhrase("ui.voice_quality.title", locale)} ${Math.round(quality.score)}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 12px",
        borderRadius: 8,
        background: bg,
        color: theme.text,
        fontSize: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>
          {resolvePhrase("ui.voice_quality.title", locale)}: {Math.round(quality.score)}
        </span>
        <span>— {resolvePhrase(labelKey, locale)}</span>
      </div>
      {!compact && tipKey && (
        <div style={{ fontSize: 14 }}>{resolvePhrase(tipKey, locale)}</div>
      )}
    </div>
  );
}
