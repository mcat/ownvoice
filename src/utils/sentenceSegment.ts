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
const BOUNDARY = /[.!?。！？؟]/;
const ALL_BOUNDARY = /^[.!?。！？؟]+$/;
const BOUNDARY_OR_WS = /^[\s.!?。！？؟]+$/;
// Capture a non-boundary run + trailing boundary run together so the
// punctuation rides along with its sentence.
const SENTENCE = /[^.!?。！？؟]+[.!?。！？؟]+/g;

export function segmentSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences: string[] = [];
  let lastEnd = 0;
  for (const match of trimmed.matchAll(SENTENCE)) {
    const s = match[0].trim();
    if (s && !ALL_BOUNDARY.test(s)) sentences.push(s);
    lastEnd = match.index + match[0].length;
  }

  if (sentences.length === 0) {
    // Input had no boundary chars at all, OR was entirely boundary + ws.
    return BOUNDARY_OR_WS.test(trimmed) || BOUNDARY.test(trimmed)
      ? []
      : [trimmed];
  }

  const tail = trimmed.slice(lastEnd).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
