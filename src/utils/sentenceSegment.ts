/**
 * Split a transcribed text blob into sentences using terminal punctuation.
 *
 * Boundary characters: `.`, `?`, `!`, plus CJK `。`, `！`, `？` and Arabic
 * `؟`. Runs of consecutive boundary chars collapse into a single boundary
 * (so "Wait..." is one sentence, not three). Each result keeps its
 * trailing punctuation; whitespace between sentences is consumed.
 *
 * Empty / whitespace-only input returns `[]`. Input with no boundary
 * characters returns `[input.trim()]` as a single-sentence array (the
 * model produced text without sentence punctuation, so we treat the
 * whole chunk as one sentence).
 */
export function segmentSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Match a non-boundary run followed by a run of boundary chars.
  // The boundary run is captured *with* the sentence so trailing
  // punctuation is preserved.
  const re = /[^.!?。！？؟]+[.!?。！？؟]+/g;
  const matches = trimmed.match(re);
  if (!matches) {
    // Trimmed input contains no boundary chars *and* nothing else, or
    // is entirely boundary chars + whitespace — treat the latter as empty.
    if (/^[\s.!?。！？؟]+$/.test(trimmed)) return [];
    return [trimmed];
  }

  const sentences = matches
    .map((s) => s.trim())
    // Drop fragments that are nothing but boundary chars (e.g. ".." from
    // "..  ..", where the regex matched whitespace + boundary).
    .filter((s) => s.length > 0 && !/^[.!?。！？؟]+$/.test(s));
  // If there's trailing text after the last boundary (no terminal
  // punctuation on the final fragment), include it as a sentence.
  const lastMatchEnd =
    trimmed.lastIndexOf(matches[matches.length - 1]) +
    matches[matches.length - 1].length;
  const tail = trimmed.slice(lastMatchEnd).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
