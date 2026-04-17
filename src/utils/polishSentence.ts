/**
 * Rule-based sentence cleanup for the Sentence Builder.
 *
 * The patient assembles output by tapping curated fragments or typing
 * directly. Concatenating those fragments produces a speakable string
 * that is usually close-to-grammatical but carries small artifacts the
 * TTS engine reads awkwardly: lowercase first word, mid-sentence question
 * marks (from fragments like "call my family?" tapped in the middle),
 * double spaces where a trailing-space fragment butted up against a
 * leading-space fragment, missing terminal punctuation, and the
 * occasional accidentally-repeated tap ("I I feel").
 *
 * This function runs before we hand the string to the TTS pipeline. It is
 * deterministic, covers ~80% of visible glitches with zero latency or
 * hallucination risk, and leaves the harder grammar work (agreement,
 * word order) to a future opt-in LLM polish layer.
 *
 * Rules, in order:
 *   1. Normalize whitespace — collapse runs, trim edges.
 *   2. Preserve the strongest trailing terminal mark if present
 *      (! beats ? beats .), so an intentional "?" or "!" survives.
 *   3. Strip any remaining mid-sentence terminal marks so fragments like
 *      "call my family?" embedded mid-sentence don't break the speech.
 *   4. Strip trailing junk punctuation (, ; :) — these never belong at
 *      the end of an AAC utterance.
 *   5. Collapse adjacent duplicate words (case-insensitive) — drops the
 *      common "I I" / "need need" double-tap.
 *   6. Capitalize the first character.
 *   7. Append a terminal mark if none survived: "?" when the sentence
 *      opens with a question word, otherwise ".".
 */

const QUESTION_STARTERS = new Set([
  "when",
  "where",
  "why",
  "who",
  "which",
  "what",
  "how",
  "can",
  "could",
  "would",
  "should",
  "will",
  "shall",
  "may",
  "might",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "am",
  "have",
  "has",
  "had",
]);

export function polishSentence(raw: string): string {
  if (!raw) return "";

  // 1. Normalize whitespace.
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";

  // 4a. Strip junk trailing punctuation first so step 2 sees the real end.
  text = text.replace(/[,;:]+$/g, "").trimEnd();

  // 2. Preserve the strongest trailing terminal mark, if any.
  let terminal = "";
  const trailMatch = text.match(/([.?!]+)$/);
  if (trailMatch) {
    const trail = trailMatch[1];
    if (trail.includes("!")) terminal = "!";
    else if (trail.includes("?")) terminal = "?";
    else terminal = ".";
    text = text.slice(0, trailMatch.index).trimEnd();
  }

  // 3. Strip mid-sentence terminal marks.
  text = text.replace(/[.?!]+/g, " ").replace(/\s+/g, " ").trim();

  // 4b. Strip any commas/semicolons/colons that now sit at the end after
  //     the mid-sentence scrub — e.g., "I feel, ." → "I feel, " → "I feel".
  text = text.replace(/[,;:]+$/g, "").trimEnd();

  if (!text) return terminal;

  // 5. Collapse adjacent duplicate words (case-insensitive).
  const deduped: string[] = [];
  for (const word of text.split(" ")) {
    if (!word) continue;
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === word.toLowerCase()) continue;
    deduped.push(word);
  }
  text = deduped.join(" ");
  if (!text) return terminal;

  // 6. Capitalize first character.
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // 7. Choose terminal punctuation if one wasn't preserved.
  if (!terminal) {
    const firstWord = (text.split(/\s+/)[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z']/g, "");
    terminal = QUESTION_STARTERS.has(firstWord) ? "?" : ".";
  }

  return text + terminal;
}
