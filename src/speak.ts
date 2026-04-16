import type { Speaker } from "./types";
import { getModelManager } from "./models/modelManager";
import { isGPUReady, synthesizeGPU } from "./models/ttsEngine";

/** Shared AudioContext for playing synthesized audio */
let audioCtx: AudioContext | null = null;

/**
 * Cached voice list for the Web Speech API.
 * Chrome loads voices asynchronously — getVoices() returns [] until the
 * voiceschanged event fires. Priming the cache at boot removes voice-
 * resolution latency from the patient's critical tap-to-speech path.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * User-selected fallback voice URI. When set, tryWebSpeech uses this
 * specific voice instead of auto-detecting one. This is critical for
 * Chrome reliability — explicit voice assignment bypasses Chrome's
 * default voice resolution, which can silently fail.
 */
let fallbackVoiceURI: string | null = null;

/**
 * Set the fallback Web Speech API voice. Call when settings change.
 */
export function setFallbackVoice(voiceURI: string | null): void {
  fallbackVoiceURI = voiceURI;
}

/**
 * Pre-prime the Web Speech API so fallback speech is ready immediately.
 * Call once at app startup. Safe to call in any browser — silently no-ops
 * when speechSynthesis is unavailable.
 */
export function primeSpeechSynthesis(): void {
  if (!("speechSynthesis" in window)) return;

  cachedVoices = speechSynthesis.getVoices();

  // Chrome fires voiceschanged once its async voice list is ready.
  // Safari already has voices at this point, but the listener is harmless.
  speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoices = speechSynthesis.getVoices();
  });
}

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

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

  // 1. Estimate noise magnitude spectrum (average over noise frames)
  const noiseMag = new Float64Array(frameSize);
  let noiseCount = 0;
  for (let f = 0; f < noiseFrames; f++) {
    const off = f * hop;
    if (off + frameSize > n) break;
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
function applyBiquad(
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
 * Post-process raw TTS audio to remove artifacts from quantized neural
 * models (Chatterbox Turbo q4f16).
 *
 * Pipeline:
 *   1. DC offset removal — prevents static hiss from decoder bias
 *   2. High-pass at 80 Hz — removes sub-bass rumble from decoder
 *   3. Two-stage low-pass at 7 kHz — steep rolloff removes broadband
 *      HF quantization noise while keeping all speech content
 *   4. Spectral subtraction — estimates noise profile from leading
 *      silence, subtracts it from every STFT frame to remove in-band noise
 *   5. Noise gate — mutes samples below threshold in inter-word gaps
 *   6. Peak normalization to 0.85 — consistent volume with headroom
 *   7. Soft limiter — tanh saturation prevents clipping on transients
 *   8. Cosine fade-in/out (5 ms) — prevents start/end clicks
 */
function postProcessAudio(raw: Float32Array, sampleRate: number): Float32Array {
  const n = raw.length;
  if (n === 0) return raw;

  const audio = new Float32Array(n);

  // 1. DC offset removal
  let dcSum = 0;
  for (let i = 0; i < n; i++) dcSum += raw[i];
  const dc = dcSum / n;
  for (let i = 0; i < n; i++) audio[i] = raw[i] - dc;

  // 2. High-pass at 80 Hz (removes decoder rumble)
  applyBiquad(audio, sampleRate, 80, "hp");

  // 3. Two cascaded low-pass stages at 7 kHz for steeper rolloff
  //    (~24 dB/oct total — cleans broadband q4f16 noise above speech band)
  applyBiquad(audio, sampleRate, 7000, "lp");
  applyBiquad(audio, sampleRate, 7000, "lp");

  // 4. Spectral subtraction — removes in-band noise that rides under speech
  spectralDenoise(audio, sampleRate);

  // 5. Noise gate — estimate RMS from first 10 ms (post-denoise residual),
  //    gate samples whose local energy falls below 3× that floor.
  //    Uses 2 ms RMS windows with smooth gain transitions.
  const noiseWindowSamples = Math.min(Math.floor(sampleRate * 0.01), Math.floor(n / 4));
  let noiseEnergy = 0;
  for (let i = 0; i < noiseWindowSamples; i++) noiseEnergy += audio[i] * audio[i];
  const noiseRms = Math.sqrt(noiseEnergy / noiseWindowSamples);
  const gateThreshold = noiseRms * 3;

  if (gateThreshold > 0.0001) {
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

  // 6. Peak normalization to 0.85 (headroom for soft limiter)
  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    const abs = Math.abs(audio[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0.001) {
    const gain = 0.85 / maxAbs;
    for (let i = 0; i < n; i++) audio[i] *= gain;
  }

  // 7. Soft limiter (tanh saturation above ±0.9)
  for (let i = 0; i < n; i++) {
    const s = audio[i];
    if (s > 0.9 || s < -0.9) {
      audio[i] = 0.9 * Math.tanh(s / 0.9);
    }
  }

  // 8. Cosine fade-in/out (5 ms) to prevent start/end clicks
  const fadeLen = Math.min(Math.floor(sampleRate * 0.005), Math.floor(n / 2));
  for (let i = 0; i < fadeLen; i++) {
    const t = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
    audio[i] *= t;
    audio[n - 1 - i] *= t;
  }

  return audio;
}

/**
 * Play raw PCM audio data through Web Audio API.
 */
async function playAudioBuffer(
  audio: Float32Array,
  sampleRate: number,
): Promise<void> {
  const ctx = await getAudioContext();

  const processed = postProcessAudio(audio, sampleRate);

  let rawMax = 0, rawRms = 0;
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i]);
    if (abs > rawMax) rawMax = abs;
    rawRms += audio[i] * audio[i];
  }
  rawRms = Math.sqrt(rawRms / audio.length);
  console.log(`[OwnVoice:TTS] Audio post-process: rawMax=${rawMax.toFixed(4)} rawRms=${rawRms.toFixed(4)} → processed ${processed.length} samples`);

  const buffer = ctx.createBuffer(1, processed.length, sampleRate);
  buffer.getChannelData(0).set(processed);

  return new Promise<void>((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start();
  });
}

/**
 * Synthesize speech via the TTS worker and return the audio.
 */
function synthesizeWithWorker(
  text: string,
  speakerData: unknown,
): Promise<{ data: Float32Array; sampleRate: number }> {
  const worker = getModelManager().getWorker("tts");
  if (!worker) return Promise.reject(new Error("TTS worker not available"));

  return new Promise((resolve, reject) => {
    // WASM-based autoregressive generation is slow (~100-200 tokens per
    // phrase, each requiring a full 24-layer forward pass). On the target
    // iPad with WebGPU/Metal this will be much faster; 120s accommodates
    // the WASM fallback on desktop during development.
    const timeout = setTimeout(() => {
      worker.removeEventListener("message", handler);
      reject(new Error("TTS synthesis timeout (180s)"));
    }, 180000);

    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "audio") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        resolve({ data: msg.data, sampleRate: msg.sampleRate });
      } else if (msg.type === "error") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        reject(new Error(msg.message));
      }
    };

    worker.addEventListener("message", handler);
    worker.postMessage({ type: "synthesize", text, speakerData });
  });
}

/**
 * Play a confirmation tone via Web Audio API.
 * Used as the fallback when neither Chatterbox Turbo nor Web Speech API
 * are available. A gentle two-tone chime confirms the tap registered.
 */
async function playConfirmationTone(): Promise<void> {
  const ctx = await getAudioContext();
  return new Promise<void>((resolve) => {
    const now = ctx.currentTime;

    // Two-note chime: C5 then E5
    const notes = [523.25, 659.25]; // Hz
    const duration = 0.12; // seconds per note

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * duration + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * duration);
      osc.stop(now + i * duration + duration);
    });

    setTimeout(resolve, notes.length * duration * 1000 + 50);
  });
}

/**
 * Fall back to Web Speech API.
 * Returns true if speech was successfully initiated, false if it failed/canceled.
 */
async function tryWebSpeech(text: string): Promise<boolean> {
  if (!("speechSynthesis" in window)) return false;

  // Clear any stuck queue — Chrome can get wedged in speaking:true forever.
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.volume = 1.0;

  const voices = cachedVoices.length > 0 ? cachedVoices : speechSynthesis.getVoices();
  // Prefer the user's explicit selection; fall back to any English voice
  const voice = (fallbackVoiceURI && voices.find((v) => v.voiceURI === fallbackVoiceURI))
    || voices.find((v) => v.lang.startsWith("en"));
  if (voice) utterance.voice = voice;

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    // Chrome bug: speechSynthesis silently freezes mid-utterance — audio
    // stops but neither onend nor onerror fires. A pause/resume heartbeat
    // every 100ms keeps the engine alive.
    let keepalive: ReturnType<typeof setInterval> | null = null;

    function cleanup() {
      if (keepalive) { clearInterval(keepalive); keepalive = null; }
    }

    utterance.onstart = () => {
      console.log("[OwnVoice:TTS] Web Speech started");
    };
    utterance.onend = () => {
      cleanup();
      if (!resolved) { resolved = true; resolve(true); }
    };
    utterance.onerror = () => {
      cleanup();
      if (!resolved) { resolved = true; resolve(false); }
    };

    speechSynthesis.speak(utterance);

    // Chrome bug: long utterances silently freeze (no onend/onerror).
    // A periodic pause/resume nudge prevents this. Safari doesn't need it
    // and the nudge causes audible choppiness there. Even on Chrome, 100ms
    // was far too aggressive — 10s is sufficient to catch the freeze before
    // the user notices a stall.
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent);
    if (isChrome) {
      keepalive = setInterval(() => {
        if (speechSynthesis.speaking) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        } else {
          cleanup();
        }
      }, 10_000);
    }

    // Safety timeout: if speech hasn't started within 500ms, give up.
    setTimeout(() => {
      if (!resolved && !speechSynthesis.speaking) {
        cleanup();
        resolved = true;
        resolve(false);
      }
    }, 500);
  });
}

/**
 * The single audio pathway for all speech output.
 *
 * Priority:
 *   1. Chatterbox Turbo (cloned voice via Web Audio API)
 *   2. Web Speech API (system voice)
 *   3. Confirmation tone (Web Audio API chime — always works)
 *
 * The patient always gets feedback. No silent failures.
 */
export async function speak(text: string, speaker: Speaker): Promise<void> {
  const mgr = getModelManager();

  console.log("[OwnVoice:TTS] speak() called", {
    text: text.slice(0, 30),
    hasEmbedding: !!speaker.embedding,
    gpuReady: isGPUReady(),
    wasmReady: mgr.isReady("tts"),
    speakerType: speaker.type,
  });

  // Priority 1a: Chatterbox Turbo via WebGPU (main thread, fast)
  if (isGPUReady() && speaker.embedding) {
    try {
      console.log("[OwnVoice:TTS] Trying GPU synthesis...");
      const { data, sampleRate } = await synthesizeGPU(
        text,
        speaker.embedding as Parameters<typeof synthesizeGPU>[1],
      );
      console.log(`[OwnVoice:TTS] GPU synthesis done! samples=${data.length} rate=${sampleRate} dur=${(data.length / sampleRate).toFixed(1)}s`);
      await playAudioBuffer(data, sampleRate);
      return;
    } catch (err) {
      console.warn("[OwnVoice:TTS] GPU synthesis failed, trying fallbacks:", err);
    }
  }

  // Priority 1b: Chatterbox Turbo via WASM worker (slow fallback)
  if (mgr.isReady("tts") && speaker.embedding) {
    console.log("[OwnVoice:TTS] Trying WASM worker synthesis...");
    try {
      const { data, sampleRate } = await synthesizeWithWorker(
        text,
        speaker.embedding,
      );
      const nonZero = Array.from(data.slice(0, 5000)).filter(v => Math.abs(v) > 0.001).length;
      const rms = Math.sqrt(data.slice(0, 5000).reduce((s, v) => s + v * v, 0) / Math.min(data.length, 5000));
      const maxAbs = Math.max(...Array.from(data.slice(0, 5000)).map(Math.abs));
      console.log(`[OwnVoice:TTS] WASM synthesis done! samples=${data.length} rate=${sampleRate} dur=${(data.length / sampleRate).toFixed(1)}s nonZero=${nonZero}/5000 rms=${rms.toFixed(6)} max=${maxAbs.toFixed(6)}`);
      await playAudioBuffer(data, sampleRate);
      console.log("[OwnVoice:TTS] Audio playback complete");
      return;
    } catch (err) {
      console.warn("[OwnVoice:TTS] Worker synthesis failed, trying fallbacks:", err);
    }
  } else {
    console.log("[OwnVoice:TTS] Skipping WASM worker", { wasmReady: mgr.isReady("tts"), hasEmbedding: !!speaker.embedding });
  }

  // Priority 2: Web Speech API
  console.log("[OwnVoice:TTS] Trying Web Speech API...");
  const speechWorked = await tryWebSpeech(text);
  if (speechWorked) {
    console.log("[OwnVoice:TTS] Web Speech played OK");
    return;
  }

  // Priority 3: Confirmation tone (always works via Web Audio API)
  console.log("[OwnVoice:TTS] All speech failed, playing confirmation tone");
  await playConfirmationTone();
}
