import { describe, it, expect } from "vitest";
import { polishSentence, QUESTION_STARTERS } from "./polishSentence";

describe("polishSentence", () => {
  describe("whitespace normalization", () => {
    it("collapses runs of spaces to one", () => {
      expect(polishSentence("I   feel    scared")).toBe("I feel scared.");
    });

    it("trims leading and trailing whitespace", () => {
      expect(polishSentence("   I feel scared   ")).toBe("I feel scared.");
    });

    it("normalizes tabs and newlines as whitespace", () => {
      expect(polishSentence("I\tfeel\nscared")).toBe("I feel scared.");
    });
  });

  describe("capitalization", () => {
    it("capitalizes the first character when the partial is lowercase", () => {
      expect(polishSentence("i feel scared")).toBe("I feel scared.");
    });

    it("leaves an already-capitalized sentence alone", () => {
      expect(polishSentence("I feel scared")).toBe("I feel scared.");
    });

    it("does not change case of middle words", () => {
      expect(polishSentence("i need the Doctor")).toBe("I need the Doctor.");
    });
  });

  describe("terminal punctuation", () => {
    it("adds a period to a plain declarative", () => {
      expect(polishSentence("I am cold")).toBe("I am cold.");
    });

    it("adds a question mark when the sentence opens with a question word", () => {
      expect(polishSentence("when is the doctor coming")).toBe(
        "When is the doctor coming?",
      );
      expect(polishSentence("can you help me")).toBe("Can you help me?");
      expect(polishSentence("how much longer")).toBe("How much longer?");
    });

    it("preserves an intentional trailing exclamation", () => {
      expect(polishSentence("help me!")).toBe("Help me!");
    });

    it("preserves an intentional trailing question mark on a non-question-word opener", () => {
      expect(polishSentence("my family is here?")).toBe("My family is here?");
    });

    it("collapses duplicated terminal marks into one", () => {
      expect(polishSentence("please help!!!")).toBe("Please help!");
      expect(polishSentence("why me???")).toBe("Why me?");
      expect(polishSentence("I am fine...")).toBe("I am fine.");
    });

    it("prefers '!' over '?' over '.' when multiple trail together", () => {
      expect(polishSentence("help me!?")).toBe("Help me!");
      expect(polishSentence("really?.")).toBe("Really?");
    });
  });

  describe("mid-sentence terminal punctuation", () => {
    it("strips mid-sentence question marks and re-adds the terminal per opener", () => {
      expect(polishSentence("can you call my family? please")).toBe(
        "Can you call my family please?",
      );
    });

    it("strips mid-sentence periods", () => {
      expect(polishSentence("I am in pain. please help")).toBe(
        "I am in pain please help.",
      );
    });

    it("strips mid-sentence exclamations", () => {
      expect(polishSentence("help! I need water")).toBe("Help I need water.");
    });

    it("inserts a space between words glued together by a terminal mark", () => {
      // When the terminal mark sits directly between two word chars (no
      // adjacent whitespace), the scrub MUST insert a space — otherwise
      // the words fuse: "feel.please" → "feelplease".
      expect(polishSentence("I feel.please help")).toBe("I feel please help.");
      expect(polishSentence("can you help?me")).toBe("Can you help me?");
    });
  });

  describe("trailing junk punctuation", () => {
    it("strips a trailing comma", () => {
      expect(polishSentence("I feel scared,")).toBe("I feel scared.");
    });

    it("strips a trailing semicolon or colon", () => {
      expect(polishSentence("I feel scared;")).toBe("I feel scared.");
      expect(polishSentence("I feel scared:")).toBe("I feel scared.");
    });

    it("strips a multi-character trailing junk run", () => {
      // Without the "+" quantifier on [\s,;:]+$, only one char would be
      // stripped. This test locks the quantifier in place.
      expect(polishSentence("I feel scared,,,")).toBe("I feel scared.");
      expect(polishSentence("I feel scared ;;,")).toBe("I feel scared.");
    });

    it("preserves mid-sentence commas (does not over-strip)", () => {
      // Without the "$" anchor on [\s,;:]+$, a bare [\s,;:]+ would strip
      // mid-sentence commas too, collapsing "I feel, scared" into
      // "Ifeelscared". This test locks the anchor in place.
      expect(polishSentence("I feel, scared")).toBe("I feel, scared.");
    });
  });

  describe("adjacent-duplicate word collapse", () => {
    it("drops a case-insensitive adjacent repeat", () => {
      expect(polishSentence("I I feel scared")).toBe("I feel scared.");
      expect(polishSentence("i I feel scared")).toBe("I feel scared.");
    });

    it("drops multiple adjacent repeats in the same run", () => {
      expect(polishSentence("I I I feel scared")).toBe("I feel scared.");
    });

    it("drops non-adjacent repeats ONLY when actually adjacent", () => {
      // Legitimate non-adjacent repetition should not be touched.
      expect(polishSentence("I feel I am scared")).toBe("I feel I am scared.");
    });

    it("handles repeats around punctuation after mid-sentence stripping", () => {
      expect(polishSentence("call my family family please")).toBe(
        "Call my family please.",
      );
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(polishSentence("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(polishSentence("   ")).toBe("");
    });

    it("handles a single-word declarative", () => {
      expect(polishSentence("yes")).toBe("Yes.");
    });

    it("handles a single question-word opener", () => {
      expect(polishSentence("when")).toBe("When?");
    });

    it("handles input that's all punctuation", () => {
      // After stripping, the string is empty; we return only the preserved
      // terminal, since there's nothing to append it to.
      expect(polishSentence("...")).toBe(".");
      expect(polishSentence("???")).toBe("?");
    });

    it("strips apostrophes from first word when detecting question opener", () => {
      expect(polishSentence("can't you help")).toBe("Can't you help.");
      // "can't" with the apostrophe stripped becomes "cant" which isn't in
      // the question set — not ideal, but the apostrophe is preserved in
      // output. The fix is opener-level: we don't misclassify as a question.
    });
  });

  describe("every question starter gets a '?' terminal", () => {
    // Parameterized against the exported set so removing any starter causes
    // its test to fail. Mutation testing flagged this as a big coverage gap.
    for (const starter of QUESTION_STARTERS) {
      it(`treats '${starter}' as a question opener`, () => {
        // Build a test sentence that has no intrinsic terminal mark and
        // whose first word is the starter.
        const input = `${starter} my family arriving today`;
        const result = polishSentence(input);
        expect(result.endsWith("?")).toBe(true);
        expect(result.startsWith(starter.charAt(0).toUpperCase() + starter.slice(1))).toBe(true);
      });
    }

    it("does NOT add '?' for a non-question opener", () => {
      expect(polishSentence("please help me")).toBe("Please help me.");
      expect(polishSentence("I am cold")).toBe("I am cold.");
      expect(polishSentence("my family arrived")).toBe("My family arrived.");
    });
  });

  describe("realistic AAC flows", () => {
    it("cleans 'i feel scared about the procedure'", () => {
      expect(polishSentence("i feel scared about the procedure")).toBe(
        "I feel scared about the procedure.",
      );
    });

    it("cleans 'when can my family come' as a question", () => {
      expect(polishSentence("when can my family come")).toBe(
        "When can my family come?",
      );
    });

    it("cleans a doubled 'please please help'", () => {
      expect(polishSentence("please please help me")).toBe(
        "Please help me.",
      );
    });

    it("cleans 'i am in pain  please help' with stray whitespace", () => {
      expect(polishSentence("i am in pain  please help")).toBe(
        "I am in pain please help.",
      );
    });
  });
});
