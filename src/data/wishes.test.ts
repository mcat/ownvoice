import { getWishTopics, composeWishSentence, t } from "./phraseRegistry";

const SICG_TOPICS = getWishTopics();

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

  it("each topic has id, icon, labelKey, questionKey, stemKey, and responseKeys", () => {
    for (const topic of SICG_TOPICS) {
      expect(topic.id).toEqual(expect.any(String));
      expect(topic.icon).toEqual(expect.any(String));
      expect(topic.labelKey).toEqual(expect.any(String));
      expect(topic.questionKey).toEqual(expect.any(String));
      expect(topic.stemKey).toEqual(expect.any(String));
      expect(Array.isArray(topic.responseKeys)).toBe(true);
    }
  });

  it("each topic has at least 5 responseKeys", () => {
    for (const topic of SICG_TOPICS) {
      expect(topic.responseKeys.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("all responseKeys resolve to non-empty strings", () => {
    for (const topic of SICG_TOPICS) {
      for (const rk of topic.responseKeys) {
        const resolved = t(rk, "en");
        expect(resolved).toEqual(expect.any(String));
        expect(resolved.length).toBeGreaterThan(0);
      }
    }
  });
});

// =============================================================================
// composeWishSentence
// =============================================================================
describe("composeWishSentence", () => {
  const topic = SICG_TOPICS[0]; // goals — stem "What matters most to me"

  it("returns empty string when selectedResponseKeys is empty", () => {
    expect(composeWishSentence({ locale: "en", topicId: topic.id, selectedResponseKeys: [] })).toBe("");
  });

  it("composes sentence with one response", () => {
    const result = composeWishSentence({
      locale: "en",
      topicId: topic.id,
      selectedResponseKeys: ["wishes.goals.r.family"],
    });
    expect(result).toBe("What matters most to me is being with my family.");
  });

  it("composes sentence with two responses joined by 'and'", () => {
    const result = composeWishSentence({
      locale: "en",
      topicId: topic.id,
      selectedResponseKeys: ["wishes.goals.r.family", "wishes.goals.r.comfort"],
    });
    expect(result).toBe(
      "What matters most to me is being with my family and being comfortable and free of pain.",
    );
  });

  it("composes sentence with three or more responses using commas and 'and'", () => {
    const result = composeWishSentence({
      locale: "en",
      topicId: topic.id,
      selectedResponseKeys: ["wishes.goals.r.family", "wishes.goals.r.comfort", "wishes.goals.r.home"],
    });
    expect(result).toBe(
      "What matters most to me is being with my family, being comfortable and free of pain, and going home.",
    );
  });

  it("lowercases responses in the output", () => {
    // Response text "Going home" gets lowercased to "going home"
    const result = composeWishSentence({
      locale: "en",
      topicId: topic.id,
      selectedResponseKeys: ["wishes.goals.r.home"],
    });
    expect(result).toBe("What matters most to me is going home.");
  });

  it("works with different topics (different stems)", () => {
    const worriesTopic = SICG_TOPICS[1]; // stem "I am worried about"
    const result = composeWishSentence({
      locale: "en",
      topicId: worriesTopic.id,
      selectedResponseKeys: ["wishes.worries.r.suffering"],
    });
    expect(result).toBe("I am worried about is suffering or being in pain.");
  });
});
