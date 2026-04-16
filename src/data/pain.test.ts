import { getEmojiFPS, getPainDescriptors, getBodyRegions } from "./phraseRegistry";

const EMOJI_FPS = getEmojiFPS("en");
const PAIN_DESCRIPTORS = getPainDescriptors("en");
const BODY_REGIONS = getBodyRegions("en");

describe("EMOJI_FPS", () => {
  it("has 6 entries", () => {
    expect(EMOJI_FPS).toHaveLength(6);
  });

  it("covers levels 0, 2, 4, 6, 8, 10", () => {
    const levels = EMOJI_FPS.map((f) => f.n);
    expect(levels).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("each face has n, face, and label", () => {
    for (const face of EMOJI_FPS) {
      expect(face.n).toEqual(expect.any(Number));
      expect(face.face).toEqual(expect.any(String));
      expect(face.face.length).toBeGreaterThan(0);
      expect(face.label).toEqual(expect.any(String));
      expect(face.label.length).toBeGreaterThan(0);
    }
  });
});

describe("PAIN_DESCRIPTORS", () => {
  it("has 9 entries", () => {
    expect(PAIN_DESCRIPTORS).toHaveLength(9);
  });

  it("each descriptor has non-empty text and icon", () => {
    for (const d of PAIN_DESCRIPTORS) {
      expect(d.text).toEqual(expect.any(String));
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.icon).toEqual(expect.any(String));
      expect(d.icon.length).toBeGreaterThan(0);
    }
  });
});

describe("BODY_REGIONS", () => {
  it("has 13 entries", () => {
    expect(BODY_REGIONS).toHaveLength(13);
  });

  it("each region is a non-empty string", () => {
    for (const region of BODY_REGIONS) {
      expect(region).toEqual(expect.any(String));
      expect(region.length).toBeGreaterThan(0);
    }
  });
});
