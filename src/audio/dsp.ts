// Audio DSP utilities used by the speech pipeline.
//
// Pure math. No imports from the rest of the app. Two exported entry
// points: `applyBiquad` (used directly by the enrollment preprocessor)
// and `postProcessAudio` (the full TTS post-processing chain, applied
// once at audio-cache write time so the tap path stays FFT-free).
//
// Internal helpers: `fft`, `spectralDenoise`, `findSpeechOnsetSample`.

// ── Radix-2 Cooley-Tukey FFT (in-place) ────────────────────────────
// re/im are length-N arrays where N is a power of 2.
// `inverse` = true for IFFT (includes 1/N scaling).
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const N = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const angle = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(angle), wIm = Math.sin(angle);
    for (let i = 0; i < N; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const a = i + j, b = a + half;
        const tRe = curRe * re[b] - curIm * im[b];
        const tIm = curRe * im[b] + curIm * re[b];
        re[b] = re[a] - tRe; im[b] = im[a] - tIm;
        re[a] += tRe;        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  }
}

/**
 * Spectral noise reduction via STFT spectral subtraction.
 *
 * Estimates the noise magnitude spectrum from the first `noiseFrames`
 * frames (decoder silence padding), then for every frame applies:
 *   gain[k] = max( 1 − α·noise[k] / |X[k]|,  floor )
 * where α=2 (over-subtraction) reduces residual noise and floor=0.08
 * prevents "musical noise" artifacts. Reconstructs via overlap-add
 * with a Hann window.
 */
function spectralDenoise(audio: Float32Array, sampleRate: number): void {
  const frameSize = 512;             // ~21 ms at 24 kHz
  const hop = frameSize >> 1;        // 50% overlap
  const noiseFrames = Math.max(2, Math.ceil((sampleRate * 0.02) / hop)); // ~20 ms of noise
  const overSub = 2.0;               // over-subtraction factor
  const floor = 0.08;                // spectral floor (prevents musical noise)
  const n = audio.length;

  // Hann window
  const win = new Float64Array(frameSize);
  for (let i = 0; i < frameSize; i++)
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));

  // Workspace
  const re = new Float64Array(frameSize);
  const im = new Float64Array(frameSize);

  // 1. Estimate noise magnitude spectrum from the QUIETEST region of
  //    the file. The original heuristic was "the first 20 ms" on the
  //    assumption that decoder output started with silence — but the
  //    leading-silence trim (step 2 above) runs before this denoiser,
  //    so the first frames after the trim are speech ONSET, not silence.
  //    Using speech magnitudes as the noise reference makes spectral
  //    subtraction attenuate speech formants on every subsequent frame
  //    — effectively a broadband HF roll-off. Switching to the quietest
  //    contiguous frames gives the denoiser an actual silent reference.
  //
  //    Two-pass: compute per-frame energy, find the lowest-total run of
  //    noiseFrames frames, then average their spectra.
  const numFrames = Math.max(0, Math.floor((n - frameSize) / hop) + 1);
  if (numFrames < noiseFrames) return;
  const frameEnergy = new Float64Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const off = f * hop;
    let e = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = audio[off + i];
      e += s * s;
    }
    frameEnergy[f] = e;
  }
  let runEnergy = 0;
  for (let f = 0; f < noiseFrames; f++) runEnergy += frameEnergy[f];
  let bestRunEnergy = runEnergy;
  let bestRunStart = 0;
  for (let f = noiseFrames; f < numFrames; f++) {
    runEnergy += frameEnergy[f] - frameEnergy[f - noiseFrames];
    if (runEnergy < bestRunEnergy) {
      bestRunEnergy = runEnergy;
      bestRunStart = f - noiseFrames + 1;
    }
  }
  const noiseMag = new Float64Array(frameSize);
  let noiseCount = 0;
  for (let f = bestRunStart; f < bestRunStart + noiseFrames; f++) {
    const off = f * hop;
    for (let i = 0; i < frameSize; i++) { re[i] = audio[off + i] * win[i]; im[i] = 0; }
    fft(re, im, false);
    for (let i = 0; i < frameSize; i++) noiseMag[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    noiseCount++;
  }
  if (noiseCount === 0) return;
  for (let i = 0; i < frameSize; i++) noiseMag[i] /= noiseCount;

  // 2. Process all frames via overlap-add
  const out = new Float64Array(n);
  const winSum = new Float64Array(n); // normalization accumulator

  for (let off = 0; off + frameSize <= n; off += hop) {
    for (let i = 0; i < frameSize; i++) { re[i] = audio[off + i] * win[i]; im[i] = 0; }
    fft(re, im, false);

    // Spectral subtraction gain
    for (let i = 0; i < frameSize; i++) {
      const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
      const gain = Math.max(1 - overSub * noiseMag[i] / (mag + 1e-10), floor);
      re[i] *= gain;
      im[i] *= gain;
    }

    fft(re, im, true);

    // Overlap-add with window
    for (let i = 0; i < frameSize; i++) {
      out[off + i] += re[i] * win[i];
      winSum[off + i] += win[i] * win[i];
    }
  }

  // Normalize and write back
  for (let i = 0; i < n; i++) {
    audio[i] = winSum[i] > 1e-8 ? (out[i] / winSum[i]) : 0;
  }
}

/**
 * Apply a 2nd-order Butterworth biquad filter (low-pass or high-pass).
 * Modifies `buf` in place.
 */
export function applyBiquad(
  buf: Float32Array,
  sampleRate: number,
  cutoff: number,
  type: "lp" | "hp",
): void {
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Math.SQRT2); // Q = 1/√2 for Butterworth
  const a0 = 1 + alpha;

  let b0: number, b1: number, b2: number;
  if (type === "lp") {
    b0 = ((1 - cosW0) / 2) / a0;
    b1 = (1 - cosW0) / a0;
    b2 = b0;
  } else {
    b0 = ((1 + cosW0) / 2) / a0;
    b1 = -(1 + cosW0) / a0;
    b2 = b0;
  }
  const a1 = (-2 * cosW0) / a0;
  const a2 = (1 - alpha) / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    buf[i] = y;
  }
}

/**
 * Locate the first 10 ms window whose RMS exceeds `threshold`. Returns
 * the sample offset of the speech onset, capped at `maxTrimSamples`.
 * If no window crosses the threshold within the cap, returns 0 (don't trim).
 *
 * Used by postProcessAudio to clean leading "breath/gasp" frames produced
 * by the q4 LM on certain phrases — the LM occasionally emits 5-10 leading
 * speech codes that decode as audible breath before the actual phonemes.
 * Threshold is set above sustained breath RMS but below typical voiced
 * onset, with a one-window safety buffer so soft consonant attacks aren't
 * clipped. The cap prevents catastrophic over-trim if a phrase happens
 * to be uniformly quiet.
 */
function findSpeechOnsetSample(
  audio: Float32Array,
  sampleRate: number,
  threshold: number,
  maxTrimSamples: number,
): number {
  const windowSamples = Math.max(1, Math.floor((sampleRate * 10) / 1000));
  const scanLimit = Math.min(audio.length, maxTrimSamples + windowSamples);
  for (let start = 0; start + windowSamples <= scanLimit; start += windowSamples) {
    let sumSq = 0;
    for (let j = 0; j < windowSamples; j++) {
      const s = audio[start + j];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / windowSamples);
    if (rms >= threshold) {
      // Leave one window of pre-onset content so a soft consonant attack
      // (initial /F/ /S/ /Sh/ that builds gradually) isn't clipped at its
      // very start.
      return Math.max(0, Math.min(start - windowSamples, maxTrimSamples));
    }
  }
  // No onset within the cap — leave the audio alone rather than risk
  // trimming an entire quiet phrase.
  return 0;
}

/**
 * Post-process raw TTS audio to remove artifacts from quantized neural
 * models (Chatterbox Multilingual q4).
 *
 * Pipeline:
 *   1. DC offset removal — prevents static hiss from decoder bias
 *   2. Leading breath/silence trim — removes audible "gasp" frames
 *      that the q4 LM occasionally emits before voiced content
 *   3. High-pass at 80 Hz — removes sub-bass rumble from decoder
 *   4. Single low-pass at 9 kHz — keeps sibilance, drops HF noise
 *   5. Spectral subtraction — removes in-band noise under speech
 *   6. Noise gate — mutes samples below threshold in inter-word gaps;
 *      noise floor = minimum-RMS window across the whole clip
 *      (more robust than first-10ms heuristic, especially after the trim)
 *   7. Peak normalization to 0.85 — consistent volume with headroom
 *   8. Soft limiter — tanh saturation prevents clipping on transients
 *   9. Cosine fade-in/out (5 ms) — prevents start/end clicks
 *
 * Exported so the audio-cache pre-gen path can apply it once at write time
 * rather than re-running the FFT pipeline on every playback. Cached audio
 * goes in already-processed; this function is only called at playback for
 * non-cached paths (currently none, reserved for future live-synth).
 */
export function postProcessAudio(raw: Float32Array, sampleRate: number): Float32Array {
  const n0 = raw.length;
  if (n0 === 0) return raw;

  // 1. DC offset removal (in-place into a working buffer the same size as raw)
  const dcWork = new Float32Array(n0);
  let dcSum = 0;
  for (let i = 0; i < n0; i++) dcSum += raw[i];
  const dc = dcSum / n0;
  for (let i = 0; i < n0; i++) dcWork[i] = raw[i] - dc;

  // 2. Leading breath/silence trim — operate on the DC-corrected buffer so
  //    RMS detection isn't biased by a constant offset. Threshold of 0.015
  //    (~−36 dBFS) sits above sustained-breath RMS but below typical voiced
  //    speech onset. Cap at 250 ms so a phrase that happens to start with a
  //    quiet phoneme can't be more than 250 ms shorter than expected.
  const TRIM_RMS_THRESHOLD = 0.015;
  const TRIM_MAX_MS = 250;
  const trimMaxSamples = Math.floor((sampleRate * TRIM_MAX_MS) / 1000);
  const trimOffset = findSpeechOnsetSample(
    dcWork,
    sampleRate,
    TRIM_RMS_THRESHOLD,
    trimMaxSamples,
  );

  const audio = trimOffset > 0 ? dcWork.slice(trimOffset) : dcWork;
  const n = audio.length;

  // 3. High-pass at 80 Hz (removes decoder rumble)
  applyBiquad(audio, sampleRate, 80, "hp");

  // 4. Single low-pass at 9 kHz. Sibilance (/s/, /sh/, /f/) lives in the
  //    3–8 kHz band, so cutting at 7 kHz with two stages noticeably softens
  //    consonants. One stage at 9 kHz keeps the speech band intact and still
  //    drops the worst of the high-frequency noise above ~10 kHz.
  applyBiquad(audio, sampleRate, 9000, "lp");

  // 5. Spectral subtraction — removes in-band noise that rides under speech
  spectralDenoise(audio, sampleRate);

  // 6. Noise gate — noise floor = minimum RMS across non-overlapping 10 ms
  //    windows (typically a tail-end pause). Robust to the leading-trim
  //    above (the previous "first 10 ms" heuristic became invalid once we
  //    removed leading silence). Gate samples whose 2 ms local RMS falls
  //    below 3× the floor.
  const noiseWindowSamples = Math.max(1, Math.floor(sampleRate * 0.01));
  let minWindowRms = Infinity;
  for (let i = 0; i + noiseWindowSamples <= n; i += noiseWindowSamples) {
    let we = 0;
    for (let j = 0; j < noiseWindowSamples; j++) {
      const s = audio[i + j];
      we += s * s;
    }
    const wrms = Math.sqrt(we / noiseWindowSamples);
    if (wrms < minWindowRms) minWindowRms = wrms;
  }
  const noiseRms = isFinite(minWindowRms) ? minWindowRms : 0;
  const gateThreshold = noiseRms * 3;

  if (gateThreshold > 0.0001) {
    // Per-window constant gain. A prior version applied linear gain
    // interpolation across samples within each window to eliminate a
    // 500 Hz step-modulation that the constant-per-window gain creates
    // (visible in FFT as harmonics through 3 kHz). Mathematically more
    // correct but PERCEPTUALLY worse: with interpolation, sample 0 of
    // the audio has gain 0 and ramps up over 2 ms, whereas constant-
    // per-window gives sample 0 immediate gain 0.3. For consonant/
    // sibilant speech onsets (/n/, /d/, /r/) the silent-then-ramping
    // start creates a plosive "puh" transient — user listen-test on
    // "No", "Dim the light", "Please repeat that" confirmed it under
    // the interpolated variant. The 500 Hz step modulation it removed
    // is below most listeners' threshold under fp32 decoder output, so
    // the trade-off favors keeping the constant-per-window gain.
    const windowLen = Math.floor(sampleRate * 0.002); // 2 ms analysis window
    let gateGain = 0; // starts closed
    const attack = 0.3;  // gate opens quickly
    const release = 0.05; // gate closes gradually (avoids choppy cutoffs)
    for (let i = 0; i < n; i += windowLen) {
      const end = Math.min(i + windowLen, n);
      let winEnergy = 0;
      for (let j = i; j < end; j++) winEnergy += audio[j] * audio[j];
      const winRms = Math.sqrt(winEnergy / (end - i));

      const target = winRms > gateThreshold ? 1 : 0;
      gateGain += (target - gateGain) * (target > gateGain ? attack : release);

      for (let j = i; j < end; j++) audio[j] *= gateGain;
    }
  }

  // 7. Peak normalization to 0.85 (headroom for soft limiter)
  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    const abs = Math.abs(audio[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0.001) {
    const gain = 0.85 / maxAbs;
    for (let i = 0; i < n; i++) audio[i] *= gain;
  }

  // 8. Soft limiter (tanh saturation above ±0.9)
  for (let i = 0; i < n; i++) {
    const s = audio[i];
    if (s > 0.9 || s < -0.9) {
      audio[i] = 0.9 * Math.tanh(s / 0.9);
    }
  }

  // 9. Cosine fade-in/out (5 ms) to prevent start/end clicks
  const fadeLen = Math.min(Math.floor(sampleRate * 0.005), Math.floor(n / 2));
  for (let i = 0; i < fadeLen; i++) {
    const t = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
    audio[i] *= t;
    audio[n - 1 - i] *= t;
  }

  return audio;
}
