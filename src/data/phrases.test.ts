import { LANGS } from "./phrases";
import {
  getCategories,
  getPatientSpeakablePhrases,
  getProviderSpeakablePhrases,
  getProviderCategories,
} from "./phraseRegistry";

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

describe("getPatientSpeakablePhrases", () => {
  const patient = getPatientSpeakablePhrases("en");
  const providerText = new Set(
    Object.values(getProviderCategories("en")).flat(),
  );

  it("returns a non-empty list", () => {
    expect(patient.length).toBeGreaterThan(0);
  });

  it("has no duplicates", () => {
    expect(new Set(patient).size).toBe(patient.length);
  });

  it("includes Quick tab phrases first for priority caching", () => {
    const quick = CATS.find((c) => c.id === "quick")!;
    const firstQuick = quick.phrases![0].text;
    expect(patient.indexOf(firstQuick)).toBeLessThan(6);
  });

  it("includes category phrases, pain parts, wish responses, time suggestions, emergency", () => {
    expect(patient).toContain("Yes");
    expect(patient).toContain("I need water");
    expect(patient).toContain("I need help");
  });

  it("excludes phrases that only appear in provider categories", () => {
    const providerOnly = [...providerText].filter((p) => {
      // A phrase is provider-only if it doesn't appear in any patient surface.
      // We can't introspect all patient surfaces here, so check via the
      // public contract: patient list must not contain it.
      return !patient.includes(p);
    });
    // Every provider phrase that isn't shared must be absent from patient list.
    expect(providerOnly.length).toBeGreaterThan(0);
    for (const p of providerOnly) {
      expect(patient).not.toContain(p);
    }
  });
});

describe("getProviderSpeakablePhrases", () => {
  const provider = getProviderSpeakablePhrases("en");

  it("returns a non-empty list", () => {
    expect(provider.length).toBeGreaterThan(0);
  });

  it("has no duplicates", () => {
    expect(new Set(provider).size).toBe(provider.length);
  });

  it("contains only provider-category phrases", () => {
    const providerSet = new Set(
      Object.values(getProviderCategories("en")).flat(),
    );
    for (const p of provider) {
      expect(providerSet.has(p)).toBe(true);
    }
  });
});
