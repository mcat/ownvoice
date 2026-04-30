import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildMultilingualTokenizer,
  cangjieNormalize,
  koreanNormalize,
  prepareLanguage,
  puncNorm,
  setCangjieData,
  SUPPORTED_LANGUAGES,
} from "./multilingualTokenizer";
import { MODELS_RELEASE } from "./assetVersions";

const CHATTERBOX_DIR = `public/models/${MODELS_RELEASE}/chatterbox-multilingual`;

const TOKENIZER_JSON = JSON.parse(
  readFileSync(`${CHATTERBOX_DIR}/tokenizer.json`, "utf8"),
);

describe("multilingualTokenizer encode", () => {
  // The post-processor wraps every encoded sequence as:
  //   [EXAGGERATION (6563), BOS (255), <inner>, EOS (0), START_SPEECH (6561), START_SPEECH (6561)]
  // So inner tokens start at index 2 (after EXAGGERATION + BOS) and end at
  // index length-4 (before EOS + START_SPEECH × 2).
  test("wraps encoded text with the post-processor template", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hello");
    expect(ids[0]).toBe(6563); // EXAGGERATION
    expect(ids[1]).toBe(255); // BOS
    expect(ids[2]).toBe(708); // [en] is the first inner token
    expect(ids[ids.length - 3]).toBe(0); // EOS
    expect(ids[ids.length - 2]).toBe(6561); // START_SPEECH
    expect(ids[ids.length - 1]).toBe(6561); // START_SPEECH (×2)
  });

  test("treats a literal space as the [SPACE] token (id 2)", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hello world");
    // Inner content has exactly one [SPACE] in the middle.
    const spaceCount = ids.filter((id) => id === 2).length;
    expect(spaceCount).toBe(1);
  });

  test("emits one [SPACE] per literal space (multi-word handling)", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]a b c");
    const spaceCount = ids.filter((id) => id === 2).length;
    expect(spaceCount).toBe(2); // two spaces
  });
});

describe("prepareLanguage", () => {
  test("prepends [xx] with no space, lowercase tag, lowercased text, terminal period", () => {
    // Upstream MTLTokenizer.encode lowercases text before tokenizing.
    // We were skipping this, so "Yes" produced Y(301) + es(61) instead
    // of upstream's y(38) + es(61).
    expect(prepareLanguage("Hello", "en")).toBe("[en]hello.");
    expect(prepareLanguage("Bonjour", "FR")).toBe("[fr]bonjour."); // case-insensitive
    expect(prepareLanguage("こんにちは", "ja")).toBe(
      "[ja]こんにちは.",
    );
  });

  test("NFKD-normalizes input (decomposes accented chars)", () => {
    // "café" with composed é (U+00E9) decomposes to "café"
    // (e + combining acute accent). The BPE was trained on decomposed
    // input — composed accents would tokenize as unknown.
    const composed = "Café";
    const prepared = prepareLanguage(composed, "fr");
    expect(prepared).toBe("[fr]café.");
  });

  test("rejects unsupported language codes", () => {
    expect(() => prepareLanguage("hi", "xyz")).toThrow(/unsupported language/i);
  });

  test("supports all 23 documented languages", () => {
    expect(SUPPORTED_LANGUAGES.size).toBe(23);
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(() => prepareLanguage("test", lang)).not.toThrow();
    }
  });
});

describe("puncNorm", () => {
  test("appends period when no terminal punctuation", () => {
    expect(puncNorm("Hello world")).toBe("Hello world.");
    expect(puncNorm("please wait")).toBe("please wait.");
  });

  test("leaves text alone when terminal punctuation already present", () => {
    for (const p of [".", "!", "?", "-", ","]) {
      expect(puncNorm(`Yes${p}`)).toBe(`Yes${p}`);
    }
    // CJK enders
    expect(puncNorm("こんにちは。")).toBe(
      "こんにちは。",
    );
  });

  test("collapses runs of whitespace", () => {
    expect(puncNorm("hello    world")).toBe("hello world.");
    expect(puncNorm("  hi  there  ")).toBe("hi there.");
  });

  test("normalizes uncommon LLM punctuation", () => {
    // Upstream rewrites: "..." → ", " (comma + space), ";" → ", ", etc.
    // After replacement the trailing whitespace is rstripped, then a
    // terminal period is appended unless the last char is already an
    // ender. So "yes..." → "yes," (comma is itself an ender; no period).
    expect(puncNorm("yes...")).toBe("yes,");
    expect(puncNorm("a;b")).toBe("a, b.");
    expect(puncNorm("“hi”")).toBe('"hi".'); // smart quotes → straight
    expect(puncNorm("a—b")).toBe("a-b."); // em-dash → hyphen
  });

  test("returns canned text on empty input", () => {
    expect(puncNorm("")).toBe("You need to add some text for me to talk.");
  });
});

describe("cangjieNormalize (Chinese ideographs → [cj_*] tokens)", () => {
  // Load the real Cangjie5 table once for the suite. It's a 126,610-entry
  // tab-separated dataset shipped alongside the tokenizer.
  const cangjieEntries: string[] = JSON.parse(
    readFileSync(`${CHATTERBOX_DIR}/Cangjie5_TC.json`, "utf8"),
  );

  // setCangjieData mutates module-level state. beforeEach guarantees every
  // test starts with the real table loaded, regardless of failure / test
  // ordering. afterAll restores so subsequent describe blocks (including
  // the round-trip suite below) get a known-good Cangjie state.
  beforeEach(() => {
    setCangjieData(cangjieEntries);
  });
  afterAll(() => {
    setCangjieData(cangjieEntries);
  });

  test("encodes a single ideograph to wrapped Cangjie code", () => {
    // 你 (you) has Cangjie code "onf" (lowercase per the data file).
    const encoded = cangjieNormalize("你");
    expect(encoded).toBe("[cj_o][cj_n][cj_f][cj_.]");
  });

  test("encodes a multi-character phrase", () => {
    // 你好 → "你" (onf) + "好" (vnd)
    const encoded = cangjieNormalize("你好");
    expect(encoded).toBe("[cj_o][cj_n][cj_f][cj_.][cj_v][cj_n][cj_d][cj_.]");
  });

  test("leaves non-ideographic characters untouched", () => {
    // Mixed: ASCII + ideograph + ASCII.
    const encoded = cangjieNormalize("hi 你 bye");
    expect(encoded).toBe("hi [cj_o][cj_n][cj_f][cj_.] bye");
    // Punctuation and digits are not category Lo — pass through.
    expect(cangjieNormalize("123, abc.")).toBe("123, abc.");
  });

  test("passes through ideographs not in the Cangjie table", () => {
    // Japanese hiragana あ is category Lo but isn't a Chinese
    // ideograph, so won't be in Cangjie5_TC. Should pass through.
    const result = cangjieNormalize("あ");
    expect(result).toBe("あ");
  });

  test("returns input unchanged when data not loaded", () => {
    setCangjieData(null);
    expect(cangjieNormalize("你好")).toBe("你好");
  });

  test("plumbs through prepareLanguage for zh", () => {
    // prepareLanguage runs punc_norm → lowercase → NFKD → cangjieNormalize → [zh] prefix.
    const prepared = prepareLanguage("你好", "zh");
    // Expect: "[zh]" + Cangjie-encoded "你好" + "."
    expect(prepared).toBe("[zh][cj_o][cj_n][cj_f][cj_.][cj_v][cj_n][cj_d][cj_.].");
  });
});

describe("koreanNormalize (Hangul → Jamo)", () => {
  test("decomposes a syllable with final consonant", () => {
    // 안 (U+C548) = 안 (initial ᄋ U+110B + medial ᅡ U+1161 + final ᆫ U+11AB)
    const decomposed = koreanNormalize("안");
    expect(decomposed.length).toBe(3);
    expect(decomposed.codePointAt(0)).toBe(0x110b);
    expect(decomposed.codePointAt(1)).toBe(0x1161);
    expect(decomposed.codePointAt(2)).toBe(0x11ab);
  });

  test("decomposes a syllable without final consonant", () => {
    // 가 (U+AC00) = 가 (initial ᄀ U+1100 + medial ᅡ U+1161, no final)
    const decomposed = koreanNormalize("가");
    expect(decomposed.length).toBe(2);
    expect(decomposed.codePointAt(0)).toBe(0x1100);
    expect(decomposed.codePointAt(1)).toBe(0x1161);
  });

  test("leaves non-Hangul characters untouched", () => {
    expect(koreanNormalize("hello")).toBe("hello");
    expect(koreanNormalize("123")).toBe("123");
    // Mixed: only Hangul gets decomposed
    expect(koreanNormalize("hi 안")).toBe(
      "hi " + String.fromCodePoint(0x110b, 0x1161, 0x11ab),
    );
  });

  test("handles empty string", () => {
    expect(koreanNormalize("")).toBe("");
  });

  test("plumbs through prepareLanguage for ko", () => {
    // prepareLanguage should: punc_norm → lowercase → NFKD → koreanNormalize → [ko] prefix.
    const prepared = prepareLanguage("안", "ko");
    // expect: "[ko]" + decomposed-안 + "."
    expect(prepared.startsWith("[ko]")).toBe(true);
    expect(prepared.endsWith(".")).toBe(true);
    // Decomposed Jamo letters present
    expect(prepared.codePointAt(4)).toBe(0x110b); // initial ᄋ
    expect(prepared.codePointAt(5)).toBe(0x1161); // medial ᅡ
    expect(prepared.codePointAt(6)).toBe(0x11ab); // final ᆫ
  });

  test("does not affect prepareLanguage for non-Korean languages", () => {
    // English passes through unchanged regardless of incidental Hangul.
    const prepared = prepareLanguage("Hello", "en");
    expect(prepared).toBe("[en]hello.");
  });
});

describe("multilingualTokenizer decode", () => {
  test("decodes [SPACE] back to literal space", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const decoded = tok.decode([2, 2, 2]); // three [SPACE]s
    expect(decoded).toBe("   ");
  });

  test("stops decoding at EOS and skips post-processor wrappers", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hi");
    // Wrapped sequence ends with [..., EOS=0, START_SPEECH=6561, START_SPEECH=6561]
    expect(ids[ids.length - 3]).toBe(0); // EOS
    const decoded = tok.decode(ids);
    // Should not include the [en] tag literal or any wrapper marker text
    expect(decoded).not.toContain("[en]");
    expect(decoded).not.toContain("STOP");
    expect(decoded).not.toContain("EXAGGERATION");
    expect(decoded).not.toContain("BOS");
  });
});

describe("multilingualTokenizer round-trip across languages", () => {
  const tok = buildMultilingualTokenizer(TOKENIZER_JSON);

  // Languages whose scripts are fully covered by the BPE vocab (Latin, hiragana)
  const roundTripCases = [
    ["en", "Hello world"],
    ["fr", "Bonjour le monde"],
    ["es", "Hola mundo"],
    ["de", "Hallo Welt"],
    ["ja", "こんにちは"],
  ] as const;
  for (const [lang, phrase] of roundTripCases) {
    test(`${lang}: encode -> decode preserves meaningful content`, () => {
      const prepared = prepareLanguage(phrase, lang);
      const ids = tok.encode(prepared);
      expect(ids.length).toBeGreaterThan(0);
      const decoded = tok.decode(ids);
      // Round-trip should preserve at least the first 3 characters
      expect(decoded.toLowerCase()).toContain(
        phrase.toLowerCase().slice(0, 3),
      );
    });
  }

  // CJK ideographs (hanzi/kanji) are not in the BPE vocab -- the upstream model
  // handles them at inference time via its own pre-tokenizer, but our pure BPE
  // encode silently drops unknown chars. Verify encoding still produces valid
  // token sequences (language tag + [STOP] at minimum).
  test("zh: encodes without error even though hanzi are out-of-vocab", () => {
    const prepared = prepareLanguage("你好世界", "zh");
    const ids = tok.encode(prepared);
    // Wrapped: [EXAGGERATION, BOS, [zh], <maybe nothing inner>, EOS, START_SPEECH, START_SPEECH]
    expect(ids[0]).toBe(6563); // EXAGGERATION
    expect(ids[1]).toBe(255); // BOS
    expect(ids[2]).toBe(725); // [zh] is first inner token
    expect(ids[ids.length - 1]).toBe(6561); // trailing START_SPEECH
  });
});

describe("upstream tokenization parity (byte-for-byte)", () => {
  // Golden token sequences captured from the upstream HuggingFace
  // `tokenizers` library running the full upstream MTLTokenizer.encode +
  // mtl_tts.py SOT/EOT padding pipeline (lowercase + NFKD + per-language
  // preprocessor + post_processor template). These pin our TS port to
  // the reference implementation so any drift in puncNorm, lowercase,
  // NFKD ordering, koreanNormalize, or cangjieNormalize fails loudly.
  //
  // To regenerate after a deliberate preprocessing change, run the
  // capture script printed in this file's git history at the
  // "feat(tts): port Chinese Cangjie5 preprocessor" commit, or replay
  // the python harness used to seed these values:
  //
  //   /tmp/cbox-test/bin/python <<<'... see git log dc5d96c.. for harness ...'

  const cangjieEntries: string[] = JSON.parse(
    readFileSync(`${CHATTERBOX_DIR}/Cangjie5_TC.json`, "utf8"),
  );
  const tok = buildMultilingualTokenizer(TOKENIZER_JSON);

  beforeEach(() => {
    setCangjieData(cangjieEntries);
  });

  const cases: Array<{
    lang: string;
    phrase: string;
    description: string;
    expectedIds: number[];
  }> = [
    {
      lang: "en",
      phrase: "Yes",
      description: "single word, terminal period appended by punc_norm",
      expectedIds: [6563, 255, 708, 38, 61, 9, 0, 6561, 6561],
    },
    {
      lang: "en",
      phrase: "No.",
      description: "single word, existing terminal period preserved",
      expectedIds: [6563, 255, 708, 95, 9, 0, 6561, 6561],
    },
    {
      lang: "en",
      phrase: "I'm cold",
      description: "apostrophe + space",
      expectedIds: [6563, 255, 708, 22, 4, 26, 2, 174, 79, 9, 0, 6561, 6561],
    },
    {
      lang: "en",
      phrase: "Please wait",
      description: "two words, period appended (the punc_norm canary)",
      expectedIds: [6563, 255, 708, 29, 64, 55, 18, 2, 36, 14, 60, 9, 0, 6561, 6561],
    },
    {
      lang: "en",
      phrase: "How are you?",
      description: "question mark already present, no period appended",
      expectedIds: [6563, 255, 708, 21, 69, 2, 127, 2, 74, 13, 0, 6561, 6561],
    },
    {
      lang: "en",
      phrase: "Hello   world",
      description: "multiple spaces collapsed by punc_norm",
      expectedIds: [6563, 255, 708, 62, 84, 28, 2, 179, 79, 9, 0, 6561, 6561],
    },
    {
      lang: "es",
      phrase: "Hola, ¿cómo estás?",
      description: "spanish accents + inverted question (NFKD decomposition)",
      expectedIds: [6563, 255, 635, 21, 28, 25, 14, 7, 2, 360, 174, 764, 115, 2, 218, 14, 764, 32, 13, 0, 6561, 6561],
    },
    {
      lang: "fr",
      phrase: "Café au lait",
      description: "french accent (NFKD decomposition)",
      expectedIds: [6563, 255, 634, 183, 132, 764, 2, 14, 34, 2, 25, 14, 60, 9, 0, 6561, 6561],
    },
    {
      lang: "de",
      phrase: "Schöne Grüße",
      description: "german umlauts (NFKD)",
      expectedIds: [6563, 255, 636, 32, 71, 28, 762, 111, 2, 198, 34, 762, 392, 18, 9, 0, 6561, 6561],
    },
    {
      lang: "ko",
      phrase: "안녕하세요",
      description: "korean greeting (Jamo decomposition)",
      expectedIds: [6563, 255, 724, 1794, 1880, 1954, 1785, 1886, 1971, 1801, 1880, 1792, 1885, 1794, 1892, 9, 0, 6561, 6561],
    },
    {
      lang: "zh",
      phrase: "你好世界",
      description: "chinese hello world (Cangjie5 lookup)",
      expectedIds: [6563, 255, 725, 747, 746, 738, 2064, 754, 746, 736, 2064, 748, 752, 2064, 755, 747, 744, 744, 2064, 9, 0, 6561, 6561],
    },
    {
      lang: "zh",
      phrase: "我饿了",
      description: "chinese 'I am hungry' (Cangjie5 lookup)",
      expectedIds: [6563, 255, 725, 740, 749, 741, 2064, 746, 754, 740, 749, 741, 2064, 746, 746, 2064, 9, 0, 6561, 6561],
    },
  ];

  for (const { lang, phrase, description, expectedIds } of cases) {
    test(`${lang}: ${description} — ${JSON.stringify(phrase)}`, () => {
      const prepared = prepareLanguage(phrase, lang);
      const ids = tok.encode(prepared);
      expect(ids).toEqual(expectedIds);
    });
  }
});
