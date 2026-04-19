/**
 * Recording guidance per locale — the passage the patient reads while we
 * capture 15 seconds of audio for voice cloning.
 *
 * This is deliberately separate from the speakable phrase registry because
 * these strings are *read by the patient* (displayed on screen), not
 * *spoken by the app*. They must not leak into `getAllSpeakablePhrases()`
 * or the audio cache runner.
 *
 * Why a script instead of free-form speech?
 * Chatterbox Turbo extracts a 192-dim x-vector via its CAMPPlus speaker
 * encoder. That embedding captures spectrum, pitch statistics, and formant
 * structure — and it's *averaged* across the reference clip. Patients who
 * speak monotonically for 15s under-represent their own pitch range; the
 * resulting clone sounds flatter than they do.
 *
 * The Rainbow Passage (Fairbanks, 1960) was literally designed for
 * proportional English phoneme coverage and is the canonical reference
 * passage in the VCTK corpus. The opening two sentences run ~14s at
 * conversational pace — a near-perfect fit for the 15s budget.
 *
 * See `docs/BIBLIOGRAPHY.md` §9 ("Voice Cloning Reference Audio") for
 * citations.
 *
 * Locales without a native-speaker-reviewed script fall through to the
 * free-speak coaching — still produces a usable embedding; the clone is
 * just slightly less expressive.
 */
export interface RecordingScript {
  /** Short label above the passage, e.g. "Read this aloud:". */
  prompt: string;
  /** The passage the patient reads. Omit for free-speak fallback. */
  passage?: string;
  /** Gentle subtitle under the passage offering an escape hatch. */
  subtitle?: string;
  /** Coaching text shown at t=0 before the reader begins. */
  openingHint: string;
  /** Coaching text shown in the final ~3 seconds. */
  closingHint: string;
  /** Coaching used for free-speak mode (no passage). Takes a `remaining` seconds placeholder. */
  freeSpeakTemplate: string;
}

const english: RecordingScript = {
  prompt: "Read this aloud:",
  passage:
    "When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors.",
  subtitle: "Or speak naturally — anything works.",
  openingHint: "Take a breath, then begin.",
  closingHint: "Nice — almost done.",
  freeSpeakTemplate: "Speak naturally for {remaining} more seconds…",
};

const freeSpeakFallback: RecordingScript = {
  prompt: "",
  openingHint: "Take a breath, then begin.",
  closingHint: "Nice — almost done.",
  freeSpeakTemplate: "Speak naturally for {remaining} more seconds…",
};

const SCRIPTS: Record<string, RecordingScript> = {
  en: english,
  "en-US": english,
  "en-GB": english,
};

export function getRecordingScript(locale: string | undefined): RecordingScript {
  if (!locale) return freeSpeakFallback;
  if (SCRIPTS[locale]) return SCRIPTS[locale];
  const base = locale.split("-")[0];
  return SCRIPTS[base] ?? freeSpeakFallback;
}
