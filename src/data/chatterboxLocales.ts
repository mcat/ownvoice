/**
 * BCP 47 locales Chatterbox Multilingual can synthesize with a cloned
 * voice embedding. If the target speech-output locale isn't in this set,
 * voice cloning is suppressed and the app falls back to Web Speech.
 *
 * Placed under src/data/ so it sits inside the project's mutation-audit
 * scope (see .claude/skills/mutation-audit/skill.md "File risk rankings").
 */
export const CHATTERBOX_LOCALES: ReadonlySet<string> = new Set([
  "ar", "zh", "da", "nl", "en", "fi", "fr", "de", "el", "he",
  "hi", "it", "ja", "ko", "ms", "no", "pl", "pt", "ru", "es",
  "sw", "sv", "tr",
]);

/**
 * True when Chatterbox Multilingual can synthesize the given locale
 * from a cloned voice embedding. Pass cfg.caregiverLang to decide
 * whether the patient clone is usable, or cfg.patientLang to decide
 * whether each provider clone is usable.
 *
 * Accepts full BCP 47 tags (e.g. "en-US") — only the base language
 * subtag is checked against the supported set.
 */
export function canCloneForLocale(locale: string): boolean {
  const base = locale.split("-")[0].toLowerCase();
  return CHATTERBOX_LOCALES.has(base);
}

/**
 * Extract the base language subtag from a BCP 47 locale string.
 * Used to derive the `languageId` that the Chatterbox Multilingual
 * workers expect (e.g. "en-US" → "en").
 */
export function baseLocale(locale: string): string {
  return locale.split("-")[0].toLowerCase();
}
