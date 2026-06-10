/**
 * Characterization tests for the TTS post-processing chain.
 *
 * postProcessAudio runs once at audio-cache write time on EVERY phrase a
 * patient will ever tap — it had zero direct coverage. These tests pin
 * the load-bearing behaviors (DC removal, trim semantics, normalization,
 * limiter ceiling, fades, NaN-safety) so future DSP edits fail loudly
 * instead of audibly.
 */
import { postProcessAudio, applyBiquad } from "./dsp";

const SR = 24_000;

function sine(freq: number, seconds: number, amp = 0.5, sr = SR): Float32Array {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

function allFinite(buf: Float32Array): boolean {
  for (let i = 0; i < buf.length; i++) if (!Number.isFinite(buf[i])) return false;
  return true;
}

function peak(buf: Float32Array): number {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  return m;
}

function mean(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i];
  return buf.length ? s / buf.length : 0;
}

describe("postProcessAudio", () => {
  it("returns the input untouched for an empty buffer", () => {
    const empty = new Float32Array(0);
    expect(postProcessAudio(empty, SR)).toBe(empty);
  });

  it("maps silence to silence without NaN", () => {
    const out = postProcessAudio(new Float32Array(SR), SR);
    expect(allFinite(out)).toBe(true);
    expect(peak(out)).toBe(0);
  });

  it("removes a DC offset", () => {
    const input = sine(220, 1, 0.3);
    for (let i = 0; i < input.length; i++) input[i] += 0.4; // decoder bias
    expect(Math.abs(mean(input))).toBeGreaterThan(0.3);

    const out = postProcessAudio(input, SR);
    expect(Math.abs(mean(out))).toBeLessThan(0.01);
  });

  it("normalizes a quiet clip to ~0.85 peak and never exceeds the 0.9 limiter ceiling", () => {
    const quiet = postProcessAudio(sine(220, 1, 0.05), SR);
    expect(peak(quiet)).toBeGreaterThan(0.5);
    expect(peak(quiet)).toBeLessThanOrEqual(0.9);

    const blownOut = postProcessAudio(sine(220, 1, 50), SR);
    expect(allFinite(blownOut)).toBe(true);
    expect(peak(blownOut)).toBeLessThanOrEqual(0.9);
  });

  it("trims leading near-silence ahead of a voiced onset", () => {
    const silenceMs = 200;
    const lead = new Float32Array(Math.floor((SR * silenceMs) / 1000));
    for (let i = 0; i < lead.length; i++) lead[i] = 0.001 * Math.sin(i); // breathy floor
    const voiced = sine(220, 1, 0.5);
    const input = new Float32Array(lead.length + voiced.length);
    input.set(lead, 0);
    input.set(voiced, lead.length);

    const out = postProcessAudio(input, SR);
    // Onset detection backs off one 10 ms window from the first loud
    // window, so expect roughly (silenceMs − 20 ms) trimmed.
    const trimmed = input.length - out.length;
    expect(trimmed).toBeGreaterThan((SR * (silenceMs - 40)) / 1000);
    expect(trimmed).toBeLessThanOrEqual((SR * 250) / 1000); // hard cap
  });

  it("refuses to trim when no onset is found within the 250 ms cap", () => {
    // 2 s of silence then speech: the onset is far past the cap, and the
    // documented behavior is "leave the audio alone rather than risk
    // trimming an entire quiet phrase".
    const lead = new Float32Array(SR * 2);
    const voiced = sine(220, 0.5, 0.5);
    const input = new Float32Array(lead.length + voiced.length);
    input.set(voiced, lead.length);

    const out = postProcessAudio(input, SR);
    expect(out.length).toBe(input.length);
  });

  it("applies cosine fades so the first and last samples are exactly zero", () => {
    // Loud from sample 0 → no leading trim → fade indices are stable.
    const out = postProcessAudio(sine(220, 0.5, 0.8), SR);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(0);
  });

  it("stays finite on degenerate tiny buffers", () => {
    for (const n of [1, 2, 7, 64]) {
      const buf = new Float32Array(n).fill(0.25);
      const out = postProcessAudio(buf, SR);
      expect(allFinite(out)).toBe(true);
    }
  });
});

describe("applyBiquad", () => {
  it("high-pass at 80 Hz blocks DC in steady state", () => {
    const buf = new Float32Array(SR).fill(0.5);
    applyBiquad(buf, SR, 80, "hp");
    const tail = buf.subarray(buf.length / 2);
    expect(Math.abs(mean(tail as Float32Array))).toBeLessThan(0.01);
  });

  it("low-pass at 1 kHz strongly attenuates a Nyquist-rate alternation", () => {
    const buf = new Float32Array(SR);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 1 : -1;
    applyBiquad(buf, SR, 1000, "lp");
    const tail = buf.subarray(buf.length / 2);
    let sumSq = 0;
    for (let i = 0; i < tail.length; i++) sumSq += tail[i] * tail[i];
    expect(Math.sqrt(sumSq / tail.length)).toBeLessThan(0.05);
  });

  it("passes a mid-band tone through the speech-band filters mostly intact", () => {
    const buf = sine(440, 1, 0.5);
    applyBiquad(buf, SR, 80, "hp");
    applyBiquad(buf, SR, 9000, "lp");
    expect(peak(buf)).toBeGreaterThan(0.4);
    expect(allFinite(buf)).toBe(true);
  });
});
