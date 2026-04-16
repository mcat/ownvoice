/**
 * WebGPU TTS Worker — Chatterbox Turbo via ONNX Runtime WebGPU EP.
 *
 * This is a plain JS worker (not bundled by Vite) that imports ORT directly
 * from the dist path. Vite's worker bundler can't resolve onnxruntime-web/webgpu
 * correctly, but the raw dist file works because it's served as a plain ES module.
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "synthesize", text: string, speakerData: object }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "audio", data: Float32Array, sampleRate: number }
 *   { type: "error", message: string }
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
const EOT_TOKEN = 50256;
const MAX_NEW_TOKENS = 768; // Model supports 1024; 768 covers long sentences with headroom
const NUM_LAYERS = 24;
const NUM_HEADS = 16;
const HEAD_DIM = 64;

// Sampling parameters — must match the reference Chatterbox Turbo implementation
// (resemble-ai/chatterbox tts_turbo.py + generation_config.json).
// Processing order: repetition penalty → temperature → top-k → top-p → sample.
const TEMPERATURE = 0.8;
const TOP_K = 1000;
const TOP_P = 0.95;
const REPETITION_PENALTY = 1.2;
const MIN_NEW_TOKENS = 10; // Don't allow STOP before this many speech tokens

// WASM paths for fallback ops. Points to /ort/ where the JSEP WASM lives.
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = 1;
}
ort.env.logLevel = "error";

let embedTokensSession = null;
let languageModelSession = null;
let conditionalDecoderSession = null;
let tokenizer = null;

async function createSession(url, hasExternalData = false, wasmOnly = false) {
  const opts = {
    executionProviders: wasmOnly ? ["wasm"] : ["webgpu", "wasm"],
    graphOptimizationLevel: "all",
    logSeverityLevel: 3, // suppress native WASM warnings (3 = errors only)
  };
  if (hasExternalData) {
    const dataUrl = url + "_data";
    const dataFileName = url.split("/").pop() + "_data";
    opts.externalData = [{ path: dataFileName, data: dataUrl }];
  }
  return ort.InferenceSession.create(url, opts);
}

// ── GPT-2 Byte-Level BPE Tokenizer ──────────────────────────────────────────
function buildByteToUnicode() {
  const bs = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
  }
  const map = new Map();
  for (let i = 0; i < bs.length; i++) map.set(bs[i], String.fromCodePoint(cs[i]));
  return map;
}
const BYTE_TO_UNICODE = buildByteToUnicode();
const GPT2_PAT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

function textToByteTokens(text) {
  const bytes = new TextEncoder().encode(text);
  let result = "";
  for (const b of bytes) result += BYTE_TO_UNICODE.get(b) ?? String.fromCodePoint(b);
  return result;
}

function applyBPE(tokens, mergeRanks) {
  if (tokens.length <= 1) return tokens;
  let word = [...tokens];
  while (word.length > 1) {
    let bestPair = null;
    for (let i = 0; i < word.length - 1; i++) {
      const rank = mergeRanks.get(`${word[i]} ${word[i + 1]}`);
      if (rank !== undefined && (bestPair === null || rank < bestPair[2]))
        bestPair = [word[i], word[i + 1], rank];
    }
    if (!bestPair) break;
    const [left, right] = bestPair;
    const merged = left + right;
    const newWord = [];
    let i = 0;
    while (i < word.length) {
      if (i < word.length - 1 && word[i] === left && word[i + 1] === right) {
        newWord.push(merged); i += 2;
      } else { newWord.push(word[i]); i++; }
    }
    word = newWord;
  }
  return word;
}

async function loadTokenizer(url) {
  const response = await fetch(url);
  const json = await response.json();
  const vocab = new Map();
  for (const [token, id] of Object.entries(json.model.vocab)) vocab.set(token, id);

  const mergeRanks = new Map();
  for (let i = 0; i < json.model.merges.length; i++) {
    const m = json.model.merges[i];
    mergeRanks.set(Array.isArray(m) ? m.join(" ") : m, i);
  }

  // Post-processor: append <|endoftext|> × 2
  const eotId = json.added_tokens?.find(t => t.content === "<|endoftext|>")?.id ?? 50256;

  tokenizer = {
    encode(text) {
      const ids = [];
      const words = text.match(GPT2_PAT) ?? [];
      for (const word of words) {
        const byteStr = textToByteTokens(word);
        const merged = applyBPE([...byteStr], mergeRanks);
        for (const token of merged) {
          const id = vocab.get(token);
          if (id !== undefined) ids.push(id);
        }
      }
      ids.push(eotId, eotId);
      return ids;
    },
  };
  console.log(`${LOG} BPE tokenizer loaded (${vocab.size} vocab, ${mergeRanks.size} merges)`);
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

  await loadTokenizer(baseUrl + "tokenizer.json");

  const t0 = performance.now();
  console.log(`${LOG} Loading embed_tokens (WASM — avoids GatherBlockQuantized dispatch bug on Metal)...`);
  embedTokensSession = await createSession(baseUrl + "embed_tokens_q4f16.onnx", true, true);

  console.log(`${LOG} Loading language_model (WebGPU)...`);
  languageModelSession = await createSession(baseUrl + "language_model_q4f16_webgpu.onnx", true);

  // Conditional decoder uses WASM — the WebGPU-exported variant
  // (q4f16_webgpu) produces severe audio artifacts due to int32 quantization
  // damage in the vocoder's ConvTranspose layers. The WASM int64 variant
  // produces clean audio. Decoding is a single forward pass so the speed
  // difference is negligible.
  console.log(`${LOG} Loading conditional_decoder (WASM — WebGPU variant has audio artifacts)...`);
  conditionalDecoderSession = await createSession(baseUrl + "conditional_decoder_q4f16.onnx", true, true);

  console.log(`${LOG} All models loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  postMessage({ type: "ready" });
}

async function handleSynthesize(text, speakerData) {
  if (!embedTokensSession || !languageModelSession || !conditionalDecoderSession || !tokenizer) {
    throw new Error("Models not initialized");
  }

  const t0 = performance.now();
  console.log(`${LOG} Synthesizing: "${text.slice(0, 50)}..."`);

  // Step 1: Tokenize via GPT-2 BPE.
  // Post-processor appends [50256, 50256]; embed_tokens routes last 2 to speech_emb.
  const inputIds = tokenizer.encode(text);

  // embed_tokens runs on WASM with the int64 model variant
  const embedIdsTensor = new ort.Tensor("int64", BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);

  // Step 2: Embed text + start-of-speech tokens
  const embedResult = await embedTokensSession.run({ input_ids: embedIdsTensor });
  const textEmbeds = embedResult["inputs_embeds"];
  if (!textEmbeds) throw new Error("embed_tokens failed: " + Object.keys(embedResult));

  // Step 3: Autoregressive LM generation
  const condEmbF32 = new Float32Array(speakerData.condEmb);
  const condLen = speakerData.condEmbShape[1] ?? 0;
  const textLen = textEmbeds.dims[1] ?? 0;
  const embedDim = textEmbeds.dims[2] ?? 0;
  const totalLen = condLen + textLen;

  const combinedEmbeds = new Float32Array(totalLen * embedDim);
  combinedEmbeds.set(condEmbF32, 0);
  combinedEmbeds.set(new Float32Array(textEmbeds.data), condLen * embedDim);

  let lmInputs = {
    inputs_embeds: new ort.Tensor("float32", combinedEmbeds, [1, totalLen, embedDim]),
    attention_mask_int32: new ort.Tensor("int32", Int32Array.from(Array(totalLen).fill(1)), [1, totalLen]),
    position_ids_int32: new ort.Tensor("int32", Int32Array.from(Array.from({ length: totalLen }, (_, i) => i)), [1, totalLen]),
  };

  for (let i = 0; i < NUM_LAYERS; i++) {
    lmInputs[`past_key_values.${i}.key`] = new ort.Tensor("float16", new Uint16Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
    lmInputs[`past_key_values.${i}.value`] = new ort.Tensor("float16", new Uint16Array(0), [1, NUM_HEADS, 0, HEAD_DIM]);
  }

  const generatedTokens = [START_SPEECH_TOKEN];

  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const lmResult = await languageModelSession.run(lmInputs);
    const logits = lmResult["logits"];
    if (!logits) throw new Error("LM missing logits: " + Object.keys(lmResult));

    const logitsData = new Float32Array(logits.data);
    const vocabSize = logits.dims[logits.dims.length - 1] ?? 0;
    const lastTokenLogits = logitsData.slice(-vocabSize);

    // Mask invalid tokens: only speech codes [0, 6560] and STOP (6562) are valid.
    // START (6561) should not appear mid-sequence; text tokens (> 6562) would
    // cause out-of-bounds lookups in the conditional decoder's speech embedding.
    lastTokenLogits[START_SPEECH_TOKEN] = -Infinity;
    for (let i = STOP_SPEECH_TOKEN + 1; i < lastTokenLogits.length; i++) {
      lastTokenLogits[i] = -Infinity;
    }

    // Prevent premature STOP before minimum tokens are generated
    if (step < MIN_NEW_TOKENS) {
      lastTokenLogits[STOP_SPEECH_TOKEN] = -Infinity;
    }

    const maxIdx = sampleToken(lastTokenLogits, generatedTokens);

    if (maxIdx === STOP_SPEECH_TOKEN) {
      console.log(`${LOG} Stopped at token ${step + 1}`);
      break;
    }
    generatedTokens.push(maxIdx);

    // Next step — embed via speech_emb (single token routed by Slice[-2:]).
    // Substitute token 0 for control tokens (START/STOP) to avoid ORT WASM
    // GatherBlockQuantized bounds bug on speech_emb indices >= 6561.
    const embedIdx = maxIdx >= START_SPEECH_TOKEN ? 0 : maxIdx;
    const nextTok = new ort.Tensor("int64", BigInt64Array.from([BigInt(embedIdx)]), [1, 1]);
    const nextEmb = await embedTokensSession.run({ input_ids: nextTok });
    const newLen = totalLen + step + 1;

    lmInputs = {
      inputs_embeds: nextEmb["inputs_embeds"],
      attention_mask_int32: new ort.Tensor("int32", Int32Array.from(Array(newLen).fill(1)), [1, newLen]),
      position_ids_int32: new ort.Tensor("int32", Int32Array.from([newLen - 1]), [1, 1]),
    };

    for (const [key, value] of Object.entries(lmResult)) {
      if (key.startsWith("present.")) {
        lmInputs["past_key_values." + key.slice("present.".length)] = value;
      }
    }
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
    { type: "audio", data: audioData, sampleRate: SAMPLE_RATE },
    [audioData.buffer],
  );
}

self.addEventListener("message", async (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  try {
    if (msg.type === "init") await handleInit(msg.modelUrl);
    else if (msg.type === "synthesize") await handleSynthesize(msg.text, msg.speakerData);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Error:`, message);
    postMessage({ type: "error", message });
  }
});
