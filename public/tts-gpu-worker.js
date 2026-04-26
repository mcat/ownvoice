/**
 * WebGPU TTS Worker — Chatterbox Multilingual (23 languages) via ONNX Runtime WebGPU EP.
 *
 * This is a plain JS worker (not bundled by Vite) that imports ORT directly
 * from the dist path. Vite's worker bundler can't resolve onnxruntime-web/webgpu
 * correctly, but the raw dist file works because it's served as a plain ES module.
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "synthesize", text: string, speakerData: object, id?: number, languageId: string, exaggeration?: number }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "audio", data: Float32Array, sampleRate: number, id?: number }
 *   { type: "error", message: string, id?: number }
 *
 * Concurrency:
 *   Synthesize requests are serialized via `synthChain` — ORT session.run()
 *   is not safe to invoke concurrently on the same session. Without this,
 *   a main-thread timeout+retry would post a second synth while the first
 *   is still mid-decode, corrupting both. The `id` on each response echoes
 *   the `id` from the incoming request so the main thread can discard
 *   responses from timed-out synths it no longer cares about.
 */

// Import ORT from /ort/ (copies of the dist files in public/).
// This ensures the dynamic import of the JSEP shim resolves correctly
// relative to this file's location — both are served from the same /ort/ path.
import * as ort from "/ort/ort.webgpu.min.mjs";

const LOG = "[OwnVoice:TTS:GPU]";
const SAMPLE_RATE = 24000;
const START_SPEECH_TOKEN = 6561;
const STOP_SPEECH_TOKEN = 6562;
const SILENCE_TOKEN = 4299;
const MAX_NEW_TOKENS = 768; // Model supports 1024; 768 covers long sentences with headroom
const NUM_LAYERS = 30;
const NUM_HEADS = 16;
const HEAD_DIM = 64;

// Sampling parameters — repetition_penalty matches the model's
// generation_config.json. Temperature lowered from upstream's 0.8 to 0.6 to
// tighten the output distribution: 0.8 was producing prosody that read as
// theatrical/sarcastic on conversational phrases. 0.6 is still well within
// the sampling regime (greedy is unsafe — see USE_GREEDY note below).
// Processing order: repetition penalty → temperature → top-k → top-p → sample.
const TEMPERATURE = 0.6;
const TOP_K = 1000;
const TOP_P = 0.95;
// 2.0 is upstream chatterbox-multilingual default (Turbo uses 1.2). Llama
// LM has wider attractors than Turbo's GPT-2, so the same logit landscape
// needs stronger repeat suppression. An earlier attempt to bump this alone
// caused "No No Pie" runaway because once the LM lands on a repeat
// attractor, rep_penalty 2.0 pushes it toward unusual codes that produce
// nonsense audio. Pairing with the token-repetition guard below: if a
// runaway pattern starts anyway (last 2 tokens equal), force loop exit.
const REPETITION_PENALTY = 2.0;
const MIN_NEW_TOKENS = 10; // Don't allow STOP before this many speech tokens

// Use the full Chatterbox Turbo sampling pipeline
// (rep_penalty → temperature → top-k → top-p → nucleus sample) instead
// of plain argmax. An earlier version of this worker set `USE_GREEDY =
// true` on the rationale that the audio cache made sampling variance
// invisible — but that shortcut turned out to cause a long-standing
// stuttering regression: ~60% of pre-gen phrases generated 100-769
// speech tokens instead of the expected 20-50, with roughly 10% of
// phrases hitting MAX_NEW_TOKENS=768 without ever emitting STOP.
//
// Root cause: for certain inputs, the LM's argmax lands on a repeating
// speech-token attractor that sits just above STOP in logit space.
// Greedy can't escape it. The reference sampling pipeline applies
// rep_penalty=1.2 which divides logits of already-generated tokens on
// every step; after a handful of repeats, STOP becomes the top logit
// and generation terminates cleanly. The model was trained to be
// decoded this way — greedy is not a safe optimization.
//
// Cost: cache output is now non-deterministic across full regens (same
// phrase on two separate pre-gen runs produces different byte-exact
// audio, though both are valid renderings). Within a session, cached
// bytes are stable because each phrase is generated once and stored.
// If byte-stable regens ever become important, the follow-up is to
// seed the sampler from hashKey(phrase, fingerprint) and use a
// deterministic PRNG in sampleToken.
// Multilingual model: upstream HF reference inference uses argmax (greedy).
// Multilingual is a Llama LM with different training dynamics than Turbo's
// GPT-2 — the Turbo stutter-bug rationale that originally forced sampling
// doesn't necessarily apply here. Sampling at temp=0.6 was producing
// gibberish for English; switching to greedy to match upstream.
// If multilingual ALSO stutters with greedy, revert and investigate sampling
// hyperparameters (top_p, top_k, temperature) for this specific model.
const USE_GREEDY = true;

// Classifier-free guidance weight. Upstream multilingual defaults to 0.5
// (mtl_tts.py:generate). Implementation: a SINGLE LM call with batch=2.
// Batch[0] is the conditional branch (full text + speaker conditioning);
// batch[1] is unconditional (text-zeroed + same speaker). Per-token logits
// are combined as
//   final = cond + CFG_WEIGHT * (cond - uncond)
//
// The LM ONNX has `batch_size` as a dynamic dim (verified via onnx.load),
// so a single batch=2 forward replaces two sequential batch=1 forwards.
// This is critical for performance: an earlier "two session.run calls"
// implementation timed out (5min+) because per-call JS/ORT overhead
// dominated the actual GPU compute. Batched CFG keeps overhead at one
// call per token instead of two.
//
// Set to 0 to disable (single-batch fast path, preserved for fallback).
// Turbo (English-only GPT-2 LM) does NOT use CFG; multilingual does.
const CFG_WEIGHT = 0.5;

// WASM paths for fallback ops. Points to /ort/ where the JSEP WASM lives.
//
// numThreads is gated on `crossOriginIsolated` — set only when the page
// serves COOP+COEP (handled by the dev server and sw.js in prod), which
// is the prerequisite for SharedArrayBuffer and therefore multi-threaded
// WASM. On first load before the SW installs, or on a host that strips
// the headers, we silently fall back to single-threaded WASM. The
// conditional decoder is WASM-bound, so this is the primary lever for
// pain-matrix pre-gen throughput.
// Capped at 4: M5 iPad reports ~10 logical cores, but this worker runs
// concurrent with the main thread, the GPU EP's internal worker, and any
// other TTS/STT/LLM workers that happen to be mid-inference. Past ~4
// threads the contention overhead outpaces the parallelism win on WASM
// convolution workloads (ORT/Emscripten guidance).
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
    : 1;
}
ort.env.logLevel = "error";

let embedTokensSession = null;
let languageModelSession = null;
let conditionalDecoderSession = null;
let tokenizer = null;

async function createSession(url, hasExternalData = false, wasmOnly = false, extraOpts = {}) {
  const opts = {
    executionProviders: wasmOnly ? ["wasm"] : ["webgpu", "wasm"],
    graphOptimizationLevel: "all",
    logSeverityLevel: 3, // suppress native WASM warnings (3 = errors only)
    ...extraOpts,
  };
  if (hasExternalData) {
    const dataUrl = url + "_data";
    const dataFileName = url.split("/").pop() + "_data";
    opts.externalData = [{ path: dataFileName, data: dataUrl }];
  }
  return ort.InferenceSession.create(url, opts);
}

/**
 * Build a preferredOutputLocation map that keeps the language model's KV
 * cache in GPU memory across decode steps. Default ORT Web behavior is to
 * download every output tensor to CPU after session.run(); for the
 * autoregressive loop that means ~1-3 MB of PCIe traffic per token for
 * tensors we immediately re-upload as the next step's past_key_values.*
 * input. Pinning the present.* outputs to 'gpu-buffer' lets ORT reuse
 * the same GPU allocation on the next run() — no readback, no re-upload.
 *
 * Logits stays on CPU (the default) because we sample in JS.
 */
function kvCacheOnGpu() {
  const loc = {};
  for (let i = 0; i < NUM_LAYERS; i++) {
    loc[`present.${i}.key`] = "gpu-buffer";
    loc[`present.${i}.value`] = "gpu-buffer";
  }
  return loc;
}

// ── Multilingual BPE Tokenizer (inlined from src/models/multilingualTokenizer.ts) ─

/** Languages supported by chatterbox-multilingual. Each gets a [xx] tag id. */
const SUPPORTED_LANGUAGES = new Set([
  "ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi",
  "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv",
  "sw", "tr", "zh",
]);

/** Mirror upstream MTLTokenizer.encode() preprocessing — see the matching
 *  comment in src/models/multilingualTokenizer.ts. Adds lowercase + NFKD
 *  normalization before prepending [lang]; missing this caused "Yes" to
 *  tokenize differently than upstream and degraded clone fidelity. */
function prepareLanguage(text, languageId) {
  const lang = languageId.toLowerCase();
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    throw new Error(
      `Unsupported language: ${languageId}. Supported: ${Array.from(SUPPORTED_LANGUAGES).sort().join(", ")}`,
    );
  }
  const preprocessed = text.toLowerCase().normalize("NFKD");
  return `[${lang}]${preprocessed}`;
}

function applyBPE(chars, mergeRanks) {
  if (chars.length <= 1) return chars;
  let word = [...chars];
  while (word.length > 1) {
    let best = null;
    for (let i = 0; i < word.length - 1; i++) {
      const r = mergeRanks.get(`${word[i]} ${word[i + 1]}`);
      if (r !== undefined && (!best || r < best[2]))
        best = [word[i], word[i + 1], r];
    }
    if (!best) break;
    const [l, r] = best;
    const next = [];
    for (let i = 0; i < word.length; ) {
      if (i < word.length - 1 && word[i] === l && word[i + 1] === r) {
        next.push(l + r); i += 2;
      } else { next.push(word[i]); i++; }
    }
    word = next;
  }
  return word;
}

/**
 * Build a multilingual BPE tokenizer from tokenizer.json.
 * Replaces the old GPT-2 byte-level BPE; handles [xx] language tags and
 * [SPACE] normalization natively. Applies the post-processor template:
 *   EXAGGERATION (6563) + BOS (255) + <text> + EOS (0) + START_SPEECH (6561) ×2
 * The trailing START_SPEECH ×2 is the model's signal to enter speech-token
 * generation mode. Without it the LM never emits STOP_SPEECH and runs to
 * MAX_NEW_TOKENS producing garbage output.
 */
function buildMultilingualTokenizer(json) {
  // Post-processor template ids — verified from tokenizer.json
  // post_processor.special_tokens. Architectural constants, not vocab entries.
  const EXAGGERATION_TOKEN_ID = 6563;
  const BOS_TOKEN_ID = 255;
  const EOS_TOKEN_ID = 0;
  const START_SPEECH_TOKEN_ID = 6561;

  const vocab = new Map();
  for (const [token, id] of Object.entries(json.model.vocab)) vocab.set(token, id);

  const mergeRanks = new Map();
  for (let i = 0; i < json.model.merges.length; i++) {
    const m = json.model.merges[i];
    mergeRanks.set(Array.isArray(m) ? m.join(" ") : m, i);
  }

  const addedTokens = new Map();
  for (const t of json.added_tokens ?? []) {
    addedTokens.set(t.content, t.id);
  }

  // Regex matching any added token literal — longest first to avoid prefix collisions
  let addedPattern = null;
  if (addedTokens.size) {
    addedPattern = new RegExp(
      `(${Array.from(addedTokens.keys())
        .sort((a, b) => b.length - a.length)
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})`,
    );
  }

  return {
    encode(text) {
      // Replace literal spaces with "[SPACE]" so BPE sees them as added tokens
      const normalized = text.replace(/ /g, "[SPACE]");

      const innerIds = [];
      const segments = addedPattern
        ? normalized.split(addedPattern)
        : [normalized];

      for (const segment of segments) {
        if (segment === "") continue;
        const specialId = addedTokens.get(segment);
        if (specialId !== undefined) {
          innerIds.push(specialId);
          continue;
        }
        const merged = applyBPE([...segment], mergeRanks);
        for (const tok of merged) {
          const id = vocab.get(tok);
          if (id !== undefined) innerIds.push(id);
        }
      }

      // Apply the post-processor template (mirrors src/models/multilingualTokenizer.ts).
      return [
        EXAGGERATION_TOKEN_ID,
        BOS_TOKEN_ID,
        ...innerIds,
        EOS_TOKEN_ID,
        START_SPEECH_TOKEN_ID,
        START_SPEECH_TOKEN_ID,
      ];
    },
  };
}

async function loadTokenizer(url) {
  const response = await fetch(url);
  const json = await response.json();
  tokenizer = buildMultilingualTokenizer(json);
  console.log(`${LOG} Multilingual BPE tokenizer loaded (${Object.keys(json.model.vocab).length} vocab, ${json.model.merges.length} merges)`);
}

/**
 * Apply HuggingFace-convention repetition penalty in-place to logits.
 * Penalty > 1.0 discourages tokens already in `generated`; positive logits
 * are divided by the penalty (lowering probability) and negative logits
 * are multiplied (lowering further). This is what upstream chatterbox
 * applies BEFORE argmax — without it, greedy decoding gets stuck on
 * repeating-token attractors and never emits STOP_SPEECH.
 *
 * generation_config.json declares repetition_penalty: 1.2; that's the
 * model's training-time decode default and is mandatory for greedy.
 */
function applyRepetitionPenalty(logits, generated, penalty) {
  if (penalty === 1.0) return;
  const seen = new Set(generated);
  for (const tok of seen) {
    if (tok < logits.length) {
      if (logits[tok] > 0) logits[tok] /= penalty;
      else logits[tok] *= penalty;
    }
  }
}

/**
 * Greedy argmax over the masked logits. The upstream "greedy" mode is
 * actually rep_penalty + argmax, not bare argmax — see
 * applyRepetitionPenalty above. -Infinity entries are naturally skipped
 * because nothing compares greater than -Infinity.
 */
function argmaxGreedy(logits) {
  let best = 0;
  let bestVal = logits[0];
  for (let i = 1; i < logits.length; i++) {
    if (logits[i] > bestVal) { bestVal = logits[i]; best = i; }
  }
  return best;
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
 * @param {Float32Array} logits - Raw logits (modified in-place). Assumes vocab
 *   mask and min-token guard have already been applied.
 * @param {number[]} generatedTokens - Previously generated tokens for rep penalty.
 */
function sampleToken(logits, generatedTokens) {
  // 1. Repetition penalty — discourage tokens that already appeared.
  //    HF convention: positive logits are divided, negative are multiplied.
  if (REPETITION_PENALTY !== 1.0) {
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
    // Collect finite logits and find the Kth-largest value
    const finite = [];
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
  const indexed = [];
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

async function handleInit(modelUrl) {
  const baseUrl = modelUrl.endsWith("/") ? modelUrl : modelUrl + "/";
  console.log(`${LOG} Initializing WebGPU TTS in DedicatedWorker...`);

  const t0 = performance.now();

  // ORT Web's runtime setup is brittle under concurrent session creation.
  // Three races have been observed in this worker so far:
  //   1. Concurrent WASM-EP sessions race `initWasm()` (fixed).
  //   2. Concurrent LM (WebGPU) + decoder (WASM) sessions leave the LM's
  //      WebGPU init half-baked — it silently falls back to WASM EP but
  //      keeps its `preferredOutputLocation: "gpu-buffer"` config, so
  //      every run() fails with "Invalid session handle passed to
  //      webgpuRegisterBuffer". Synthesis is then either broken outright
  //      or (if ORT accepts the fallback) 100-1000× slower on pure WASM.
  //
  // The only pair we can parallelize safely is tokenizer + ONE ORT
  // session — the tokenizer is a plain fetch and doesn't touch ORT at
  // all. All ORT session creations must run sequentially.
  //
  // Notes on EP choice:
  //  - embed_tokens on WASM: Metal GatherBlockQuantized dispatch bug
  //  - language_model on WebGPU: the hot autoregressive loop
  //  - conditional_decoder on WASM: WebGPU variant has ConvTranspose
  //    quantization artifacts that trash audio quality
  const [, embed] = await Promise.all([
    loadTokenizer(baseUrl + "tokenizer.json"),
    createSession(baseUrl + "embed_tokens.onnx", true, true),
  ]);
  embedTokensSession = embed;

  languageModelSession = await createSession(
    baseUrl + "language_model_q4f16.onnx",
    true,
    false,
    { preferredOutputLocation: kvCacheOnGpu() },
  );

  conditionalDecoderSession = await createSession(
    baseUrl + "conditional_decoder.onnx",
    true,
    true,
  );

  console.log(`${LOG} All models loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  // Warm the hot path. Without this, the first real synthesis pays WebGPU
  // shader compilation, initial command-queue setup, and ORT's first-run
  // graph planning costs — typically 3-8s on top of steady-state time.
  // After warmup, subsequent calls hit compiled kernels and pre-allocated
  // device resources. See README perf notes.
  try {
    await warmupLanguageModel();
  } catch (err) {
    // Warmup is an optimization, never a correctness requirement. If the
    // fake-shape pass trips on something model-specific, log it and carry
    // on; the first real synthesis will eat the cold-start cost instead.
    console.warn(`${LOG} Warmup failed (continuing):`, err);
  }

  postMessage({ type: "ready" });

  // No conditional-decoder warmup. An earlier version ran a synthetic
  // pass through the decoder at init time to amortize JIT cost, but the
  // graph has hard shape/content dependencies (F0 predictor, ECAPA
  // feature layout) that can't be satisfied without a real speakerData
  // — the warmup failed on every boot and the first-real-synth paid
  // the cold-start cost anyway, plus a confusing console error. The
  // decoder runs on WASM where per-op JIT is cheap relative to
  // shader compilation, so the saving was marginal to begin with.
}

/**
 * Run a throwaway LM forward pass to compile WebGPU shaders and initialize
 * device resources before any real synthesis is requested. Uses synthetic
 * shape-correct inputs — the *values* don't matter, only the *shapes* do,
 * since ORT caches kernels keyed on shape. Two passes cover the two
 * dominant shapes in the real decode loop:
 *   pass A: [1, totalLen, embedDim] with empty KV → "step 0" shape
 *   pass B: [1, 1, embedDim]  with grown KV  → "step N" shape
 *
 * Skips the conditional decoder (WASM path, no shader compilation) and
 * skips sampling (no patient-visible output to produce). Runs entirely
 * self-contained — no main-thread coordination, no real speakerData needed.
 */
async function warmupLanguageModel() {
  const w0 = performance.now();

  // Step A: discover embedDim by running embed_tokens on a short fake input.
  // This also primes the embed_tokens WASM session (first-call JIT costs).
  // Use small IDs valid for the multilingual vocab (~2453 entries).
  const fakeIds = [100, 200, 300, 400];
  const idsTensor = new ort.Tensor("int64", BigInt64Array.from(fakeIds.map(BigInt)), [1, fakeIds.length]);
  const posTensor = new ort.Tensor("int64", BigInt64Array.from(fakeIds.map((_, i) => BigInt(i))), [1, fakeIds.length]);
  const exagTensor = new ort.Tensor("float32", new Float32Array([0.5]), [1]);
  const embedOut = await embedTokensSession.run({ input_ids: idsTensor, position_ids: posTensor, exaggeration: exagTensor });
  const textEmbeds = embedOut["inputs_embeds"];
  if (!textEmbeds) throw new Error("warmup: embed_tokens produced no output");
  const embedDim = textEmbeds.dims[2] ?? 0;
  const textLen = textEmbeds.dims[1] ?? 0;

  // Use a plausible-but-small condLen. The LM's seq-length kernels are
  // shape-polymorphic, so the exact value matters less than exercising
  // the "totalLen > 1 with empty KV" path.
  const condLen = 4;
  const totalLen = condLen + textLen;

  // Warmup uses the same batch size as real synthesis. With CFG enabled,
  // the LM forwards run with batch=2 — compiling those kernels here avoids
  // a multi-second stall on the first synth.
  const batch = CFG_WEIGHT > 0 ? 2 : 1;
  const rowSize = totalLen * embedDim;

  const combinedEmbeds = new Float32Array(batch * rowSize);
  // Leave condEmb region zero (warmup doesn't need real values), splice in
  // textEmbeds after it for batch[0]. Batch[1] (if present) stays zero-filled.
  const textBytes = new Float32Array(textEmbeds.data);
  combinedEmbeds.set(textBytes, condLen * embedDim);

  // Multilingual LM: attention_mask is int64, no position_ids input.
  const passA = {
    inputs_embeds: new ort.Tensor("float32", combinedEmbeds, [batch, totalLen, embedDim]),
    attention_mask: new ort.Tensor("int64", BigInt64Array.from({ length: batch * totalLen }, () => 1n), [batch, totalLen]),
  };
  for (let i = 0; i < NUM_LAYERS; i++) {
    passA[`past_key_values.${i}.key`] = new ort.Tensor("float16", new Uint16Array(0), [batch, NUM_HEADS, 0, HEAD_DIM]);
    passA[`past_key_values.${i}.value`] = new ort.Tensor("float16", new Uint16Array(0), [batch, NUM_HEADS, 0, HEAD_DIM]);
  }
  const resultA = await languageModelSession.run(passA);

  // Step B: one more LM call with the step-N shape — inputs_embeds [batch,1,D]
  // + grown KV cache. This compiles the kernels used for every token after
  // the first, where most loop time is spent.
  const nextTok = new ort.Tensor("int64", BigInt64Array.from([0n]), [1, 1]);
  const nextPos = new ort.Tensor("int64", BigInt64Array.from([0n]), [1, 1]);
  const nextEmb = await embedTokensSession.run({ input_ids: nextTok, position_ids: nextPos, exaggeration: exagTensor });
  const newLen = totalLen + 1;

  // Broadcast nextEmb (batch=1) to batch=2 if CFG is on.
  const nextEmbData = nextEmb["inputs_embeds"].data;
  let nextEmbedsBatched;
  if (batch === 2) {
    nextEmbedsBatched = new Float32Array(2 * embedDim);
    nextEmbedsBatched.set(nextEmbData, 0);
    nextEmbedsBatched.set(nextEmbData, embedDim);
  } else {
    nextEmbedsBatched = new Float32Array(nextEmbData);
  }

  // Multilingual LM: attention_mask is int64, no position_ids input.
  const passB = {
    inputs_embeds: new ort.Tensor("float32", nextEmbedsBatched, [batch, 1, embedDim]),
    attention_mask: new ort.Tensor("int64", BigInt64Array.from({ length: batch * newLen }, () => 1n), [batch, newLen]),
  };
  for (const [key, value] of Object.entries(resultA)) {
    if (key.startsWith("present.")) {
      passB["past_key_values." + key.slice("present.".length)] = value;
    }
  }
  const resultB = await languageModelSession.run(passB);

  // Release every GPU-backed tensor we produced so warmup leaves no
  // lingering buffers. CPU tensors are dropped by JS GC.
  for (const t of Object.values(resultA)) {
    if (t?.location === "gpu-buffer") t.dispose?.();
  }
  for (const t of Object.values(resultB)) {
    if (t?.location === "gpu-buffer") t.dispose?.();
  }

  console.log(`${LOG} Warmup complete in ${((performance.now() - w0) / 1000).toFixed(1)}s`);
}

async function handleSynthesize(text, speakerData, id, languageId, exaggeration = 0.5) {
  if (!embedTokensSession || !languageModelSession || !conditionalDecoderSession || !tokenizer) {
    throw new Error("Models not initialized");
  }

  const t0 = performance.now();
  console.log(`${LOG} Synthesizing: "${text.slice(0, 50)}..." [lang=${languageId}, exag=${exaggeration}]`);

  // Step 1: Tokenize via multilingual BPE.
  // prepareLanguage prepends "[xx]" language tag (e.g. "[en]Hello").
  const preparedText = prepareLanguage(text, languageId);
  const inputIds = tokenizer.encode(preparedText);
  console.log(`${LOG} Prepared text: "${preparedText.slice(0, 60)}" → first 8 ids: ${inputIds.slice(0, 8).join(",")}`);

  // embed_tokens runs on WASM with int64 inputs.
  // Multilingual embed_tokens requires position_ids and exaggeration.
  // Per upstream HF reference inference:
  //   position_ids = np.where(input_ids >= START_SPEECH_TOKEN, 0, arange(N) - 1)
  // i.e. transition wrapper tokens (EXAGGERATION 6563 at the start,
  // START_SPEECH 6561 ×2 at the end) get position 0; text-side tokens use
  // arange-1 indexing. The model is trained with this dual-positioning so
  // wrappers act as positionless markers and text carries sequence position.
  const embedIdsTensor = new ort.Tensor("int64", BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
  const positionIdsTensor = new ort.Tensor(
    "int64",
    BigInt64Array.from(inputIds.map((tokenId, i) => (tokenId >= START_SPEECH_TOKEN ? 0n : BigInt(i - 1)))),
    [1, inputIds.length],
  );
  const exaggerationTensor = new ort.Tensor("float32", new Float32Array([exaggeration]), [1]);

  // Step 2: Embed text + start-of-speech tokens
  const embedResult = await embedTokensSession.run({
    input_ids: embedIdsTensor,
    position_ids: positionIdsTensor,
    exaggeration: exaggerationTensor,
  });
  const textEmbeds = embedResult["inputs_embeds"];
  if (!textEmbeds) throw new Error("embed_tokens failed: " + Object.keys(embedResult));

  // Step 3: Autoregressive LM generation with batched classifier-free guidance.
  //
  // ONE LM call per token with batch=2 (cond at [0], uncond at [1]):
  //   batch[0] = condEmb || text_embeds                   (full conditioning)
  //   batch[1] = condEmb || zeros(text_embeds.shape)      (text zeroed)
  // Logits combine: final = cond + CFG_WEIGHT * (cond - uncond).
  //
  // Earlier dual-call CFG (two sequential session.run with batch=1) timed
  // out at 5min+ on M5 iPad WebGPU because per-call JS/ORT overhead
  // dominated. Single batched call recovers most of that cost — the LM
  // ONNX has batch_size as a dynamic dim (verified) so the GPU can
  // pipeline both branches in parallel within one kernel launch.
  //
  // CFG_WEIGHT === 0 → batch=1 fast path (no uncond branch built).
  const cfgEnabled = CFG_WEIGHT > 0;
  const batch = cfgEnabled ? 2 : 1;

  const condEmbF32 = new Float32Array(speakerData.condEmb);
  const condLen = speakerData.condEmbShape[1] ?? 0;
  const textLen = textEmbeds.dims[1] ?? 0;
  const embedDim = textEmbeds.dims[2] ?? 0;
  const totalLen = condLen + textLen;
  const rowSize = totalLen * embedDim;

  // Batch[0]: full conditioning (condEmb + real text_embeds).
  // Batch[1]: text-zeroed (condEmb + zeros). Float32Array() is zero-init.
  const batchedEmbeds = new Float32Array(batch * rowSize);
  batchedEmbeds.set(condEmbF32, 0);
  batchedEmbeds.set(textEmbeds.data, condLen * embedDim);
  if (cfgEnabled) {
    // Uncond row: copy condEmb prefix only; text region stays zero.
    batchedEmbeds.set(condEmbF32, rowSize);
  }

  // attention_mask: one typed array per Tensor per run (ORT Web WebGPU has
  // shared-buffer hazards across successive run() calls).
  // Multilingual LM: attention_mask is int64, no position_ids input.
  let lmInputs = {
    inputs_embeds: new ort.Tensor("float32", batchedEmbeds, [batch, totalLen, embedDim]),
    attention_mask: new ort.Tensor("int64", BigInt64Array.from({ length: batch * totalLen }, () => 1n), [batch, totalLen]),
  };
  for (let i = 0; i < NUM_LAYERS; i++) {
    lmInputs[`past_key_values.${i}.key`] = new ort.Tensor("float16", new Uint16Array(0), [batch, NUM_HEADS, 0, HEAD_DIM]);
    lmInputs[`past_key_values.${i}.value`] = new ort.Tensor("float16", new Uint16Array(0), [batch, NUM_HEADS, 0, HEAD_DIM]);
  }

  const generatedTokens = [START_SPEECH_TOKEN];

  // Tracks GPU-backed tensors from the prior step so we can dispose them
  // once the next run() has consumed them as past_key_values.* inputs.
  // Without this, WebGPU buffers accumulate across the autoregressive loop
  // and leak into subsequent sentences during batch pre-gen.
  let priorGpuKV = [];

  try {
  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const lmResult = await languageModelSession.run(lmInputs);
    for (const t of priorGpuKV) t.dispose?.();
    priorGpuKV = [];

    const logits = lmResult["logits"];
    if (!logits) throw new Error("LM missing logits: " + Object.keys(lmResult));

    // logits.data layout: [batch=0 row 0, ..., batch=0 row T-1, batch=1 row 0, ...]
    // For step 0 we have T positions per batch; for subsequent steps T=1.
    const vocabSize = logits.dims[logits.dims.length - 1] ?? 0;
    const seqLenOut = logits.dims[1] ?? 1;
    const condLastStart = (seqLenOut - 1) * vocabSize;
    const condLast = logits.data.subarray(condLastStart, condLastStart + vocabSize);

    // CFG combine — produces a writable copy regardless of the path.
    let lastTokenLogits;
    if (cfgEnabled) {
      const uncondLastStart = (seqLenOut + seqLenOut - 1) * vocabSize;
      const uncondLast = logits.data.subarray(uncondLastStart, uncondLastStart + vocabSize);
      lastTokenLogits = new Float32Array(vocabSize);
      for (let i = 0; i < vocabSize; i++) {
        lastTokenLogits[i] = condLast[i] + CFG_WEIGHT * (condLast[i] - uncondLast[i]);
      }
    } else {
      lastTokenLogits = new Float32Array(condLast);
    }

    // Mask invalid tokens: only speech codes [0, 6560] and STOP (6562) are valid.
    // START (6561) should not appear mid-sequence; text tokens (> 6562) would
    // cause out-of-bounds lookups in the conditional decoder's speech embedding.
    // Multilingual LM logits dim is 8194 — the upper mask loop zeros 6563..8193.
    lastTokenLogits[START_SPEECH_TOKEN] = -Infinity;
    for (let i = STOP_SPEECH_TOKEN + 1; i < lastTokenLogits.length; i++) {
      lastTokenLogits[i] = -Infinity;
    }
    if (step < MIN_NEW_TOKENS) {
      lastTokenLogits[STOP_SPEECH_TOKEN] = -Infinity;
    }

    if (USE_GREEDY) {
      applyRepetitionPenalty(lastTokenLogits, generatedTokens, REPETITION_PENALTY);
    }
    const maxIdx = USE_GREEDY
      ? argmaxGreedy(lastTokenLogits)
      : sampleToken(lastTokenLogits, generatedTokens);

    if (maxIdx === STOP_SPEECH_TOKEN) {
      console.log(`${LOG} Stopped at token ${step + 1}`);
      break;
    }
    generatedTokens.push(maxIdx);

    // Token-repetition guard — port of upstream AlignmentStreamAnalyzer.step:
    //   token_repetition = (
    //     len(self.generated_tokens) >= 3 and
    //     len(set(self.generated_tokens[-2:])) == 1
    //   )
    // Once we've generated 2+ speech tokens AND the last two are equal,
    // we're on a repeat attractor that rep_penalty 2.0 alone can't escape.
    // Upstream forces EOS via logits clobbering on the next step; we
    // accomplish the same end by exiting the loop here. Audio rendered
    // from generatedTokens-so-far still ends cleanly — the conditional
    // decoder pads three SILENCE tokens regardless of how the speech
    // sequence ended.
    if (generatedTokens.length >= 3 &&
        generatedTokens[generatedTokens.length - 1] === generatedTokens[generatedTokens.length - 2]) {
      console.log(`${LOG} Token-repetition guard fired at token ${step + 1} (repeated ${maxIdx})`);
      break;
    }

    // Embed next speech token (batch=1) and broadcast to batch=2 by copy.
    // Upstream zeros only the original text_emb, not subsequent speech embeds —
    // both branches see the same generated speech token.
    const nextTok = new ort.Tensor("int64", BigInt64Array.from([BigInt(maxIdx)]), [1, 1]);
    const stepPos = new ort.Tensor("int64", BigInt64Array.from([BigInt(step + 1)]), [1, 1]);
    const nextEmb = await embedTokensSession.run({
      input_ids: nextTok,
      position_ids: stepPos,
      exaggeration: exaggerationTensor,
    });
    const newLen = totalLen + step + 1;
    const embData = nextEmb["inputs_embeds"].data; // Float32Array, length embedDim

    let nextBatchedEmbeds;
    if (cfgEnabled) {
      nextBatchedEmbeds = new Float32Array(2 * embedDim);
      nextBatchedEmbeds.set(embData, 0);
      nextBatchedEmbeds.set(embData, embedDim);
    } else {
      nextBatchedEmbeds = new Float32Array(embData); // copy for safety
    }

    lmInputs = {
      inputs_embeds: new ort.Tensor("float32", nextBatchedEmbeds, [batch, 1, embedDim]),
      attention_mask: new ort.Tensor("int64", BigInt64Array.from({ length: batch * newLen }, () => 1n), [batch, newLen]),
    };

    for (const [key, value] of Object.entries(lmResult)) {
      if (key.startsWith("present.")) {
        lmInputs["past_key_values." + key.slice("present.".length)] = value;
        if (value?.location === "gpu-buffer") priorGpuKV.push(value);
      }
    }
  }

  } finally {
    // Loop exited normally (STOP/MAX_NEW_TOKENS) or threw mid-run —
    // either way the orphaned KV buffers must be released.
    for (const t of priorGpuKV) t.dispose?.();
    priorGpuKV = [];
  }

  console.log(`${LOG} Generated ${generatedTokens.length} speech tokens in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  // Step 4: Decode → audio
  // Post-process: strip ALL control tokens (>= 6561), prepend prompt_token, append 3× silence.
  // The reference implementation does: speech_tokens = speech_tokens[speech_tokens < 6561]
  // This removes START, STOP, and any other control tokens anywhere in the sequence.
  const speechOnly = generatedTokens.filter(t => t < START_SPEECH_TOKEN);
  const promptTokens = Array.from(speakerData.promptToken);
  const decoderTokens = [...promptTokens, ...speechOnly, SILENCE_TOKEN, SILENCE_TOKEN, SILENCE_TOKEN];

  console.log(`${LOG} Decoder input: ${decoderTokens.length} tokens (${promptTokens.length} prompt + ${speechOnly.length} speech + 3 silence)`);
  // Decoder uses WASM variant with int64 inputs (not the WebGPU int32 variant)
  const speechTok = new ort.Tensor("int64", BigInt64Array.from(decoderTokens.map(BigInt)), [1, decoderTokens.length]);
  const spkEmb = new ort.Tensor("float32", new Float32Array(speakerData.speakerEmbeddings), speakerData.speakerEmbeddingsShape);
  const spkFeat = new ort.Tensor("float32", new Float32Array(speakerData.speakerFeatures), speakerData.speakerFeaturesShape);

  const decResult = await conditionalDecoderSession.run({
    speech_tokens: speechTok,
    speaker_embeddings: spkEmb,
    speaker_features: spkFeat,
  });

  const wav = decResult["waveform"] ?? decResult["wav"];
  if (!wav) throw new Error("Decoder missing output: " + Object.keys(decResult));

  const audioData = new Float32Array(wav.data);
  console.log(`${LOG} Total: ${((performance.now() - t0) / 1000).toFixed(1)}s, ${(audioData.length / SAMPLE_RATE).toFixed(1)}s audio`);

  postMessage(
    { type: "audio", data: audioData, sampleRate: SAMPLE_RATE, id },
    [audioData.buffer],
  );
}

// Serialize synthesize calls. ORT session.run() is not safe to invoke
// concurrently on the same session — a prior bug where main-thread
// timeout+retry posted a second synth mid-decode corrupted both runs
// and effectively stalled the 702-phrase pain-matrix pass. Every
// incoming synth chains onto `synthChain` and runs strictly after the
// previous one completes.
let synthChain = Promise.resolve();

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === "init") {
    handleInit(msg.modelUrl).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LOG} Init error:`, message);
      postMessage({ type: "error", message });
    });
    return;
  }

  if (msg.type === "synthesize") {
    // Chain on, swallowing per-synth failures so one bad phrase doesn't
    // break the chain for subsequent ones. The main thread correlates
    // responses via `msg.id` and ignores those for synths it has
    // already timed out on.
    synthChain = synthChain.then(() =>
      handleSynthesize(msg.text, msg.speakerData, msg.id, msg.languageId, msg.exaggeration).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${LOG} Synth error:`, message);
        postMessage({ type: "error", message, id: msg.id });
      }),
    );
  }
});
