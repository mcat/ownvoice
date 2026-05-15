// Build marker for CF edge cache invalidation. Bump when _headers rules
// change so the edge re-fetches the bundle to pick up new response headers.
// The string literal MUST survive minification — esbuild evaluates `void <const>`
// to `void 0` and strips the string, so we assign to a global property which
// forces a real runtime side effect that retains the literal in the output bytes.
// Verified by `grep '2026-05-12' dist/assets/*Worker-*.js` after build.
(self as unknown as { __OV_BUILD__: string }).__OV_BUILD__ = "2026-05-12-require-corp";
/**
 * STT Web Worker — Whisper small (onnx-community/whisper-small, q4 variant)
 *
 * WASM-only fallback — the primary WebGPU path runs via sttEngine.ts
 * (plain JS worker in public/stt-gpu-worker.js, same pattern as TTS).
 * This worker is used when WebGPU is unavailable.
 *
 * Split encoder-decoder architecture with KV cache for autoregressive decoding.
 * Loads real ONNX model files and tokenizer.json for on-device speech-to-text.
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "transcribe", audio: Float32Array, sampleRate: number }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "progress", loaded: number, total: number }
 *   { type: "transcript", text: string }
 *   { type: "error", message: string }
 */

import * as ort from "onnxruntime-web";
import { ORT_VERSION } from "./assetVersions";
import { linearResample } from "./resample";

// Multi-threaded WASM is only available when `crossOriginIsolated` is true
// (page + SW serve COOP+COEP). Silently fall back to single-thread otherwise.
ort.env.logLevel = "error";
// See tts-gpu-worker.js for why this is capped at 4.
if (ort.env?.wasm) {
  // ORT loads WASM at runtime from this URL prefix. In production,
  // /ort/* is served by a Pages Function backed by R2 (see
  // functions/ort/[[path]].ts). In dev, a Vite middleware (see
  // vite.config.ts) rewrites /ort/<version>/<file> to public/ort/<file>.
  ort.env.wasm.wasmPaths = `/ort/${ORT_VERSION}/`;
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
    : 1;
}

const LOG_PREFIX = "[OwnVoice:STT]";

/** Whisper expects 16 kHz mono audio */
const TARGET_SAMPLE_RATE = 16_000;

/** Whisper processes 30-second chunks */
const CHUNK_SECONDS = 30;
const CHUNK_SAMPLES = TARGET_SAMPLE_RATE * CHUNK_SECONDS;

/** Mel spectrogram parameters for Whisper small.
 *
 * `N_FFT` is the analysis-window size — matches Whisper's reference exactly.
 * `FFT_SIZE` is the FFT length, padded up to the next power of two so we
 * can use a fast radix-2 Cooley-Tukey FFT (~50× faster than the naive
 * O(N²) DFT we used to do here). The filterbank is built against
 * `FFT_SIZE`, not `N_FFT`, because the frequency-bin spacing depends on
 * the actual FFT length. Nyquist is unchanged either way, so the mel
 * features stay within rounding of the reference Whisper preprocessor. */
const N_FFT = 400;
const FFT_SIZE = 512;
const FREQ_BINS = FFT_SIZE / 2 + 1; // 257
const HOP_LENGTH = 160;
const N_MELS = 80;
const MEL_FRAMES = CHUNK_SAMPLES / HOP_LENGTH; // 3000

/** Whisper small architecture constants */
const NUM_DECODER_LAYERS = 12;
const NUM_HEADS = 12;
const HEAD_DIM = 64;

/** Maximum tokens to generate (safety limit) */
const MAX_TOKENS = 448;

// ─── State ─────────────────────────────────────────────────────────

let encoderSession: ort.InferenceSession | null = null;
let decoderSession: ort.InferenceSession | null = null;

/** Vocabulary: token ID → byte-decoded string */
let vocabulary: Map<number, string> = new Map();

/** Set of special token IDs to filter from output */
let specialTokenIds: Set<number> = new Set();

/** Token IDs — populated from tokenizer.json (NOT hardcoded, varies by model) */
let TOKEN_EOT = -1;
let TOKEN_SOT = -1;
let TOKEN_EN = -1;
let TOKEN_TRANSCRIBE = -1;
let TOKEN_NOTIMESTAMPS = -1;
let TOKEN_TIMESTAMP_BEGIN = -1;
/** Whisper's no-speech token. -1 if not in tokenizer (treats as feature unavailable). */
let TOKEN_NO_SPEECH = -1;

/** ISO-639-1 language code → Whisper language token ID. Populated from tokenizer.json. */
const LANG_TO_TOKEN: Map<string, number> = new Map();

/** Whisper's reference no-speech threshold; if SOT-position softmax(no_speech) exceeds this,
 * the chunk is treated as silence/non-speech and an empty transcript is returned. */
const NO_SPEECH_THRESHOLD = 0.6;

// ─── Audio preprocessing ────────────────────────────────────────────

function resampleTo16k(audio: Float32Array, fromRate: number): Float32Array {
  return linearResample(audio, fromRate, TARGET_SAMPLE_RATE);
}

/**
 * Pad or trim audio to exactly CHUNK_SAMPLES (30 seconds at 16 kHz).
 */
function padOrTrim(audio: Float32Array): Float32Array {
  if (audio.length === CHUNK_SAMPLES) return audio;

  const out = new Float32Array(CHUNK_SAMPLES);
  out.set(audio.subarray(0, Math.min(audio.length, CHUNK_SAMPLES)));
  // If shorter than 30s, the rest is zero-padded by default
  return out;
}

/**
 * Compute a Hann window of the given length.
 */
function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / length));
  }
  return w;
}

/**
 * Build a closure that computes an in-place radix-2 Cooley-Tukey FFT of
 * length `size` (must be a power of two). Bit-reversal indices and
 * per-level twiddle factors are precomputed at construction time so the
 * hot path inside `stft()` does no trig — just multiplies and adds.
 */
function makeFFT(size: number): (re: Float64Array, im: Float64Array) => void {
  if ((size & (size - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two; got ${size}`);
  }
  const log2N = Math.log2(size) | 0;

  // Bit-reversal lookup
  const bitReverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let r = 0;
    let x = i;
    for (let bit = 0; bit < log2N; bit++) {
      r = (r << 1) | (x & 1);
      x >>>= 1;
    }
    bitReverse[i] = r;
  }

  // Twiddle factors per level: for stage `k` (size = 2^(k+1), halfSize = 2^k),
  // we need W^j = exp(-i·2π·j / size) for j = 0..halfSize-1.
  const cosTables: Float64Array[] = [];
  const sinTables: Float64Array[] = [];
  for (let level = 0; level < log2N; level++) {
    const stageSize = 2 << level;
    const halfStage = stageSize >> 1;
    const cosT = new Float64Array(halfStage);
    const sinT = new Float64Array(halfStage);
    for (let j = 0; j < halfStage; j++) {
      const angle = (-2 * Math.PI * j) / stageSize;
      cosT[j] = Math.cos(angle);
      sinT[j] = Math.sin(angle);
    }
    cosTables.push(cosT);
    sinTables.push(sinT);
  }

  return function fft(re: Float64Array, im: Float64Array): void {
    // Bit-reverse permute (in-place)
    for (let i = 0; i < size; i++) {
      const j = bitReverse[i];
      if (i < j) {
        let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
        tmp = im[i]; im[i] = im[j]; im[j] = tmp;
      }
    }
    // Cooley-Tukey butterflies
    for (let level = 0; level < log2N; level++) {
      const stageSize = 2 << level;
      const halfStage = stageSize >> 1;
      const cosT = cosTables[level];
      const sinT = sinTables[level];
      for (let start = 0; start < size; start += stageSize) {
        for (let j = 0; j < halfStage; j++) {
          const cos = cosT[j];
          const sin = sinT[j];
          const i1 = start + j;
          const i2 = i1 + halfStage;
          const tre = re[i2] * cos - im[i2] * sin;
          const tim = re[i2] * sin + im[i2] * cos;
          re[i2] = re[i1] - tre;
          im[i2] = im[i1] - tim;
          re[i1] += tre;
          im[i1] += tim;
        }
      }
    }
  };
}

const fftPow2 = makeFFT(FFT_SIZE);

/**
 * Compute power spectrogram using STFT with Hann window.
 *
 * Each frame is windowed with a 400-point Hann (matching Whisper's
 * `n_fft=400`), zero-padded to 512 samples, and run through a radix-2
 * FFT. The first `FREQ_BINS` (257) bins of the magnitude-squared
 * spectrum are returned. Per-frame work is `O(FFT_SIZE log FFT_SIZE)`
 * vs the previous `O(N_FFT × FREQ_BINS)`; for a 30 s chunk that's
 * ~30 M ops vs ~240 M.
 *
 * Returns a 2D array shaped `[FREQ_BINS][MEL_FRAMES]`.
 */
function stft(audio: Float32Array): Float64Array[] {
  const win = hannWindow(N_FFT);
  const numFrames = MEL_FRAMES;

  const spectrogram: Float64Array[] = new Array(FREQ_BINS);
  for (let f = 0; f < FREQ_BINS; f++) {
    spectrogram[f] = new Float64Array(numFrames);
  }

  // Reusable per-frame buffers (zeroed once, then per-frame we only
  // need to overwrite the first N_FFT slots; the tail stays zero).
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let t = 0; t < numFrames; t++) {
    const offset = t * HOP_LENGTH;

    // Apply window to the first N_FFT samples; rest is the zero-pad tail.
    for (let n = 0; n < N_FFT; n++) {
      const sample = offset + n < audio.length ? audio[offset + n] : 0;
      re[n] = sample * win[n];
      im[n] = 0;
    }
    for (let n = N_FFT; n < FFT_SIZE; n++) {
      re[n] = 0;
      im[n] = 0;
    }

    fftPow2(re, im);

    for (let f = 0; f < FREQ_BINS; f++) {
      spectrogram[f][t] = re[f] * re[f] + im[f] * im[f];
    }
  }

  return spectrogram;
}

/**
 * Create mel filterbank matrix.
 *
 * Bin-index math uses `FFT_SIZE` (not `N_FFT`) because the spectrogram
 * coming out of `stft()` has `FREQ_BINS = FFT_SIZE / 2 + 1` bins, not
 * `N_FFT / 2 + 1`. Highest representable frequency is unchanged
 * (Nyquist = `TARGET_SAMPLE_RATE / 2`); only the bin spacing differs.
 *
 * Returns `[N_MELS][FREQ_BINS]` weights.
 */
function melFilterbank(): Float64Array[] {
  const melHigh = 2595 * Math.log10(1 + TARGET_SAMPLE_RATE / 2 / 700);
  const melLow = 0;

  const melPoints = new Float64Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    melPoints[i] = melLow + ((melHigh - melLow) * i) / (N_MELS + 1);
  }

  const hzPoints = new Float64Array(N_MELS + 2);
  const binIndices = new Float64Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    hzPoints[i] = 700 * (Math.pow(10, melPoints[i] / 2595) - 1);
    binIndices[i] = (hzPoints[i] * FFT_SIZE) / TARGET_SAMPLE_RATE;
  }

  const filters: Float64Array[] = new Array(N_MELS);
  for (let m = 0; m < N_MELS; m++) {
    filters[m] = new Float64Array(FREQ_BINS);
    const left = binIndices[m];
    const center = binIndices[m + 1];
    const right = binIndices[m + 2];

    // Slaney normalization: scale each filter by 2 / (hz[m+2] − hz[m]) so its
    // area in Hz space ≈ 1. Whisper's reference (openai/whisper/audio.py)
    // loads `mel_filters.npz` generated by `librosa.filters.mel(...)`, which
    // since librosa 0.7 defaults to `norm="slaney"`. Without this scaling,
    // higher mel bins (wider in Hz) over-weight the input by a factor of
    // their bandwidth — the downstream `(max − 8) / 4 + 1` clamp absorbs
    // uniform offsets but not this per-band shape. Same family of bug as
    // the log10 fix in PR #155: a constant in the chain calibrated for a
    // specific upstream transformation we weren't applying.
    const enorm = 2.0 / (hzPoints[m + 2] - hzPoints[m]);

    for (let f = 0; f < FREQ_BINS; f++) {
      if (f >= left && f <= center) {
        filters[m][f] = ((f - left) / (center - left)) * enorm;
      } else if (f > center && f <= right) {
        filters[m][f] = ((right - f) / (right - center)) * enorm;
      }
    }
  }

  return filters;
}

/**
 * Compute 80-bin log-Mel spectrogram features for Whisper.
 * Returns Float32Array of shape [1, N_MELS, MEL_FRAMES].
 */
function logMelSpectrogram(audio: Float32Array): Float32Array {
  const padded = padOrTrim(audio);
  const powerSpec = stft(padded);
  const filters = melFilterbank();

  const output = new Float32Array(N_MELS * MEL_FRAMES);

  // Whisper's reference (openai/whisper):
  //   log_spec = clamp(mel_spec, min=1e-10).log10()
  //   log_spec = max(log_spec, log_spec.max() - 8.0)
  //   log_spec = (log_spec + 4.0) / 4.0   ≡  log_spec/4 + 1
  //
  // We were using natural log here. Math.log values are ~2.303× larger
  // than Math.log10 for the same input, so the encoder was receiving
  // features at the wrong magnitude — and the (x+4)/4 rescale below
  // is calibrated for log10 input. Result: every transcription saw a
  // distribution-shifted feature space the encoder was never trained
  // on. Match the spec by switching to log10.
  for (let m = 0; m < N_MELS; m++) {
    for (let t = 0; t < MEL_FRAMES; t++) {
      let sum = 0;
      for (let f = 0; f < FREQ_BINS; f++) {
        sum += filters[m][f] * powerSpec[f][t];
      }
      output[m * MEL_FRAMES + t] = Math.log10(Math.max(sum, 1e-10));
    }
  }

  // Cap at max - 8.0 (≈ 80 dB dynamic range), then rescale into
  // Whisper's expected feature range. `/ 4 + 1` is algebraically
  // identical to `(x + 4) / 4` from the reference.
  let maxVal = -Infinity;
  for (let i = 0; i < output.length; i++) {
    if (output[i] > maxVal) maxVal = output[i];
  }
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.max(output[i], maxVal - 8.0) / 4.0 + 1.0;
  }

  return output;
}

// ─── Tokenizer ─────────────────────────────────────────────────────

/**
 * Build the GPT-2 byte-to-unicode mapping used by Whisper's BPE tokenizer.
 * This maps byte values (0-255) to unicode characters.
 */
function buildByteToUnicode(): Map<number, string> {
  const bs: number[] = [];
  const cs: number[] = [];

  // Printable ASCII ranges that map to themselves
  // 33-126 (! through ~), 161-172, 174-255
  for (let i = 33; i <= 126; i++) { bs.push(i); cs.push(i); }     // ! to ~
  for (let i = 161; i <= 172; i++) { bs.push(i); cs.push(i); }    // ¡ to ¬
  for (let i = 174; i <= 255; i++) { bs.push(i); cs.push(i); }    // ® to ÿ

  // Remaining bytes get mapped to higher unicode codepoints
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }

  const map = new Map<number, string>();
  for (let i = 0; i < bs.length; i++) {
    map.set(bs[i], String.fromCodePoint(cs[i]));
  }
  return map;
}

/**
 * Build the inverse mapping: unicode character -> byte value.
 */
function buildUnicodeToByteMap(): Map<string, number> {
  const b2u = buildByteToUnicode();
  const map = new Map<string, number>();
  for (const [byte, char] of b2u) {
    map.set(char, byte);
  }
  return map;
}

/**
 * Decode a BPE token string (in GPT-2 byte encoding) back to a UTF-8 string.
 */
function decodeBpeToken(token: string, unicodeToByte: Map<string, number>): string {
  const bytes: number[] = [];
  for (const ch of token) {
    const b = unicodeToByte.get(ch);
    if (b !== undefined) {
      bytes.push(b);
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}

/**
 * Load tokenizer.json and build:
 * - vocabulary: id -> decoded text string
 * - specialTokenIds: set of IDs to filter from output
 */
async function loadTokenizer(baseUrl: string): Promise<void> {
  console.log(`${LOG_PREFIX} Loading tokenizer...`);

  const response = await fetch(`${baseUrl}tokenizer.json`);
  if (!response.ok) {
    throw new Error(`Failed to load tokenizer: HTTP ${response.status}`);
  }

  const tokenizer = await response.json();
  const bpeVocab: Record<string, number> = tokenizer.model?.vocab ?? {};
  const addedTokens: Array<{ id: number; content: string; special?: boolean }> =
    tokenizer.added_tokens ?? [];

  const unicodeToByte = buildUnicodeToByteMap();

  // Build id -> string map from BPE vocab
  vocabulary = new Map();
  for (const [token, id] of Object.entries(bpeVocab)) {
    vocabulary.set(id, decodeBpeToken(token, unicodeToByte));
  }

  // Build special token set and extract IDs from tokenizer (not hardcoded)
  specialTokenIds = new Set();
  const contentToId = new Map<string, number>();
  for (const tok of addedTokens) {
    vocabulary.set(tok.id, tok.content);
    if (tok.special) {
      specialTokenIds.add(tok.id);
    }
    contentToId.set(tok.content, tok.id);
  }

  TOKEN_EOT = contentToId.get("<|endoftext|>") ?? -1;
  TOKEN_SOT = contentToId.get("<|startoftranscript|>") ?? -1;
  TOKEN_EN = contentToId.get("<|en|>") ?? -1;
  TOKEN_TRANSCRIBE = contentToId.get("<|transcribe|>") ?? -1;
  TOKEN_NOTIMESTAMPS = contentToId.get("<|notimestamps|>") ?? -1;
  TOKEN_TIMESTAMP_BEGIN = TOKEN_NOTIMESTAMPS + 1;
  TOKEN_NO_SPEECH = contentToId.get("<|nospeech|>") ?? contentToId.get("<|nocaptions|>") ?? -1;

  // Mark all timestamp tokens as special
  for (let id = TOKEN_TIMESTAMP_BEGIN; id < TOKEN_TIMESTAMP_BEGIN + 1501; id++) {
    specialTokenIds.add(id);
  }

  // Build language → token map from added_tokens. Whisper language tokens are
  // always <|xx|> or <|xxx|> with 2- or 3-char lowercase codes (en, es, haw, jw…).
  // The 2-3-char regex deliberately filters out longer special tokens
  // (<|transcribe|>, <|notimestamps|>, <|nospeech|>, etc.).
  LANG_TO_TOKEN.clear();
  for (const tok of addedTokens) {
    const m = tok.content.match(/^<\|([a-z]{2,3})\|>$/);
    if (m) LANG_TO_TOKEN.set(m[1], tok.id);
  }

  console.log(
    `${LOG_PREFIX} Tokenizer loaded: ${vocabulary.size} tokens, ${specialTokenIds.size} special`,
  );
  console.log(
    `${LOG_PREFIX} Token IDs: EOT=${TOKEN_EOT} SOT=${TOKEN_SOT} EN=${TOKEN_EN} TRANSCRIBE=${TOKEN_TRANSCRIBE} NOTIMESTAMPS=${TOKEN_NOTIMESTAMPS} TS_BEGIN=${TOKEN_TIMESTAMP_BEGIN}`,
  );
}

// ─── Token decoding ─────────────────────────────────────────────────

/**
 * Decode token IDs to text, filtering out special tokens and timestamps.
 */
function decodeTokens(tokenIds: number[]): string {
  const pieces: string[] = [];
  for (const id of tokenIds) {
    if (specialTokenIds.has(id)) continue;
    if (id >= TOKEN_TIMESTAMP_BEGIN) continue;
    const text = vocabulary.get(id);
    if (text !== undefined) {
      pieces.push(text);
    }
  }
  return pieces.join("").trim();
}

// ─── Model lifecycle ────────────────────────────────────────────────

/**
 * Download a model file from the given URL with progress reporting.
 */
async function downloadModel(
  url: string,
  label: string,
): Promise<ArrayBuffer> {
  console.log(`${LOG_PREFIX} Downloading ${label} from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${label}`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    self.postMessage({ type: "progress", label, loaded, total });
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(
    `${LOG_PREFIX} ${label} download complete (${(loaded / 1e6).toFixed(1)} MB)`,
  );
  return combined.buffer;
}

/**
 * Initialize both ONNX InferenceSessions (encoder + decoder) with WASM EP.
 * Also loads the tokenizer vocabulary.
 */
async function handleInit(modelUrl: string): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing with model base: ${modelUrl}`);

  // Ensure trailing slash
  const baseUrl = modelUrl.endsWith("/") ? modelUrl : modelUrl + "/";

  // Load tokenizer in parallel with model downloads
  const [encoderData, decoderData] = await Promise.all([
    downloadModel(`${baseUrl}encoder_model_q4.onnx`, "encoder"),
    downloadModel(`${baseUrl}decoder_model_merged_q4.onnx`, "decoder"),
    loadTokenizer(baseUrl),
  ]);

  // WASM-only — WebGPU path is handled by stt-gpu-worker.js
  console.log(`${LOG_PREFIX} Creating sessions with EP: wasm`);

  const sessionOpts: ort.InferenceSession.SessionOptions = {
    executionProviders: ["wasm"],
    logSeverityLevel: 3,
  };

  // Create sessions sequentially (WebGPU EP requires it; WASM is fine either way)
  const enc = await ort.InferenceSession.create(encoderData, sessionOpts);
  const dec = await ort.InferenceSession.create(decoderData, sessionOpts);

  encoderSession = enc;
  decoderSession = dec;

  console.log(
    `${LOG_PREFIX} Encoder inputs: [${enc.inputNames}], outputs: [${enc.outputNames}]`,
  );
  console.log(
    `${LOG_PREFIX} Decoder inputs: [${dec.inputNames.slice(0, 5)}...], outputs: [${dec.outputNames.slice(0, 5)}...]`,
  );
  console.log(`${LOG_PREFIX} Both sessions created. Ready.`);
  self.postMessage({ type: "ready" });
}

// ─── KV Cache helpers ──────────────────────────────────────────────

/**
 * Create empty KV cache tensors for the first decoder step.
 * The merged decoder expects past_key_values.N.{encoder,decoder}.{key,value}
 * with shape [batch, num_heads, 0, head_dim] for decoder caches (empty on first step)
 * and [batch, num_heads, 0, head_dim] for encoder caches (will be populated by the model).
 */
function createEmptyKVCache(): Record<string, ort.Tensor> {
  const feeds: Record<string, ort.Tensor> = {};

  for (let i = 0; i < NUM_DECODER_LAYERS; i++) {
    // Decoder self-attention caches: empty on first step
    feeds[`past_key_values.${i}.decoder.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
    feeds[`past_key_values.${i}.decoder.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
    // Encoder cross-attention caches: empty on first step (model computes them)
    feeds[`past_key_values.${i}.encoder.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
    feeds[`past_key_values.${i}.encoder.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
  }

  return feeds;
}

/**
 * Extract the KV cache from decoder output tensors (present.N.*) and
 * return them as input tensors (past_key_values.N.*) for the next step.
 */
function extractKVCache(
  results: ort.InferenceSession.OnnxValueMapType,
): Record<string, ort.Tensor> {
  const feeds: Record<string, ort.Tensor> = {};

  for (let i = 0; i < NUM_DECODER_LAYERS; i++) {
    for (const attnType of ["decoder", "encoder"] as const) {
      for (const kvType of ["key", "value"] as const) {
        const outputName = `present.${i}.${attnType}.${kvType}`;
        const inputName = `past_key_values.${i}.${attnType}.${kvType}`;
        const tensor = results[outputName];
        if (tensor) {
          feeds[inputName] = tensor;
        }
      }
    }
  }

  return feeds;
}

// ─── Transcription ──────────────────────────────────────────────────

/**
 * Compute the softmax probability of `tokenId` given a row of logits.
 * Numerically stable (subtract max). Used for the SOT-position no-speech check.
 */
function softmaxProb(
  logits: Float32Array,
  rowOffset: number,
  vocabSize: number,
  tokenId: number,
): number {
  let maxLogit = -Infinity;
  for (let v = 0; v < vocabSize; v++) {
    const lv = logits[rowOffset + v];
    if (lv > maxLogit) maxLogit = lv;
  }
  let sumExp = 0;
  for (let v = 0; v < vocabSize; v++) {
    sumExp += Math.exp(logits[rowOffset + v] - maxLogit);
  }
  return Math.exp(logits[rowOffset + tokenId] - maxLogit) / sumExp;
}

/**
 * Transcribe audio using Whisper small (encoder-decoder pipeline).
 *
 * @param audio       Mono PCM samples at any rate; resampled to 16 kHz internally.
 * @param sampleRate  Source rate of `audio`.
 * @param language    Optional ISO-639-1 code (e.g. "en", "es"). Selects the
 *                    Whisper language token in the prefix. Falls back to English
 *                    if the requested language has no token in this checkpoint.
 */
async function handleTranscribe(
  audio: Float32Array,
  sampleRate: number,
  language: string = "en",
): Promise<void> {
  if (!encoderSession || !decoderSession) {
    throw new Error("Model not initialized");
  }

  console.log(
    `${LOG_PREFIX} Transcribing ${(audio.length / sampleRate).toFixed(1)}s of audio (lang=${language})`,
  );

  // Step 1: Resample to 16 kHz if needed
  const audio16k = resampleTo16k(audio, sampleRate);

  // Step 2: Compute log-Mel spectrogram
  const melFeatures = logMelSpectrogram(audio16k);

  // Step 3: Run encoder
  const inputFeatures = new ort.Tensor("float32", melFeatures, [
    1,
    N_MELS,
    MEL_FRAMES,
  ]);

  console.log(`${LOG_PREFIX} Running encoder...`);
  const encoderResult = await encoderSession.run({
    input_features: inputFeatures,
  });

  const encoderHidden = encoderResult["last_hidden_state"];
  if (!encoderHidden) {
    throw new Error(
      `Encoder did not produce last_hidden_state. Got: [${Object.keys(encoderResult)}]`,
    );
  }
  console.log(
    `${LOG_PREFIX} Encoder done. Hidden shape: [${encoderHidden.dims}]`,
  );

  // Step 4: Autoregressive decoding
  // Start tokens: <|startoftranscript|> <|lang|> <|transcribe|> <|notimestamps|>
  const langToken = LANG_TO_TOKEN.get(language) ?? TOKEN_EN;
  if (langToken === TOKEN_EN && language !== "en") {
    console.warn(
      `${LOG_PREFIX} No language token for "${language}" in this checkpoint; falling back to English`,
    );
  }
  const outputTokens: number[] = [
    TOKEN_SOT,
    langToken,
    TOKEN_TRANSCRIBE,
    TOKEN_NOTIMESTAMPS,
  ];

  // First decoder step: use_cache_branch = false, no KV cache
  let kvCache = createEmptyKVCache();
  let isFirstStep = true;

  console.log(`${LOG_PREFIX} Running decoder (autoregressive)...`);

  for (let step = 0; step < MAX_TOKENS; step++) {
    // Build input_ids: full sequence on first step, just last token on cached steps
    const inputIds = isFirstStep
      ? BigInt64Array.from(outputTokens.map((id) => BigInt(id)))
      : BigInt64Array.from([BigInt(outputTokens[outputTokens.length - 1])]);

    const inputIdsTensor = new ort.Tensor("int64", inputIds, [
      1,
      inputIds.length,
    ]);

    const useCacheBranch = new ort.Tensor("bool", [!isFirstStep], [1]);

    const feeds: Record<string, ort.Tensor> = {
      input_ids: inputIdsTensor,
      encoder_hidden_states: encoderHidden,
      use_cache_branch: useCacheBranch,
      ...kvCache,
    };

    const results = await decoderSession.run(feeds);

    // Extract logits: [batch, seq_len, vocab_size]
    const logits = results["logits"];
    if (!logits) {
      throw new Error(
        `Decoder did not produce logits. Got: [${Object.keys(results).filter((k) => !k.startsWith("present."))}]`,
      );
    }

    const logitsData = logits.data as Float32Array;
    const vocabSize = logits.dims[2];
    const seqLen = logits.dims[1];

    // No-speech detection on the first step. The logits at position 0 (after
    // SOT, before causal-masked attention sees the rest of the prefix) carry
    // the model's "is this speech?" decision — same position HF reads the
    // no-speech probability from. If above threshold, return early with an
    // empty transcript instead of letting the decoder hallucinate from
    // training distribution (the classic " Thanks for watching!" failure).
    if (step === 0 && TOKEN_NO_SPEECH !== -1) {
      const noSpeechProb = softmaxProb(logitsData, 0, vocabSize, TOKEN_NO_SPEECH);
      if (noSpeechProb > NO_SPEECH_THRESHOLD) {
        console.log(
          `${LOG_PREFIX} No speech detected (prob=${noSpeechProb.toFixed(3)} > ${NO_SPEECH_THRESHOLD}); returning empty transcript`,
        );
        self.postMessage({ type: "transcript", text: "" });
        return;
      }
    }

    // Get logits for the last position
    const lastPositionOffset = (seqLen - 1) * vocabSize;

    // Argmax over vocabulary for the last position
    let maxVal = -Infinity;
    let maxIdx = 0;
    for (let v = 0; v < vocabSize; v++) {
      const val = logitsData[lastPositionOffset + v];
      if (val > maxVal) {
        maxVal = val;
        maxIdx = v;
      }
    }

    // Check for end-of-text
    if (maxIdx === TOKEN_EOT) {
      console.log(`${LOG_PREFIX} EOT at step ${step}`);
      break;
    }

    outputTokens.push(maxIdx);

    // Stream partial results every 3 tokens
    if (step > 0 && step % 3 === 0) {
      const partial = decodeTokens(outputTokens);
      if (partial) self.postMessage({ type: "partial", text: partial });
    }

    // Extract KV cache for next step
    kvCache = extractKVCache(results);
    isFirstStep = false;
  }

  // Step 5: Decode tokens to text
  const text = decodeTokens(outputTokens);

  console.log(`${LOG_PREFIX} Transcript (${outputTokens.length} tokens): "${text}"`);
  self.postMessage({ type: "transcript", text });
}

/** Run a tiny silent transcription so encoder + decoder graphs are warm.
 *  Emits {type:"warm"} on success. The transcript output is discarded —
 *  consumers waiting for `warm` are independent of any stray `transcript`
 *  event that handleTranscribe may post on the silent buffer. */
async function handleWarmup(): Promise<void> {
  if (!encoderSession || !decoderSession) {
    self.postMessage({
      type: "error",
      message: "STT not initialized",
      phase: "warmup",
    });
    return;
  }
  try {
    // 100 ms of silence — just enough to confirm the graph runs.
    const silent = new Float32Array(TARGET_SAMPLE_RATE / 10);
    await handleTranscribe(silent, TARGET_SAMPLE_RATE, "en");
    self.postMessage({ type: "warm" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "error", message: msg, phase: "warmup" });
  }
}

// ─── Message handler ────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "init":
        await handleInit(msg.modelUrl);
        break;

      case "transcribe":
        await handleTranscribe(msg.audio, msg.sampleRate, msg.language);
        break;

      case "warmup":
        await handleWarmup();
        break;

      case "shutdown":
        // Page is unloading. Release ORT sessions so the next page's
        // ORT init doesn't fail with leftover device/runtime state.
        for (const s of [encoderSession, decoderSession]) {
          try { await s?.release(); } catch { /* swallow — tearing down */ }
        }
        encoderSession = null;
        decoderSession = null;
        self.close();
        break;

      default:
        console.warn(`${LOG_PREFIX} Unknown message type: ${msg.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Error:`, message);
    self.postMessage({ type: "error", message });
  }
};
