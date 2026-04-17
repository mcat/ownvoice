import { describe, it, expect } from "vitest";
import { buildBPETokenizer } from "./bpeTokenizer";

describe("bpeTokenizer — encode", () => {
  it("round-trips simple ASCII through byte-level BPE", () => {
    const tok = buildBPETokenizer({
      model: {
        // "Ġ" (U+0120) is the byte-level BPE marker for a leading space
        vocab: {
          h: 1, e: 2, l: 3, o: 4,
          "\u0120": 5, w: 6, r: 7, d: 8,
        },
        merges: [],
      },
    });
    const ids = tok.encode("hello world");
    // "hello" → [h,e,l,l,o] ; " world" → [Ġ,w,o,r,l,d]
    expect(ids).toEqual([1, 2, 3, 3, 4, 5, 6, 4, 7, 3, 8]);
  });

  it("preserves added-token IDs instead of BPE-encoding the literal string", () => {
    const tok = buildBPETokenizer({
      model: {
        vocab: { h: 1, i: 2 },
        merges: [],
      },
      added_tokens: [
        { content: "<|startoftext|>", id: 100 },
        { content: "<|im_start|>", id: 101 },
        { content: "<|im_end|>", id: 102 },
      ],
    });
    const ids = tok.encode("<|im_start|>hi<|im_end|>");
    expect(ids).toEqual([101, 1, 2, 102]);
  });

  it("leaves non-special segments to the BPE path when added tokens are present", () => {
    const tok = buildBPETokenizer({
      model: { vocab: { h: 1, i: 2 }, merges: [] },
      added_tokens: [{ content: "<|im_end|>", id: 99 }],
    });
    expect(tok.encode("hi<|im_end|>hi")).toEqual([1, 2, 99, 1, 2]);
  });
});

describe("bpeTokenizer — post_processor", () => {
  it("applies Chatterbox-style TemplateProcessing (append <|endoftext|> x2)", () => {
    const tok = buildBPETokenizer({
      model: { vocab: { h: 1, i: 2 }, merges: [] },
      added_tokens: [{ content: "<|endoftext|>", id: 50256 }],
      post_processor: {
        type: "TemplateProcessing",
        single: [
          { Sequence: { id: "A", type_id: 0 } },
          { SpecialToken: { id: "<|endoftext|>", type_id: 0 } },
          { SpecialToken: { id: "<|endoftext|>", type_id: 0 } },
        ],
      },
    });
    expect(tok.encode("hi")).toEqual([1, 2, 50256, 50256]);
  });

  it("applies LFM2-style Sequence+TemplateProcessing (prepend <|startoftext|>)", () => {
    const tok = buildBPETokenizer({
      model: { vocab: { h: 1, i: 2 }, merges: [] },
      added_tokens: [{ content: "<|startoftext|>", id: 1 }],
      post_processor: {
        type: "Sequence",
        processors: [
          { type: "ByteLevel" },
          {
            type: "TemplateProcessing",
            single: [
              { SpecialToken: { id: "<|startoftext|>", type_id: 0 } },
              { Sequence: { id: "A", type_id: 0 } },
            ],
          },
        ],
      },
    });
    // BOS is prepended, no trailing tokens
    expect(tok.encode("hi")).toEqual([1, 1, 2]);
  });

  it("appends nothing when post_processor is absent", () => {
    const tok = buildBPETokenizer({
      model: { vocab: { h: 1, i: 2 }, merges: [] },
      added_tokens: [{ content: "<|endoftext|>", id: 50256 }],
    });
    expect(tok.encode("hi")).toEqual([1, 2]);
  });
});

describe("bpeTokenizer — decode", () => {
  it("decodes byte-level BPE token IDs back to text", () => {
    const tok = buildBPETokenizer({
      model: {
        vocab: {
          h: 1, e: 2, l: 3, o: 4,
          "\u0120": 5, w: 6, r: 7, d: 8,
        },
        merges: [],
      },
    });
    expect(tok.decode([1, 2, 3, 3, 4, 5, 6, 4, 7, 3, 8])).toBe("hello world");
  });

  it("skips special/added tokens when decoding", () => {
    const tok = buildBPETokenizer({
      model: { vocab: { h: 1, i: 2 }, merges: [] },
      added_tokens: [{ content: "<|im_end|>", id: 99 }],
    });
    expect(tok.decode([1, 2, 99])).toBe("hi");
  });

  it("returns empty string when all ids are special", () => {
    const tok = buildBPETokenizer({
      model: { vocab: {}, merges: [] },
      added_tokens: [{ content: "<|im_end|>", id: 99 }],
    });
    expect(tok.decode([99, 99])).toBe("");
  });
});
