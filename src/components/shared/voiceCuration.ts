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
  // Classic novelty / sound-effect voices
  "Bad News",
  "Bahh",
  "Bells",
  "Boing",
  "Bubbles",
  "Cellos",
  "Deranged",
  "Good News",
  "Hysterical",
  "Jester",
  "Organ",
  "Pipe Organ",
  "Superstar",
  "Trinoids",
  "Whisper",
  "Wobble",
  "Zarvox",

  // Retro robotic Apple voices (pre-neural, ~2005-era quality)
  "Albert",
  "Fred",
  "Junior",
  "Kathy",
  "Ralph",

  // Apple "personality" voices (casual/novelty timbre, not clinical-appropriate).
  // These are the voices that accumulated in the "More voices" disclosure
  // on a user's device — they're newer than the retro robotic set but
  // stylized (caricatured elderly, surfer, etc.) in ways that don't belong
  // in an ICU fallback voice.
  "Aaron",
  "Arthur",
  "Eddy",
  "Flo",
  "Grandma",
  "Grandpa",
  "Nathan",
  "Reed",
  "Rocko",
  "Sandy",
  "Shelley",
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
 * Microsoft voice "roots" that should be blocked — the SAPI 4 / Vista-era
 * voices that sound like 2005 and are inappropriate in a clinical setting.
 * Matched as `Microsoft <root>` followed by a non-alphanumeric boundary,
 * so "Microsoft Sam - English (US)" is blocked but "Microsoft Samuel"
 * would not be (if it ever shipped).
 *
 * "LH" blocks the ancient Lernout & Hauspie voices Microsoft inherited
 * ("Microsoft LH Michael", "Microsoft LH Michelle", …).
 */
export const MICROSOFT_BLOCKED_ROOTS: ReadonlySet<string> = new Set([
  "Sam",
  "Mike",
  "Mary",
  "Anna",
  "LH",
]);

/**
 * Microsoft voice "roots" that should be recommended — the Windows 10/11
 * SAPI 5 voices and their Mobile counterparts across all locales
 * Microsoft ships for. More synthetic than Azure Neural (which already
 * gets picked up by the enhanced-pattern detection) but clear,
 * professional, and acceptable in a clinical fallback context.
 *
 * Matched as `Microsoft <root>` followed by a non-alphanumeric boundary
 * — so "Microsoft David Desktop - English (United States)" recommends
 * on "David" but "Microsoft Davidson" would not.
 *
 * Grouped by locale for maintenance; a voice only needs to appear once.
 */
export const MICROSOFT_RECOMMENDED_ROOTS: ReadonlySet<string> = new Set([
  // English
  "David", "Zira", "Mark",                            // en-US
  "Hazel", "Susan", "George",                         // en-GB
  "Catherine", "James",                               // en-AU
  "Linda", "Richard",                                 // en-CA
  "Heera", "Ravi",                                    // en-IN

  // Spanish
  "Helena", "Pablo", "Laura",                         // es-ES
  "Sabina", "Raul",                                   // es-MX

  // French
  "Julie", "Paul", "Hortense",                        // fr-FR
  "Caroline", "Claude",                               // fr-CA

  // German
  "Hedda", "Katja", "Stefan",                         // de-DE

  // Italian
  "Elsa", "Cosimo",                                   // it-IT

  // Portuguese (Brazil) — note "Daniel" and "Maria" clash with human
  // first names used by Apple's recommended list, but the Microsoft-
  // prefix matcher won't collide with Apple entries (different name
  // spaces entirely).
  "Maria", "Daniel", "Helia",                         // pt-BR

  // Japanese
  "Haruka", "Sayaka",                                 // ja-JP

  // Chinese
  "Huihui", "Kangkang", "Yaoyao",                     // zh-CN
  "Hanhan", "Zhiwei",                                 // zh-TW
  "Tracy", "Danny",                                   // zh-HK

  // Korean
  "Heami",                                            // ko-KR

  // Russian
  "Irina", "Pavel",                                   // ru-RU

  // Additional locales Microsoft ships SAPI 5 voices for
  "Naayf",                                            // ar-SA
  "Kalpana", "Hemant",                                // hi-IN
  "Tolga",                                            // tr-TR
  "Adri",                                             // af-ZA
  "Matej",                                            // sk-SK
  "Jakub",                                            // cs-CZ
  "Szabolcs",                                         // hu-HU
  "Ivan",                                             // bg-BG
  "Paulina",                                          // pl-PL (also es-MX Apple — same name OK)
  "Andrika",                                          // da-DK
  "Bengt",                                            // sv-SE
  "Jon",                                              // nb-NO
  "Heidi",                                            // fi-FI
  "Frank", "Fabiola",                                 // nl-NL
  "Herena",                                           // ca-ES
  "An",                                               // vi-VN
  "Pattara",                                          // th-TH
  "Rosa",                                             // id-ID
]);

/**
 * Match a voice name of the form "Microsoft <root>[ <rest>]" or
 * exactly "Microsoft <root>" against a set of roots. The space-
 * boundary check prevents false positives ("David" root vs
 * "Davidson" voice). Chrome/Edge report Microsoft voices uniformly
 * with `" "` separators between root and suffix
 * (e.g. `"Microsoft David Desktop - English (United States)"`), so
 * a space-only boundary is sufficient.
 */
function matchesMicrosoftRoot(
  name: string,
  roots: ReadonlySet<string>,
): boolean {
  const PREFIX = "Microsoft ";
  if (!name.startsWith(PREFIX)) return false;
  const rest = name.slice(PREFIX.length);
  for (const root of roots) {
    if (rest === root) return true;
    if (rest.startsWith(root + " ")) return true;
  }
  return false;
}

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

  // Microsoft voices are handled by the MICROSOFT_RECOMMENDED_ROOTS
  // prefix matcher (above) because Chrome/Edge report them with
  // "Desktop"/"Mobile"/locale suffixes that don't survive an exact-name
  // check. Chrome's Google voices are picked up separately by the
  // "Google " prefix rule in isRecommendedVoice.
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
  // Microsoft SAPI-4 / Vista-era voices (Sam, Mike, Mary, Anna, LH*).
  if (matchesMicrosoftRoot(v.name, MICROSOFT_BLOCKED_ROOTS)) return true;
  return false;
}

/**
 * A voice the picker should surface in the prominent "Recommended"
 * section. Three paths of recognition:
 *   - exact (or parenthetical-stripped) match in RECOMMENDED_VOICE_NAMES
 *   - "Microsoft <root>" prefix match against MICROSOFT_RECOMMENDED_ROOTS
 *   - "Google " prefix match (all Chrome cloud voices are safe)
 */
export function isRecommendedVoice(v: SpeechSynthesisVoice): boolean {
  if (RECOMMENDED_VOICE_NAMES.has(v.name)) return true;
  const bare = v.name.split("(")[0].trim();
  if (RECOMMENDED_VOICE_NAMES.has(bare)) return true;
  if (matchesMicrosoftRoot(v.name, MICROSOFT_RECOMMENDED_ROOTS)) return true;
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
