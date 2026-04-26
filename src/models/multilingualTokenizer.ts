/**
 * Multilingual Chatterbox BPE tokenizer.
 *
 * Mirrors upstream MTLTokenizer.encode():
 *   1. prepareLanguage(text, lang) -> "[xx]text" (NO space, lowercase tag)
 *   2. encode(text):
 *      - Replace literal spaces with "[SPACE]" so the BPE sees them as added tokens
 *      - Split on the added-token regex; emit dedicated IDs for matches
 *      - BPE-encode each non-special segment
 *      - Append [STOP] (id 0) at the end
 *
 * Differences from src/models/bpeTokenizer.ts (the LFM2 GPT-2 BPE):
 *   - No byte-level pre-tokenization (multilingual vocab handles bytes via BPE merges)
 *   - [SPACE] handling is a string normalization, not a regex split
 *   - Vocab is much smaller (~2,453 vs ~50,000)
 */

interface TokenizerJSON {
  model: { vocab: Record<string, number>; merges: string[] | string[][] };
  added_tokens?: Array<{ content: string; id: number; special?: boolean }>;
}

export interface MultilingualTokenizer {
  encode: (text: string) => number[];
  decode: (ids: number[]) => string;
}

const STOP_TOKEN_ID = 0;
const SPACE_TOKEN_ID = 2;

export function buildMultilingualTokenizer(
  json: TokenizerJSON,
): MultilingualTokenizer {
  const vocab = new Map<string, number>(Object.entries(json.model.vocab));
  const idToToken = new Map<number, string>();
  for (const [tok, id] of vocab.entries()) idToToken.set(id, tok);

  const mergeRanks = new Map<string, number>();
  for (let i = 0; i < json.model.merges.length; i++) {
    const m = json.model.merges[i];
    const key = Array.isArray(m) ? (m as string[]).join(" ") : m;
    mergeRanks.set(key as string, i);
  }

  const addedTokens = new Map<string, number>();
  const addedTokenIds = new Set<number>();
  for (const t of json.added_tokens ?? []) {
    addedTokens.set(t.content, t.id);
    addedTokenIds.add(t.id);
    idToToken.set(t.id, t.content);
  }

  // Regex matching any added token literal -- longest first to avoid prefix collisions
  const addedPattern = addedTokens.size
    ? new RegExp(
        `(${Array.from(addedTokens.keys())
          .sort((a, b) => b.length - a.length)
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})`,
      )
    : null;

  function applyBPE(chars: string[]): string[] {
    if (chars.length <= 1) return chars;
    let word = [...chars];
    while (word.length > 1) {
      let best: [string, string, number] | null = null;
      for (let i = 0; i < word.length - 1; i++) {
        const r = mergeRanks.get(`${word[i]} ${word[i + 1]}`);
        if (r !== undefined && (!best || r < best[2]))
          best = [word[i], word[i + 1], r];
      }
      if (!best) break;
      const [l, r] = best;
      const next: string[] = [];
      for (let i = 0; i < word.length; ) {
        if (i < word.length - 1 && word[i] === l && word[i + 1] === r) {
          next.push(l + r);
          i += 2;
        } else {
          next.push(word[i]);
          i++;
        }
      }
      word = next;
    }
    return word;
  }

  return {
    encode(text: string): number[] {
      // Mirror upstream: replace each literal space with the "[SPACE]" string so
      // the BPE sees [SPACE] as an added token rather than collapsing whitespace.
      const normalized = text.replace(/ /g, "[SPACE]");

      const ids: number[] = [];
      const segments = addedPattern
        ? normalized.split(addedPattern)
        : [normalized];

      for (const segment of segments) {
        if (segment === "") continue;
        const specialId = addedTokens.get(segment);
        if (specialId !== undefined) {
          ids.push(specialId);
          continue;
        }
        const merged = applyBPE([...segment]);
        for (const tok of merged) {
          const id = vocab.get(tok);
          if (id !== undefined) ids.push(id);
        }
      }
      ids.push(STOP_TOKEN_ID);
      return ids;
    },

    decode(ids: number[]): string {
      const out: string[] = [];
      for (const id of ids) {
        if (id === STOP_TOKEN_ID) break;
        if (id === SPACE_TOKEN_ID) {
          out.push(" ");
          continue;
        }
        // Skip added/special tokens by ID (not by content prefix) so that
        // regular vocab tokens like '[' (id 303) are preserved correctly.
        if (addedTokenIds.has(id)) continue;
        const tok = idToToken.get(id);
        if (tok) out.push(tok);
      }
      return out.join("");
    },
  };
}

/** Languages supported by chatterbox-multilingual. Each gets a [xx] tag id
 *  in the tokenizer's added_tokens. */
export const SUPPORTED_LANGUAGES = new Set([
  "ar",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sv",
  "sw",
  "tr",
  "zh",
]);

/** Mirror upstream `txt = f"[{language_id.lower()}]{txt}"`. NO space, lowercase. */
export function prepareLanguage(text: string, languageId: string): string {
  const lang = languageId.toLowerCase();
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    throw new Error(
      `Unsupported language: ${languageId}. Supported: ${Array.from(SUPPORTED_LANGUAGES).sort().join(", ")}`,
    );
  }
  return `[${lang}]${text}`;
}
