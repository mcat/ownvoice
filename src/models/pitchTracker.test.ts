import { describe, it, expect } from "vitest";
import { trackPitch } from "./pitchTracker";

function sine(freq: number, durationSec: number, sampleRate: number): Float32Array {
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

function silence(durationSec: number, sampleRate: number): Float32Array {
  return new Float32Array(Math.round(durationSec * sampleRate));
}

describe("trackPitch", () => {
  it("recovers F0 of a 200 Hz sine wave within ±5 Hz", () => {
    const sr = 24000;
    const audio = sine(200, 0.5, sr);
    const result = trackPitch(audio, sr);
    const voicedF0s: number[] = [];
    for (let i = 0; i < result.f0Hz.length; i++) {
      if (result.voiced[i]) voicedF0s.push(result.f0Hz[i]);
    }
    expect(voicedF0s.length).toBeGreaterThan(10);
    const median = voicedF0s.sort((a, b) => a - b)[Math.floor(voicedF0s.length / 2)];
    expect(Math.abs(median - 200)).toBeLessThan(5);
  });

  it("marks pure silence as unvoiced everywhere", () => {
    const sr = 24000;
    const audio = silence(0.5, sr);
    const result = trackPitch(audio, sr);
    let voicedCount = 0;
    for (let i = 0; i < result.voiced.length; i++) if (result.voiced[i]) voicedCount++;
    expect(voicedCount).toBe(0);
  });

  it("reports high peak heights on clean periodic input", () => {
    const sr = 24000;
    const audio = sine(150, 0.5, sr);
    const result = trackPitch(audio, sr);
    const voicedHeights: number[] = [];
    for (let i = 0; i < result.peakHeights.length; i++) {
      if (result.voiced[i]) voicedHeights.push(result.peakHeights[i]);
    }
    expect(voicedHeights.length).toBeGreaterThan(10);
    const medianHeight = voicedHeights.sort((a, b) => a - b)[Math.floor(voicedHeights.length / 2)];
    expect(medianHeight).toBeGreaterThan(0.7);
  });

  it("reports low peak heights on white noise (used by dysphonia guard)", () => {
    const sr = 24000;
    const n = Math.round(0.5 * sr);
    const audio = new Float32Array(n);
    for (let i = 0; i < n; i++) audio[i] = (Math.random() * 2 - 1) * 0.3;
    const result = trackPitch(audio, sr);
    const allHeights: number[] = [];
    for (let i = 0; i < result.peakHeights.length; i++) allHeights.push(result.peakHeights[i]);
    const medianHeight = allHeights.sort((a, b) => a - b)[Math.floor(allHeights.length / 2)];
    expect(medianHeight).toBeLessThan(0.4);
  });

  it("returns empty arrays for input shorter than one window", () => {
    const sr = 24000;
    const audio = new Float32Array(100);
    const result = trackPitch(audio, sr);
    expect(result.f0Hz.length).toBe(0);
    expect(result.voiced.length).toBe(0);
    expect(result.peakHeights.length).toBe(0);
  });
});
