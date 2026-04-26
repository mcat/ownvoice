import { describe, expect, test } from "vitest";
import {
  estimateSNR,
  highPass,
  peakNormalize,
  preprocessEnrollment,
  removeDCOffset,
  trimSilence,
} from "./enrollmentAudio";

const SR = 24000;

function rms(audio: Float32Array): number {
  let s = 0;
  for (let i = 0; i < audio.length; i++) s += audio[i] * audio[i];
  return Math.sqrt(s / audio.length);
}

function sine(freqHz: number, durSec: number, amp = 0.5, sr = SR): Float32Array {
  const n = Math.floor(durSec * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freqHz * i) / sr);
  return out;
}

describe("removeDCOffset", () => {
  test("removes a positive DC offset", () => {
    const audio = new Float32Array(1000).fill(0.3);
    const result = removeDCOffset(audio);
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += result[i];
    const mean = sum / result.length;
    expect(Math.abs(mean)).toBeLessThan(1e-6);
  });

  test("leaves a zero-mean signal almost unchanged", () => {
    const audio = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) audio[i] = Math.sin((2 * Math.PI * i) / 100);
    const result = removeDCOffset(audio);
    for (let i = 0; i < 1000; i++) {
      expect(Math.abs(result[i] - audio[i])).toBeLessThan(1e-5);
    }
  });

  test("does not mutate the input", () => {
    const audio = new Float32Array(100).fill(0.5);
    removeDCOffset(audio);
    for (let i = 0; i < 100; i++) expect(audio[i]).toBe(0.5);
  });
});

describe("highPass at 80 Hz", () => {
  test("attenuates a 30 Hz rumble by at least 12 dB", () => {
    const tone = sine(30, 1.0);
    const filtered = highPass(tone, SR, 80);
    // Drop the first 200 ms of transient settling (~6 cycles at 30 Hz).
    const settle = Math.floor(0.2 * SR);
    const before = rms(tone.subarray(settle));
    const after = rms(filtered.subarray(settle));
    expect(20 * Math.log10(after / before)).toBeLessThan(-12);
  });

  test("passes a 1 kHz tone with less than 1 dB loss", () => {
    const tone = sine(1000, 0.5);
    const filtered = highPass(tone, SR, 80);
    const settle = Math.floor(0.05 * SR);
    const before = rms(tone.subarray(settle));
    const after = rms(filtered.subarray(settle));
    const lossDb = 20 * Math.log10(after / before);
    expect(lossDb).toBeGreaterThan(-1);
    expect(lossDb).toBeLessThan(0.5);
  });

  test("does not mutate the input", () => {
    const tone = sine(1000, 0.1);
    const snapshot = new Float32Array(tone);
    highPass(tone, SR, 80);
    for (let i = 0; i < tone.length; i++) expect(tone[i]).toBe(snapshot[i]);
  });
});

function peak(audio: Float32Array): number {
  let p = 0;
  for (let i = 0; i < audio.length; i++) {
    const a = Math.abs(audio[i]);
    if (a > p) p = a;
  }
  return p;
}

describe("peakNormalize", () => {
  test("scales a 0.3-peak signal up to the target peak (0.95)", () => {
    const tone = sine(1000, 0.1, 0.3);
    const result = peakNormalize(tone, 0.95);
    expect(peak(result)).toBeCloseTo(0.95, 3);
  });

  test("scales a 1.5-peak (clipped) signal down to the target", () => {
    const tone = sine(1000, 0.1, 1.5);
    const result = peakNormalize(tone, 0.95);
    expect(peak(result)).toBeCloseTo(0.95, 3);
  });

  test("caps gain at maxGainDb so near-silent inputs don't explode", () => {
    const tone = sine(1000, 0.1, 0.001); // -60 dBFS — almost silent
    const result = peakNormalize(tone, 0.95, 20); // 20 dB max gain → 10x
    // 0.001 * 10 = 0.01 — far below 0.95 because of the gain cap
    expect(peak(result)).toBeLessThan(0.05);
  });

  test("returns zero-array for an all-zero input", () => {
    const audio = new Float32Array(1000);
    const result = peakNormalize(audio, 0.95);
    for (let i = 0; i < 1000; i++) expect(result[i]).toBe(0);
  });
});

function concat(...parts: Float32Array[]): Float32Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

describe("trimSilence at -40 dBFS", () => {
  test("removes 200 ms of leading silence", () => {
    const speech = sine(440, 0.5, 0.3);
    const lead = new Float32Array(Math.floor(0.2 * SR)); // silence
    const audio = concat(lead, speech);
    const result = trimSilence(audio, SR, -40);
    // Result should be roughly the speech length (within one frame).
    expect(result.length).toBeGreaterThan(speech.length - 0.05 * SR);
    expect(result.length).toBeLessThan(speech.length + 0.05 * SR);
  });

  test("removes 200 ms of trailing silence", () => {
    const speech = sine(440, 0.5, 0.3);
    const tail = new Float32Array(Math.floor(0.2 * SR));
    const audio = concat(speech, tail);
    const result = trimSilence(audio, SR, -40);
    expect(result.length).toBeGreaterThan(speech.length - 0.05 * SR);
    expect(result.length).toBeLessThan(speech.length + 0.05 * SR);
  });

  test("preserves silence between speech segments", () => {
    const seg1 = sine(440, 0.3, 0.3);
    const gap = new Float32Array(Math.floor(0.15 * SR)); // 150 ms gap
    const seg2 = sine(440, 0.3, 0.3);
    const audio = concat(seg1, gap, seg2);
    const result = trimSilence(audio, SR, -40);
    // Total should still be ~ seg1 + gap + seg2.
    expect(result.length).toBeGreaterThan(audio.length - 0.05 * SR);
  });

  test("returns the original buffer if nothing crosses the threshold", () => {
    const audio = new Float32Array(SR); // 1 sec of silence
    const result = trimSilence(audio, SR, -40);
    expect(result.length).toBe(audio.length);
  });
});

function whiteNoise(durSec: number, amp: number): Float32Array {
  const n = Math.floor(durSec * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * amp;
  return out;
}

describe("estimateSNR", () => {
  test("returns high SNR for clean speech-like signal with quiet pauses", () => {
    // 500 ms tone, 100 ms silence, 500 ms tone — top frames are the tone,
    // bottom frames are the silence. SNR should be very high (>40 dB).
    const audio = concat(
      sine(440, 0.5, 0.3),
      new Float32Array(Math.floor(0.1 * SR)),
      sine(440, 0.5, 0.3),
    );
    const { snrDb } = estimateSNR(audio, SR);
    expect(snrDb).toBeGreaterThan(40);
  });

  test("returns low SNR when speech is buried in white noise", () => {
    // Tone at amp 0.05, white noise at amp 0.05 throughout.
    const tone = sine(440, 1.0, 0.05);
    const noise = whiteNoise(1.0, 0.05);
    const audio = new Float32Array(tone.length);
    for (let i = 0; i < audio.length; i++) audio[i] = tone[i] + noise[i];
    const { snrDb } = estimateSNR(audio, SR);
    expect(snrDb).toBeLessThan(15);
  });

  test("returns ~0 dB when all frames are pure noise (no signal vs noise distinction)", () => {
    const audio = whiteNoise(1.0, 0.05);
    const { snrDb } = estimateSNR(audio, SR);
    // Pure stationary noise has signal_rms ≈ noise_rms, so SNR ≈ 0 dB.
    // Allow some headroom because top/bottom percentiles still differ a bit.
    expect(snrDb).toBeLessThan(10);
  });
});

describe("preprocessEnrollment", () => {
  test("trims silence, removes DC offset, and normalizes peak", () => {
    // 200 ms silence + 2.5 s of (1 kHz tone amp 0.2 + DC offset 0.1) + 200 ms silence
    const lead = new Float32Array(Math.floor(0.2 * SR));
    const tone = sine(1000, 2.5, 0.2);
    for (let i = 0; i < tone.length; i++) tone[i] += 0.1; // DC offset
    const tail = new Float32Array(Math.floor(0.2 * SR));
    const input = concat(lead, tone, tail);
    const result = preprocessEnrollment(input, SR);

    // Duration approximately the speech section (2.5 s) — allow up to ~300 ms
    // for HP-filter ringing into the silence regions plus the trim margin.
    expect(result.durationSec).toBeGreaterThan(2.4);
    expect(result.durationSec).toBeLessThan(2.9);

    // Peak normalized to ~0.95.
    let p = 0;
    for (let i = 0; i < result.audio.length; i++) {
      const a = Math.abs(result.audio[i]);
      if (a > p) p = a;
    }
    expect(p).toBeCloseTo(0.95, 2);

    // DC removed — mean close to zero.
    let sum = 0;
    for (let i = 0; i < result.audio.length; i++) sum += result.audio[i];
    expect(Math.abs(sum / result.audio.length)).toBeLessThan(0.01);

    // Quality gate accepts good audio.
    expect(result.acceptable).toBe(true);
    expect(result.snrDb).toBeGreaterThan(20);
  });

  test("rejects pure-noise input via the SNR gate", () => {
    const noise = whiteNoise(2.0, 0.1);
    const result = preprocessEnrollment(noise, SR);
    expect(result.acceptable).toBe(false);
    expect(result.rejectionReason).toBeDefined();
  });

  test("rejects audio shorter than the minimum duration", () => {
    const tiny = sine(440, 0.5, 0.3); // 0.5 s — below typical 2s minimum
    const result = preprocessEnrollment(tiny, SR);
    expect(result.acceptable).toBe(false);
    expect(result.rejectionReason).toContain("short");
  });

  test("does not mutate the input buffer", () => {
    const tone = sine(1000, 1.0, 0.5);
    const snapshot = new Float32Array(tone);
    preprocessEnrollment(tone, SR);
    for (let i = 0; i < tone.length; i++) expect(tone[i]).toBe(snapshot[i]);
  });
});
