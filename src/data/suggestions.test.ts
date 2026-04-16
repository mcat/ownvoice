import { getTimeSuggestionsForPeriod } from "./phraseRegistry";
import { getTimeIcon } from "./suggestions";

const TIME_SUGGESTIONS = getTimeSuggestionsForPeriod("en");

describe("TIME_SUGGESTIONS", () => {
  it("has morning, afternoon, and evening keys", () => {
    expect(Object.keys(TIME_SUGGESTIONS).sort()).toEqual(
      ["afternoon", "evening", "morning"],
    );
  });

  it("each period has an array of strings", () => {
    for (const key of Object.keys(TIME_SUGGESTIONS)) {
      const suggestions = TIME_SUGGESTIONS[key as keyof typeof TIME_SUGGESTIONS];
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s).toEqual(expect.any(String));
      }
    }
  });
});

describe("getTimeIcon", () => {
  it("returns a non-empty string", () => {
    const icon = getTimeIcon();
    expect(icon).toEqual(expect.any(String));
    expect(icon.length).toBeGreaterThan(0);
  });
});
