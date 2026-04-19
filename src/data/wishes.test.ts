import { getWishTopics, composeWishSentence } from "./phraseRegistry";

const SICG_TOPICS = getWishTopics("en");

describe("SICG_TOPICS", () => {
  it("has exactly 7 topics (SICG framework)", () => {
    expect(SICG_TOPICS).toHaveLength(7);
  });

  it("has the expected topic ids", () => {
    const ids = SICG_TOPICS.map((t) => t.id);
    expect(ids).toEqual([
      "goals",
      "worries",
      "strength",
      "joy",
      "tradeoffs",
      "family",
      "hopes",
    ]);
  });

  it("each topic has id, icon, label, question, stem, and responses", () => {
    for (const topic of SICG_TOPICS) {
      expect(topic.id).toEqual(expect.any(String));
      expect(topic.icon).toEqual(expect.any(String));
      expect(topic.label).toEqual(expect.any(String));
      expect(topic.question).toEqual(expect.any(String));
      expect(topic.stem).toEqual(expect.any(String));
      expect(Array.isArray(topic.responses)).toBe(true);
    }
  });

  it("each topic has at least 5 responses", () => {
    for (const topic of SICG_TOPICS) {
      expect(topic.responses.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("all responses are non-empty strings", () => {
    for (const topic of SICG_TOPICS) {
      for (const r of topic.responses) {
        expect(r).toEqual(expect.any(String));
        expect(r.length).toBeGreaterThan(0);
      }
    }
  });
});

// =============================================================================
// composeWishSentence
// =============================================================================
describe("composeWishSentence", () => {
  const topic = SICG_TOPICS[0]; // goals — stem "What matters most to me"

  it("returns empty string when ranked is empty", () => {
    expect(composeWishSentence("en", topic, [])).toBe("");
  });

  it("composes sentence with one response", () => {
    const result = composeWishSentence("en", topic, ["Being with my family"]);
    expect(result).toBe("What matters most to me is being with my family.");
  });

  it("composes sentence with two responses joined by 'and'", () => {
    const result = composeWishSentence("en", topic, [
      "Being with my family",
      "Being comfortable and free of pain",
    ]);
    expect(result).toBe(
      "What matters most to me is being with my family and being comfortable and free of pain.",
    );
  });

  it("composes sentence with three or more responses using commas and 'and'", () => {
    const result = composeWishSentence("en", topic, [
      "Being with my family",
      "Being comfortable and free of pain",
      "Going home",
    ]);
    expect(result).toBe(
      "What matters most to me is being with my family, being comfortable and free of pain, and going home.",
    );
  });

  it("lowercases responses in the output", () => {
    const result = composeWishSentence("en", topic, ["GOING HOME"]);
    expect(result).toBe("What matters most to me is going home.");
  });

  it("works with different topics (different stems)", () => {
    const worriesTopic = SICG_TOPICS[1]; // stem "I am worried about"
    const result = composeWishSentence("en", worriesTopic, ["Suffering or being in pain"]);
    expect(result).toBe("I am worried about is suffering or being in pain.");
  });
});
