import { describe, it, expect } from "vitest";
import { CHATTERBOX_LOCALES, canCloneForLocale, baseLocale } from "./chatterboxLocales";

describe("CHATTERBOX_LOCALES", () => {
  it("contains exactly 23 locales", () => {
    expect(CHATTERBOX_LOCALES.size).toBe(23);
  });

  it("includes English and a representative from each major family", () => {
    expect(CHATTERBOX_LOCALES.has("en")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("es")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("de")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("zh")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ja")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ko")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ar")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("he")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("pl")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("tr")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ru")).toBe(true);
  });

  it("does NOT include Vietnamese, Tagalog, Somali, Haitian Creole, Hmong", () => {
    expect(CHATTERBOX_LOCALES.has("vi")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("tl")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("so")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("ht")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("hmn")).toBe(false);
  });
});

describe("canCloneForLocale", () => {
  it("returns true for supported locales", () => {
    expect(canCloneForLocale("en")).toBe(true);
    expect(canCloneForLocale("es")).toBe(true);
    expect(canCloneForLocale("ar")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(canCloneForLocale("vi")).toBe(false);
    expect(canCloneForLocale("tl")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(canCloneForLocale("")).toBe(false);
  });

  it("returns false for garbage input", () => {
    expect(canCloneForLocale("xx-YZ")).toBe(false);
  });

  it("strips BCP 47 region subtags and matches the base language", () => {
    expect(canCloneForLocale("en-US")).toBe(true);
    expect(canCloneForLocale("es-MX")).toBe(true);
    expect(canCloneForLocale("zh-TW")).toBe(true);
    expect(canCloneForLocale("pt-BR")).toBe(true);
  });

  it("returns false for unsupported locales even with region subtags", () => {
    expect(canCloneForLocale("vi-VN")).toBe(false);
    expect(canCloneForLocale("tl-PH")).toBe(false);
  });
});

describe("baseLocale", () => {
  it("extracts the base language subtag from a BCP 47 tag", () => {
    expect(baseLocale("en-US")).toBe("en");
    expect(baseLocale("zh-TW")).toBe("zh");
    expect(baseLocale("pt-BR")).toBe("pt");
  });

  it("returns the input unchanged when there is no region subtag", () => {
    expect(baseLocale("en")).toBe("en");
    expect(baseLocale("fr")).toBe("fr");
  });

  it("lowercases the result", () => {
    expect(baseLocale("EN-US")).toBe("en");
    expect(baseLocale("FR")).toBe("fr");
  });
});
