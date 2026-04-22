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

// No custom wasmPaths — let ORT resolve WASM files relative to its own module
// location. Vite serves onnxruntime-web from node_modules (excluded from
// optimizeDeps), so ORT's internal dynamic imports resolve correctly.
// Setting wasmPaths to /ort/ breaks in Vite workers because Vite transforms
// dynamic import() calls with ?import suffix, which the public/ files can't handle.
// Multi-threaded WASM is only available when `crossOriginIsolated` is true
// (page + SW serve COOP+COEP). Silently fall back to single-thread otherwise.
ort.env.logLevel = "error";
// See tts-gpu-worker.js for why this is capped at 4.
if (ort.env?.wasm) {
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

/** Mel spectrogram parameters for Whisper small */
const N_FFT = 400;
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

// ─── Audio preprocessing ────────────────────────────────────────────

/**
 * Resample audio to 16 kHz using linear interpolation.
 */
function resampleTo16k(audio: Float32Array, fromRate: number): Float32Array {
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
 * Compute power spectrogram using STFT with Hann window.
 * Uses a 400-point DFT (matching Whisper's n_fft=400 exactly).
 * Returns a 2D array: [freqBins][timeFrames].
 */
function stft(audio: Float32Array): Float64Array[] {
  const win = hannWindow(N_FFT);
  const freqBins = N_FFT / 2 + 1; // 201
  const numFrames = MEL_FRAMES; // 3000

  const spectrogram: Float64Array[] = new Array(freqBins);
  for (let f = 0; f < freqBins; f++) {
    spectrogram[f] = new Float64Array(numFrames);
  }

  // Precompute twiddle factors for each frequency bin
  const cosTable = new Float64Array(freqBins * N_FFT);
  const sinTable = new Float64Array(freqBins * N_FFT);
  for (let f = 0; f < freqBins; f++) {
    const freqRad = (2 * Math.PI * f) / N_FFT;
    for (let n = 0; n < N_FFT; n++) {
      cosTable[f * N_FFT + n] = Math.cos(freqRad * n);
      sinTable[f * N_FFT + n] = Math.sin(freqRad * n);
    }
  }

  for (let t = 0; t < numFrames; t++) {
    const offset = t * HOP_LENGTH;
    for (let f = 0; f < freqBins; f++) {
      let real = 0;
      let imag = 0;
      const tIdx = f * N_FFT;
      for (let n = 0; n < N_FFT; n++) {
        const sample = offset + n < audio.length ? audio[offset + n] : 0;
        const windowed = sample * win[n];
        real += windowed * cosTable[tIdx + n];
        imag += windowed * sinTable[tIdx + n];
      }
      spectrogram[f][t] = real * real + imag * imag;
    }
  }

  return spectrogram;
}

/**
 * Create mel filterbank matrix.
 * Returns [N_MELS][freqBins] weights.
 */
function melFilterbank(): Float64Array[] {
  const freqBins = N_FFT / 2 + 1;

  const melHigh = 2595 * Math.log10(1 + TARGET_SAMPLE_RATE / 2 / 700);
  const melLow = 0;

  // N_MELS + 2 evenly spaced points in mel space
  const melPoints = new Float64Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    melPoints[i] = melLow + ((melHigh - melLow) * i) / (N_MELS + 1);
  }

  // Convert mel points back to Hz, then to FFT bin indices
  const binIndices = new Float64Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    const hz = 700 * (Math.pow(10, melPoints[i] / 2595) - 1);
    binIndices[i] = (hz * N_FFT) / TARGET_SAMPLE_RATE;
  }

  const filters: Float64Array[] = new Array(N_MELS);
  for (let m = 0; m < N_MELS; m++) {
    filters[m] = new Float64Array(freqBins);
    const left = binIndices[m];
    const center = binIndices[m + 1];
    const right = binIndices[m + 2];

    for (let f = 0; f < freqBins; f++) {
      if (f >= left && f <= center) {
        filters[m][f] = (f - left) / (center - left);
      } else if (f > center && f <= right) {
        filters[m][f] = (right - f) / (right - center);
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

  const freqBins = N_FFT / 2 + 1;
  const output = new Float32Array(N_MELS * MEL_FRAMES);

  for (let m = 0; m < N_MELS; m++) {
    for (let t = 0; t < MEL_FRAMES; t++) {
      let sum = 0;
      for (let f = 0; f < freqBins; f++) {
        sum += filters[m][f] * powerSpec[f][t];
      }
      // Log-mel: log(max(sum, 1e-10))
      output[m * MEL_FRAMES + t] = Math.log(Math.max(sum, 1e-10));
    }
  }

  // Normalize: scale to match Whisper's expected range
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

  // Mark all timestamp tokens as special
  for (let id = TOKEN_TIMESTAMP_BEGIN; id < TOKEN_TIMESTAMP_BEGIN + 1501; id++) {
    specialTokenIds.add(id);
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
 * Transcribe audio using Whisper small (encoder-decoder pipeline).
 */
async function handleTranscribe(
  audio: Float32Array,
  sampleRate: number,
): Promise<void> {
  if (!encoderSession || !decoderSession) {
    throw new Error("Model not initialized");
  }

  console.log(
    `${LOG_PREFIX} Transcribing ${(audio.length / sampleRate).toFixed(1)}s of audio`,
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
  // Start tokens: <|startoftranscript|> <|en|> <|transcribe|> <|notimestamps|>
  const outputTokens: number[] = [
    TOKEN_SOT,
    TOKEN_EN,
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

// ─── Message handler ────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "init":
        await handleInit(msg.modelUrl);
        break;

      case "transcribe":
        await handleTranscribe(msg.audio, msg.sampleRate);
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
