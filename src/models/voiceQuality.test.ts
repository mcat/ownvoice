import { describe, it, expect } from "vitest";
import {
  QUALITY_VERSION,
  DEFAULT_WEIGHTS,
  scoreSnr,
  scoreClipping,
  computeClipFraction,
  scoreCoverage,
  scoreVoicedFraction,
  computeVoicedFraction,
  scorePitchVariation,
  computePitchStdevSemitones,
  scoreLoudnessConsistency,
  computeLoudnessCV,
  scoreSpectralTilt,
  computeSpectralTiltAlphaDb,
  classifyTiltDirection,
} from "./voiceQuality";

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

describe("scoreSnr", () => {
  it("returns 0 at the gate floor (6 dB)", () => {
    expect(scoreSnr(6)).toBeCloseTo(0, 1);
  });
  it("returns ~50 at 15 dB", () => {
    expect(scoreSnr(15)).toBeGreaterThan(45);
    expect(scoreSnr(15)).toBeLessThan(55);
  });
  it("returns ~90 at 25 dB", () => {
    expect(scoreSnr(25)).toBeGreaterThan(85);
    expect(scoreSnr(25)).toBeLessThan(95);
  });
  it("returns 100 at and above 35 dB", () => {
    expect(scoreSnr(35)).toBeCloseTo(100, 1);
    expect(scoreSnr(50)).toBe(100);
  });
  it("clamps below the floor", () => {
    expect(scoreSnr(0)).toBe(0);
    expect(scoreSnr(-5)).toBe(0);
  });
});

describe("computeClipFraction", () => {
  it("returns 0 for clean signal at 0.5 amplitude", () => {
    const a = new Float32Array(1000);
    for (let i = 0; i < a.length; i++) a[i] = 0.5;
    expect(computeClipFraction(a)).toBe(0);
  });
  it("returns 1 when every sample is at the ceiling", () => {
    const a = new Float32Array(1000);
    for (let i = 0; i < a.length; i++) a[i] = 1;
    expect(computeClipFraction(a)).toBeCloseTo(1, 5);
  });
  it("counts samples at +/- 0.99 as clipped", () => {
    const a = new Float32Array(100);
    a[0] = 0.99;
    a[1] = -1;
    expect(computeClipFraction(a)).toBeCloseTo(0.02, 5);
  });
});

describe("scoreClipping", () => {
  it("returns 100 for zero clipping", () => { expect(scoreClipping(0)).toBe(100); });
  it("returns ~80 at 0.05% clipping", () => {
    expect(scoreClipping(0.0005)).toBeGreaterThan(75);
    expect(scoreClipping(0.0005)).toBeLessThan(85);
  });
  it("returns ~30 at 0.5% clipping", () => {
    expect(scoreClipping(0.005)).toBeGreaterThan(25);
    expect(scoreClipping(0.005)).toBeLessThan(35);
  });
  it("returns 0 at and above 2% clipping", () => {
    expect(scoreClipping(0.02)).toBe(0);
    expect(scoreClipping(0.5)).toBe(0);
  });
});

describe("scoreCoverage", () => {
  it("returns 0 below 2 s of speech", () => {
    expect(scoreCoverage(1.5)).toBe(0);
    expect(scoreCoverage(0)).toBe(0);
  });
  it("returns ~60 at 6 s", () => {
    expect(scoreCoverage(6)).toBeGreaterThan(55);
    expect(scoreCoverage(6)).toBeLessThan(65);
  });
  it("returns ~95 at 12 s", () => {
    expect(scoreCoverage(12)).toBeGreaterThan(90);
    expect(scoreCoverage(12)).toBe(95);
  });
  it("returns 100 above 12 s", () => {
    expect(scoreCoverage(15)).toBe(100);
    expect(scoreCoverage(60)).toBe(100);
  });
});

describe("computeVoicedFraction", () => {
  it("returns 0 for pure silence", () => {
    const audio = new Float32Array(48000);
    expect(computeVoicedFraction(audio, 24000)).toBe(0);
  });
  it("returns ~1 for sustained loud speech", () => {
    const audio = new Float32Array(48000);
    for (let i = 0; i < audio.length; i++) audio[i] = Math.sin((2 * Math.PI * 200 * i) / 24000) * 0.5;
    expect(computeVoicedFraction(audio, 24000)).toBeGreaterThan(0.95);
  });
  it("returns ~0.5 for half-speech / half-silence", () => {
    const audio = new Float32Array(48000);
    for (let i = 0; i < 24000; i++) audio[i] = Math.sin((2 * Math.PI * 200 * i) / 24000) * 0.5;
    const f = computeVoicedFraction(audio, 24000);
    expect(f).toBeGreaterThan(0.4);
    expect(f).toBeLessThan(0.6);
  });
});

describe("scoreVoicedFraction", () => {
  it("returns 0 at 40% voiced", () => { expect(scoreVoicedFraction(0.4)).toBe(0); });
  it("returns ~40 at 60%", () => {
    expect(scoreVoicedFraction(0.6)).toBeGreaterThan(35);
    expect(scoreVoicedFraction(0.6)).toBeLessThan(45);
  });
  it("returns ~80 at 75%", () => {
    expect(scoreVoicedFraction(0.75)).toBeGreaterThan(75);
    expect(scoreVoicedFraction(0.75)).toBeLessThan(85);
  });
  it("returns 100 at 85% and above", () => {
    expect(scoreVoicedFraction(0.85)).toBe(100);
    expect(scoreVoicedFraction(1)).toBe(100);
  });
});

describe("computePitchStdevSemitones", () => {
  it("returns 0 for a constant pitch", () => {
    const f0 = new Float32Array(20).fill(150);
    const voiced = new Uint8Array(20).fill(1);
    expect(computePitchStdevSemitones(f0, voiced)).toBeCloseTo(0, 3);
  });
  it("returns ~1 semitone stdev for f0 oscillating ±~3% (1 ST = 2^(1/12) ≈ 5.95%)", () => {
    const f0 = new Float32Array(40);
    const voiced = new Uint8Array(40).fill(1);
    for (let i = 0; i < 40; i++) f0[i] = i % 2 === 0 ? 200 : 200 * Math.pow(2, 1 / 12);
    const sd = computePitchStdevSemitones(f0, voiced);
    expect(sd).toBeGreaterThan(0.4);
    expect(sd).toBeLessThan(0.6);
  });
  it("returns null when no frames are voiced", () => {
    const f0 = new Float32Array(10);
    const voiced = new Uint8Array(10);
    expect(computePitchStdevSemitones(f0, voiced)).toBeNull();
  });
  it("returns null with fewer than 2 voiced frames", () => {
    const f0 = new Float32Array(10);
    const voiced = new Uint8Array(10);
    voiced[3] = 1;
    f0[3] = 200;
    expect(computePitchStdevSemitones(f0, voiced)).toBeNull();
  });
});

describe("scorePitchVariation", () => {
  it("returns 0 at 1 ST (monotone)", () => { expect(scorePitchVariation(1)).toBe(0); });
  it("returns ~70 at 2.5 ST (neutral read speech band)", () => {
    expect(scorePitchVariation(2.5)).toBeGreaterThan(65);
    expect(scorePitchVariation(2.5)).toBeLessThan(75);
  });
  it("returns 100 at 4.5 ST and above", () => {
    expect(scorePitchVariation(4.5)).toBe(100);
    expect(scorePitchVariation(8)).toBe(100);
  });
});

describe("computeLoudnessCV", () => {
  it("returns 0 for steady-amplitude signal", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 2);
    for (let i = 0; i < audio.length; i++) audio[i] = 0.5;
    expect(computeLoudnessCV(audio, sr)).toBeCloseTo(0, 3);
  });
  it("returns large CV for half-silent signal", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 2);
    for (let i = 0; i < sr; i++) audio[i] = 0.5;
    expect(computeLoudnessCV(audio, sr)).toBeGreaterThan(0.8);
  });
});

describe("scoreLoudnessConsistency", () => {
  it("returns 100 below CV 0.25", () => {
    expect(scoreLoudnessConsistency(0.1)).toBe(100);
    expect(scoreLoudnessConsistency(0.25)).toBe(100);
  });
  it("returns ~70 at CV 0.5", () => {
    expect(scoreLoudnessConsistency(0.5)).toBeGreaterThan(65);
    expect(scoreLoudnessConsistency(0.5)).toBeLessThan(75);
  });
  it("returns 0 at CV 1.5 and above", () => {
    expect(scoreLoudnessConsistency(1.5)).toBe(0);
    expect(scoreLoudnessConsistency(3)).toBe(0);
  });
});

describe("computeSpectralTiltAlphaDb", () => {
  it("returns negative alpha (low-band-heavy) for a low-pass signal", () => {
    const sr = 24000;
    const audio = new Float32Array(sr);
    for (let i = 0; i < audio.length; i++) audio[i] = Math.sin((2 * Math.PI * 200 * i) / sr) * 0.5;
    const voiced = new Uint8Array(audio.length).fill(1);
    expect(computeSpectralTiltAlphaDb(audio, voiced, sr)).toBeLessThan(-10);
  });
  it("returns positive alpha (high-band-heavy) for a high-pass signal", () => {
    const sr = 24000;
    const audio = new Float32Array(sr);
    for (let i = 0; i < audio.length; i++) audio[i] = Math.sin((2 * Math.PI * 3000 * i) / sr) * 0.5;
    const voiced = new Uint8Array(audio.length).fill(1);
    expect(computeSpectralTiltAlphaDb(audio, voiced, sr)).toBeGreaterThan(10);
  });
});

describe("classifyTiltDirection", () => {
  it("classifies near target as neutral", () => { expect(classifyTiltDirection(-3)).toBe("neutral"); });
  it("classifies very negative delta as boomy", () => { expect(classifyTiltDirection(-12)).toBe("boomy"); });
  it("classifies very positive delta as tinny", () => { expect(classifyTiltDirection(8)).toBe("tinny"); });
});

describe("scoreSpectralTilt", () => {
  it("returns 100 within ±3 dB of target", () => {
    expect(scoreSpectralTilt(-3)).toBe(100);
    expect(scoreSpectralTilt(0)).toBe(100);
  });
  it("returns ~70 at 7 dB delta", () => {
    expect(scoreSpectralTilt(-10)).toBeGreaterThan(65);
    expect(scoreSpectralTilt(-10)).toBeLessThan(75);
  });
  it("returns 0 at 18 dB delta", () => {
    expect(scoreSpectralTilt(-21)).toBe(0);
    expect(scoreSpectralTilt(15)).toBe(0);
  });
});

import { aggregate, scoreVoiceSample } from "./voiceQuality";

describe("aggregate", () => {
  it("returns the weighted sum when all sub-scores are present", () => {
    const score = aggregate({
      snr: 100, clipping: 100, pitchVariation: 100, voicedFraction: 100,
      loudnessConsistency: 100, coverage: 100, spectralTilt: 100,
    });
    expect(score).toBeCloseTo(100, 5);
  });
  it("redistributes weight when pitchVariation is null", () => {
    const score = aggregate({
      snr: 100, clipping: 100, pitchVariation: null, voicedFraction: 100,
      loudnessConsistency: 100, coverage: 100, spectralTilt: 100,
    });
    expect(score).toBeCloseTo(100, 5);
  });
  it("low pitchVariation pulls the aggregate down", () => {
    const score = aggregate({
      snr: 100, clipping: 100, pitchVariation: 0, voicedFraction: 100,
      loudnessConsistency: 100, coverage: 100, spectralTilt: 100,
    });
    expect(score).toBeLessThan(100);
    expect(score).toBeCloseTo(75, 1); // (1 - 0.25) * 100
  });
});

describe("scoreVoiceSample", () => {
  it("scores a synthetic clean read in the 'good' band", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 5);
    // 200 Hz fundamental amplitude-modulated by 5 Hz to vary pitch via vibrato
    for (let i = 0; i < audio.length; i++) {
      const t = i / sr;
      const f0 = 200 * Math.pow(2, 0.05 * Math.sin(2 * Math.PI * 0.5 * t));
      audio[i] = Math.sin(2 * Math.PI * f0 * t) * 0.4;
    }
    const result = scoreVoiceSample(audio, sr);
    expect(result.qualityVersion).toBe(1);
    expect(result.score).toBeGreaterThan(50);
    expect(result.breakdown.clipping).toBe(100);
    expect(result.breakdown.pitchVariation).not.toBeNull();
  });

  it("fires the dysphonia guard on weak-periodicity input (sets pitchVariation to null)", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 3);
    for (let i = 0; i < audio.length; i++) {
      const envelope = 0.5 + 0.5 * Math.sin((2 * Math.PI * 4 * i) / sr);
      audio[i] = (Math.random() * 2 - 1) * 0.4 * envelope;
    }
    const result = scoreVoiceSample(audio, sr);
    expect(result.breakdown.pitchVariation).toBeNull();
  });

  it("fully-clipped signal scores low on clipping", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 3);
    for (let i = 0; i < audio.length; i++) audio[i] = i % 2 === 0 ? 1 : -1;
    const result = scoreVoiceSample(audio, sr);
    expect(result.breakdown.clipping).toBeLessThan(10);
  });

  it("returns spectralTiltDirection 'boomy' on heavy low-band content", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 3);
    for (let i = 0; i < audio.length; i++) audio[i] = Math.sin((2 * Math.PI * 150 * i) / sr) * 0.4;
    const result = scoreVoiceSample(audio, sr);
    expect(result.spectralTiltDirection).toBe("boomy");
  });
});
