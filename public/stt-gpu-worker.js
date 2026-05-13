// build: 2026-05-12-require-corp
/**
 * WebGPU STT Worker — Whisper small via ONNX Runtime WebGPU EP.
 *
 * Plain JS worker (not Vite-bundled) — imports ORT from /ort/ dist path.
 *
 * Key design decisions:
 *   - Sessions are WARMED UP during init (dummy inference triggers WebGPU
 *     shader compilation). Without this, the first real transcription hangs
 *     for minutes while shaders compile synchronously.
 *   - Uses radix-2 FFT instead of naive DFT for mel spectrogram (~50x faster).
 *   - Concurrent transcription guard: only one transcription runs at a time.
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "transcribe", audio: Float32Array, sampleRate: number }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "partial", text: string }
 *   { type: "transcript", text: string }
 *   { type: "error", message: string }
 */

// Versioned to match wasmPaths below. See tts-gpu-worker.js for rationale.
import * as ort from "/ort/v1.25.1/ort.webgpu.min.mjs";

const LOG = "[OwnVoice:STT:GPU]";

// Multi-threaded WASM is only available when `crossOriginIsolated` is true
// (page + SW serve COOP+COEP). Silently fall back to single-thread otherwise.
// See tts-gpu-worker.js for why this is capped at 4.
if (ort.env?.wasm) {
  // Path matches src/models/assetVersions.ts ORT_VERSION. Versioned because
  // /ort/v<X>/*.wasm is served by a Pages Function reading R2 in production.
  // Update this string when bumping ORT_VERSION there.
  ort.env.wasm.wasmPaths = "/ort/v1.25.1/";
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
    : 1;
}
ort.env.logLevel = "error";

// ─── Whisper constants ─────────────────────────────────────────────

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 30;
const CHUNK_SAMPLES = TARGET_SAMPLE_RATE * CHUNK_SECONDS;

// N_FFT is the analysis-window size (matches Whisper's reference exactly).
// FFT_SIZE is the FFT length, padded up to the next power of two so we can
// use a fast radix-2 Cooley-Tukey FFT (~50× faster than the O(N²) DFT we
// used to do here). Bin-index math uses FFT_SIZE; Nyquist is unchanged.
const N_FFT = 400;
const FFT_SIZE = 512;
const FREQ_BINS = FFT_SIZE / 2 + 1; // 257
const HOP_LENGTH = 160;
const N_MELS = 80;
const MEL_FRAMES = CHUNK_SAMPLES / HOP_LENGTH; // 3000

const NUM_DECODER_LAYERS = 12;
const NUM_HEADS = 12;
const HEAD_DIM = 64;

const MAX_TOKENS = 448;

// ─── State ─────────────────────────────────────────────────────────

let encoderSession = null;
let decoderSession = null;
let vocabulary = new Map();
let specialTokenIds = new Set();
let transcribing = false; // concurrency guard

// Token IDs — populated from tokenizer.json (NOT hardcoded, varies by model)
let TOKEN_EOT = -1;
let TOKEN_SOT = -1;
let TOKEN_EN = -1;
let TOKEN_TRANSCRIBE = -1;
let TOKEN_NOTIMESTAMPS = -1;
let TOKEN_TIMESTAMP_BEGIN = -1;
let TOKEN_NO_SPEECH = -1;

// ISO-639-1 → Whisper language token ID (e.g. "en" → 50259). Populated at tokenizer load.
const LANG_TO_TOKEN = new Map();

// HF reference threshold; SOT-position softmax(no_speech) above this short-circuits to "".
const NO_SPEECH_THRESHOLD = 0.6;

// ─── FFT ───────────────────────────────────────────────────────────

/**
 * Build a closure that computes an in-place radix-2 Cooley-Tukey FFT of
 * length `size` (must be a power of two). Bit-reversal indices and
 * per-level twiddle factors are precomputed at construction time so the
 * hot path inside `stft()` does no trig — just multiplies and adds.
 */
function makeFFT(size) {
  if ((size & (size - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two; got ${size}`);
  }
  const log2N = Math.log2(size) | 0;

  const bitReverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let r = 0, x = i;
    for (let bit = 0; bit < log2N; bit++) {
      r = (r << 1) | (x & 1);
      x >>>= 1;
    }
    bitReverse[i] = r;
  }

  const cosTables = [];
  const sinTables = [];
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

  return function fft(re, im) {
    for (let i = 0; i < size; i++) {
      const j = bitReverse[i];
      if (i < j) {
        let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
        tmp = im[i]; im[i] = im[j]; im[j] = tmp;
      }
    }
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

// ─── Audio preprocessing ────────────────────────────────────────────

function resampleTo16k(audio, fromRate) {
  if (fromRate === TARGET_SAMPLE_RATE) return audio;
  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const outLength = Math.round(audio.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, audio.length - 1);
    const frac = srcIdx - lo;
    out[i] = audio[lo] * (1 - frac) + audio[hi] * frac;
  }
  return out;
}

function padOrTrim(audio) {
  if (audio.length === CHUNK_SAMPLES) return audio;
  const out = new Float32Array(CHUNK_SAMPLES);
  out.set(audio.subarray(0, Math.min(audio.length, CHUNK_SAMPLES)));
  return out;
}

function hannWindow(length) {
  const w = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / length));
  }
  return w;
}

/**
 * Compute power spectrogram using STFT with Hann window.
 * Each frame: 400-point Hann window, zero-padded to 512, radix-2 FFT,
 * keep first FREQ_BINS (257) magnitude-squared bins. Per-frame work is
 * O(FFT_SIZE log FFT_SIZE) vs the previous O(N_FFT × FREQ_BINS).
 */
function stft(audio) {
  const win = hannWindow(N_FFT);
  const numFrames = MEL_FRAMES;

  const spectrogram = new Array(FREQ_BINS);
  for (let f = 0; f < FREQ_BINS; f++) {
    spectrogram[f] = new Float64Array(numFrames);
  }

  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let t = 0; t < numFrames; t++) {
    const offset = t * HOP_LENGTH;
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

// Bin-index math uses FFT_SIZE (not N_FFT) to match the spectrogram bins
// produced by stft(). Nyquist is unchanged; only the bin spacing differs.
//
// Slaney normalization (per-filter `2 / (hz[m+2] − hz[m])`) matches
// librosa.filters.mel default since 0.7, which is what openai/whisper's
// shipped `mel_filters.npz` was generated with. Mirrors src/models/sttWorker.ts.
function melFilterbank() {
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
  const filters = new Array(N_MELS);
  for (let m = 0; m < N_MELS; m++) {
    filters[m] = new Float64Array(FREQ_BINS);
    const left = binIndices[m];
    const center = binIndices[m + 1];
    const right = binIndices[m + 2];
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

function logMelSpectrogram(audio) {
  const padded = padOrTrim(audio);
  const powerSpec = stft(padded);
  const filters = melFilterbank();
  const output = new Float32Array(N_MELS * MEL_FRAMES);

  // Whisper's reference uses log10; the (x+4)/4 rescale below is
  // calibrated for log10. Using natural log shifted features by a
  // factor of ~2.303 — distribution mismatch with what the encoder was
  // trained on. See sttWorker.ts logMelSpectrogram for the full note.
  for (let m = 0; m < N_MELS; m++) {
    for (let t = 0; t < MEL_FRAMES; t++) {
      let sum = 0;
      for (let f = 0; f < FREQ_BINS; f++) {
        sum += filters[m][f] * powerSpec[f][t];
      }
      output[m * MEL_FRAMES + t] = Math.log10(Math.max(sum, 1e-10));
    }
  }

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

function buildByteToUnicode() {
  const bs = [], cs = [];
  for (let i = 33; i <= 126; i++) { bs.push(i); cs.push(i); }
  for (let i = 161; i <= 172; i++) { bs.push(i); cs.push(i); }
  for (let i = 174; i <= 255; i++) { bs.push(i); cs.push(i); }
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
  }
  const map = new Map();
  for (let i = 0; i < bs.length; i++) map.set(bs[i], String.fromCodePoint(cs[i]));
  return map;
}

function buildUnicodeToByteMap() {
  const b2u = buildByteToUnicode();
  const map = new Map();
  for (const [byte, char] of b2u) map.set(char, byte);
  return map;
}

function decodeBpeToken(token, unicodeToByte) {
  const bytes = [];
  for (const ch of token) {
    const b = unicodeToByte.get(ch);
    if (b !== undefined) bytes.push(b);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}

async function loadTokenizer(baseUrl) {
  console.log(`${LOG} Loading tokenizer...`);
  const response = await fetch(`${baseUrl}tokenizer.json`);
  if (!response.ok) throw new Error(`Failed to load tokenizer: HTTP ${response.status}`);
  const tokenizer = await response.json();
  const bpeVocab = tokenizer.model?.vocab ?? {};
  const addedTokens = tokenizer.added_tokens ?? [];
  const unicodeToByte = buildUnicodeToByteMap();
  vocabulary = new Map();
  for (const [token, id] of Object.entries(bpeVocab)) {
    vocabulary.set(id, decodeBpeToken(token, unicodeToByte));
  }

  // Build special token set and extract IDs from tokenizer (not hardcoded)
  specialTokenIds = new Set();
  const contentToId = new Map();
  for (const tok of addedTokens) {
    vocabulary.set(tok.id, tok.content);
    if (tok.special) specialTokenIds.add(tok.id);
    contentToId.set(tok.content, tok.id);
  }

  TOKEN_EOT = contentToId.get("<|endoftext|>") ?? -1;
  TOKEN_SOT = contentToId.get("<|startoftranscript|>") ?? -1;
  TOKEN_EN = contentToId.get("<|en|>") ?? -1;
  TOKEN_TRANSCRIBE = contentToId.get("<|transcribe|>") ?? -1;
  TOKEN_NOTIMESTAMPS = contentToId.get("<|notimestamps|>") ?? -1;
  // Timestamps start right after <|notimestamps|>
  TOKEN_TIMESTAMP_BEGIN = TOKEN_NOTIMESTAMPS + 1;
  TOKEN_NO_SPEECH = contentToId.get("<|nospeech|>") ?? contentToId.get("<|nocaptions|>") ?? -1;

  // Mark all timestamp tokens as special
  for (let id = TOKEN_TIMESTAMP_BEGIN; id < TOKEN_TIMESTAMP_BEGIN + 1501; id++) {
    specialTokenIds.add(id);
  }

  // Build language → token map. Whisper language tokens are <|xx|> or <|xxx|>
  // with 2- or 3-char lowercase codes (en, es, haw, jw…). The 2-3-char regex
  // filters out longer special tokens (transcribe, notimestamps, nospeech…).
  LANG_TO_TOKEN.clear();
  for (const tok of addedTokens) {
    const m = tok.content.match(/^<\|([a-z]{2,3})\|>$/);
    if (m) LANG_TO_TOKEN.set(m[1], tok.id);
  }

  console.log(`${LOG} Tokenizer loaded: ${vocabulary.size} tokens, ${specialTokenIds.size} special`);
  console.log(`${LOG} Token IDs: EOT=${TOKEN_EOT} SOT=${TOKEN_SOT} EN=${TOKEN_EN} TRANSCRIBE=${TOKEN_TRANSCRIBE} NOTIMESTAMPS=${TOKEN_NOTIMESTAMPS} TS_BEGIN=${TOKEN_TIMESTAMP_BEGIN}`);
}

function decodeTokens(tokenIds) {
  const pieces = [];
  for (const id of tokenIds) {
    if (specialTokenIds.has(id)) continue;
    if (id >= TOKEN_TIMESTAMP_BEGIN) continue;
    const text = vocabulary.get(id);
    if (text !== undefined) pieces.push(text);
  }
  return pieces.join("").trim();
}

// ─── Model lifecycle ────────────────────────────────────────────────

async function downloadModel(url, label) {
  console.log(`${LOG} Downloading ${label} from ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText} for ${label}`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const chunks = [];
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
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  console.log(`${LOG} ${label} download complete (${(loaded / 1e6).toFixed(1)} MB)`);
  return combined.buffer;
}

// ─── KV Cache helpers ──────────────────────────────────────────────

function createEmptyKVCache() {
  const feeds = {};
  for (let i = 0; i < NUM_DECODER_LAYERS; i++) {
    feeds[`past_key_values.${i}.decoder.key`] = new ort.Tensor("float32", new Float32Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
    feeds[`past_key_values.${i}.decoder.value`] = new ort.Tensor("float32", new Float32Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
    feeds[`past_key_values.${i}.encoder.key`] = new ort.Tensor("float32", new Float32Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
    feeds[`past_key_values.${i}.encoder.value`] = new ort.Tensor("float32", new Float32Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
  }
  return feeds;
}

function extractKVCache(results) {
  const feeds = {};
  for (let i = 0; i < NUM_DECODER_LAYERS; i++) {
    for (const attnType of ["decoder", "encoder"]) {
      for (const kvType of ["key", "value"]) {
        const outputName = `present.${i}.${attnType}.${kvType}`;
        const inputName = `past_key_values.${i}.${attnType}.${kvType}`;
        const tensor = results[outputName];
        if (tensor) feeds[inputName] = tensor;
      }
    }
  }
  return feeds;
}

// ─── Init with warmup ──────────────────────────────────────────────

async function handleInit(modelUrl) {
  console.log(`${LOG} Initializing with model base: ${modelUrl}`);
  const baseUrl = modelUrl.endsWith("/") ? modelUrl : modelUrl + "/";

  const [encoderData, decoderData] = await Promise.all([
    downloadModel(`${baseUrl}encoder_model_q4.onnx`, "encoder"),
    downloadModel(`${baseUrl}decoder_model_merged_q4.onnx`, "decoder"),
    loadTokenizer(baseUrl),
  ]);

  const eps = ["webgpu", "wasm"];
  console.log(`${LOG} Creating sessions with EPs: ${eps.join(", ")}`);
  const sessionOpts = { executionProviders: eps, graphOptimizationLevel: "all", logSeverityLevel: 3 };

  // Sequential session creation (WebGPU EP requirement)
  const enc = await ort.InferenceSession.create(encoderData, sessionOpts);
  const dec = await ort.InferenceSession.create(decoderData, sessionOpts);

  encoderSession = enc;
  decoderSession = dec;

  console.log(`${LOG} Encoder inputs: [${enc.inputNames}], outputs: [${enc.outputNames}]`);
  console.log(`${LOG} Decoder inputs: [${dec.inputNames.slice(0, 5)}...], outputs: [${dec.outputNames.slice(0, 5)}...]`);

  // ── Warmup: run dummy inference to trigger WebGPU shader compilation ──
  // Without this, the first real transcription blocks for minutes while
  // shaders compile synchronously on the GPU.
  console.log(`${LOG} Warming up encoder (shader compilation)...`);
  const dummyMel = new Float32Array(N_MELS * MEL_FRAMES); // zeros
  const dummyInput = new ort.Tensor("float32", dummyMel, [1, N_MELS, MEL_FRAMES]);
  const warmEnc = await enc.run({ input_features: dummyInput });
  const warmHidden = warmEnc["last_hidden_state"];
  console.log(`${LOG} Encoder warm. Warming up decoder...`);

  const warmIds = BigInt64Array.from([TOKEN_SOT, TOKEN_EN, TOKEN_TRANSCRIBE, TOKEN_NOTIMESTAMPS].map(BigInt));
  const warmIdsTensor = new ort.Tensor("int64", warmIds, [1, warmIds.length]);
  const warmCache = createEmptyKVCache();
  await dec.run({
    input_ids: warmIdsTensor,
    encoder_hidden_states: warmHidden,
    use_cache_branch: new ort.Tensor("bool", [false], [1]),
    ...warmCache,
  });
  console.log(`${LOG} Decoder warm. Ready.`);

  self.postMessage({ type: "ready" });
}

// ─── Transcription ──────────────────────────────────────────────────

// Numerically stable softmax probability for one token at one logit-row offset.
function softmaxProb(logits, rowOffset, vocabSize, tokenId) {
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

async function handleTranscribe(audio, sampleRate, language = "en") {
  if (!encoderSession || !decoderSession) throw new Error("Model not initialized");
  if (transcribing) {
    console.warn(`${LOG} Already transcribing, dropping request`);
    return;
  }
  transcribing = true;

  try {
    console.log(`${LOG} Transcribing ${(audio.length / sampleRate).toFixed(1)}s of audio (lang=${language})`);

    const audio16k = resampleTo16k(audio, sampleRate);
    const melFeatures = logMelSpectrogram(audio16k);

    const inputFeatures = new ort.Tensor("float32", melFeatures, [1, N_MELS, MEL_FRAMES]);

    self.postMessage({ type: "log", text: "Running encoder..." });
    const encoderResult = await encoderSession.run({ input_features: inputFeatures });

    const encoderHidden = encoderResult["last_hidden_state"];
    if (!encoderHidden) {
      throw new Error(`Encoder did not produce last_hidden_state. Got: [${Object.keys(encoderResult)}]`);
    }
    console.log(`${LOG} Encoder done. Hidden shape: [${encoderHidden.dims}]`);

    const langToken = LANG_TO_TOKEN.get(language) ?? TOKEN_EN;
    if (langToken === TOKEN_EN && language !== "en") {
      console.warn(`${LOG} No language token for "${language}" in this checkpoint; falling back to English`);
    }
    const outputTokens = [TOKEN_SOT, langToken, TOKEN_TRANSCRIBE, TOKEN_NOTIMESTAMPS];

    console.log(`${LOG} Running decoder (autoregressive)...`);

    // KV cache disabled on this path — re-feed full token sequence each step
    // with empty caches and use_cache_branch=false. Decoder is therefore O(n²)
    // in the generated-token count (n × full-prefix work). For typical
    // <50-token transcripts the wall-clock cost is acceptable; for longer
    // utterances this is the dominant cost.
    //
    // Why disabled: the natural KV-cached path (mirroring sttWorker.ts —
    // first step full prefix + empty cache, subsequent steps last-token +
    // populated cache + use_cache_branch=true) reliably hits "divide by
    // zero" inside ORT-Web's WebGPU EP at step 2+ when the populated past_*
    // tensors are fed back. Re-spiked against onnxruntime-web 1.24.3 on
    // 2026-04-29 — issue still reproduces. The WASM EP and other backends
    // are unaffected; sttWorker.ts (WASM fallback) DOES use KV caching.
    //
    // To re-test, restore the cached-loop pattern and look for the error
    // surfacing as "[OwnVoice:Mic] STT error: divide by zero" in console.
    // Likely root cause is GPU-tensor-reuse semantics — passing output
    // tensors as inputs to the next run without copying invalidates the
    // GPU buffer binding. A workaround worth exploring: deep-copy each
    // present.* tensor into a fresh ort.Tensor before using it as
    // past_key_values.* in the next step.
    const emptyCache = createEmptyKVCache();

    for (let step = 0; step < MAX_TOKENS; step++) {
      const inputIds = BigInt64Array.from(outputTokens.map((id) => BigInt(id)));
      const inputIdsTensor = new ort.Tensor("int64", inputIds, [1, inputIds.length]);
      const useCacheBranch = new ort.Tensor("bool", [false], [1]);

      const feeds = {
        input_ids: inputIdsTensor,
        encoder_hidden_states: encoderHidden,
        use_cache_branch: useCacheBranch,
        ...emptyCache,
      };

      const results = await decoderSession.run(feeds);
      const logits = results["logits"];
      if (!logits) {
        throw new Error(`Decoder did not produce logits. Got: [${Object.keys(results).filter((k) => !k.startsWith("present."))}]`);
      }

      const logitsData = logits.data;
      const vocabSize = logits.dims[2];
      const seqLen = logits.dims[1];
      const lastPositionOffset = (seqLen - 1) * vocabSize;

      // No-speech detection on first step only. Position 0 logits = next-token
      // distribution after seeing only SOT (causal mask). If softmax(no_speech)
      // exceeds threshold, the chunk is silence — return empty rather than let
      // the decoder hallucinate from training distribution (e.g. "Thanks for
      // watching!").
      if (step === 0 && TOKEN_NO_SPEECH !== -1) {
        const noSpeechProb = softmaxProb(logitsData, 0, vocabSize, TOKEN_NO_SPEECH);
        if (noSpeechProb > NO_SPEECH_THRESHOLD) {
          self.postMessage({ type: "log", text: `No speech detected (prob=${noSpeechProb.toFixed(3)}); empty transcript` });
          self.postMessage({ type: "transcript", text: "" });
          return;
        }
      }

      let maxVal = -Infinity;
      let maxIdx = 0;
      for (let v = 0; v < vocabSize; v++) {
        const val = logitsData[lastPositionOffset + v];
        if (val > maxVal) { maxVal = val; maxIdx = v; }
      }

      if (maxIdx === TOKEN_EOT) {
        self.postMessage({ type: "log", text: `EOT at step ${step}` });
        break;
      }

      outputTokens.push(maxIdx);

      // Stream partial results every 3 tokens
      if (step > 0 && step % 3 === 0) {
        const partial = decodeTokens(outputTokens);
        if (partial) self.postMessage({ type: "partial", text: partial });
      }
    }

    const text = decodeTokens(outputTokens);
    console.log(`${LOG} Transcript (${outputTokens.length} tokens): "${text}"`);
    self.postMessage({ type: "transcript", text });
  } finally {
    transcribing = false;
  }
}

// ─── Message handler ────────────────────────────────────────────────

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "init":
        await handleInit(msg.modelUrl);
        break;
      case "transcribe":
        await handleTranscribe(msg.audio, msg.sampleRate, msg.language);
        break;
      default:
        console.warn(`${LOG} Unknown message type: ${msg.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Error:`, message);
    self.postMessage({ type: "error", message });
  }
};
