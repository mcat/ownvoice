/**
 * Curation rules for the Web Speech API voice list.
 *
 * The Web Speech API hands us whatever the OS reports, including
 * "novelty" voices like Bad News, Bells, Pipe Organ, etc. — fine
 * for demos, deeply inappropriate in a clinical setting. This module
 * classifies each `SpeechSynthesisVoice` into one of three buckets:
 *
 *   - **blocked**: hidden from the picker entirely (novelty / sound-effect
 *     voices whose mere appearance is a safety risk).
 *   - **recommended**: surfaced prominently in the picker (known-good
 *     human-sounding voices across the locales the app supports).
 *   - **other**: everything else — kept behind a "More voices" disclosure
 *     so a clinician can still choose an unusual voice if they need to.
 *
 * An independent **enhanced** check flags voices that come from a neural /
 * premium pipeline — Apple's "(Enhanced)" / "(Premium)" / Siri voices,
 * Google Chrome's cloud voices (name prefix "Google "), and Microsoft's
 * neural voices (name contains "Neural" or "Online"). This is orthogonal
 * to recommended/other — either bucket can contain an enhanced voice.
 *
 * Lists are intentionally data, not inferred — the consequences of a wrong
 * classification in a clinical setting are worse than the maintenance cost
 * of updating a Set when a new OS voice ships.
 */

/**
 * Exact voice names Apple ships as sound-effect / novelty voices on macOS
 * (a subset is available on iPadOS). Matched case-sensitively against
 * `voice.name`. Covers the classic novelty set plus the retro robotic
 * voices ("Albert", "Fred", "Ralph", "Junior", "Kathy") that pre-date
 * Apple's neural TTS and sound deeply robotic by modern standards —
 * not appropriate as a patient's voice in an ICU.
 */
export const BLOCKED_VOICE_NAMES: ReadonlySet<string> = new Set([
  "Albert",
  "Bad News",
  "Bahh",
  "Bells",
  "Boing",
  "Bubbles",
  "Cellos",
  "Deranged",
  "Fred",
  "Good News",
  "Hysterical",
  "Jester",
  "Junior",
  "Kathy",
  "Organ",
  "Pipe Organ",
  "Ralph",
  "Superstar",
  "Trinoids",
  "Whisper",
  "Wobble",
  "Zarvox",
]);

/**
 * Regex patterns that catch variants of blocked voices — "Pipe Organ"
 * sometimes appears with extra whitespace or casing. Keep the set small;
 * the exact-match list above is the primary gate.
 */
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /\bpipe\s*organ\b/i,
];

/**
 * Voices that are clinically appropriate — human-sounding, professional
 * in tone. Matched against the "bare" voice name (parenthetical suffixes
 * like "(Enhanced)" stripped), so "Samantha (Enhanced)" counts as
 * "Samantha" for recommendation purposes.
 *
 * Grouped by locale for maintenance; a voice only needs to appear once.
 */
export const RECOMMENDED_VOICE_NAMES: ReadonlySet<string> = new Set([
  // Apple English — US / UK / AU / IE / IN / ZA
  "Samantha", "Alex", "Allison", "Ava", "Susan", "Tom", "Victoria",
  "Daniel", "Fiona", "Karen", "Moira", "Serena", "Tessa", "Veena",
  "Nicky", "Kate", "Martha", "Siri", "Rishi",
  // Apple Spanish — ES / MX
  "Monica", "Mónica", "Paulina", "Jorge", "Juan", "Angelica", "Angélica",
  // Apple French — FR / CA
  "Amélie", "Amelie", "Thomas", "Aurelie", "Aurélie",
  // Apple German
  "Anna", "Markus", "Petra",
  // Apple Italian
  "Alice", "Federica", "Luca",
  // Apple Portuguese — BR / PT
  "Joana", "Luciana",
  // Apple Mandarin / Cantonese
  "Mei-Jia", "Ting-Ting", "Sin-Ji",
  // Apple Japanese / Korean
  "Kyoko", "Otoya", "Yuna",
  // Apple Russian
  "Milena", "Yuri",
  // Apple Arabic / Hindi / Turkish / Hebrew / Vietnamese / Thai
  "Maged", "Tarik", "Lekha", "Yelda", "Carmit", "Linh", "Kanya",

  // Microsoft Edge / Windows neural voices
  "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy",
  "Microsoft David", "Microsoft Zira", "Microsoft Mark",

  // Chrome's Google voices are named by locale, not person;
  // they're picked up by the `Google ` prefix rule in isRecommendedVoice
  // rather than listed here.
]);

/**
 * Regex patterns that mark a voice as "enhanced" — neural / premium /
 * Siri / cloud-backed pipelines. Matches against the full voice name.
 */
const ENHANCED_NAME_PATTERNS: readonly RegExp[] = [
  /\(Enhanced\)/i,
  /\(Premium\)/i,
  /\(Siri[^)]*\)/i,   // "(Siri Voice 1)", "(Siri)"
  /\bNeural\b/i,
  /\bOnline\b/i,      // Microsoft cloud voices often include "Online"
];

/**
 * voiceURI substrings (lower-cased) that mark the underlying
 * implementation as an enhanced pipeline. Apple's URI scheme is the most
 * reliable signal since the localized name can vary.
 */
const ENHANCED_URI_SUBSTRINGS: readonly string[] = [
  ".siri.",
  ".premium.",
  ".enhanced.",
  "com.apple.voice.compact.siri",
  "neural",
];

/** A voice that the picker should hide entirely. */
export function isBlockedVoice(v: SpeechSynthesisVoice): boolean {
  if (BLOCKED_VOICE_NAMES.has(v.name)) return true;
  if (BLOCKED_PATTERNS.some((p) => p.test(v.name))) return true;
  return false;
}

/**
 * A voice the picker should surface in the prominent "Recommended"
 * section. The parenthetical-stripping ("Samantha (Enhanced)" → "Samantha")
 * keeps the Set small while handling Apple's enhanced-variant naming.
 */
export function isRecommendedVoice(v: SpeechSynthesisVoice): boolean {
  if (RECOMMENDED_VOICE_NAMES.has(v.name)) return true;
  const bare = v.name.split("(")[0].trim();
  if (RECOMMENDED_VOICE_NAMES.has(bare)) return true;
  // Chrome ships Google cloud voices as "Google US English",
  // "Google español", etc. All are neural-quality and safe.
  if (v.name.startsWith("Google ")) return true;
  return false;
}

/** A voice produced by a neural / premium / cloud pipeline. */
export function isEnhancedVoice(v: SpeechSynthesisVoice): boolean {
  if (ENHANCED_NAME_PATTERNS.some((p) => p.test(v.name))) return true;
  const uri = v.voiceURI.toLowerCase();
  if (ENHANCED_URI_SUBSTRINGS.some((s) => uri.includes(s))) return true;
  // Chrome's Google voices are all server-backed neural quality.
  if (v.name.startsWith("Google ")) return true;
  return false;
}

export interface CuratedVoices {
  recommended: SpeechSynthesisVoice[];
  other: SpeechSynthesisVoice[];
}

/**
 * Partition a raw voice list into the recommended / other buckets.
 * Blocked voices are dropped entirely.
 */
export function curateVoices(voices: readonly SpeechSynthesisVoice[]): CuratedVoices {
  const recommended: SpeechSynthesisVoice[] = [];
  const other: SpeechSynthesisVoice[] = [];
  for (const v of voices) {
    if (isBlockedVoice(v)) continue;
    if (isRecommendedVoice(v)) recommended.push(v);
    else other.push(v);
  }
  return { recommended, other };
}
