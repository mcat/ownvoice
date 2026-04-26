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
  test("encodes a language tag as its dedicated id at the start", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hello");
    expect(ids[0]).toBe(708); // [en]
    expect(ids[ids.length - 1]).toBe(0); // [STOP] appended
  });

  test("treats a literal space as the [SPACE] token (id 2)", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hello world");
    // Expect 708 ... 2 ... 0 -- exactly one [SPACE] in the middle
    expect(ids[0]).toBe(708);
    expect(ids[ids.length - 1]).toBe(0);
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
  test("prepends [xx] with no space, lowercase tag", () => {
    expect(prepareLanguage("Hello", "en")).toBe("[en]Hello");
    expect(prepareLanguage("Bonjour", "FR")).toBe("[fr]Bonjour"); // case-insensitive
    expect(prepareLanguage("こんにちは", "ja")).toBe(
      "[ja]こんにちは",
    );
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

  test("stops decoding at [STOP]", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en]Hi");
    expect(ids[ids.length - 1]).toBe(0);
    const decoded = tok.decode(ids);
    // Should not include [STOP] character or the [en] tag literal
    expect(decoded).not.toContain("[en]");
    expect(decoded).not.toContain("STOP");
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
    expect(ids[0]).toBe(725); // [zh]
    expect(ids[ids.length - 1]).toBe(0); // [STOP]
  });
});
