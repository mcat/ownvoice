import { getProviderCategories } from "./phraseRegistry";

const PROVIDER_CATEGORIES = getProviderCategories("en");

describe("PROVIDER_CATEGORIES", () => {
  const expectedKeys = ["responses", "questions", "directions", "goals of care"];

  it("has exactly 4 category keys", () => {
    expect(Object.keys(PROVIDER_CATEGORIES).sort()).toEqual(
      [...expectedKeys].sort(),
    );
  });

  it("each category has a non-empty array of phrases", () => {
    for (const key of expectedKeys) {
      const phrases = PROVIDER_CATEGORIES[key];
      expect(Array.isArray(phrases)).toBe(true);
      expect(phrases.length).toBeGreaterThan(0);
    }
  });

  it("all phrases are non-empty strings", () => {
    for (const key of expectedKeys) {
      for (const phrase of PROVIDER_CATEGORIES[key]) {
        expect(typeof phrase).toBe("string");
        expect(phrase.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
