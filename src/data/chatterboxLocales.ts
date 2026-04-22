/**
 * BCP 47 locales Chatterbox Turbo can synthesize with a cloned voice
 * embedding. If the target speech-output locale isn't in this set, voice
 * cloning is suppressed and the app falls back to Web Speech.
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
 * True when Chatterbox Turbo can synthesize the given locale from a
 * cloned voice embedding. Pass cfg.caregiverLang to decide whether the
 * patient clone is usable, or cfg.patientLang to decide whether each
 * provider clone is usable.
 */
export function canCloneForLocale(locale: string): boolean {
  return CHATTERBOX_LOCALES.has(locale);
}
