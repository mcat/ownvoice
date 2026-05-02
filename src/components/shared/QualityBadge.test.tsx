import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { QualityBadge, labelFor, tipKeyFor } from "./QualityBadge";
import type { VoiceQualityResult } from "../../models/types";

function fixture(overrides: Partial<VoiceQualityResult> = {}): VoiceQualityResult {
  return {
    score: 85,
    breakdown: {
      snr: 90, clipping: 100, coverage: 80, voicedFraction: 80,
      pitchVariation: 80, loudnessConsistency: 90, spectralTilt: 85,
    },
    spectralTiltDirection: "neutral",
    qualityVersion: 1,
    ...overrides,
  };
}

describe("labelFor", () => {
  it("classifies >= 80 as good", () => { expect(labelFor(80)).toBe("good"); });
  it("classifies 50-79 as ok", () => { expect(labelFor(60)).toBe("ok"); });
  it("classifies < 50 as poor", () => { expect(labelFor(20)).toBe("poor"); });
});

describe("tipKeyFor", () => {
  it("returns null for high scores", () => {
    const q = fixture({ score: 90 });
    expect(tipKeyFor(q)).toBeNull();
  });
  it("returns the lowest sub-score's key", () => {
    const q = fixture({
      score: 60,
      breakdown: {
        snr: 95, clipping: 95, coverage: 95, voicedFraction: 30,
        pitchVariation: 95, loudnessConsistency: 95, spectralTilt: 95,
      },
    });
    expect(tipKeyFor(q)).toBe("ui.voice_quality.tip.voiced_fraction");
  });
  it("skips null pitchVariation when picking the lowest", () => {
    const q = fixture({
      score: 60,
      breakdown: {
        snr: 95, clipping: 95, coverage: 30, voicedFraction: 95,
        pitchVariation: null, loudnessConsistency: 95, spectralTilt: 95,
      },
    });
    expect(tipKeyFor(q)).toBe("ui.voice_quality.tip.coverage");
  });
  it("routes spectralTilt to the boomy tip when direction is boomy", () => {
    const q = fixture({
      score: 60,
      spectralTiltDirection: "boomy",
      breakdown: {
        snr: 95, clipping: 95, coverage: 95, voicedFraction: 95,
        pitchVariation: 95, loudnessConsistency: 95, spectralTilt: 30,
      },
    });
    expect(tipKeyFor(q)).toBe("ui.voice_quality.tip.tilt_boomy");
  });
  it("routes spectralTilt to the tinny tip when direction is tinny", () => {
    const q = fixture({
      score: 60,
      spectralTiltDirection: "tinny",
      breakdown: {
        snr: 95, clipping: 95, coverage: 95, voicedFraction: 95,
        pitchVariation: 95, loudnessConsistency: 95, spectralTilt: 30,
      },
    });
    expect(tipKeyFor(q)).toBe("ui.voice_quality.tip.tilt_tinny");
  });
});

describe("QualityBadge", () => {
  it("renders score, label, and tip when score is low", () => {
    const q = fixture({
      score: 60,
      breakdown: {
        snr: 95, clipping: 95, coverage: 95, voicedFraction: 30,
        pitchVariation: 95, loudnessConsistency: 95, spectralTilt: 95,
      },
    });
    render(<QualityBadge quality={q} locale="en" />);
    expect(screen.getByText(/60/)).toBeTruthy();
    expect(screen.getByText(/OK/i)).toBeTruthy();
    expect(screen.getByText(/keep talking/i)).toBeTruthy();
  });

  it("hides the tip in compact mode", () => {
    const q = fixture({
      score: 60,
      breakdown: {
        snr: 95, clipping: 95, coverage: 95, voicedFraction: 30,
        pitchVariation: 95, loudnessConsistency: 95, spectralTilt: 95,
      },
    });
    render(<QualityBadge quality={q} locale="en" compact />);
    expect(screen.queryByText(/keep talking/i)).toBeNull();
  });

  it("does not render a tip when score >= 80", () => {
    const q = fixture({ score: 90 });
    render(<QualityBadge quality={q} locale="en" />);
    expect(screen.queryByText(/try/i)).toBeNull();
  });
});
