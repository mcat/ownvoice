import { describe, it, expect } from "vitest";
import { CHATTERBOX_LOCALES, canCloneForLocale } from "./chatterboxLocales";

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
});
