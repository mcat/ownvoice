import { describe, it, expect } from "vitest";
import { segmentSentences } from "./sentenceSegment";

describe("segmentSentences", () => {
  it("splits English text on . ? !", () => {
    expect(
      segmentSentences(
        "We'll take you off the vent in about an hour. Are you ready? Great!",
      ),
    ).toEqual([
      "We'll take you off the vent in about an hour.",
      "Are you ready?",
      "Great!",
    ]);
  });

  it("returns a single sentence when no boundary punctuation is present", () => {
    expect(segmentSentences("breathing well now")).toEqual(["breathing well now"]);
  });

  it("trims whitespace from each sentence", () => {
    expect(segmentSentences("  One.   Two.  ")).toEqual(["One.", "Two."]);
  });

  it("drops empty fragments", () => {
    expect(segmentSentences("..  ..")).toEqual([]);
  });

  it("handles CJK punctuation 。！？", () => {
    expect(segmentSentences("一小时后拔管。准备好了吗？很好！")).toEqual([
      "一小时后拔管。",
      "准备好了吗？",
      "很好！",
    ]);
  });

  it("handles Arabic question mark ؟", () => {
    expect(segmentSentences("هل أنت مستعد؟ نعم.")).toEqual([
      "هل أنت مستعد؟",
      "نعم.",
    ]);
  });

  it("returns [] for empty or whitespace-only input", () => {
    expect(segmentSentences("")).toEqual([]);
    expect(segmentSentences("   ")).toEqual([]);
  });

  it("collapses runs of boundary punctuation (e.g. '...') into one boundary", () => {
    expect(segmentSentences("Wait... what?")).toEqual(["Wait...", "what?"]);
  });

  it("preserves a trailing fragment without terminal punctuation", () => {
    expect(segmentSentences("One. Two")).toEqual(["One.", "Two"]);
  });

  it("does not misattribute trailing position when a sentence repeats", () => {
    // Earlier lastIndexOf-based logic could pick the wrong occurrence
    // when the final sentence fragment also appeared earlier in the input.
    expect(segmentSentences("Yes. OK. Yes. tail")).toEqual([
      "Yes.",
      "OK.",
      "Yes.",
      "tail",
    ]);
  });
});
