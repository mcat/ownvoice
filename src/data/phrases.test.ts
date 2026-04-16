import { LANGS } from "./phrases";
import { getCategories } from "./phraseRegistry";

const CATS = getCategories("en");

describe("LANGS", () => {
  it("has 13 language entries", () => {
    expect(LANGS).toHaveLength(13);
  });

  it("each entry has code, label, and flag", () => {
    for (const lang of LANGS) {
      expect(lang.code).toEqual(expect.any(String));
      expect(lang.label).toEqual(expect.any(String));
      expect(lang.flag).toEqual(expect.any(String));
      expect(lang.code.length).toBeGreaterThan(0);
      expect(lang.label.length).toBeGreaterThan(0);
      expect(lang.flag.length).toBeGreaterThan(0);
    }
  });
});

describe("CATS", () => {
  it("has 5 categories", () => {
    expect(CATS).toHaveLength(5);
  });

  it("has the expected category ids in order", () => {
    const ids = CATS.map((c) => c.id);
    expect(ids).toEqual(["quick", "needs", "feelings", "questions", "pain"]);
  });

  it("each category has id, label, icon, and color", () => {
    for (const cat of CATS) {
      expect(cat.id).toEqual(expect.any(String));
      expect(cat.label).toEqual(expect.any(String));
      expect(cat.icon).toEqual(expect.any(String));
      expect(cat.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  describe("quick", () => {
    it("has a phrases array", () => {
      const quick = CATS.find((c) => c.id === "quick")!;
      expect(quick.phrases).toBeDefined();
      expect(quick.phrases!.length).toBeGreaterThan(0);
    });
  });

  describe("needs", () => {
    it("has subs (subcategories)", () => {
      const needs = CATS.find((c) => c.id === "needs")!;
      expect(needs.subs).toBeDefined();
      expect(needs.subs!.length).toBeGreaterThan(0);
    });
  });

  describe("feelings", () => {
    it("has subs (subcategories)", () => {
      const feelings = CATS.find((c) => c.id === "feelings")!;
      expect(feelings.subs).toBeDefined();
      expect(feelings.subs!.length).toBeGreaterThan(0);
    });
  });

  describe("pain", () => {
    it("has isPain flag set to true", () => {
      const pain = CATS.find((c) => c.id === "pain")!;
      expect(pain.isPain).toBe(true);
    });
  });

  describe("questions", () => {
    it("has a phrases array", () => {
      const questions = CATS.find((c) => c.id === "questions")!;
      expect(questions.phrases).toBeDefined();
      expect(questions.phrases!.length).toBeGreaterThan(0);
    });
  });

  it("all phrase objects have non-empty text and icon", () => {
    for (const cat of CATS) {
      const phrases = cat.phrases ?? [];
      const subPhrases = (cat.subs ?? []).flatMap((s) => s.phrases);
      for (const p of [...phrases, ...subPhrases]) {
        expect(p.text).toEqual(expect.any(String));
        expect(p.text.length).toBeGreaterThan(0);
        expect(p.icon).toEqual(expect.any(String));
        expect(p.icon.length).toBeGreaterThan(0);
      }
    }
  });
});
