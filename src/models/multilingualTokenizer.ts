/**
 * Multilingual Chatterbox BPE tokenizer.
 *
 * Mirrors upstream MTLTokenizer.encode() including the post-processor template
 * that wraps the encoded text with the model's expected control tokens:
 *
 *   [EXAGGERATION (6563), BOS (255), <encoded text>, EOS (0), START_SPEECH (6561), START_SPEECH (6561)]
 *
 * The trailing START_SPEECH × 2 is what tells the LM to enter speech-generation
 * mode. Without these wrappers (we shipped one earlier version that emitted only
 * `<text> + [STOP]`) the model never properly transitions out of text mode and
 * either runs to MAX_NEW_TOKENS without emitting STOP_SPEECH (greedy) or emits
 * gibberish speech tokens (sampling).
 *
 *   1. prepareLanguage(text, lang) -> "[xx]text" (NO space, lowercase tag)
 *   2. encode(text):
 *      - Replace literal spaces with "[SPACE]" so the BPE sees them as added tokens
 *      - Split on the added-token regex; emit dedicated IDs for matches
 *      - BPE-encode each non-special segment
 *      - Wrap the result with the post-processor template above
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

const SPACE_TOKEN_ID = 2;
// Post-processor template ids — verified from tokenizer.json post_processor.special_tokens.
// These DON'T live inside vocab.json; the model knows them as architectural constants.
const EXAGGERATION_TOKEN_ID = 6563;
const BOS_TOKEN_ID = 255;
const EOS_TOKEN_ID = 0;
const START_SPEECH_TOKEN_ID = 6561;

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

      const innerIds: number[] = [];
      const segments = addedPattern
        ? normalized.split(addedPattern)
        : [normalized];

      for (const segment of segments) {
        if (segment === "") continue;
        const specialId = addedTokens.get(segment);
        if (specialId !== undefined) {
          innerIds.push(specialId);
          continue;
        }
        const merged = applyBPE([...segment]);
        for (const tok of merged) {
          const id = vocab.get(tok);
          if (id !== undefined) innerIds.push(id);
        }
      }

      // Apply the post-processor template:
      //   EXAGGERATION + BOS + <inner> + EOS + START_SPEECH + START_SPEECH
      // The trailing START_SPEECH × 2 is the model's signal to switch into
      // speech-token generation. Missing it produces runaway / gibberish output.
      return [
        EXAGGERATION_TOKEN_ID,
        BOS_TOKEN_ID,
        ...innerIds,
        EOS_TOKEN_ID,
        START_SPEECH_TOKEN_ID,
        START_SPEECH_TOKEN_ID,
      ];
    },

    decode(ids: number[]): string {
      const out: string[] = [];
      for (const id of ids) {
        // EOS terminates decode (matches upstream behavior on the inner content)
        if (id === EOS_TOKEN_ID) break;
        if (id === SPACE_TOKEN_ID) {
          out.push(" ");
          continue;
        }
        // Skip the post-processor wrappers and any other added/special tokens
        // by ID so regular vocab tokens like '[' (id 303) are preserved.
        if (id === EXAGGERATION_TOKEN_ID) continue;
        if (id === BOS_TOKEN_ID) continue;
        if (id === START_SPEECH_TOKEN_ID) continue;
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

/** Mirror upstream `MTLTokenizer.encode()` preprocessing pipeline:
 *    txt = txt.lower()
 *    txt = NFKD(txt)
 *    [language-specific preprocessing for zh/ja/he/ko/ru — not implemented here]
 *    txt = f"[{language_id.lower()}]{txt}"
 *
 *  The earlier port skipped lowercase + NFKD, so "Yes" tokenized as
 *  Y(301) + es(61) instead of upstream's y(38) + es(61). The Llama LM
 *  was trained on lowercased input — uppercase produced different
 *  token IDs the model didn't recognize as the intended phoneme path.
 *
 *  NFKD decomposes accented characters (é → e + ◌́) so the BPE sees
 *  base letters. Pure-ASCII English is unchanged.
 *
 *  zh/ja/he/ko/ru need additional preprocessing (Cangjie codes for zh,
 *  hiragana for ja, diacritics for he, Jamo for ko, stress for ru) that
 *  we don't implement — those languages will produce degraded output
 *  until the corresponding preprocessors are ported. */
/** Punctuation normalization, ported from upstream `mtl_tts.py:punc_norm`.
 *  Runs BEFORE lowercase/NFKD so the period appended here is part of the
 *  text the BPE encodes.
 *
 *  Critical for terminal-prosody: the model was trained on text-with-
 *  terminal-punctuation, and missing punctuation produces subtle
 *  end-of-utterance drift. We saw "Please wait" mispronounced as "Nice
 *  wait" until this normalization was added.
 *
 *  Skips upstream's "capitalize first letter" step — we lowercase next,
 *  so capitalization is a no-op for the final BPE input. */
export function puncNorm(text: string): string {
  if (text.length === 0) return "You need to add some text for me to talk.";

  // Collapse multiple whitespace runs.
  let out = text.split(/\s+/).filter(Boolean).join(" ");

  // Replace uncommon / LLM-ish punctuation with model-friendly equivalents.
  const replacements: Array<[string, string]> = [
    ["...", ", "],
    ["…", ", "], // …
    [":", ","],
    [" - ", ", "],
    [";", ", "],
    ["—", "-"], // em-dash
    ["–", "-"], // en-dash
    [" ,", ","],
    ["“", '"'], // left double quote
    ["”", '"'], // right double quote
    ["‘", "'"], // left single quote
    ["’", "'"], // right single quote
  ];
  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
  }

  // Append a period if no terminal punctuation. Mirrors upstream's
  // sentence-enders set (includes CJK punctuation for multilingual).
  out = out.replace(/\s+$/, "");
  const enders = new Set([".", "!", "?", "-", ",", "、", "，", "。", "？", "！"]);
  if (out.length > 0 && !enders.has(out[out.length - 1])) {
    out += ".";
  }
  return out;
}

/** Korean syllable → Jamo decomposition. Port of upstream
 *  `korean_normalize`. The BPE vocab indexes Hangul Jamo letters
 *  (U+1100 / U+1161 / U+11A7 ranges), not the precomposed syllables
 *  in U+AC00–U+D7AF. Without decomposition, Hangul inputs encode as
 *  out-of-vocab and the model produces silence or garbage.
 *
 *  Algorithmic, no external data. See Unicode Annex 29 for the
 *  decomposition formula. */
export function koreanNormalize(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0xac00 || code > 0xd7af) {
      out += ch;
      continue;
    }
    const base = code - 0xac00;
    const initial = String.fromCodePoint(0x1100 + Math.floor(base / (21 * 28)));
    const medial = String.fromCodePoint(0x1161 + Math.floor((base % (21 * 28)) / 28));
    const final = base % 28 > 0 ? String.fromCodePoint(0x11a7 + (base % 28)) : "";
    out += initial + medial + final;
  }
  return out.trim();
}

/** Dispatch the upstream language-specific preprocessor that runs after
 *  lowercase/NFKD and before the `[lang]` tag is prepended.
 *
 *  Implemented:  ko (Hangul → Jamo)
 *  Pending:      zh (Cangjie5), ja (kakasi hiragana), he (dicta diacritics),
 *                ru (stress marking) — those produce degraded output until
 *                their preprocessors are ported. */
function applyLanguagePreprocessor(text: string, lang: string): string {
  switch (lang) {
    case "ko":
      return koreanNormalize(text);
    default:
      return text;
  }
}

export function prepareLanguage(text: string, languageId: string): string {
  const lang = languageId.toLowerCase();
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    throw new Error(
      `Unsupported language: ${languageId}. Supported: ${Array.from(SUPPORTED_LANGUAGES).sort().join(", ")}`,
    );
  }
  const punctuated = puncNorm(text);
  const normalized = punctuated.toLowerCase().normalize("NFKD");
  const langPreprocessed = applyLanguagePreprocessor(normalized, lang);
  return `[${lang}]${langPreprocessed}`;
}
