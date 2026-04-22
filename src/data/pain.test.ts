import { getEmojiFPS, getPainDescriptors, getBodyRegions, composePainSentence, t } from "./phraseRegistry";

const EMOJI_FPS = getEmojiFPS();
const PAIN_DESCRIPTORS = getPainDescriptors();
const BODY_REGIONS = getBodyRegions();

describe("EMOJI_FPS", () => {
  it("has 6 entries", () => {
    expect(EMOJI_FPS).toHaveLength(6);
  });

  it("covers levels 0, 2, 4, 6, 8, 10", () => {
    const levels = EMOJI_FPS.map((f) => f.n);
    expect(levels).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("each face has n, face, and labelKey that resolves", () => {
    for (const face of EMOJI_FPS) {
      expect(face.n).toEqual(expect.any(Number));
      expect(face.face).toEqual(expect.any(String));
      expect(face.face.length).toBeGreaterThan(0);
      const label = t(face.labelKey, "en");
      expect(label).toEqual(expect.any(String));
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("PAIN_DESCRIPTORS", () => {
  it("has 9 entries", () => {
    expect(PAIN_DESCRIPTORS).toHaveLength(9);
  });

  it("each descriptor has key that resolves and non-empty icon", () => {
    for (const d of PAIN_DESCRIPTORS) {
      const text = t(d.key, "en");
      expect(text).toEqual(expect.any(String));
      expect(text.length).toBeGreaterThan(0);
      expect(d.icon).toEqual(expect.any(String));
      expect(d.icon.length).toBeGreaterThan(0);
    }
  });
});

describe("BODY_REGIONS", () => {
  it("has 13 entries", () => {
    expect(BODY_REGIONS).toHaveLength(13);
  });

  it("each region has key that resolves to a non-empty string", () => {
    for (const region of BODY_REGIONS) {
      const text = t(region.key, "en");
      expect(text).toEqual(expect.any(String));
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// composePainSentence — key-based
// =============================================================================
describe("composePainSentence — key-based", () => {
  it("composes a pain sentence in English", () => {
    const out = composePainSentence({
      locale: "en",
      descriptorKey: "pain.descriptor.burning",
      regionKey: "pain.region.chest",
      severity: 8,
    });
    expect(out).toBe("I have burning pain in my Chest, level 8 out of 10");
  });

  it("lowercases the descriptor in the sentence", () => {
    const out = composePainSentence({
      locale: "en",
      descriptorKey: "pain.descriptor.sharp",
      regionKey: "pain.region.head",
      severity: 4,
    });
    expect(out).toBe("I have sharp pain in my Head, level 4 out of 10");
  });
});
