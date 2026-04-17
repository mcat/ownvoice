/**
 * GPT-2 Byte-Level BPE Tokenizer
 *
 * Implements the full GPT-2 tokenization pipeline:
 *   1. Byte-level pre-tokenization (text → bytes → Unicode chars)
 *   2. Regex word splitting (GPT-2 pattern)
 *   3. BPE merge algorithm
 *   4. Vocabulary lookup
 *
 * Loads from HuggingFace tokenizer.json format.
 */

/** Byte-to-Unicode mapping used by GPT-2's byte-level BPE.
 *  Maps each byte (0-255) to a unique Unicode character. Printable ASCII
 *  bytes map to themselves; others map to Unicode range starting at 256. */
function buildByteToUnicode(): Map<number, string> {
  const bs: number[] = [];
  // Printable ASCII ranges that map to themselves
  for (let i = 33; i <= 126; i++) bs.push(i);   // '!' to '~'
  for (let i = 161; i <= 172; i++) bs.push(i);   // '¡' to '¬'
  for (let i = 174; i <= 255; i++) bs.push(i);   // '®' to 'ÿ'

  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }

  const map = new Map<number, string>();
  for (let i = 0; i < bs.length; i++) {
    map.set(bs[i], String.fromCodePoint(cs[i]));
  }
  return map;
}

const BYTE_TO_UNICODE = buildByteToUnicode();

/** GPT-2 word-splitting regex. Matches:
 *  - Contractions: 's, 't, 're, 've, 'm, 'll, 'd
 *  - Letter sequences (optionally preceded by space)
 *  - Number sequences (optionally preceded by space)
 *  - Non-whitespace/letter/number sequences
 *  - Trailing whitespace not followed by non-whitespace
 *  - Any whitespace */
const GPT2_PAT =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

/** Convert a string to GPT-2 byte-level Unicode representation */
function textToByteTokens(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let result = "";
  for (const b of bytes) {
    result += BYTE_TO_UNICODE.get(b) ?? String.fromCodePoint(b);
  }
  return result;
}

/** Find the pair with the lowest merge rank in a token list */
function getLowestMergePair(
  tokens: string[],
  mergeRanks: Map<string, number>,
): [string, string, number] | null {
  let bestPair: [string, string, number] | null = null;

  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    const rank = mergeRanks.get(pair);
    if (rank !== undefined && (bestPair === null || rank < bestPair[2])) {
      bestPair = [tokens[i], tokens[i + 1], rank];
    }
  }

  return bestPair;
}

/** Apply BPE merges to a list of tokens */
function applyBPE(
  tokens: string[],
  mergeRanks: Map<string, number>,
): string[] {
  if (tokens.length <= 1) return tokens;

  let word = [...tokens];

  while (word.length > 1) {
    const best = getLowestMergePair(word, mergeRanks);
    if (!best) break;

    const [left, right] = best;
    const merged = left + right;
    const newWord: string[] = [];
    let i = 0;
    while (i < word.length) {
      if (i < word.length - 1 && word[i] === left && word[i + 1] === right) {
        newWord.push(merged);
        i += 2;
      } else {
        newWord.push(word[i]);
        i++;
      }
    }
    word = newWord;
  }

  return word;
}

export interface BPETokenizer {
  encode: (text: string) => number[];
  decode: (ids: number[]) => string;
}

interface TokenizerJSON {
  model: {
    vocab: Record<string, number>;
    merges: string[];
  };
  added_tokens?: Array<{ content: string; id: number }>;
  post_processor?: {
    type: string;
    processors?: Array<{
      type: string;
      tokens?: Array<[string, number]>;
    }>;
  };
}

/** Build a BPE tokenizer from a HuggingFace tokenizer.json */
export function buildBPETokenizer(json: TokenizerJSON): BPETokenizer {
  const vocab = new Map<string, number>();
  for (const [token, id] of Object.entries(json.model.vocab)) {
    vocab.set(token, id);
  }

  // Build merge rank lookup: "token1 token2" → priority (lower = merge first)
  const mergeRanks = new Map<string, number>();
  for (let i = 0; i < json.model.merges.length; i++) {
    const merge = json.model.merges[i];
    // Merges are stored as either ["a", "b"] arrays or "a b" strings
    const key = Array.isArray(merge) ? merge.join(" ") : merge;
    mergeRanks.set(key, i);
  }

  // Post-processor tokens (e.g., append <|endoftext|> twice)
  const postTokenIds: number[] = [];
  if (json.post_processor?.processors) {
    for (const proc of json.post_processor.processors) {
      if (proc.type === "Sequence" && proc.tokens) {
        for (const [, id] of proc.tokens) postTokenIds.push(id);
      }
    }
  }
  // Fallback: if no post-processor found, use the known Chatterbox convention
  if (postTokenIds.length === 0) {
    const eotId = json.added_tokens?.find((t) => t.content === "<|endoftext|>")?.id;
    if (eotId !== undefined) {
      postTokenIds.push(eotId, eotId);
    }
  }

  // Reverse byte-to-Unicode lookup for decode
  const unicodeToByte = new Map<string, number>();
  for (const [byte, char] of BYTE_TO_UNICODE.entries()) {
    unicodeToByte.set(char, byte);
  }

  // Id → token map for decode; added tokens override any vocab collision
  const idToToken = new Map<number, string>();
  for (const [token, id] of vocab.entries()) idToToken.set(id, token);

  const addedTokens = new Map<string, number>();
  const addedTokenIds = new Set<number>();
  for (const t of json.added_tokens ?? []) {
    addedTokens.set(t.content, t.id);
    addedTokenIds.add(t.id);
    idToToken.set(t.id, t.content);
  }

  // Regex that splits input text on added-token literals, preserving them as
  // separate segments. Longest tokens first to avoid prefix collisions.
  const addedPattern = addedTokens.size
    ? new RegExp(
        `(${Array.from(addedTokens.keys())
          .sort((a, b) => b.length - a.length)
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})`,
      )
    : null;

  return {
    encode(text: string): number[] {
      const ids: number[] = [];
      const segments = addedPattern ? text.split(addedPattern) : [text];

      for (const segment of segments) {
        if (segment === "") continue;

        const specialId = addedTokens.get(segment);
        if (specialId !== undefined) {
          ids.push(specialId);
          continue;
        }

        // Split text into words using GPT-2 regex
        const words = segment.match(GPT2_PAT) ?? [];

        for (const word of words) {
          // Convert word to byte-level Unicode tokens
          const byteStr = textToByteTokens(word);
          // Start with individual characters as tokens
          const charTokens = [...byteStr];
          // Apply BPE merges
          const merged = applyBPE(charTokens, mergeRanks);
          // Look up token IDs
          for (const token of merged) {
            const id = vocab.get(token);
            if (id !== undefined) {
              ids.push(id);
            }
            // Unknown tokens are silently dropped (rare with byte-level BPE)
          }
        }
      }

      // Append post-processor tokens
      ids.push(...postTokenIds);
      return ids;
    },

    decode(ids: number[]): string {
      let byteStr = "";
      for (const id of ids) {
        if (addedTokenIds.has(id)) continue;
        const token = idToToken.get(id);
        if (token !== undefined) byteStr += token;
      }

      // Invert byte-level Unicode back to UTF-8 bytes, then decode.
      const bytes: number[] = [];
      for (const ch of byteStr) {
        const b = unicodeToByte.get(ch);
        if (b !== undefined) {
          bytes.push(b);
        } else {
          // Fall through: encode the codepoint as UTF-8 bytes directly.
          const enc = new TextEncoder().encode(ch);
          for (const byte of enc) bytes.push(byte);
        }
      }
      return new TextDecoder("utf-8", { fatal: false }).decode(
        new Uint8Array(bytes),
      );
    },
  };
}
