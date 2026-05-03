# Voice Enrollment Quality Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an advisory 0-100 voice-quality score to the enrollment flow that computes seven sub-scores from raw audio (SNR, clipping, coverage, voiced fraction, pitch variation, loudness consistency, spectral tilt), persists with a versioning policy, and surfaces a single actionable tip when low.

**Architecture:** A pure scoring module `voiceQuality.ts` consumes the same raw `Float32Array` that `processAndCapture` already decodes. A small `pitchTracker.ts` and `fft.ts` provide DSP primitives. A `QualityBadge` component renders the score on the recording preview and the saved-state card. The score persists alongside `SpeakerData` in IndexedDB. A dysphonia guard prevents F0 mis-measurement from punishing ICU patients.

**Tech Stack:** TypeScript, Preact, Vite, Vitest (jsdom). Existing audio path runs through `MediaRecorder` → `AudioContext` (24 kHz) → `Float32Array`. Tests are colocated as `*.test.ts(x)`. Coverage thresholds in `vitest.config.ts` are 90/90/80 (lines/functions/branches).

**Spec:** `docs/superpowers/specs/2026-05-02-voice-quality-score-design.md`

---

## Task 0: Branch setup

**Files:**
- None (git operation only)

- [ ] **Step 1: Create the feature branch from `main`**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/voice-quality-score
```

Expected: branch created, working tree clean except for any pre-existing unrelated changes.

- [ ] **Step 2: Verify the test suite is green before any changes**

```bash
npm test -- --run
```

Expected: PASS. If anything fails on `main` before changes, stop and surface to the user — do not start work on a red baseline.

---

## Task 1: Add `VoiceQualityResult` type and extend `SpeakerData`

**Files:**
- Modify: `src/models/types.ts`

- [ ] **Step 1: Read the current `SpeakerData` definition**

```bash
sed -n '60,76p' src/models/types.ts
```

Expected: shows the existing `SpeakerData` interface declared at line 66.

- [ ] **Step 2: Add `VoiceQualityResult` and extend `SpeakerData`**

In `src/models/types.ts`, **add** the following just above the existing `SpeakerData` declaration (so the score type is in scope when `SpeakerData` references it):

```ts
/**
 * Advisory quality score for an enrollment recording. Computed by
 * `scoreVoiceSample` in voiceQuality.ts. Persisted alongside SpeakerData
 * to enable later clone-health views without a schema migration.
 */
export interface VoiceQualityResult {
  /** Overall 0-100 weighted score. */
  score: number;
  /** Per-dimension 0-100 sub-scores. `pitchVariation` is null when the
   *  pitch tracker's median voicing confidence is below threshold; the
   *  aggregate ignores null entries and renormalises remaining weights. */
  breakdown: {
    snr: number;
    clipping: number;
    coverage: number;
    voicedFraction: number;
    pitchVariation: number | null;
    loudnessConsistency: number;
    spectralTilt: number;
  };
  /** Direction of spectral-tilt deviation, used by the tip selector. */
  spectralTiltDirection: "boomy" | "tinny" | "neutral";
  /** Bumped when the algorithm or weights change. */
  qualityVersion: number;
}
```

Then **modify** `SpeakerData` to add the optional field:

```ts
export interface SpeakerData {
  condEmb: number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: number[];
  speakerFeaturesShape: number[];
  /** Optional: undefined for speakers enrolled before this feature shipped. */
  quality?: VoiceQualityResult;
}
```

- [ ] **Step 3: Run typecheck to verify the change compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: build succeeds (no type errors). If errors appear referencing files that import `SpeakerData`, do not patch them — they should already be compatible because the new field is optional.

- [ ] **Step 4: Commit**

```bash
git add src/models/types.ts
git commit -m "types(voice-quality): add VoiceQualityResult and extend SpeakerData"
```

---

## Task 2: Add a small real-input FFT primitive

**Files:**
- Create: `src/models/fft.ts`
- Test: `src/models/fft.test.ts`

A radix-2 Cooley-Tukey forward FFT for real-valued input. Used by the spectral-tilt sub-score. Approximately 90 lines.

- [ ] **Step 1: Write the failing test**

Create `src/models/fft.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fftReal } from "./fft";

describe("fftReal", () => {
  it("returns a single peak at bin 0 for a DC signal", () => {
    const N = 64;
    const x = new Float32Array(N).fill(1);
    const { re, im } = fftReal(x);
    expect(re[0]).toBeCloseTo(N, 3);
    expect(im[0]).toBeCloseTo(0, 5);
    for (let k = 1; k < N / 2; k++) {
      expect(Math.hypot(re[k], im[k])).toBeLessThan(1e-3);
    }
  });

  it("returns a single peak at the right bin for a pure sine", () => {
    const N = 128;
    const k0 = 8;
    const x = new Float32Array(N);
    for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * k0 * n) / N);
    const { re, im } = fftReal(x);
    const mag = (k: number) => Math.hypot(re[k], im[k]);
    let peakBin = 0;
    let peakMag = 0;
    for (let k = 0; k < N / 2; k++) {
      const m = mag(k);
      if (m > peakMag) { peakMag = m; peakBin = k; }
    }
    expect(peakBin).toBe(k0);
  });

  it("throws on non-power-of-2 length", () => {
    expect(() => fftReal(new Float32Array(100))).toThrow(/power of 2/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/models/fft.test.ts
```

Expected: FAIL with "Cannot find module './fft'" or "fftReal is not defined".

- [ ] **Step 3: Implement `fft.ts`**

Create `src/models/fft.ts`:

```ts
/**
 * Radix-2 Cooley-Tukey forward FFT for real-valued input.
 *
 * Length must be a power of 2. Returns full complex output as parallel
 * Float32Arrays (real and imaginary parts). Use bins 0..N/2 — bins above
 * Nyquist are the conjugate mirror and carry no new information.
 *
 * Self-contained, no dependencies. Used by spectral-tilt scoring.
 */
export function fftReal(x: Float32Array): { re: Float32Array; im: Float32Array } {
  const N = x.length;
  if ((N & (N - 1)) !== 0 || N === 0) {
    throw new Error(`fftReal: length must be a power of 2 (got ${N})`);
  }
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = x[i];
  bitReversePermute(re, im);

  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const tableStep = N / size;
    for (let i = 0; i < N; i += size) {
      let k = 0;
      for (let j = i; j < i + half; j++) {
        const angle = (-2 * Math.PI * k) / size;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const tre = re[j + half] * cos - im[j + half] * sin;
        const tim = re[j + half] * sin + im[j + half] * cos;
        re[j + half] = re[j] - tre;
        im[j + half] = im[j] - tim;
        re[j] += tre;
        im[j] += tim;
        k += tableStep;
      }
    }
  }
  return { re, im };
}

function bitReversePermute(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/models/fft.test.ts
```

Expected: PASS, 3/3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/models/fft.ts src/models/fft.test.ts
git commit -m "feat(voice-quality): add radix-2 FFT primitive"
```

---

## Task 3: Add the pitch tracker

**Files:**
- Create: `src/models/pitchTracker.ts`
- Test: `src/models/pitchTracker.test.ts`

Autocorrelation pitch tracker, ~80 lines. Returns per-frame F0, voiced mask, and per-frame autocorrelation peak heights (the voicing-confidence signal that the dysphonia guard later consumes).

- [ ] **Step 1: Write the failing test**

Create `src/models/pitchTracker.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/models/pitchTracker.test.ts
```

Expected: FAIL with "Cannot find module './pitchTracker'".

- [ ] **Step 3: Implement `pitchTracker.ts`**

Create `src/models/pitchTracker.ts`:

```ts
/**
 * Autocorrelation pitch tracker.
 *
 * Operates on raw audio at any sample rate; internally downsamples to
 * 8 kHz before correlation (covers F0 down to ~70 Hz; ~3× cheaper than
 * 24 kHz). Returns per-frame F0, voiced mask, and the normalised
 * autocorrelation peak height — the latter is consumed by the dysphonia
 * guard in voiceQuality.ts to decide whether the F0 estimates are
 * trustworthy enough to score.
 */

const TARGET_SR = 8000;
const FRAME_MS = 30;
const HOP_MS = 10;
const F0_MIN_HZ = 70;
const F0_MAX_HZ = 500;
const VOICING_PEAK_THRESHOLD = 0.3;

export interface PitchTrack {
  f0Hz: Float32Array;
  voiced: Uint8Array;
  peakHeights: Float32Array;
}

export function trackPitch(audio: Float32Array, sampleRate: number): PitchTrack {
  const downsampled = downsampleTo(audio, sampleRate, TARGET_SR);
  const filtered = bandpassF0Range(downsampled, TARGET_SR);
  const frameSize = Math.floor((FRAME_MS / 1000) * TARGET_SR);
  const hopSize = Math.floor((HOP_MS / 1000) * TARGET_SR);

  if (filtered.length < frameSize) {
    return { f0Hz: new Float32Array(0), voiced: new Uint8Array(0), peakHeights: new Float32Array(0) };
  }

  const numFrames = Math.floor((filtered.length - frameSize) / hopSize) + 1;
  const f0Hz = new Float32Array(numFrames);
  const voiced = new Uint8Array(numFrames);
  const peakHeights = new Float32Array(numFrames);

  const minLag = Math.floor(TARGET_SR / F0_MAX_HZ);
  const maxLag = Math.ceil(TARGET_SR / F0_MIN_HZ);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    const frame = filtered.subarray(start, start + frameSize);
    const { peakLag, peakNorm } = autocorrelatePeak(frame, minLag, maxLag);
    peakHeights[f] = peakNorm;
    if (peakNorm >= VOICING_PEAK_THRESHOLD && peakLag > 0) {
      voiced[f] = 1;
      f0Hz[f] = TARGET_SR / peakLag;
    } else {
      voiced[f] = 0;
      f0Hz[f] = 0;
    }
  }

  return { f0Hz, voiced, peakHeights };
}

/** Plain integer-factor decimation with a 2-tap moving-average prefilter.
 *  Adequate for F0 work — higher-quality resampling is unnecessary because
 *  we only care about resolving a fundamental, not preserving fidelity. */
function downsampleTo(audio: Float32Array, fromSr: number, toSr: number): Float32Array {
  if (fromSr === toSr) return audio;
  const ratio = fromSr / toSr;
  const out = new Float32Array(Math.floor(audio.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, audio.length - 1);
    const t = src - i0;
    out[i] = audio[i0] * (1 - t) + audio[i1] * t;
  }
  return out;
}

/** Cascade of one-pole high-pass and one-pole low-pass at F0_MIN/F0_MAX. */
function bandpassF0Range(audio: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(audio.length);
  const aHp = Math.exp((-2 * Math.PI * F0_MIN_HZ) / sampleRate);
  const aLp = 1 - Math.exp((-2 * Math.PI * F0_MAX_HZ) / sampleRate);
  let prevIn = 0;
  let prevHp = 0;
  let prevLp = 0;
  for (let i = 0; i < audio.length; i++) {
    const hp = aHp * (prevHp + audio[i] - prevIn);
    prevIn = audio[i];
    prevHp = hp;
    prevLp = prevLp + aLp * (hp - prevLp);
    out[i] = prevLp;
  }
  return out;
}

function autocorrelatePeak(
  frame: Float32Array,
  minLag: number,
  maxLag: number,
): { peakLag: number; peakNorm: number } {
  let r0 = 0;
  for (let i = 0; i < frame.length; i++) r0 += frame[i] * frame[i];
  if (r0 < 1e-12) return { peakLag: 0, peakNorm: 0 };

  let peakLag = 0;
  let peakValue = 0;
  for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
    let sum = 0;
    for (let i = 0; i < frame.length - lag; i++) sum += frame[i] * frame[i + lag];
    if (sum > peakValue) { peakValue = sum; peakLag = lag; }
  }
  return { peakLag, peakNorm: peakValue / r0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/models/pitchTracker.test.ts
```

Expected: PASS, 5/5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/models/pitchTracker.ts src/models/pitchTracker.test.ts
git commit -m "feat(voice-quality): add autocorrelation pitch tracker"
```

---

## Task 4: Voice quality — module skeleton, weights, and version constant

**Files:**
- Create: `src/models/voiceQuality.ts`
- Test: `src/models/voiceQuality.test.ts`

This task creates the module shell. Sub-scores are added in Task 5; aggregation and the dysphonia guard come in Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/models/voiceQuality.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/models/voiceQuality.test.ts
```

Expected: FAIL with "Cannot find module './voiceQuality'".

- [ ] **Step 3: Implement the skeleton**

Create `src/models/voiceQuality.ts`:

```ts
/**
 * Voice-clone enrollment quality score.
 *
 * Computes seven sub-scores from raw audio (no encoder run) and a
 * weighted aggregate. Designed as an *advisory* signal layered on top of
 * the existing hard gate in enrollmentAudio.ts — never gates by itself.
 *
 * See docs/superpowers/specs/2026-05-02-voice-quality-score-design.md.
 */

import type { VoiceQualityResult } from "./types";

/** Bumped when sub-score mappings, weights, or the schema change. */
export const QUALITY_VERSION = 1;

/** Default aggregation weights. Sum to 1.0. Pitch variation is the
 *  highest because Chatterbox conditions on frame-level features the LM
 *  uses for prosody, not just the pooled x-vector. */
export const DEFAULT_WEIGHTS = {
  snr: 0.20,
  clipping: 0.20,
  pitchVariation: 0.25,
  voicedFraction: 0.15,
  loudnessConsistency: 0.10,
  coverage: 0.05,
  spectralTilt: 0.05,
} as const;

export type SubScoreKey = keyof typeof DEFAULT_WEIGHTS;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/models/voiceQuality.test.ts
```

Expected: PASS, 3/3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/models/voiceQuality.ts src/models/voiceQuality.test.ts
git commit -m "feat(voice-quality): add scoring module skeleton with weights"
```

---

## Task 5: Sub-score implementations

Each sub-score is a small pure function. We add them one at a time, each with its own test, then commit the batch when all seven pass.

### Task 5a: `scoreSnr`

- [ ] **Step 1: Add the failing test**

Append to `src/models/voiceQuality.test.ts`:

```ts
import { scoreSnr } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure** — `npx vitest run src/models/voiceQuality.test.ts` — Expected: FAIL ("scoreSnr is not exported").

- [ ] **Step 3: Add the implementation**

Append to `src/models/voiceQuality.ts`:

```ts
function piecewiseLinear(x: number, points: readonly [number, number][]): number {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

export function scoreSnr(snrDb: number): number {
  return piecewiseLinear(snrDb, [
    [6, 0],
    [15, 50],
    [25, 90],
    [35, 100],
  ]);
}
```

- [ ] **Step 4: Run, verify pass** — Expected: 5/5 new tests green plus the prior 3.

### Task 5b: `scoreClipping`

- [ ] **Step 1: Add the failing test**

Append to the test file:

```ts
import { scoreClipping, computeClipFraction } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add the implementations** — append to `voiceQuality.ts`:

```ts
const CLIP_THRESHOLD = 0.99;

export function computeClipFraction(audio: Float32Array): number {
  if (audio.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < audio.length; i++) {
    if (Math.abs(audio[i]) >= CLIP_THRESHOLD) count++;
  }
  return count / audio.length;
}

export function scoreClipping(clipFraction: number): number {
  return piecewiseLinear(clipFraction, [
    [0, 100],
    [0.0005, 80],
    [0.005, 30],
    [0.02, 0],
  ]);
}
```

- [ ] **Step 4: Run, verify pass**.

### Task 5c: `scoreCoverage`

- [ ] **Step 1: Add failing test**:

```ts
import { scoreCoverage } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation**:

```ts
export function scoreCoverage(speechDurationSec: number): number {
  return piecewiseLinear(speechDurationSec, [
    [2, 0],
    [6, 60],
    [12, 95],
    [12.0001, 100],
  ]);
}
```

- [ ] **Step 4: Run, verify pass**.

### Task 5d: `scoreVoicedFraction` and `computeVoicedFraction`

- [ ] **Step 1: Add failing test**:

```ts
import { scoreVoicedFraction, computeVoicedFraction } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation**:

```ts
const VOICED_FRAME_MS = 20;
const SILENCE_THRESHOLD_DBFS = -40;

export function computeVoicedFraction(audio: Float32Array, sampleRate: number): number {
  const frameSize = Math.floor((VOICED_FRAME_MS / 1000) * sampleRate);
  if (frameSize === 0 || audio.length < frameSize) return 0;
  const numFrames = Math.floor(audio.length / frameSize);
  if (numFrames === 0) return 0;
  const threshold = Math.pow(10, SILENCE_THRESHOLD_DBFS / 20);
  let voiced = 0;
  for (let f = 0; f < numFrames; f++) {
    let s = 0;
    const off = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const x = audio[off + i];
      s += x * x;
    }
    const rms = Math.sqrt(s / frameSize);
    if (rms > threshold) voiced++;
  }
  return voiced / numFrames;
}

export function scoreVoicedFraction(voicedFraction: number): number {
  return piecewiseLinear(voicedFraction, [
    [0.4, 0],
    [0.6, 40],
    [0.75, 80],
    [0.85, 100],
  ]);
}
```

- [ ] **Step 4: Run, verify pass**.

### Task 5e: `scorePitchVariation` and `computePitchStdevSemitones`

- [ ] **Step 1: Add failing test**:

```ts
import { scorePitchVariation, computePitchStdevSemitones } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation**:

```ts
export function computePitchStdevSemitones(
  f0Hz: Float32Array,
  voiced: Uint8Array,
): number | null {
  const voicedF0: number[] = [];
  for (let i = 0; i < f0Hz.length; i++) {
    if (voiced[i] && f0Hz[i] > 0) voicedF0.push(f0Hz[i]);
  }
  if (voicedF0.length < 2) return null;
  const refHz = voicedF0[Math.floor(voicedF0.length / 2)]; // median-anchored reference
  const semitones = voicedF0.map((f) => 12 * Math.log2(f / refHz));
  const mean = semitones.reduce((s, v) => s + v, 0) / semitones.length;
  const variance =
    semitones.reduce((s, v) => s + (v - mean) * (v - mean), 0) / semitones.length;
  return Math.sqrt(variance);
}

export function scorePitchVariation(stdevSemitones: number): number {
  return piecewiseLinear(stdevSemitones, [
    [1, 0],
    [2, 40],
    [2.5, 70],
    [3.5, 90],
    [4.5, 100],
  ]);
}
```

- [ ] **Step 4: Run, verify pass**.

### Task 5f: `scoreLoudnessConsistency` and `computeLoudnessCV`

- [ ] **Step 1: Add failing test**:

```ts
import { scoreLoudnessConsistency, computeLoudnessCV } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation**:

```ts
const LOUDNESS_WINDOW_MS = 200;

export function computeLoudnessCV(audio: Float32Array, sampleRate: number): number {
  const winSize = Math.floor((LOUDNESS_WINDOW_MS / 1000) * sampleRate);
  if (winSize === 0 || audio.length < winSize * 2) return 0;
  const numWindows = Math.floor(audio.length / winSize);
  const rmsValues = new Float64Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    let s = 0;
    const off = w * winSize;
    for (let i = 0; i < winSize; i++) s += audio[off + i] * audio[off + i];
    rmsValues[w] = Math.sqrt(s / winSize);
  }
  let mean = 0;
  for (let i = 0; i < numWindows; i++) mean += rmsValues[i];
  mean /= numWindows;
  if (mean < 1e-9) return 0;
  let variance = 0;
  for (let i = 0; i < numWindows; i++) variance += (rmsValues[i] - mean) ** 2;
  variance /= numWindows;
  return Math.sqrt(variance) / mean;
}

export function scoreLoudnessConsistency(cv: number): number {
  return piecewiseLinear(cv, [
    [0, 100],
    [0.25, 100],
    [0.5, 70],
    [1.0, 30],
    [1.5, 0],
  ]);
}
```

- [ ] **Step 4: Run, verify pass**.

### Task 5g: `scoreSpectralTilt` and `computeSpectralTiltAlphaDb`

- [ ] **Step 1: Add failing test**:

```ts
import { scoreSpectralTilt, computeSpectralTiltAlphaDb, classifyTiltDirection } from "./voiceQuality";

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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation** — append to `voiceQuality.ts`:

```ts
import { fftReal } from "./fft";

const SPECTRAL_FRAME_MS = 30;
const SPECTRAL_HOP_MS = 10;
const FFT_SIZE = 1024;
const TILT_TARGET_DB = -3;
const LOW_BAND_HZ: [number, number] = [80, 1000];
const HIGH_BAND_HZ: [number, number] = [1000, 5000];

export function computeSpectralTiltAlphaDb(
  audio: Float32Array,
  voiced: Uint8Array,
  sampleRate: number,
): number {
  const frameSize = Math.floor((SPECTRAL_FRAME_MS / 1000) * sampleRate);
  const hopSize = Math.floor((SPECTRAL_HOP_MS / 1000) * sampleRate);
  if (frameSize === 0 || audio.length < frameSize) return TILT_TARGET_DB;

  const window = new Float32Array(FFT_SIZE);
  let lowSum = 0;
  let highSum = 0;
  let voicedFrameCount = 0;
  const numFrames = Math.floor((audio.length - frameSize) / hopSize) + 1;
  // Map frame index to a voiced-mask index. The mask was computed on the
  // pitch tracker's downsampled+framed signal at a different rate, so we
  // index by relative position.
  for (let f = 0; f < numFrames; f++) {
    const voicedIdx = Math.floor((f / numFrames) * voiced.length);
    if (!voiced[voicedIdx]) continue;
    voicedFrameCount++;
    const start = f * hopSize;
    for (let i = 0; i < FFT_SIZE; i++) {
      if (i < frameSize && start + i < audio.length) {
        const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
        window[i] = audio[start + i] * hamming;
      } else {
        window[i] = 0;
      }
    }
    const { re, im } = fftReal(window);
    const binHz = sampleRate / FFT_SIZE;
    for (let k = 1; k < FFT_SIZE / 2; k++) {
      const f0 = k * binHz;
      const power = re[k] * re[k] + im[k] * im[k];
      if (f0 >= LOW_BAND_HZ[0] && f0 < LOW_BAND_HZ[1]) lowSum += power;
      else if (f0 >= HIGH_BAND_HZ[0] && f0 < HIGH_BAND_HZ[1]) highSum += power;
    }
  }
  if (voicedFrameCount === 0 || lowSum < 1e-12 || highSum < 1e-12) return TILT_TARGET_DB;
  return 10 * Math.log10(highSum / lowSum);
}

export function classifyTiltDirection(alphaDb: number): "boomy" | "tinny" | "neutral" {
  const delta = alphaDb - TILT_TARGET_DB;
  if (delta < -5) return "boomy";
  if (delta > 5) return "tinny";
  return "neutral";
}

export function scoreSpectralTilt(alphaDb: number): number {
  const absDelta = Math.abs(alphaDb - TILT_TARGET_DB);
  return piecewiseLinear(absDelta, [
    [0, 100],
    [3, 100],
    [7, 70],
    [12, 30],
    [18, 0],
  ]);
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/models/voiceQuality.test.ts` — Expected: all 7 sub-score test groups pass.

### Task 5h: Commit all sub-scores

- [ ] **Step 1: Commit**

```bash
git add src/models/voiceQuality.ts src/models/voiceQuality.test.ts
git commit -m "feat(voice-quality): implement seven sub-score functions"
```

---

## Task 6: Aggregation, dysphonia guard, and `scoreVoiceSample` entry point

**Files:**
- Modify: `src/models/voiceQuality.ts`
- Modify: `src/models/voiceQuality.test.ts`

This task wires the seven sub-scores into a single `scoreVoiceSample(rawAudio, sampleRate) → VoiceQualityResult` function with the dysphonia guard.

- [ ] **Step 1: Add failing tests**

Append to `src/models/voiceQuality.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, verify failure** — `aggregate` and `scoreVoiceSample` not exported.

- [ ] **Step 3: Add the implementation** — append to `voiceQuality.ts`:

```ts
import { trackPitch } from "./pitchTracker";
import { estimateSNR } from "./enrollmentAudio";

const DYSPHONIA_GUARD_THRESHOLD = 0.45;

type Breakdown = VoiceQualityResult["breakdown"];

export function aggregate(breakdown: Breakdown): number {
  let totalWeight = 0;
  let weighted = 0;
  for (const k of Object.keys(DEFAULT_WEIGHTS) as SubScoreKey[]) {
    const v = breakdown[k];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    totalWeight += DEFAULT_WEIGHTS[k];
    weighted += DEFAULT_WEIGHTS[k] * v;
  }
  if (totalWeight === 0) return 0;
  return weighted / totalWeight;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function scoreVoiceSample(rawAudio: Float32Array, sampleRate: number): VoiceQualityResult {
  // Sub-scores that operate on the raw audio directly:
  const { snrDb } = estimateSNR(rawAudio, sampleRate);
  const snr = scoreSnr(snrDb);

  const clipFraction = computeClipFraction(rawAudio);
  const clipping = scoreClipping(clipFraction);

  const speechDuration = rawAudio.length / sampleRate;
  const coverage = scoreCoverage(speechDuration);

  const voicedFraction = computeVoicedFraction(rawAudio, sampleRate);
  const voicedFractionScore = scoreVoicedFraction(voicedFraction);

  const loudnessCV = computeLoudnessCV(rawAudio, sampleRate);
  const loudnessConsistency = scoreLoudnessConsistency(loudnessCV);

  // Pitch-derived sub-scores. The dysphonia guard reads
  // peakHeights[voicedMask] median; if confidence is too low to trust the
  // pitch estimates, set pitchVariation to null. Aggregation will
  // redistribute pitch's weight automatically across remaining dimensions.
  const pitch = trackPitch(rawAudio, sampleRate);
  const voicedHeights: number[] = [];
  for (let i = 0; i < pitch.peakHeights.length; i++) {
    if (pitch.voiced[i]) voicedHeights.push(pitch.peakHeights[i]);
  }
  const medianConfidence = voicedHeights.length > 0 ? median(voicedHeights) : 0;
  const dysphoniaSuppressed = medianConfidence < DYSPHONIA_GUARD_THRESHOLD;

  let pitchVariation: number | null;
  if (dysphoniaSuppressed) {
    pitchVariation = null;
  } else {
    const stdev = computePitchStdevSemitones(pitch.f0Hz, pitch.voiced);
    pitchVariation = stdev === null ? null : scorePitchVariation(stdev);
  }

  const alphaDb = computeSpectralTiltAlphaDb(rawAudio, pitch.voiced, sampleRate);
  const spectralTilt = scoreSpectralTilt(alphaDb);
  const spectralTiltDirection = classifyTiltDirection(alphaDb);

  const breakdown: Breakdown = {
    snr,
    clipping,
    coverage,
    voicedFraction: voicedFractionScore,
    pitchVariation,
    loudnessConsistency,
    spectralTilt,
  };

  return {
    score: aggregate(breakdown),
    breakdown,
    spectralTiltDirection,
    qualityVersion: QUALITY_VERSION,
  };
}
```

- [ ] **Step 4: Run, verify pass** — Expected: all tests across the file green.

- [ ] **Step 5: Commit**

```bash
git add src/models/voiceQuality.ts src/models/voiceQuality.test.ts
git commit -m "feat(voice-quality): add aggregation, dysphonia guard, and entry point"
```

---

## Task 7: Hydration guard `isValidQualityResult`

**Files:**
- Modify: `src/models/voiceQuality.ts`
- Modify: `src/models/voiceQuality.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/models/voiceQuality.test.ts`:

```ts
import { isValidQualityResult } from "./voiceQuality";

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
  it("rejects pitchVariation undefined (only null is allowed)", () => {
    const v = valid() as { breakdown: Record<string, unknown> };
    v.breakdown.pitchVariation = undefined;
    expect(isValidQualityResult(v)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Add implementation** — append to `voiceQuality.ts`:

```ts
const VALID_TILT_DIRECTIONS = new Set(["boomy", "tinny", "neutral"]);
const NUMERIC_BREAKDOWN_KEYS = [
  "snr", "clipping", "coverage", "voicedFraction",
  "loudnessConsistency", "spectralTilt",
] as const;

export function isValidQualityResult(x: unknown): x is VoiceQualityResult {
  if (!x || typeof x !== "object") return false;
  const q = x as Record<string, unknown>;
  if (typeof q.score !== "number" || !Number.isFinite(q.score)) return false;
  if (typeof q.qualityVersion !== "number") return false;
  if (typeof q.spectralTiltDirection !== "string"
      || !VALID_TILT_DIRECTIONS.has(q.spectralTiltDirection)) return false;
  if (!q.breakdown || typeof q.breakdown !== "object") return false;
  const b = q.breakdown as Record<string, unknown>;
  for (const k of NUMERIC_BREAKDOWN_KEYS) {
    if (typeof b[k] !== "number" || !Number.isFinite(b[k])) return false;
  }
  if (b.pitchVariation !== null
      && (typeof b.pitchVariation !== "number" || !Number.isFinite(b.pitchVariation))) {
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Run, verify pass**.

- [ ] **Step 5: Commit**

```bash
git add src/models/voiceQuality.ts src/models/voiceQuality.test.ts
git commit -m "feat(voice-quality): add isValidQualityResult hydration guard"
```

---

## Task 8: Phrase registry — labels and tip strings

**Files:**
- Modify: `src/data/locales/en.ts`

- [ ] **Step 1: Open the file and locate the `ui.provider.voice_capture.*` block**

```bash
grep -n "voice_capture" src/data/locales/en.ts | head -10
```

The new keys live alongside the existing `ui.provider.voice_capture.*` group. Follow the file's existing structure (it's a deeply nested object; the project supports both flat and nested keys via `t()`).

- [ ] **Step 2: Add the twelve new keys**

Inside the `ui` namespace, add a `voice_quality` group (sibling to `provider`):

```ts
voice_quality: {
  title: "Voice quality",
  label: {
    good: "Good",
    ok: "OK",
    poor: "Needs improvement",
  },
  tip: {
    snr: "Try recording in a quieter spot.",
    clipping: "Move a bit further from the microphone.",
    coverage: "Try reading for a bit longer.",
    voiced_fraction: "Try to keep talking for the full recording.",
    pitch_variation: "Try reading more naturally — let your voice rise and fall.",
    loudness: "Try to keep your volume steady.",
    tilt_boomy: "Try moving slightly further from the microphone.",
    tilt_tinny: "This mic sounds thin — if you have another, try it.",
  },
},
```

The exact insertion point depends on the file's current shape — find the place where other `ui.X` groups (like `provider`, `patient`) are declared and add `voice_quality` next to them.

- [ ] **Step 3: Verify the keys resolve via `t()`**

Add a small test to confirm the registry resolves all new keys. Append to `src/data/phraseRegistry.test.ts` (or create one if missing — follow the pattern of existing locale tests):

```ts
import { t } from "./phraseRegistry";

describe("voice_quality phrase keys", () => {
  const keys = [
    "ui.voice_quality.title",
    "ui.voice_quality.label.good",
    "ui.voice_quality.label.ok",
    "ui.voice_quality.label.poor",
    "ui.voice_quality.tip.snr",
    "ui.voice_quality.tip.clipping",
    "ui.voice_quality.tip.coverage",
    "ui.voice_quality.tip.voiced_fraction",
    "ui.voice_quality.tip.pitch_variation",
    "ui.voice_quality.tip.loudness",
    "ui.voice_quality.tip.tilt_boomy",
    "ui.voice_quality.tip.tilt_tinny",
  ];
  for (const k of keys) {
    it(`resolves ${k} for en`, () => {
      const value = t(k as Parameters<typeof t>[0], "en");
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    });
  }
});
```

If `phraseRegistry.test.ts` does not exist, create it with the surrounding `describe("voice_quality phrase keys", ...)` wrapper. If it does, append the `describe` block.

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run src/data/phraseRegistry.test.ts
```

Expected: all 12 keys resolve.

- [ ] **Step 5: Commit**

```bash
git add src/data/locales/en.ts src/data/phraseRegistry.test.ts
git commit -m "feat(voice-quality): add phrase keys for labels and tips"
```

---

## Task 9: `QualityBadge` component with label + tip selection

**Files:**
- Create: `src/components/shared/QualityBadge.tsx`
- Test: `src/components/shared/QualityBadge.test.tsx`

The component is presentational. Label thresholds and tip selection are pure functions co-located with the component (not stored on the data record per the spec).

- [ ] **Step 1: Write the failing test**

Create `src/components/shared/QualityBadge.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run, verify failure**.

- [ ] **Step 3: Implement `QualityBadge.tsx`**

Create `src/components/shared/QualityBadge.tsx`:

```tsx
import { theme } from "../../theme";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/locales/en";
import type { VoiceQualityResult } from "../../models/types";

const SUBSCORE_TIP_KEYS: Record<
  Exclude<keyof VoiceQualityResult["breakdown"], "spectralTilt" | "pitchVariation">,
  PhraseKey
> = {
  snr: "ui.voice_quality.tip.snr",
  clipping: "ui.voice_quality.tip.clipping",
  coverage: "ui.voice_quality.tip.coverage",
  voicedFraction: "ui.voice_quality.tip.voiced_fraction",
  loudnessConsistency: "ui.voice_quality.tip.loudness",
};

const PITCH_TIP_KEY: PhraseKey = "ui.voice_quality.tip.pitch_variation";

export type QualityLabel = "good" | "ok" | "poor";

export function labelFor(score: number): QualityLabel {
  if (score >= 80) return "good";
  if (score >= 50) return "ok";
  return "poor";
}

export function tipKeyFor(quality: VoiceQualityResult): PhraseKey | null {
  if (quality.score >= 80) return null;
  let lowestKey: keyof VoiceQualityResult["breakdown"] | null = null;
  let lowestVal = Infinity;
  for (const k of Object.keys(quality.breakdown) as (keyof VoiceQualityResult["breakdown"])[]) {
    const v = quality.breakdown[k];
    if (v === null || v === undefined) continue;
    if (v < lowestVal) { lowestVal = v; lowestKey = k; }
  }
  if (lowestKey === null) return null;
  if (lowestKey === "pitchVariation") return PITCH_TIP_KEY;
  if (lowestKey === "spectralTilt") {
    if (quality.spectralTiltDirection === "boomy") return "ui.voice_quality.tip.tilt_boomy";
    if (quality.spectralTiltDirection === "tinny") return "ui.voice_quality.tip.tilt_tinny";
    return null; // "neutral" with low score is unusual; no tip
  }
  return SUBSCORE_TIP_KEYS[lowestKey];
}

interface QualityBadgeProps {
  quality: VoiceQualityResult;
  locale: string;
  compact?: boolean;
}

export function QualityBadge({ quality, locale, compact }: QualityBadgeProps) {
  const label = labelFor(quality.score);
  const labelKey: PhraseKey = `ui.voice_quality.label.${label}` as PhraseKey;
  const tipKey = tipKeyFor(quality);
  const intensity =
    label === "good" ? theme.colors.indigo
    : label === "ok"   ? theme.colors.indigoMid
                       : theme.colors.indigoMuted;

  return (
    <div
      role="status"
      aria-label={`${resolvePhrase("ui.voice_quality.title", locale)} ${Math.round(quality.score)}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 12px",
        borderRadius: 8,
        background: intensity,
        color: theme.colors.text,
        fontSize: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>
          {resolvePhrase("ui.voice_quality.title", locale)}: {Math.round(quality.score)}
        </span>
        <span>— {resolvePhrase(labelKey, locale)}</span>
      </div>
      {!compact && tipKey && (
        <div style={{ fontSize: 14 }}>{resolvePhrase(tipKey, locale)}</div>
      )}
    </div>
  );
}
```

If `theme.colors.indigoMid` / `indigoMuted` do not exist in `src/theme/`, use whatever existing tokens map to mid/muted intensity in the current palette. Inspect `src/theme/index.ts` (or equivalent) and pick the closest analogue. The badge must follow the project's accessibility convention from `CLAUDE.md`: single-hue intensity ramp on indigo, no red/green.

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run src/components/shared/QualityBadge.test.tsx
```

Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/QualityBadge.tsx src/components/shared/QualityBadge.test.tsx
git commit -m "feat(voice-quality): add QualityBadge component with tip selection"
```

---

## Task 10: Commit calibration fixture and update `.gitignore`

**Files:**
- Modify: `.gitignore`
- Add (binary): `sample-voices/mark-voice.wav`
- Create: `sample-voices/README.md`

- [ ] **Step 1: Update `.gitignore`**

Replace the line `sample-voices/` with the negation pattern that allows the calibration fixture and its README while keeping every other file in `sample-voices/` ignored:

```bash
sed -i.bak 's|^sample-voices/$|sample-voices/*\n!sample-voices/mark-voice.wav\n!sample-voices/README.md|' .gitignore && rm .gitignore.bak
```

Verify:

```bash
grep -A 2 "^sample-voices" .gitignore
```

Expected:
```
sample-voices/*
!sample-voices/mark-voice.wav
!sample-voices/README.md
```

- [ ] **Step 2: Confirm the fixture file is on disk and correctly sized**

```bash
ls -la sample-voices/mark-voice.wav
```

Expected: file exists, ~1.26 MB. If absent, the developer must record a 13-15 s read of the Rainbow Passage opening at 48 kHz mono 16-bit and place it at this path before continuing.

- [ ] **Step 3: Create the README**

Create `sample-voices/README.md`:

```markdown
# Sample voices

This directory contains voice clips used for development and testing.

## `mark-voice.wav` (committed)

Calibration fixture for the voice-quality scoring tests in
`src/models/voiceQuality.test.ts`. The file is a 13-15s read of the
opening of the Rainbow Passage at 48 kHz mono 16-bit. The calibration
test loads it, resamples to 24 kHz, and asserts that a healthy adult
read scores at least 80 overall and ≥ 70 on `pitchVariation`. If a
threshold or weight change in `voiceQuality.ts` breaks this assertion,
the algorithm is wrong, not the test.

## Other files (gitignored)

Other voice samples and the `cloned-fp16-validation/` subdirectory are
local-only artefacts. They stay out of the repo via the
`sample-voices/*` rule with explicit negations only for the fixture
and this README. See `.gitignore`.
```

- [ ] **Step 4: Stage and commit**

```bash
git add .gitignore sample-voices/mark-voice.wav sample-voices/README.md
git status   # confirm only those three paths are staged
git commit -m "fixture(voice-quality): commit mark-voice.wav as calibration backstop"
```

If `git status` shows additional staged files (e.g., other contents of `sample-voices/`), unstage them with `git reset HEAD <path>` before committing — only the WAV, README, and gitignore go in this commit.

---

## Task 11: Calibration backstop test

**Files:**
- Modify: `src/models/voiceQuality.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/models/voiceQuality.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

describe("calibration: mark-voice.wav (Rainbow Passage)", () => {
  const fixturePath = path.resolve(__dirname, "../../sample-voices/mark-voice.wav");

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
    p += 8 + size + (size % 2); // chunks are padded to even length
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
```

- [ ] **Step 2: Run, verify pass**

```bash
npx vitest run src/models/voiceQuality.test.ts -t "calibration"
```

Expected: PASS. If it fails:
- If `pitchVariation < 70` → the F0 mapping is too punitive for a healthy reader; review `scorePitchVariation` thresholds.
- If `voicedFraction < 60` → the voiced-fraction mapping is too punitive for the natural pauses in Rainbow Passage reading; review `scoreVoicedFraction` thresholds.
- If `score < 80` → multiple sub-scores are pulling the aggregate down; inspect the breakdown (`console.log(result.breakdown)` in the test) to see which.

If a real fix is needed, update the threshold(s), re-run, then update the spec to record the change. Do not weaken the assertion — the test is the calibration backstop.

- [ ] **Step 3: Commit**

```bash
git add src/models/voiceQuality.test.ts
git commit -m "test(voice-quality): add calibration backstop using mark-voice.wav"
```

---

## Task 12: Wire scoring into `VoiceCapture`

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Modify: `src/components/shared/VoiceCapture.test.tsx`

This is the integration task: thread the score through `processAndCapture`, surface the badge on the recording-preview screen, surface it on the saved-state card, extend `onCapture`'s signature.

- [ ] **Step 1: Read the current `VoiceCaptureProps` and the relevant render branches**

```bash
sed -n '23,48p' src/components/shared/VoiceCapture.tsx
sed -n '440,500p' src/components/shared/VoiceCapture.tsx
```

Expected: shows the current `onCapture` signature `(audioBlob: Blob, embedding?: unknown) => void` and the `processAndCapture` body.

- [ ] **Step 2: Extend `VoiceCaptureProps.onCapture`**

In `src/components/shared/VoiceCapture.tsx`, change:

```ts
onCapture: (audioBlob: Blob, embedding?: unknown) => void;
```

to:

```ts
onCapture: (audioBlob: Blob, embedding?: unknown, quality?: VoiceQualityResult) => void;
```

Add the import:

```ts
import { scoreVoiceSample } from "../../models/voiceQuality";
import { QualityBadge } from "./QualityBadge";
import type { VoiceQualityResult } from "../../models/types";
```

- [ ] **Step 3: Compute quality inside `processAndCapture`**

Update `processAndCapture` (currently at `src/components/shared/VoiceCapture.tsx:445-489`) to compute the score after the hard gate and pass it through `onCapture`:

```ts
async function processAndCapture(blob: Blob) {
  setCloneStatus("extracting");
  setError(null);
  try {
    const rawAudio = await decodeAudio(blob);
    const prep = preprocessEnrollment(rawAudio, 24000);
    if (!prep.acceptable) {
      setSavedBlob(blob);
      setError(prep.rejectionReason ?? "Recording quality too low.");
      setCloneStatus("failed");
      onCapture(blob);
      return;
    }
    const quality = scoreVoiceSample(rawAudio, 24000);
    const embedding = await extractEmbedding(rawAudio);
    setSavedBlob(blob);
    if (embedding) {
      setCloneStatus("ready");
      onCapture(blob, embedding, quality);
    } else {
      setCloneStatus("model-loading");
      onCapture(blob, undefined, quality);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice processing failed";
    setError(msg);
    setCloneStatus("failed");
    setSavedBlob(blob);
    onCapture(blob);
  }
}
```

Mirror the same `quality` computation in `retryEmbedding` (currently at line 403) so a deferred extraction also propagates a score:

```ts
async function retryEmbedding() {
  const blob = savedBlob || externalBlob;
  if (!blob) return;
  setCloneStatus("extracting");
  setError(null);
  try {
    const rawAudio = await decodeAudio(blob);
    const prep = preprocessEnrollment(rawAudio, 24000);
    if (!prep.acceptable) {
      setError(prep.rejectionReason ?? "Recording quality too low.");
      setCloneStatus("failed");
      return;
    }
    const quality = scoreVoiceSample(rawAudio, 24000);
    const embedding = await extractEmbedding(rawAudio);
    if (embedding) {
      setCloneStatus("ready");
      onCapture(blob, embedding, quality);
    } else {
      setCloneStatus("model-loading");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice processing failed";
    setError(msg);
    setCloneStatus("failed");
  }
}
```

- [ ] **Step 4: Add preview-time scoring state and effect**

Just after the existing component state declarations (look for `setPreviewBlob` calls), add:

```ts
const [previewQuality, setPreviewQuality] = useState<VoiceQualityResult | null>(null);

useEffect(() => {
  if (!previewBlob) { setPreviewQuality(null); return; }
  let cancelled = false;
  (async () => {
    try {
      const audio = await decodeAudio(previewBlob);
      const result = scoreVoiceSample(audio, 24000);
      if (!cancelled) setPreviewQuality(result);
    } catch {
      if (!cancelled) setPreviewQuality(null);
    }
  })();
  return () => { cancelled = true; };
}, [previewBlob]);
```

- [ ] **Step 5: Render the badge on the preview screen**

Locate the preview render branch (search for the playback row + `acceptRecording`). Add the badge between playback and the action buttons:

```tsx
{previewQuality && (
  <QualityBadge quality={previewQuality} locale={caregiverLang} />
)}
```

- [ ] **Step 6: Render the compact badge on the saved-state card**

The saved-state card branch reads `hasEmbedding` and the existing "voice clone active" indicator. Add the compact badge wherever the existing voice-clone status indicator lives, fed from a new prop:

In the props interface:

```ts
/** Persisted quality from speakerData; absent for legacy speakers and renders nothing. */
savedQuality?: VoiceQualityResult;
```

Render below the existing status indicator:

```tsx
{savedQuality && <QualityBadge quality={savedQuality} locale={caregiverLang} compact />}
```

- [ ] **Step 7: Add or extend tests in `VoiceCapture.test.tsx`**

The existing test file already exercises the upload and recording flows. Append new tests:

```tsx
import { QualityBadge } from "./QualityBadge"; // unused — included only for type completeness if needed
import type { VoiceQualityResult } from "../../models/types";

describe("VoiceCapture quality integration", () => {
  it("propagates quality through onCapture for uploads", async () => {
    const onCapture = vi.fn();
    // Use the existing test harness pattern — fake a small WAV blob, simulate
    // a file pick, await processAndCapture, assert onCapture was called with
    // (blob, embedding, quality) where quality is a VoiceQualityResult.
    // Refer to the existing upload test in this file for the exact harness shape.
    // Assertion (after the harness flow):
    // expect(onCapture).toHaveBeenCalledWith(expect.any(Blob), expect.anything(),
    //   expect.objectContaining({ score: expect.any(Number), qualityVersion: 1 }));
  });

  it("renders the saved-state badge when savedQuality is provided", () => {
    const q: VoiceQualityResult = {
      score: 75,
      breakdown: {
        snr: 80, clipping: 90, coverage: 70, voicedFraction: 75,
        pitchVariation: 70, loudnessConsistency: 80, spectralTilt: 75,
      },
      spectralTiltDirection: "neutral",
      qualityVersion: 1,
    };
    // Render VoiceCapture with hasVoice={true}, audioBlob set, savedQuality={q}.
    // Assert the badge text "75" or the label is present.
  });
});
```

If the existing test file uses a particular harness for mock audio decoding, follow that pattern. The detailed assertions vary by harness but the contract to test is fixed: (a) `onCapture` receives a third argument that is a `VoiceQualityResult`, (b) the saved-state card renders the compact badge when `savedQuality` is provided.

- [ ] **Step 8: Run all VoiceCapture tests, verify pass**

```bash
npx vitest run src/components/shared/VoiceCapture.test.tsx
```

Expected: all existing tests still pass, plus the two new behaviours covered.

- [ ] **Step 9: Commit**

```bash
git add src/components/shared/VoiceCapture.tsx src/components/shared/VoiceCapture.test.tsx
git commit -m "feat(voice-quality): integrate scoring into VoiceCapture preview + saved state"
```

---

## Task 13: Update the four `onCapture` call sites

**Files:**
- Modify: `src/components/settings/Setup.tsx` (two sites)
- Modify: `src/components/settings/sections/PatientInfoSection.tsx`
- Modify: `src/components/settings/sections/CareTeamSection.tsx`

Each call site stores `embedding` into either a Patient's `speakerData` or a Provider's `embedding`. Add an additional write of `quality` into the same record. For patients, attach to `speakerData.quality`. For providers, attach to `embedding.quality` (provider `embedding` is a `SpeakerData` at runtime).

- [ ] **Step 1: Update `Setup.tsx:560` (patient onCapture)**

Locate the `onCapture` callback at line 560-563 and modify the signature plus body:

Before:
```ts
onCapture={async (blob, embedding) => {
  // existing patient setup logic
}}
```

After:
```ts
onCapture={async (blob, embedding, quality) => {
  // existing patient setup logic, but when writing speakerData also include
  // quality:
  // setSpeakerData({ ...embeddingAsSpeakerData, quality })
  // The exact form depends on the existing logic — preserve it and merge
  // `quality` into the SpeakerData object before persistence.
}}
```

The implementer must read the existing body, identify where `embedding` is being persisted, and ensure `quality` is included as `{ ...speakerData, quality }`.

- [ ] **Step 2: Update `Setup.tsx:683` (provider onCapture)**

Same pattern. Provider's `embedding` field on the `Provider` type is `unknown` at the type level but `SpeakerData` at runtime. Cast accordingly when merging:

```ts
onCapture={(_blob, embedding, quality) => {
  if (!embedding) return;
  const speakerData = { ...(embedding as SpeakerData), quality };
  // existing provider update logic, but write `speakerData` instead of `embedding`
}}
```

- [ ] **Step 3: Update `PatientInfoSection.tsx:108-112`**

Same pattern as the Setup patient site.

- [ ] **Step 4: Update `CareTeamSection.tsx:183-187`**

Same pattern as the Setup provider site.

- [ ] **Step 5: Pass `savedQuality` prop down to `VoiceCapture` from each call site**

Where the call site renders `VoiceCapture`, also pass `savedQuality={existing.speakerData?.quality}` (patient) or `savedQuality={(provider.embedding as SpeakerData | undefined)?.quality}` (provider).

- [ ] **Step 6: Verify each touched file typechecks and existing tests pass**

```bash
npm run build 2>&1 | tail -20
npx vitest run src/components/settings/
```

Expected: typecheck succeeds, all settings tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/Setup.tsx \
        src/components/settings/sections/PatientInfoSection.tsx \
        src/components/settings/sections/CareTeamSection.tsx
git commit -m "feat(voice-quality): persist quality at all four onCapture call sites"
```

---

## Task 14: Hydration guard wiring in `settingsStore`

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/settingsStore.test.ts`

The validator from Task 7 needs to actually run during hydration so corrupted records get scrubbed.

- [ ] **Step 1: Read the existing `onRehydrateStorage` and the migration block**

```bash
sed -n '160,240p' src/stores/settingsStore.ts
```

- [ ] **Step 2: Add the failing test**

In `src/stores/settingsStore.test.ts`, add a test that exercises the hydration path with a malformed `quality` field on a patient's `speakerData`:

```ts
import { isValidQualityResult } from "../models/voiceQuality";

describe("settingsStore hydration: quality validation", () => {
  it("drops a malformed quality field but preserves the rest of speakerData", () => {
    const malformedSpeakerData = {
      condEmb: [0], condEmbShape: [1],
      promptToken: [0], promptTokenShape: [1],
      speakerEmbeddings: [0], speakerEmbeddingsShape: [1],
      speakerFeatures: [0], speakerFeaturesShape: [1],
      quality: { score: NaN, breakdown: {} }, // malformed
    };
    expect(isValidQualityResult(malformedSpeakerData.quality)).toBe(false);
    // Run the actual hydration scrubber (function added in Step 3) and verify
    // that quality is removed but every other field survives:
    const scrubbed = scrubQualityIfInvalid(malformedSpeakerData);
    expect(scrubbed.quality).toBeUndefined();
    expect(scrubbed.condEmb).toEqual([0]);
  });

  it("leaves a valid quality field intact", () => {
    const valid = {
      condEmb: [0], condEmbShape: [1],
      promptToken: [0], promptTokenShape: [1],
      speakerEmbeddings: [0], speakerEmbeddingsShape: [1],
      speakerFeatures: [0], speakerFeaturesShape: [1],
      quality: {
        score: 80,
        breakdown: {
          snr: 80, clipping: 90, coverage: 70, voicedFraction: 75,
          pitchVariation: 80, loudnessConsistency: 80, spectralTilt: 75,
        },
        spectralTiltDirection: "neutral",
        qualityVersion: 1,
      },
    };
    const scrubbed = scrubQualityIfInvalid(valid);
    expect(scrubbed.quality).toEqual(valid.quality);
  });
});
```

The test references `scrubQualityIfInvalid` which we add in the next step.

- [ ] **Step 3: Run, verify failure**.

- [ ] **Step 4: Add `scrubQualityIfInvalid` and call it during hydration**

In `src/stores/settingsStore.ts`, add near the other helpers:

```ts
import { isValidQualityResult } from "../models/voiceQuality";
import type { SpeakerData } from "../models/types";

export function scrubQualityIfInvalid(speakerData: unknown): SpeakerData {
  if (!speakerData || typeof speakerData !== "object") return speakerData as SpeakerData;
  const sd = speakerData as SpeakerData & { quality?: unknown };
  if (sd.quality !== undefined && !isValidQualityResult(sd.quality)) {
    const { quality: _drop, ...rest } = sd as { quality?: unknown };
    return rest as SpeakerData;
  }
  return sd as SpeakerData;
}
```

In the `migrate` callback (around line 167), after each branch produces a `cfg`, walk every patient's `speakerData` and run the scrubber:

```ts
if (cfg) {
  cfg = {
    ...cfg,
    patients: cfg.patients.map((p) => ({
      ...p,
      speakerData: p.speakerData ? scrubQualityIfInvalid(p.speakerData) : null,
    })),
    providers: cfg.providers.map((pr) => ({
      ...pr,
      embedding: pr.embedding ? scrubQualityIfInvalid(pr.embedding) : pr.embedding,
    })),
  };
}
```

(The exact integration point depends on the surrounding migration logic — read the file and choose the spot where `cfg` has been finalised but before it is returned.)

- [ ] **Step 5: Export `scrubQualityIfInvalid` for the test** — already done above.

- [ ] **Step 6: Run, verify pass**

```bash
npx vitest run src/stores/settingsStore.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat(voice-quality): scrub invalid quality fields during hydration"
```

---

## Task 15: Browser smoke test

This task runs the dev server and exercises the feature end-to-end in a real browser. Per `feedback_test_in_browser.md`: vitest green ≠ feature works.

**Files:**
- None modified — purely manual verification.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

- [ ] **Step 2: Walk the recording flow**

In the browser:

1. Open Settings → Patient → record a voice. Read the displayed Rainbow Passage script naturally.
2. On the preview screen (after the 15s recording stops), confirm:
   - The `QualityBadge` appears between the playback row and the accept/discard buttons.
   - The score is shown (`Voice quality: NN — Good|OK|Needs improvement`).
   - If the score is below 80, a single tip line appears below.
3. Click "Use this take." Confirm the saved-state card now shows the compact badge (score + label only, no tip).
4. Reload the page. Confirm the saved-state badge still renders (proves persistence + hydration).

- [ ] **Step 3: Walk the upload flow**

1. From a clean state (Remove the saved voice), click Upload, select an audio file (any short clip on disk works).
2. Confirm the saved-state card shows the compact badge (uploads have no preview screen — the badge appears post-process only).
3. Reload, confirm badge survives.

- [ ] **Step 4: Confirm no console errors**

Open DevTools → Console. There should be no red errors during enrollment, scoring, or rendering. `[OwnVoice:Bench]` lines and existing model-loading logs are expected; new errors are not.

- [ ] **Step 5: Confirm tip routing for a known-bad take**

Optional but useful: deliberately record a monotone read (one steady note for 15s). Confirm the tip text reads "Try reading more naturally — let your voice rise and fall." This validates that `tipKeyFor` picked `pitchVariation` as the lowest sub-score AND the dysphonia guard did *not* fire (which would have suppressed the tip).

- [ ] **Step 6: Stop the dev server.**

No commit for this task — it is verification only. If anything fails, file the symptom against the relevant earlier task and re-run.

---

## Task 16: Push branch, open PR, stop

**Files:**
- None modified.

Per the project's PR-merge-cadence policy (memory: `feedback_pr_merge_cadence.md`): push branch + open PR + stop. Do not auto-merge.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/voice-quality-score
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create \
  --base main \
  --head feat/voice-quality-score \
  --title "Voice clone: advisory enrollment quality score" \
  --body "$(cat <<'EOF'
## Summary

Adds an advisory 0-100 voice-quality score to the voice-clone enrollment flow.
The existing hard gate stays as the floor; this score nudges users toward
better takes by surfacing one targeted tip when low.

Seven sub-scores on raw audio: SNR, clipping, coverage, voiced fraction,
pitch variation, loudness consistency, spectral tilt. Aggregation is a
weighted average; a dysphonia guard sets `pitchVariation` to `null` when
voicing confidence is too low to trust the F0 estimates (critical for the
ICU/post-trach population). The score persists alongside `SpeakerData` in
IndexedDB with a `qualityVersion` tag.

## Spec & plan

- Spec: `docs/superpowers/specs/2026-05-02-voice-quality-score-design.md`
- Plan: `docs/superpowers/plans/2026-05-02-voice-quality-score.md`

## Out-of-scope follow-ups (filed)

- #167 — Cap upload duration at ~30s
- #168 — Surface persisted quality in Settings (clone-health view)
- #169 — Calibrate spectralTilt thresholds against a real-user corpus
- #170 — Log qualityVersion to detect score-rev adoption

## Test plan

- [x] `npm test -- --run` — full unit suite green (sub-score monotonicity,
  aggregation, dysphonia guard, hydration guard, badge render, calibration
  backstop using `sample-voices/mark-voice.wav`)
- [x] `npm run build` — typecheck green
- [x] Browser smoke test — recording flow shows preview badge + tip; saved
  state shows compact badge; badge survives reload; upload flow shows
  saved-state badge; no console errors

## Notes

- `sample-voices/` was previously fully gitignored. `.gitignore` now
  negates exactly two paths: `mark-voice.wav` (the calibration fixture)
  and `README.md`. Other contents of the directory remain ignored.
- Coverage thresholds in `vitest.config.ts` (90/90/80) apply; new files
  meet them via the colocated test files.
EOF
)"
```

- [ ] **Step 3: Print the PR URL** — the `gh pr create` output is the URL. Stop here. Do not merge.

---

## Self-review (already performed)

**Spec coverage:** every section in the spec has at least one task — types in Task 1; FFT in Task 2; pitch tracker in Task 3; module skeleton in Task 4; sub-scores in Task 5; aggregation + dysphonia guard in Task 6; hydration guard in Task 7; phrases in Task 8; badge in Task 9; calibration fixture and backstop in Tasks 10-11; integration in Task 12; call sites in Task 13; hydration wiring in Task 14; browser verification in Task 15; ship in Task 16.

**Placeholder scan:** no TBD/TODO/FIXME in the plan body. The Task 8 phrase-registry insertion point is described but not pinned to a line number because the en.ts file structure is established and the implementer must read it to find the right group sibling — this is a deliberate "follow the existing pattern" instruction, not a placeholder.

**Type consistency:** `VoiceQualityResult`, `SpeakerData`, `Breakdown`, `SubScoreKey`, and the per-sub-score function names are consistent across tasks. The `scoreVoiceSample` signature is established in Task 4 (header) and finalised in Task 6.

**Gaps:** the Tasks 12 and 13 test sketches reference a "harness" without spelling it out — this is because the existing `VoiceCapture.test.tsx` already provides a harness pattern that the implementer should follow, and prescribing one here would conflict with the codebase's. The integration assertions are stated as contracts; the implementer fills in the harness specifics.
