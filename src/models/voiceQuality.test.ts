import { describe, it, expect } from "vitest";
import { QUALITY_VERSION, DEFAULT_WEIGHTS } from "./voiceQuality";

describe("voiceQuality module constants", () => {
  it("exports QUALITY_VERSION starting at 1", () => {
    expect(QUALITY_VERSION).toBe(1);
  });

  it("DEFAULT_WEIGHTS sum to 1.0", () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("DEFAULT_WEIGHTS includes all seven sub-scores", () => {
    expect(Object.keys(DEFAULT_WEIGHTS).sort()).toEqual([
      "clipping",
      "coverage",
      "loudnessConsistency",
      "pitchVariation",
      "snr",
      "spectralTilt",
      "voicedFraction",
    ]);
  });
});
