import { describe, it, expect } from "vitest";
import en from "./en";
import es from "./es";
import zh from "./zh";
import vi from "./vi";
import tl from "./tl";

describe("draft locales — structural completeness", () => {
  const enKeys = Object.keys(en).sort();

  it.each([
    ["es", es],
    ["zh", zh],
    ["vi", vi],
    ["tl", tl],
  ])("%s has every key from en (type-safe via LocaleStrings)", (_name, locale) => {
    expect(Object.keys(locale).sort()).toEqual(enKeys);
  });

  it.each([
    ["es", es],
    ["zh", zh],
    ["vi", vi],
    ["tl", tl],
  ])("%s preserves placeholder tokens", (_name, locale) => {
    // For every key that contains a {placeholder} in en, verify the same
    // placeholders appear in the translated string.
    for (const key of enKeys) {
      const enVal = (en as Record<string, string>)[key];
      const trVal = (locale as Record<string, string>)[key];
      const enPlaceholders = (enVal.match(/\{[^}]+\}/g) ?? []).sort();
      const trPlaceholders = (trVal.match(/\{[^}]+\}/g) ?? []).sort();
      expect(trPlaceholders, `placeholder mismatch for ${key}`).toEqual(enPlaceholders);
    }
  });
});
