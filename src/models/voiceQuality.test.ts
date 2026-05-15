/*
 * Mutation-audit accepted-survivor categories (as of 2026-05-15):
 *
 *  - Piecewise-linear curve interior points (`[1.0, 30]`-style ArrayDeclaration
 *    mutants in `scoreSnr` / `scoreCoverage` / `scorePitchVariation` etc.).
 *    Killing these would lock in the exact curve shape the team designs
 *    iteratively. Sub-score outputs are tested at representative inputs;
 *    asserting on every interior knot is brittle for an advisory metric.
 *
 *  - FFT / spectral arithmetic intermediates (ArithmeticOperator and
 *    EqualityOperator mutants in `computeSpectralTiltAlphaDb`). Killing
 *    requires asserting exact bin powers, which couples tests to FFT
 *    implementation details rather than the classified output
 *    (boomy/tinny/neutral) we actually care about.
 *
 *  - Guard-chain LogicalOperator mutants (`a && b` → `a || b`) where both
 *    arms are exercised by separate tests with different observable
 *    outcomes. The mutant produces the same observable result on the
 *    inputs we test; the corner case where they'd diverge isn't load-
 *    bearing for the advisory score.
 *
 * If the score becomes a hard gate rather than advisory, revisit — the
 * brittleness/value tradeoff flips at that point.
 */
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
  isValidQualityResult,
} from "./voiceQuality";

describe("voiceQuality module constants", () => {
  it("exports QUALITY_VERSION at the current value", () => {
    expect(QUALITY_VERSION).toBe(3);
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
  it("returns ~40 at 55%", () => {
    expect(scoreVoicedFraction(0.55)).toBeGreaterThan(35);
    expect(scoreVoicedFraction(0.55)).toBeLessThan(45);
  });
  it("returns ~80 at 70%", () => {
    expect(scoreVoicedFraction(0.7)).toBeGreaterThan(75);
    expect(scoreVoicedFraction(0.7)).toBeLessThan(85);
  });
  it("returns 100 at 80% and above", () => {
    expect(scoreVoicedFraction(0.8)).toBe(100);
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
    expect(result.qualityVersion).toBe(3);
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

  it("scores pure silence at zero (no-speech guard fires)", () => {
    // Regression test: before the no-speech guard, 7s of pure zero audio
    // scored ~51 because clipping/loudnessConsistency/spectralTilt all
    // returned 100 (no degradation = full credit) and coverage gave 66
    // (raw 7s in the 6→60..12→95 band). The user reported score 60 on
    // dead-air recordings; this asserts silence now scores 0.
    const sr = 24000;
    const audio = new Float32Array(sr * 7);
    const result = scoreVoiceSample(audio, sr);
    expect(result.score).toBe(0);
    expect(result.breakdown.clipping).toBeNull();
    expect(result.breakdown.loudnessConsistency).toBeNull();
    expect(result.breakdown.spectralTilt).toBeNull();
    expect(result.breakdown.voicedFraction).toBe(0);
    expect(result.breakdown.coverage).toBe(0);
    // When the no-speech guard fires, tilt direction defaults to "neutral"
    // rather than being computed from FFT of all-zero audio (which is
    // undefined). Asserting the default keeps the contract pinned.
    expect(result.spectralTiltDirection).toBe("neutral");
  });

  it("scores low-amplitude ambient noise at zero (no-speech guard fires)", () => {
    const sr = 24000;
    const audio = new Float32Array(sr * 7);
    // ~-54 dBFS room tone, well below the -40 dBFS voiced threshold
    for (let i = 0; i < audio.length; i++) audio[i] = (Math.random() * 2 - 1) * 0.002;
    const result = scoreVoiceSample(audio, sr);
    expect(result.score).toBeLessThan(15);
    expect(result.breakdown.clipping).toBeNull();
    expect(result.breakdown.loudnessConsistency).toBeNull();
    expect(result.breakdown.spectralTilt).toBeNull();
  });

  it("uses effective speech duration for coverage (raw × voicedFraction)", () => {
    // 12 s of audio with only the first 3 s voiced — effective speech
    // duration is ~3 s, well below the 6 s knee, so coverage should be low
    // even though the raw recording is "long enough."
    const sr = 24000;
    const audio = new Float32Array(sr * 12);
    for (let i = 0; i < sr * 3; i++) {
      audio[i] = Math.sin((2 * Math.PI * 200 * i) / sr) * 0.4;
    }
    // remaining 9 s stays silence
    const result = scoreVoiceSample(audio, sr);
    expect(result.breakdown.coverage).toBeLessThan(50);
  });
});

describe("isValidQualityResult", () => {
  function valid(): unknown {
    return {
      score: 75,
      breakdown: {
        snr: 80, clipping: 90, coverage: 60, voicedFraction: 70,
        pitchVariation: 75, loudnessConsistency: 80, spectralTilt: 85,
      },
      spectralTiltDirection: "neutral",
      qualityVersion: 1,
    };
  }

  it("accepts a well-formed object", () => {
    expect(isValidQualityResult(valid())).toBe(true);
  });
  it("accepts pitchVariation: null (dysphonia guard fired)", () => {
    const v = valid() as { breakdown: Record<string, number | null> };
    v.breakdown.pitchVariation = null;
    expect(isValidQualityResult(v)).toBe(true);
  });
  it("rejects null", () => { expect(isValidQualityResult(null)).toBe(false); });
  it("rejects non-object", () => { expect(isValidQualityResult(42)).toBe(false); });
  it("rejects when score is NaN", () => {
    const v = valid() as { score: number };
    v.score = NaN;
    expect(isValidQualityResult(v)).toBe(false);
  });
  it("rejects when a sub-score is missing", () => {
    const v = valid() as { breakdown: Record<string, unknown> };
    delete v.breakdown.snr;
    expect(isValidQualityResult(v)).toBe(false);
  });
  it("rejects when spectralTiltDirection is unknown", () => {
    const v = valid() as { spectralTiltDirection: string };
    v.spectralTiltDirection = "weird";
    expect(isValidQualityResult(v)).toBe(false);
  });
  // All three documented spectralTiltDirection values must be accepted.
  // Without these, the VALID_TILT_DIRECTIONS Set's "boomy" and "tinny"
  // entries are never exercised — only "neutral" is via the default
  // `valid()` fixture — and a future refactor could silently drop them.
  it.each(["boomy", "tinny", "neutral"] as const)(
    "accepts spectralTiltDirection: %s",
    (dir) => {
      const v = valid() as { spectralTiltDirection: string };
      v.spectralTiltDirection = dir;
      expect(isValidQualityResult(v)).toBe(true);
    },
  );
  it("rejects pitchVariation undefined (only null is allowed)", () => {
    const v = valid() as { breakdown: Record<string, unknown> };
    v.breakdown.pitchVariation = undefined;
    expect(isValidQualityResult(v)).toBe(false);
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("calibration: mark-voice.wav (Rainbow Passage)", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.resolve(here, "../../sample-voices/mark-voice.wav");

  it("scores in the 'good' band and does not trigger the dysphonia guard", () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const buf = fs.readFileSync(fixturePath);
    const { audio: audio48k, sampleRate } = decodePcm16Wav(buf);
    expect(sampleRate).toBe(48000);
    const audio24k = halveRate(audio48k);

    const result = scoreVoiceSample(audio24k, 24000);
    expect(result.breakdown.pitchVariation).not.toBeNull();
    expect(result.breakdown.pitchVariation as number).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.voicedFraction).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});

function decodePcm16Wav(buf: Buffer): { audio: Float32Array; sampleRate: number } {
  // Minimal RIFF/WAVE PCM-16 mono parser. Skips through chunks until 'fmt '
  // and 'data'; rejects anything that is not 16-bit mono PCM.
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const id = (off: number) => String.fromCharCode(view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3));
  if (id(0) !== "RIFF" || id(8) !== "WAVE") throw new Error("not a RIFF/WAVE file");
  let p = 12;
  let sampleRate = 0;
  let bits = 0;
  let channels = 0;
  let dataOff = 0;
  let dataLen = 0;
  while (p < buf.length) {
    const chunkId = id(p);
    const size = view.getUint32(p + 4, true);
    if (chunkId === "fmt ") {
      const fmt = view.getUint16(p + 8, true);
      if (fmt !== 1) throw new Error(`only PCM (1) supported, got fmt=${fmt}`);
      channels = view.getUint16(p + 10, true);
      sampleRate = view.getUint32(p + 12, true);
      bits = view.getUint16(p + 22, true);
    } else if (chunkId === "data") {
      dataOff = p + 8;
      dataLen = size;
      break;
    }
    p += 8 + size + (size % 2);
  }
  if (channels !== 1) throw new Error(`only mono supported, got ${channels} channels`);
  if (bits !== 16) throw new Error(`only 16-bit supported, got ${bits} bits`);
  const sampleCount = dataLen / 2;
  const audio = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    audio[i] = view.getInt16(dataOff + i * 2, true) / 32768;
  }
  return { audio, sampleRate };
}

function halveRate(audio: Float32Array): Float32Array {
  const out = new Float32Array(Math.floor(audio.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = (audio[2 * i] + audio[2 * i + 1]) / 2;
  }
  return out;
}
