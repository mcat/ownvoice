/**
 * Contextual emoji for SentenceBuilder partials.
 *
 * Each curated/free/LLM suggestion chip resolves to an `EmojiEntry`
 * (or none). The emoji is shown trailing the chip text, then the
 * highest-weighted entry across all composed tokens becomes the final
 * `Message.icon` on the bubble.
 *
 * Weight tiers
 *  - 30 — symptoms, body states, pain descriptors. The semantic core of
 *         what the patient is reporting. These dominate the bubble.
 *  - 20 — clinical objects, care-team people, comfort items. The "what"
 *         the patient is asking for / about.
 *  - 10 — temporal modifiers ("now"). Only surface on the bubble when
 *         no higher-weighted token is present.
 *
 * Grammatical and politeness words (the/a/and/please/to/in/on/of/etc.) are
 * deliberately NOT in the map — those tokens stay icon-less, which keeps
 * chip rows quiet and prevents low-information emoji from outvoting real
 * content via the priority sort.
 *
 * The keyword scan runs on English text. The curated suggestion tree and
 * the LLM both emit English at lookup time (resolution to patientLang
 * happens at render), so the scan applies cleanly to chips. Free text
 * typed by a non-English-patientLang patient won't match — acceptable
 * limitation; documented in the design.
 */

import type { PhraseKey } from "./locales/en";
import type { SuggestionItem } from "./phraseRegistry";

export interface EmojiEntry {
  icon: string;
  weight: number;
}

/** Per-PhraseKey override. Used for the rare key whose display text
 *  doesn't contain its topical keyword (e.g. `suggest.i_feel_better.thanks`,
 *  where "thanks" alone wouldn't match "better"). Keep this list short —
 *  the keyword scan handles the common case. */
const KEY_EMOJI: Partial<Record<PhraseKey, EmojiEntry>> = {
  // Wishes carry a unifying heart on the bubble; these keys would
  // otherwise lose to nothing in the keyword scan.
  "wishes.hopes.stem": { icon: "✨", weight: 30 },        // ✨
  "wishes.joy.stem": { icon: "💛", weight: 30 },    // 💛
};

interface KeywordRule {
  pattern: RegExp;
  entry: EmojiEntry;
}

/** Word-boundary regex for an English keyword or set of variants. */
function kw(...words: string[]): RegExp {
  return new RegExp(`\\b(?:${words.join("|")})\\b`, "i");
}

/**
 * Match order doesn't determine the winner — `pickHighest` runs across
 * all matching rules and selects by weight, ties broken by *first match
 * in this list*. Group entries by tier visually for review-ability.
 */
const KEYWORD_EMOJI: ReadonlyArray<KeywordRule> = [
  // ── Tier 30: symptoms / body states ─────────────────────────────
  { pattern: kw("water", "thirsty", "drink"),     entry: { icon: "💧", weight: 30 } },          // 💧
  { pattern: kw("hungry", "eat", "food"),         entry: { icon: "🍽️", weight: 30 } },    // 🍽️
  { pattern: kw("cold", "freezing", "chilly"),    entry: { icon: "🥶", weight: 30 } },          // 🥶
  { pattern: kw("hot", "warm", "burning up"),     entry: { icon: "🥵", weight: 30 } },          // 🥵
  { pattern: kw("tired", "sleepy", "exhausted", "rest"), entry: { icon: "😴", weight: 30 } },   // 😴
  { pattern: kw("sleep"),                         entry: { icon: "😴", weight: 30 } },          // 😴
  { pattern: kw("pain", "hurt", "hurts", "hurting", "ache", "ached", "aching", "sore"), entry: { icon: "🤕", weight: 30 } }, // 🤕
  { pattern: kw("burning"),                       entry: { icon: "🔥", weight: 30 } },          // 🔥
  { pattern: kw("sharp"),                         entry: { icon: "⚡", weight: 30 } },                // ⚡
  { pattern: kw("throbbing"),                     entry: { icon: "💢", weight: 30 } },          // 💢
  { pattern: kw("cramping", "cramp"),             entry: { icon: "🔄", weight: 30 } },          // 🔄
  { pattern: kw("numb"),                          entry: { icon: "🧊", weight: 30 } },          // 🧊
  { pattern: kw("pressure"),                      entry: { icon: "🔻", weight: 30 } },          // 🔻
  { pattern: kw("nauseous", "nausea", "sick"),    entry: { icon: "🤢", weight: 30 } },          // 🤢
  { pattern: kw("dizzy"),                         entry: { icon: "😵‍💫", weight: 30 } }, // 😵‍💫
  { pattern: kw("weak"),                          entry: { icon: "🥱", weight: 30 } },          // 🥱
  { pattern: kw("itchy", "itch"),                 entry: { icon: "🤏", weight: 30 } },          // 🤏
  { pattern: kw("scared", "afraid"),              entry: { icon: "😰", weight: 30 } },          // 😰
  { pattern: kw("worried"),                       entry: { icon: "😟", weight: 30 } },          // 😟
  { pattern: kw("lonely", "alone"),               entry: { icon: "😔", weight: 30 } },          // 😔
  { pattern: kw("confused"),                      entry: { icon: "😕", weight: 30 } },          // 😕
  { pattern: kw("frustrated"),                    entry: { icon: "😤", weight: 30 } },          // 😤
  { pattern: kw("safe"),                          entry: { icon: "🤗", weight: 30 } },          // 🤗
  { pattern: kw("better"),                        entry: { icon: "💪", weight: 30 } },          // 💪
  { pattern: kw("worse"),                         entry: { icon: "📉", weight: 30 } },          // 📉
  { pattern: kw("breathe", "breathing", "breath"), entry: { icon: "💨", weight: 30 } },         // 💨
  { pattern: kw("uncomfortable"),                 entry: { icon: "😣", weight: 30 } },          // 😣

  // Body regions — tier 30, lower than symptoms only because symptoms
  // are usually the topic word; pain.region.* descriptors win when both
  // appear because of first-match ordering inside the same tier.
  { pattern: kw("chest"),                         entry: { icon: "🫁", weight: 30 } },          // 🫁  (lung)
  { pattern: kw("stomach", "belly"),              entry: { icon: "🫃", weight: 30 } },          // 🫃
  { pattern: kw("back"),                          entry: { icon: "🦴", weight: 30 } },          // 🦴
  { pattern: kw("head", "headache"),              entry: { icon: "🤕", weight: 30 } },          // 🤕
  { pattern: kw("neck", "shoulder", "arm", "leg"), entry: { icon: "🦵", weight: 30 } },         // 🦵 (limb)

  // ── Tier 20: clinical objects / actions / people ────────────────
  { pattern: kw("medication", "medicine", "pills", "pill", "drug"), entry: { icon: "💊", weight: 20 } }, // 💊
  { pattern: kw("blanket"),                       entry: { icon: "🛏️", weight: 20 } },    // 🛏️
  { pattern: kw("bed"),                           entry: { icon: "🛏️", weight: 20 } },    // 🛏️
  { pattern: kw("bathroom", "toilet"),            entry: { icon: "🚻", weight: 20 } },          // 🚻
  { pattern: kw("light", "lights"),               entry: { icon: "💡", weight: 20 } },          // 💡
  { pattern: kw("phone"),                         entry: { icon: "📞", weight: 20 } },          // 📞
  { pattern: kw("glasses"),                       entry: { icon: "👓", weight: 20 } },          // 👓
  { pattern: kw("home"),                          entry: { icon: "🏠", weight: 20 } },          // 🏠
  { pattern: kw("nurse"),                         entry: { icon: "👩‍⚕️", weight: 20 } }, // 👩‍⚕️
  { pattern: kw("doctor"),                        entry: { icon: "🩺", weight: 20 } },          // 🩺
  { pattern: kw("family"),                        entry: { icon: "👨‍👩‍👧", weight: 20 } }, // 👨‍👩‍👧
  { pattern: kw("interpreter", "translator"),     entry: { icon: "🗣️", weight: 20 } },    // 🗣️
  { pattern: kw("help"),                          entry: { icon: "🆘", weight: 20 } },          // 🆘
  { pattern: kw("call"),                          entry: { icon: "📞", weight: 20 } },          // 📞
  { pattern: kw("suction"),                       entry: { icon: "🩺", weight: 20 } },          // 🩺
  { pattern: kw("treatment", "procedure"),        entry: { icon: "📋", weight: 20 } },          // 📋
  { pattern: kw("explain"),                       entry: { icon: "💬", weight: 20 } },          // 💬
  { pattern: kw("stay"),                          entry: { icon: "🤝", weight: 20 } },          // 🤝

  // ── Tier 10: temporal modifiers ─────────────────────────────────
  { pattern: kw("now", "right now"),              entry: { icon: "⏰", weight: 10 } },                // ⏰
  { pattern: kw("again"),                         entry: { icon: "🔁", weight: 10 } },          // 🔁
  { pattern: kw("today"),                         entry: { icon: "📅", weight: 10 } },          // 📅
  { pattern: kw("tomorrow"),                      entry: { icon: "📅", weight: 10 } },          // 📅
];

/** Resolve an emoji entry for a SuggestionItem. Tries the per-key
 *  override table first, then falls back to a keyword scan on the
 *  item's English text. Returns `undefined` when nothing matches. */
export function resolveEmoji(item: SuggestionItem): EmojiEntry | undefined {
  if (item.key) {
    const override = KEY_EMOJI[item.key];
    if (override) return override;
  }
  return scanKeywordEmoji(item.text);
}

/** Run the keyword regex map against an arbitrary English string. Used
 *  for free-text input committed by the patient and for LLM suggestions
 *  (which arrive without a PhraseKey). Highest weight wins; ties broken
 *  by first match in the rule list. */
export function scanKeywordEmoji(text: string): EmojiEntry | undefined {
  let best: EmojiEntry | undefined;
  for (const rule of KEYWORD_EMOJI) {
    if (!rule.pattern.test(text)) continue;
    if (!best || rule.entry.weight > best.weight) best = rule.entry;
  }
  return best;
}

/** Pick the bubble icon from a sequence of emoji-bearing tokens.
 *  Highest weight wins; ties broken by *first occurrence*, mirroring
 *  the natural reading order. Returns `undefined` if no token has an
 *  emoji — keeping pre-existing free-text-bubble behavior intact. */
export function pickBubbleIcon(
  tokens: ReadonlyArray<{ emoji?: EmojiEntry }>,
): string | undefined {
  let best: EmojiEntry | undefined;
  for (const tok of tokens) {
    if (!tok.emoji) continue;
    if (!best || tok.emoji.weight > best.weight) best = tok.emoji;
  }
  return best?.icon;
}
