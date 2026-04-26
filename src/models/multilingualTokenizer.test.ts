import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildMultilingualTokenizer,
  prepareLanguage,
  SUPPORTED_LANGUAGES,
} from "./multilingualTokenizer";

const TOKENIZER_JSON = JSON.parse(
  readFileSync("public/models/chatterbox-multilingual/tokenizer.json", "utf8"),
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
  test("prepends [xx] with no space, lowercase tag, lowercased text", () => {
    // Upstream MTLTokenizer.encode lowercases text before tokenizing.
    // We were skipping this, so "Yes" produced Y(301) + es(61) instead
    // of upstream's y(38) + es(61).
    expect(prepareLanguage("Hello", "en")).toBe("[en]hello");
    expect(prepareLanguage("Bonjour", "FR")).toBe("[fr]bonjour"); // case-insensitive
    expect(prepareLanguage("こんにちは", "ja")).toBe(
      "[ja]こんにちは",
    );
  });

  test("NFKD-normalizes input (decomposes accented chars)", () => {
    // "café" with composed é (U+00E9) decomposes to "café"
    // (e + combining acute accent). The BPE was trained on decomposed
    // input — composed accents would tokenize as unknown.
    const composed = "Café";
    const prepared = prepareLanguage(composed, "fr");
    expect(prepared).toBe("[fr]café");
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
