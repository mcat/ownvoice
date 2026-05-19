// Dev-only console mirror — must come before the build marker so even
// early-boot worker logs land in `logs/dev.log`.
import "../dev/logSink";
// Build marker for CF edge cache invalidation. Bump when _headers rules
// change so the edge re-fetches the bundle to pick up new response headers.
// The string literal MUST survive minification — esbuild evaluates `void <const>`
// to `void 0` and strips the string, so we assign to a global property which
// forces a real runtime side effect that retains the literal in the output bytes.
// Verified by `grep '2026-05-12' dist/assets/*Worker-*.js` after build.
(self as unknown as { __OV_BUILD__: string }).__OV_BUILD__ = "2026-05-12-require-corp";
/**
 * TTS Web Worker — Chatterbox Multilingual (23 languages, Resemble AI, MIT).
 *
 * 4-component ONNX pipeline:
 *   1. Speech Encoder:      audio_values → cond_emb, prompt_token, speaker_embeddings, speaker_features
 *   2. Embed Tokens:        input_ids + position_ids + exaggeration → inputs_embeds
 *   3. Language Model:      inputs_embeds + attention_mask + KV cache → logits (autoregressive, Llama 30-layer)
 *   4. Conditional Decoder:  speech_tokens + speaker_embeddings + speaker_features → wav (24kHz)
 *
 * Load strategy:
 *   - Speech encoder loads on-demand for embedding extraction, then unloads (~178 MB freed)
 *   - Embed tokens, language model, conditional decoder stay loaded at runtime (~383 MB)
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }         — Load runtime models (embed_tokens, language_model, conditional_decoder, tokenizer)
 *   { type: "embed", audio: Float32Array, sampleRate: number }  — Load speech_encoder, extract embedding, unload
 *   { type: "synthesize", text: string, speakerData: SpeakerData, languageId: string, exaggeration?: number }  — Generate speech
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "progress", loaded: number, total: number }
 *   { type: "embedding", data: SpeakerData }     — All speech encoder outputs needed for synthesis
 *   { type: "audio", data: Float32Array, sampleRate: number }
 *   { type: "error", message: string }
 */

// Use the WebGPU variant so the WebGPU execution provider is available.
// This enables Metal acceleration on iPad via WebGPU→Metal bridge.
// WASM-only fallback — the primary WebGPU path runs in ttsEngine.ts (main thread).
// This worker is used when WebGPU is unavailable.
import * as ort from "onnxruntime-web";
import { CHATTERBOX_FILES, CHATTERBOX_TOKENS } from "./types";
import { configureOrtWasmEnv } from "./workerOrtEnv";

const _postMessage = self.postMessage.bind(self);

configureOrtWasmEnv();

const LOG = "[OwnVoice:TTS]";
const { START_SPEECH, STOP_SPEECH, NUM_LAYERS, NUM_HEADS, HEAD_DIM, SAMPLE_RATE } = CHATTERBOX_TOKENS;
const SILENCE_TOKEN = 4299;
// Tighter cap than CHATTERBOX_TOKENS.MAX_NEW_TOKENS (1024). WASM is slower per
// token, but silent truncation mid-sentence is a worse UX than a longer pre-gen
// latency on the rare phrase that runs long. Pre-gen happens off the user's
// critical path.
const MAX_NEW_TOKENS = 768;

// Sampling parameters — repetition_penalty matches the model's
// generation_config.json. Temperature lowered from upstream's 0.8 to 0.6 to
// tighten the output distribution: 0.8 was producing prosody that read as
// theatrical/sarcastic on conversational phrases. 0.6 is still well within
// the sampling regime (greedy is unsafe — see USE_GREEDY note in the GPU worker).
// Processing order: repetition penalty → temperature → top-k → top-p → sample.
const TEMPERATURE = 0.6;
const TOP_K = 1000;
const TOP_P = 0.95;
const REPETITION_PENALTY = 1.2;
const MIN_NEW_TOKENS = 10; // Don't allow STOP before this many speech tokens

/** Outputs from the speech encoder, stored and reused for all synthesis calls.
 *  Float vectors round-trip through Zustand persistence via the
 *  f32Replacer/f32Reviver pair in src/stores/persistTypedArrays.ts —
 *  newly-extracted speakers store as Float32Array; legacy installs may
 *  still hold number[] on read, hence the union. promptToken stays
 *  number[]: it's int64 token IDs coerced through Number(), treated as
 *  a token list rather than a numeric vector. */
interface SpeakerData {
  condEmb: Float32Array | number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: Float32Array | number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: Float32Array | number[];
  speakerFeaturesShape: number[];
}

/** Narrow a Float32Array | number[] field to Float32Array without allocating
 *  when it's already the right shape. New speakers from handleEmbed hit the
 *  identity branch; legacy hydrated speakers pay the one-time copy. */
function asF32(x: Float32Array | number[]): Float32Array {
  return x instanceof Float32Array ? x : new Float32Array(x);
}

// Runtime sessions (always loaded)
let embedTokensSession: ort.InferenceSession | null = null;
let languageModelSession: ort.InferenceSession | null = null;
let conditionalDecoderSession: ort.InferenceSession | null = null;

// Tokenizer vocabulary (multilingual BPE)
let tokenizer: { encode: (text: string) => number[] } | null = null;
let prepareLanguageFn: ((text: string, lang: string) => string) | null = null;

let baseUrl = "";

/** Set by `?bench=true` URL flag (propagated through init message). When
 *  true, handleEmbed / handleSynthesize emit `[OwnVoice:Bench]` lines
 *  with model load + per-LM-step + decode timings for WASM-vs-WebGPU
 *  comparison on real devices. See issue #163. */
let bench = false;

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i];
}

/** Worker always uses WASM — WebGPU runs in the main thread via ttsEngine.ts */
function getEP(): string {
  return "wasm";
}

/** Create an ONNX session from a URL, handling external data files.
 *  Lists both WebGPU and WASM as execution providers — ONNX Runtime
 *  will try WebGPU first and fall back to WASM if operators aren't supported.
 *
 *  Both EPs receive URLs for model + external data; ORT streams the bytes
 *  through our SW → OPFS proxy into its WASM heap. Passing the external
 *  data as an ArrayBuffer (the previous WASM path) cost a ~291 MB JS-side
 *  transient on top of ORT's heap copy during speech_encoder load — see #288.
 *
 *  @param hasExternalData — true if a companion `_data` file exists for this model.
 *    Avoids runtime HEAD probes that cause Cache API errors in the service worker.
 */
async function createSession(
  onnxUrl: string,
  wasmOnly = false,
  hasExternalData = false,
): Promise<ort.InferenceSession> {
  console.log(`${LOG} Loading ${onnxUrl}...`);

  const eps: ort.InferenceSession.ExecutionProviderConfig[] = [];
  if (!wasmOnly && getEP() === "webgpu") eps.push("webgpu");
  eps.push("wasm");

  const opts: ort.InferenceSession.SessionOptions = {
    executionProviders: eps,
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,
  };

  if (hasExternalData) {
    const dataUrl = onnxUrl + "_data";
    const dataFileName = onnxUrl.split("/").pop() + "_data";
    opts.externalData = [{ path: dataFileName!, data: dataUrl }];
  }

  // Mirror the GPU worker's timing instrumentation so any boot-time
  // regression in the cloning path (speech_encoder load) shows up in
  // logs/dev.log under [OwnVoice:TTS] alongside the GPU side.
  const tStart = performance.now();
  const sess = await ort.InferenceSession.create(onnxUrl, opts);
  const elapsedSec = ((performance.now() - tStart) / 1000).toFixed(2);
  console.log(
    `${LOG} createSession ${onnxUrl.split("/").pop()} ` +
    `ort-create=${elapsedSec}s ` +
    `ep=${eps.join(",")}`,
  );
  return sess;
}

/**
 * Load the multilingual BPE tokenizer from tokenizer.json.
 * Replaces the old GPT-2 BPE; the multilingual tokenizer handles [xx] language
 * tags and [SPACE] normalization natively.
 */
async function loadTokenizer(tokenizerUrl: string, loadCangjie: boolean): Promise<void> {
  console.log(`${LOG} Loading tokenizer...`);
  const response = await fetch(tokenizerUrl);
  if (!response.ok) throw new Error(`Tokenizer fetch failed: ${response.status}`);
  const json = await response.json();

  const mod = await import("./multilingualTokenizer");
  tokenizer = mod.buildMultilingualTokenizer(json);
  prepareLanguageFn = mod.prepareLanguage;

  if (!loadCangjie) {
    // No zh locale in this session — skip the Cangjie5 lookup table.
    // Saves ~1.9 MB JSON download + the two Maps (~several MB) it would
    // build in the worker heap. cangjieNormalize already warns + passes
    // through unchanged when the data is absent, so a later language
    // switch to zh degrades to "untokenized Chinese" rather than crash.
    mod.setCangjieData(null);
    console.log(`${LOG} Cangjie5 skipped (no zh locale in session).`);
  } else {
    // Load Cangjie5 lookup for Chinese preprocessing alongside the tokenizer.
    // Failure is non-fatal — Chinese inputs degrade silently, other languages
    // keep working. Cangjie5_TC.json sits next to tokenizer.json in the
    // multilingual model dir.
    const cangjieUrl = tokenizerUrl.replace(/tokenizer\.json$/, "Cangjie5_TC.json");
    try {
      const cjResp = await fetch(cangjieUrl);
      if (cjResp.ok) {
        const entries: string[] = await cjResp.json();
        mod.setCangjieData(entries);
        console.log(`${LOG} Cangjie5 table loaded (${entries.length} entries)`);
      } else {
        throw new Error(`HTTP ${cjResp.status}`);
      }
    } catch (err) {
      console.warn(`${LOG} Failed to load Cangjie5 (${err}); Chinese phrases will degrade`);
      mod.setCangjieData(null);
    }
  }

  console.log(`${LOG} Multilingual BPE tokenizer loaded (${Object.keys(json.model.vocab).length} vocab, ${json.model.merges.length} merges)`);
}

/**
 * Sample a token using the full Chatterbox Turbo logits processing pipeline.
 * Order matches HuggingFace LogitsProcessorList in the reference implementation:
 *   1. Repetition penalty (on raw logits, before temperature)
 *   2. Temperature scaling
 *   3. Top-K filtering
 *   4. Top-P (nucleus) filtering
 *   5. Categorical sample
 *
 * @param logits - Raw logits (modified in-place). Assumes vocab mask and
 *   min-token guard have already been applied.
 * @param generatedTokens - Previously generated tokens for rep penalty.
 */
function sampleToken(logits: Float32Array, generatedTokens: number[]): number {
  // 1. Repetition penalty — discourage tokens that already appeared.
  //    HF convention: positive logits are divided, negative are multiplied.
  {
    const seen = new Set(generatedTokens);
    for (const token of seen) {
      if (token < logits.length) {
        if (logits[token] > 0) logits[token] /= REPETITION_PENALTY;
        else logits[token] *= REPETITION_PENALTY;
      }
    }
  }

  // 2. Temperature scaling
  for (let i = 0; i < logits.length; i++) logits[i] /= TEMPERATURE;

  // 3. Top-K — keep only the K highest logits, mask the rest
  if (TOP_K > 0 && TOP_K < logits.length) {
    const finite: number[] = [];
    for (let i = 0; i < logits.length; i++) {
      if (logits[i] !== -Infinity) finite.push(logits[i]);
    }
    if (finite.length > TOP_K) {
      finite.sort((a, b) => b - a); // descending
      const threshold = finite[TOP_K - 1];
      for (let i = 0; i < logits.length; i++) {
        if (logits[i] < threshold) logits[i] = -Infinity;
      }
    }
  }

  // 4. Softmax → probabilities
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }
  const probs = new Float32Array(logits.length);
  let sumExp = 0;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] === -Infinity) { probs[i] = 0; continue; }
    probs[i] = Math.exp(logits[i] - maxLogit);
    sumExp += probs[i];
  }
  if (sumExp > 0) {
    for (let i = 0; i < probs.length; i++) probs[i] /= sumExp;
  }

  // 5. Top-P (nucleus) — sort by probability, keep smallest set summing to >= TOP_P
  const indexed: [number, number][] = [];
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > 0) indexed.push([i, probs[i]]);
  }
  indexed.sort((a, b) => b[1] - a[1]);

  let cumSum = 0;
  let cutoff = indexed.length;
  for (let i = 0; i < indexed.length; i++) {
    cumSum += indexed[i][1];
    if (cumSum >= TOP_P) { cutoff = i + 1; break; }
  }

  // 6. Sample from the nucleus
  const nucleus = indexed.slice(0, cutoff);
  let nucleusSum = 0;
  for (const [, p] of nucleus) nucleusSum += p;

  const rand = Math.random() * nucleusSum;
  let acc = 0;
  for (const [idx, p] of nucleus) {
    acc += p;
    if (acc >= rand) return idx;
  }
  return nucleus[nucleus.length - 1][0];
}

/**
 * Initialize tokenizer + baseUrl, then signal ready.
 *
 * Synth-side models (embed_tokens, language_model, conditional_decoder) are
 * lazy-loaded on first synthesize call — see ensureSynthModelsLoaded.
 * Speech encoder is loaded on-demand during embed().
 *
 * Why lazy: the WASM TTS worker's only hot-path job in this codebase is
 * enrollment (handleEmbed), which doesn't touch the synth models. Pre-gen
 * runs through the GPU engine, not this worker. Live synth on WASM is a
 * fallback path used only when WebGPU is unavailable. Loading ~900 MB of
 * synth models eagerly during init was blocking `mgr.isReady("tts")` — and
 * therefore the enrollment UI — for ~150s+ on cold starts.
 */
async function handleInit(
  modelUrl: string,
  benchFlag: boolean,
  loadCangjie: boolean,
): Promise<void> {
  baseUrl = modelUrl.endsWith("/") ? modelUrl : modelUrl + "/";
  bench = benchFlag;
  const ep = getEP();
  console.log(`${LOG} Initializing with EP: ${ep}${bench ? " (bench mode)" : ""}`);

  // Tokenizer is small and needed for any operation; load eagerly.
  await loadTokenizer(baseUrl + CHATTERBOX_FILES.tokenizer, loadCangjie);

  console.log(`${LOG} Init complete (synth models lazy-loaded on first synthesize). Ready.`);
  _postMessage({ type: "ready" });
}

/**
 * Lazy-load the synth-side runtime models. Called from handleSynthesize.
 * Idempotent — subsequent calls return immediately if all sessions exist.
 */
async function ensureSynthModelsLoaded(): Promise<void> {
  if (embedTokensSession && languageModelSession && conditionalDecoderSession) return;

  console.log(`${LOG} Lazy-loading synth models (first synthesize call)...`);
  const t0 = performance.now();

  if (!embedTokensSession) {
    console.log(`${LOG} Loading embed_tokens (WASM)...`);
    embedTokensSession = await createSession(baseUrl + CHATTERBOX_FILES.embedTokens.onnx, true, true);
  }
  if (!languageModelSession) {
    console.log(`${LOG} Loading language_model (WASM)...`);
    languageModelSession = await createSession(baseUrl + CHATTERBOX_FILES.languageModel.onnx, true, true);
  }
  if (!conditionalDecoderSession) {
    console.log(`${LOG} Loading conditional_decoder (WASM)...`);
    conditionalDecoderSession = await createSession(baseUrl + CHATTERBOX_FILES.conditionalDecoder.onnx, true, true);
  }

  console.log(`${LOG} Synth models loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
}

/** Pre-load the speech encoder and confirm it can run inference.
 *  Run on a short silent buffer so the OPFS cache is hot when the user
 *  actually records. Emits {type:"warm"} on success and {type:"error"}
 *  on failure (without a requestId, since this is unsolicited). */
async function handleWarmup(): Promise<void> {
  console.log(`${LOG} Warmup: loading speech encoder...`);
  try {
    const session = await createSession(
      baseUrl + CHATTERBOX_FILES.speechEncoder.onnx,
      true,
      true,
    );
    // Tiny silent buffer — just enough to confirm the graph runs.
    const silent = new Float32Array(SAMPLE_RATE / 2); // 0.5 s
    const tensor = new ort.Tensor("float32", silent, [1, silent.length]);
    await session.run({ audio_values: tensor });
    session.release();
    _postMessage({ type: "warm" });
    console.log(`${LOG} Warmup complete.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Warmup failed: ${msg}`);
    _postMessage({ type: "error", message: msg, phase: "warmup" });
  }
}

/**
 * Extract speaker data from a reference audio clip.
 * Loads speech_encoder on-demand, runs inference, then disposes the session.
 *
 * @param requestId - Echoed back on the embedding/error response so the
 *   main thread can correlate concurrent embed requests with their handlers
 *   (Bug 6: handler race on concurrent embeds).
 */
async function handleEmbed(
  audio: Float32Array,
  _sampleRate: number,
  requestId: number,
): Promise<void> {
  try {
    // Stage labels for the memory-crash tombstone (gated on the main
    // thread by ?memdiag=true; the worker always emits, the receiver
    // decides whether to record). Enrollment is the second-largest
    // memory peak in the app — the speech encoder loads ~291 MB on
    // top of any already-resident GPU TTS sessions (~913 MB). Labeling
    // each sub-step lets us tell encoder-load OOM from infer-OOM from
    // post-infer JS-array-allocation OOM.
    _postMessage({ type: "stage", label: "embed:start" });

    let audioMax = 0;
    let audioRms = 0;
    for (let i = 0; i < audio.length; i++) {
      const abs = Math.abs(audio[i]);
      if (abs > audioMax) audioMax = abs;
      audioRms += audio[i] * audio[i];
    }
    audioRms = Math.sqrt(audioRms / audio.length);
    console.log(`${LOG} Extracting speaker embedding from ${(audio.length / SAMPLE_RATE).toFixed(1)}s audio (max=${audioMax.toFixed(4)}, rms=${audioRms.toFixed(4)})`);

    // Speech encoder load can take seconds (OPFS-cached) to minutes
    // (first-time network fetch). A single indeterminate-stage event
    // tells the UI to switch to a model-loading indicator; ORT streams
    // the ~291 MB external data straight into its WASM heap from the
    // URL, so no per-byte progress is available worker-side (see #288).
    _postMessage({ type: "embed-progress", stage: "loading-model" });
    _postMessage({ type: "stage", label: "embed:encoder-load" });
    console.log(`${LOG} Loading speech_encoder (on-demand, WASM)...`);
    const tLoad0 = performance.now();
    const speechEncoderSession = await createSession(
      baseUrl + CHATTERBOX_FILES.speechEncoder.onnx,
      true,
      true,
    );
    const tLoadMs = performance.now() - tLoad0;

    // Run speech encoder
    // Input: audio_values (float32, [1, audio_length])
    _postMessage({ type: "stage", label: "embed:infer" });
    const audioTensor = new ort.Tensor("float32", audio, [1, audio.length]);
    const tInfer0 = performance.now();
    const results = await speechEncoderSession.run({ audio_values: audioTensor });
    const tInferMs = performance.now() - tInfer0;
    if (bench) {
      console.log(
        `[OwnVoice:Bench] embed: ep=${getEP()} load_ms=${tLoadMs.toFixed(0)} infer_ms=${tInferMs.toFixed(0)} audio_s=${(audio.length / SAMPLE_RATE).toFixed(2)}`,
      );
    }

    // Extract all outputs needed for synthesis
    // Model output names: audio_features, audio_tokens, speaker_embeddings, speaker_features
    const condEmb = results["audio_features"];
    const promptToken = results["audio_tokens"];
    const speakerEmbeddings = results["speaker_embeddings"];
    const speakerFeatures = results["speaker_features"];

    if (!condEmb || !promptToken || !speakerEmbeddings || !speakerFeatures) {
      const available = Object.keys(results).join(", ");
      throw new Error(`Missing speech encoder outputs. Available: ${available}`);
    }

    // Debug: log speech encoder output stats
    const ptData = promptToken.data;
    const ptType = ptData.constructor.name;
    let ptNonZero = 0;
    const ptSample: string[] = [];
    for (let i = 0; i < Math.min(ptData.length, 10); i++) {
      ptSample.push(String(ptData[i]));
      if (ptData[i] !== BigInt(0) && ptData[i] !== 0) ptNonZero++;
    }
    for (let i = 10; i < ptData.length; i++) {
      if (ptData[i] !== BigInt(0) && ptData[i] !== 0) ptNonZero++;
    }
    console.log(`${LOG} Speech encoder outputs:`);
    console.log(`${LOG}   condEmb: shape=${condEmb.dims}, dtype=${condEmb.type}`);
    console.log(`${LOG}   promptToken: shape=${promptToken.dims}, dtype=${promptToken.type}, dataType=${ptType}, nonZero=${ptNonZero}/${ptData.length}, first10=[${ptSample.join(",")}]`);
    console.log(`${LOG}   speakerEmb: shape=${speakerEmbeddings.dims}`);
    console.log(`${LOG}   speakerFeat: shape=${speakerFeatures.dims}`);

    // Float32Array fields survive JSON.stringify round-trips via the
    // settingsStore replacer/reviver in src/stores/persistTypedArrays.ts —
    // tagged on write, restored on read, so we keep the encoder's native
    // typed-array output and skip the ~70K-element Array.from copy that
    // doubled heap cost via boxed doubles. See SpeakerData (above) for the
    // per-field rationale.
    _postMessage({ type: "stage", label: "embed:array-from" });
    const speakerData: SpeakerData = {
      condEmb: new Float32Array(condEmb.data as Float32Array),
      condEmbShape: condEmb.dims as number[],
      promptToken: Array.from(promptToken.data as BigInt64Array, Number),
      promptTokenShape: promptToken.dims as number[],
      speakerEmbeddings: new Float32Array(speakerEmbeddings.data as Float32Array),
      speakerEmbeddingsShape: speakerEmbeddings.dims as number[],
      speakerFeatures: new Float32Array(speakerFeatures.data as Float32Array),
      speakerFeaturesShape: speakerFeatures.dims as number[],
    };

    // Unload speech encoder to free ~178 MB
    _postMessage({ type: "stage", label: "embed:encoder-release" });
    speechEncoderSession.release();
    console.log(`${LOG} Speech encoder unloaded. Embedding extracted.`);

    _postMessage({ type: "stage", label: "embed:done" });
    _postMessage({ type: "embedding", data: speakerData, requestId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    _postMessage({ type: "error", message: msg, requestId });
  }
}

/**
 * Synthesize speech from text using stored speaker data.
 *
 * Pipeline:
 *   1. Tokenize text → input_ids
 *   2. embed_tokens(input_ids) → text embeddings
 *   3. Concatenate [cond_emb, text_embeds] + autoregressive LM generation → speech tokens
 *   4. conditional_decoder(speech_tokens, speaker_embeddings, speaker_features) → wav
 */
async function handleSynthesize(
  text: string,
  speakerData: SpeakerData,
  languageId: string,
  exaggeration: number = 0.5,
): Promise<void> {
  if (!tokenizer || !prepareLanguageFn) throw new Error("Tokenizer not loaded");

  // Lazy-load synth models on first call. Init only loaded the tokenizer
  // (small) so the worker could signal ready quickly for enrollment.
  await ensureSynthModelsLoaded();
  if (!embedTokensSession || !languageModelSession || !conditionalDecoderSession) {
    throw new Error("Runtime models failed to load");
  }

  const useGPU = getEP() === "webgpu";
  // Signal EP info to main thread via progress message (passes through ORT proxy)
  _postMessage({ type: "progress", loaded: useGPU ? 1 : 0, total: -1 });
  console.log(`${LOG} Synthesizing: "${text.slice(0, 50)}..." [lang=${languageId}, exag=${exaggeration}, EP=${useGPU ? "webgpu" : "wasm"}]`);

  // Helper: create an integer tensor in the right dtype for the active EP.
  // WebGPU models use int32 inputs; WASM models use int64.
  function intTensor(data: number[], shape: number[]): ort.Tensor {
    if (useGPU) {
      return new ort.Tensor("int32", Int32Array.from(data), shape);
    }
    return new ort.Tensor("int64", BigInt64Array.from(data.map(BigInt)), shape);
  }

  // WebGPU model variants use "_int32" suffixed input names
  const maskName = useGPU ? "attention_mask_int32" : "attention_mask";
  const idsName = useGPU ? "input_ids_int32" : "input_ids";
  const speechTokName = useGPU ? "speech_tokens_int32" : "speech_tokens";

  // Step 1: Tokenize text via multilingual BPE.
  // prepareLanguage prepends "[xx]" language tag (e.g. "[en]Hello").
  const preparedText = prepareLanguageFn(text, languageId);
  const inputIds = tokenizer.encode(preparedText);
  console.log(`${LOG} Prepared text: "${preparedText.slice(0, 60)}" → first 8 ids: ${inputIds.slice(0, 8).join(",")}`);
  const inputIdsTensor = intTensor(inputIds, [1, inputIds.length]);

  // Step 2: Get text + start-of-speech embeddings via embed_tokens.
  // Multilingual embed_tokens requires position_ids and exaggeration.
  // Per upstream HF reference inference:
  //   position_ids = np.where(input_ids >= START_SPEECH_TOKEN, 0, arange(N) - 1)
  // i.e. transition wrapper tokens (EXAGGERATION 6563 at the start,
  // START_SPEECH 6561 ×2 at the end) get position 0; text-side tokens use
  // arange-1 indexing. The model is trained with this dual-positioning so
  // wrappers act as positionless markers and text carries sequence position.
  const positionIds = inputIds.map((tokenId, i) =>
    tokenId >= START_SPEECH ? 0 : i - 1,
  );
  const positionIdsTensor = intTensor(positionIds, [1, inputIds.length]);
  const exaggerationTensor = new ort.Tensor("float32", new Float32Array([exaggeration]), [1]);

  const embedResult = await embedTokensSession.run({
    [idsName]: inputIdsTensor,
    position_ids: positionIdsTensor,
    exaggeration: exaggerationTensor,
  });
  const textEmbeds = embedResult["inputs_embeds"];
  if (!textEmbeds) {
    throw new Error(`embed_tokens failed. Available: ${Object.keys(embedResult).join(", ")}`);
  }

  // Step 3: Autoregressive speech token generation via language_model.
  // asF32 avoids a redundant copy on the new-enrollment path; the
  // condEmbF32 reference is read-only here (set() copies *from* it into
  // combinedEmbeds below), so reusing the original buffer is safe.
  const condEmbF32 = asF32(speakerData.condEmb);

  // Build initial input: [cond_emb, text_embeds] concatenated along sequence dimension
  const condLen = speakerData.condEmbShape[1] ?? 0;
  const textLen = textEmbeds.dims[1] ?? 0;
  const embedDim = textEmbeds.dims[2] ?? 0;
  const totalLen = condLen + textLen;

  const combinedEmbeds = new Float32Array(totalLen * embedDim);
  combinedEmbeds.set(condEmbF32, 0);
  combinedEmbeds.set(new Float32Array(textEmbeds.data as Float32Array), condLen * embedDim);

  const combinedTensor = new ort.Tensor("float32", combinedEmbeds, [1, totalLen, embedDim]);

  // Attention mask: all 1s
  const attentionMask = intTensor(Array(totalLen).fill(1), [1, totalLen]);

  // First forward pass — provide empty KV cache tensors.
  // Multilingual LM does not take position_ids (positions are absorbed into embed_tokens).
  let lmInputs: Record<string, ort.Tensor> = {
    inputs_embeds: combinedTensor,
    [maskName]: attentionMask,
  };

  // Seed empty KV cache for all 30 layers × key/value. The q4 LM uses
  // fp32 KV cache (q4f16 used fp16; the f16 suffix marks activation
  // precision). When swapping LM variants this dtype must match.
  for (let i = 0; i < NUM_LAYERS; i++) {
    lmInputs[`past_key_values.${i}.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
    lmInputs[`past_key_values.${i}.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_HEADS, 0, HEAD_DIM],
    );
  }

  const generatedTokens: number[] = [START_SPEECH];
  const tSynth0 = bench ? performance.now() : 0;
  const lmStepMs: number[] = bench ? [] : [];

  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const tStep0 = bench ? performance.now() : 0;
    const lmResult = await languageModelSession.run(lmInputs);
    if (bench) lmStepMs.push(performance.now() - tStep0);

    const logits = lmResult["logits"];
    if (!logits) {
      throw new Error(`Language model missing logits. Available: ${Object.keys(lmResult).join(", ")}`);
    }

    // Get last token's logits
    const logitsData = new Float32Array(logits.data as Float32Array);
    const vocabSize = logits.dims[logits.dims.length - 1] ?? 0;
    const lastTokenLogits = logitsData.slice(-vocabSize);

    // Mask invalid tokens: only speech codes [0, 6560] and STOP (6562) are valid.
    // START (6561) should not appear mid-sequence; text tokens (> 6562) would
    // cause out-of-bounds lookups in the conditional decoder's speech embedding.
    lastTokenLogits[START_SPEECH] = -Infinity;
    for (let i = STOP_SPEECH + 1; i < lastTokenLogits.length; i++) {
      lastTokenLogits[i] = -Infinity;
    }

    // Prevent premature STOP before minimum tokens are generated
    if (step < MIN_NEW_TOKENS) {
      lastTokenLogits[STOP_SPEECH] = -Infinity;
    }

    // Multilingual model: upstream HF reference inference uses
    // rep_penalty + argmax (NOT bare argmax — bare argmax gets trapped
    // on repeating-token attractors and never emits STOP).
    //
    // Apply HF-convention repetition penalty in-place (penalty 1.2 from
    // generation_config.json): positive logits divided, negative multiplied,
    // for every previously-generated token.
    {
      const seen = new Set(generatedTokens);
      for (const tok of seen) {
        if (tok < lastTokenLogits.length) {
          if (lastTokenLogits[tok] > 0) lastTokenLogits[tok] /= REPETITION_PENALTY;
          else lastTokenLogits[tok] *= REPETITION_PENALTY;
        }
      }
    }
    let maxIdx = 0;
    let bestVal = lastTokenLogits[0];
    for (let i = 1; i < lastTokenLogits.length; i++) {
      if (lastTokenLogits[i] > bestVal) { bestVal = lastTokenLogits[i]; maxIdx = i; }
    }
    // Hold the sampleToken function in scope for future revival if needed.
    void sampleToken;

    if (maxIdx === STOP_SPEECH) {
      console.log(`${LOG} Generation stopped at token ${step + 1}`);
      break;
    }

    generatedTokens.push(maxIdx);

    // Prepare next step with KV cache — feed only the new token embedding.
    // maxIdx is always a valid speech token here: START is masked to -Infinity
    // during sampling, and STOP triggers `break` above.
    const nextTokenTensor = intTensor([maxIdx], [1, 1]);
    // Position for speech token: sequential from text length onward.
    // embed_tokens absorbs position encoding for the multilingual model.
    const stepPositionTensor = intTensor([step + 1], [1, 1]);
    const nextEmbedResult = await embedTokensSession.run({
      [idsName]: nextTokenTensor,
      position_ids: stepPositionTensor,
      exaggeration: exaggerationTensor,
    });
    const nextEmbeds = nextEmbedResult["inputs_embeds"];

    const newLen = totalLen + step + 1;
    const nextAttention = intTensor(Array(newLen).fill(1), [1, newLen]);

    lmInputs = {
      inputs_embeds: nextEmbeds!,
      [maskName]: nextAttention,
    };

    // Add KV cache from previous step.
    // Output names use "present.X.key" → remap to "past_key_values.X.key" for input.
    for (const [key, value] of Object.entries(lmResult)) {
      if (key.startsWith("present.")) {
        const pastKey = "past_key_values." + key.slice("present.".length);
        lmInputs[pastKey] = value;
      }
    }
  }

  console.log(`${LOG} Generated ${generatedTokens.length} speech tokens`);

  // Step 4: Decode speech tokens → audio via conditional_decoder
  // Post-process: strip ALL control tokens (>= 6561), prepend prompt_token, append 3× silence.
  // The reference implementation does: speech_tokens = speech_tokens[speech_tokens < 6561]
  // This removes START, STOP, and any other control tokens anywhere in the sequence.
  const speechOnly = generatedTokens.filter(t => t < START_SPEECH);

  // Always prepend prompt tokens — the decoder's Conv layers require the
  // sequence length from the prompt even if the tokens are zeros.
  const promptTokens = Array.from(speakerData.promptToken);
  const decoderTokens = [...promptTokens, ...speechOnly, SILENCE_TOKEN, SILENCE_TOKEN, SILENCE_TOKEN];

  console.log(`${LOG} Decoder input: ${decoderTokens.length} tokens (${promptTokens.length} prompt + ${speechOnly.length} speech + 3 silence)`);
  const speechTokensTensor = intTensor(decoderTokens, [1, decoderTokens.length]);
  // asF32 is identity when speakerData already holds Float32Array — saves a
  // copy per synth call on the steady-state (new-enrollment) path. Legacy
  // number[] still pays the one-time copy on each call.
  const speakerEmbTensor = new ort.Tensor(
    "float32",
    asF32(speakerData.speakerEmbeddings),
    speakerData.speakerEmbeddingsShape,
  );
  const speakerFeatTensor = new ort.Tensor(
    "float32",
    asF32(speakerData.speakerFeatures),
    speakerData.speakerFeaturesShape,
  );

  const tDec0 = bench ? performance.now() : 0;
  const decoderResult = await conditionalDecoderSession.run({
    [speechTokName]: speechTokensTensor,
    speaker_embeddings: speakerEmbTensor,
    speaker_features: speakerFeatTensor,
  });
  const tDecMs = bench ? performance.now() - tDec0 : 0;

  const wav = decoderResult["waveform"] ?? decoderResult["wav"];
  if (!wav) {
    throw new Error(`Conditional decoder missing output. Available: ${Object.keys(decoderResult).join(", ")}`);
  }

  // Squeeze batch dimension if present
  const audioData = new Float32Array(wav.data as Float32Array);
  console.log(`${LOG} Synthesis complete: ${(audioData.length / SAMPLE_RATE).toFixed(1)}s audio`);

  if (bench) {
    const totalMs = performance.now() - tSynth0;
    const lmTotalMs = lmStepMs.reduce((s, x) => s + x, 0);
    const audioS = audioData.length / SAMPLE_RATE;
    console.log(
      `[OwnVoice:Bench] synth: ep=${getEP()} tokens=${lmStepMs.length}` +
        ` lm_total_ms=${lmTotalMs.toFixed(0)}` +
        ` lm_median_ms=${quantile(lmStepMs, 0.5).toFixed(1)}` +
        ` lm_p95_ms=${quantile(lmStepMs, 0.95).toFixed(1)}` +
        ` decode_ms=${tDecMs.toFixed(0)}` +
        ` total_ms=${totalMs.toFixed(0)}` +
        ` audio_s=${audioS.toFixed(2)}` +
        ` rtf=${(totalMs / 1000 / Math.max(audioS, 0.001)).toFixed(2)}`,
    );
  }

  _postMessage(
    { type: "audio", data: audioData, sampleRate: SAMPLE_RATE },
    { transfer: [audioData.buffer as ArrayBuffer] },
  );
}

/**
 * Main message handler.
 * Uses addEventListener instead of self.onmessage because the ONNX Runtime
 * WASM backend overwrites self.onmessage with its own handler
 * (ort-wasm-simd-threaded.asyncify.mjs).
 */
self.addEventListener("message", async (e: MessageEvent) => {
  const msg = e.data;

  // Ignore ONNX Runtime internal messages (they don't have our type field)
  if (!msg || !msg.type || !["init", "embed", "warmup", "synthesize", "shutdown"].includes(msg.type)) return;

  try {
    switch (msg.type) {
      case "init":
        // `loadCangjie !== false` defaults to true when the field is
        // absent — preserves prior behavior for any caller that hasn't
        // been updated to pass the flag.
        await handleInit(msg.modelUrl, msg.bench === true, msg.loadCangjie !== false);
        break;

      case "embed":
        await handleEmbed(msg.audio, msg.sampleRate, msg.requestId);
        break;

      case "warmup":
        await handleWarmup();
        break;

      case "synthesize":
        await handleSynthesize(msg.text, msg.speakerData, msg.languageId, msg.exaggeration);
        break;

      case "shutdown":
        // Page is unloading. Release ORT sessions so the next page's
        // ORT init doesn't fail with leftover device/runtime state.
        // Best-effort: the browser may terminate us before completion.
        for (const s of [embedTokensSession, languageModelSession, conditionalDecoderSession]) {
          try { await s?.release(); } catch { /* swallow — tearing down */ }
        }
        embedTokensSession = null;
        languageModelSession = null;
        conditionalDecoderSession = null;
        self.close();
        break;
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Error:`, raw);

    // Translate ONNX Runtime kernel errors into actionable messages
    let message = raw;
    if (raw.includes("Failed to find kernel for Cast") && raw.includes("int64")) {
      message =
        "Voice cloning requires a speech encoder model exported without int64 Cast ops. " +
        "The current model is incompatible with the browser ONNX runtime. " +
        "The app will use a standard voice instead.";
    }

    _postMessage({ type: "error", message });
  }
});
