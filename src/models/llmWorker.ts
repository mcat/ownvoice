/**
 * Web Worker for LFM2.5-1.2B-Instruct ONNX inference.
 *
 * Handles sentence completion for the Sentence Builder (Layer 2).
 * Receives prompts, runs inference via ONNX Runtime, and returns
 * completion suggestions for hospitalized patients.
 *
 * Model: LiquidAI/LFM2.5-1.2B-Instruct-ONNX (q4 variant)
 * Files: model_q4.onnx + model_q4.onnx_data (~850 MB), tokenizer.json (3.3 MB)
 *
 * Architecture: hybrid of 10 short-conv layers and 6 GQA attention layers.
 * The ONNX export therefore carries TWO cache types:
 *   - past_key_values.N.key/value  at attention-layer indices [2,5,8,10,12,14]
 *   - past_conv.N                  at conv-layer indices [0,1,3,4,6,7,9,11,13,15]
 *
 * Attention cache shape: [1, 8, seq_len, 64]  (kv_heads=8, head_dim=64)
 * Conv cache shape:      [1, 2048, 3]         (hidden_size=2048, conv_L_cache=3)
 *
 * Conv state is zero-filled at start, NEVER zero-length — it is a short
 * rolling buffer, not a growing cache. Both caches are discovered from
 * session.inputNames so the worker works across future LFM2 variants.
 */

import * as ort from "onnxruntime-web/webgpu";
import { buildBPETokenizer, type BPETokenizer } from "./bpeTokenizer";
import { LFM2_CHAT_TOKENS, LFM2_SAMPLING, type FewShotExample } from "./types";
import { ORT_VERSION } from "./assetVersions";

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

const LOG_PREFIX = "[OwnVoice:LLM]";

/**
 * System prompt for the Sentence Builder LLM. The framing is load-bearing:
 *   1. ICU + AAC: the patient cannot speak aloud and is tapping phrases on
 *      a device. That context (not generic "hospitalized") grounds the
 *      vocabulary — suction, oxygen, vent, restraints, sedation.
 *   2. Direction of voice: "what the patient would say TO staff, never a
 *      response FROM them". Naming the audience positively heads off the
 *      biggest drifts we saw ("I understand", "let me know", "I'll bring
 *      you...") — those are caregiver RESPONSES, not patient utterances.
 *   3. Grammar: completions must append cleanly — reading partial + phrase
 *      aloud must form one grammatical sentence (no "I am scared" after
 *      "I feel", which would produce "I feel I am scared").
 *   4. Diversity + anti-repetition: short models tend toward near-synonyms
 *      ("in pain" / "in so much pain") and echoing words already typed.
 *      Explicit rules in the prompt pay for themselves in pill variety.
 *
 * The heavy lifting still happens via multi-turn progressive-chain few-shot
 * injected as real user/assistant exchanges in buildPrompt() — the prompt
 * tells the model WHAT the task is, the demos show HOW to do it at any
 * depth. Output is a bare JSON array enforced by prompting + demos;
 * onnxruntime-web has no grammar-constrained sampling.
 */
const SYSTEM_PROMPT = `A patient in an intensive care unit cannot speak aloud and is using a communication device to build a sentence one tap at a time, telling hospital staff what they need, feel, or want to ask. The sentence so far may be 1-10 words long. Return 4-8 short phrases (1-6 words each) they could tap to extend it. Each phrase must:
- Attach cleanly to the end — reading the sentence aloud plus the phrase must form one grammatical sentence.
- Speak in the patient's own first-person voice: what the patient would say TO staff, never a response FROM them.
- Take the sentence in a different direction than the other phrases (feeling, need, request, question, detail).
- Not repeat words already in the sentence.

Respond with ONLY a JSON array of strings, nothing else. No code fence, no explanation.`;

/**
 * Fallback few-shot used when the caller doesn't supply its own. Mirrors
 * the progressive-chain shape produced by buildLLMFewShot in
 * suggestion-trees.ts — one sentence growing turn-over-turn, so the model
 * learns continuations attach at any depth. This static fallback only
 * fires for callers that don't pass `fewShot` (tests and direct
 * consumers that haven't migrated yet).
 */
const FALLBACK_FEW_SHOT: FewShotExample[] = [
  {
    user: `Continue: "I feel"`,
    assistant: `["scared", "cold", "dizzy", "weak", "worse", "better"]`,
  },
  {
    user: `Continue: "I feel scared"`,
    assistant: `["about the procedure", "and alone", "about what's happening", "and need someone"]`,
  },
  {
    user: `Continue: "I feel scared about the procedure"`,
    assistant: `["tomorrow", "and I'm alone", "they're planning", "and want to wait"]`,
  },
  {
    user: `Continue: "I need"`,
    assistant: `["water", "my family", "the nurse", "to sleep", "my medication"]`,
  },
  {
    user: `Continue: "I need help"`,
    assistant: `["breathing", "getting up", "with the pain", "right now"]`,
  },
  {
    user: `Continue: "I need help breathing"`,
    assistant: `["please", "right now", "it's getting worse", "with the oxygen"]`,
  },
];

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let session: ort.InferenceSession | null = null;
let tokenizer: BPETokenizer | null = null;

/** IDs resolved from the tokenizer at init time. */
interface TokenIds {
  bos: number;
  turnStart: number;
  turnEnd: number;
  eos: number;
  pad: number;
}
let tokenIds: TokenIds = { bos: -1, turnStart: -1, turnEnd: -1, eos: -1, pad: -1 };

/** Attention-layer indices (have past_key_values.N.key/value). */
let attnLayerIndices: number[] = [];
/** Conv-layer indices (have past_conv.N). */
let convLayerIndices: number[] = [];

/** Cache tensor shapes, populated on init and refined from first present tensors. */
const KV_HEADS = 8;
const HEAD_DIM = 64;
const HIDDEN_SIZE = 2048;
const CONV_L_CACHE = 3;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function handleInit(modelUrl: string): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing from ${modelUrl}`);

  try {
    // 1. Tokenizer
    const tokResponse = await fetch(modelUrl + "tokenizer.json");
    if (!tokResponse.ok) {
      throw new Error(`Failed to fetch tokenizer: HTTP ${tokResponse.status}`);
    }
    const tokJson = await tokResponse.json();
    tokenizer = buildBPETokenizer(tokJson);

    // Resolve every special-token ID we rely on for generation.
    const byContent = new Map<string, number>();
    for (const t of tokJson.added_tokens ?? []) byContent.set(t.content, t.id);
    tokenIds = {
      bos: byContent.get(LFM2_CHAT_TOKENS.bos) ?? -1,
      turnStart: byContent.get(LFM2_CHAT_TOKENS.turnStart) ?? -1,
      turnEnd: byContent.get(LFM2_CHAT_TOKENS.turnEnd) ?? -1,
      eos: byContent.get("<|endoftext|>") ?? byContent.get(LFM2_CHAT_TOKENS.turnEnd) ?? -1,
      pad: byContent.get("<|pad|>") ?? 0,
    };

    // 2. ONNX session
    console.log(`${LOG_PREFIX} Loading ONNX model...`);
    const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] = [];
    if ("gpu" in self.navigator) {
      executionProviders.push("webgpu");
      console.log(`${LOG_PREFIX} WebGPU available, using as primary EP`);
    } else {
      console.log(`${LOG_PREFIX} WebGPU not available, using WASM EP`);
    }
    executionProviders.push("wasm");

    const modelResponse = await fetch(modelUrl + "model_q4.onnx");
    if (!modelResponse.ok) throw new Error(`Failed to fetch model: ${modelResponse.status}`);
    const modelData = await modelResponse.arrayBuffer();
    session = await ort.InferenceSession.create(modelData, {
      executionProviders,
      logSeverityLevel: 3,
      externalData: [
        { path: "model_q4.onnx_data", data: modelUrl + "model_q4.onnx_data" },
      ],
    });

    // 3. Discover cache topology from input names
    attnLayerIndices = [];
    convLayerIndices = [];
    for (const name of session.inputNames) {
      const attn = name.match(/^past_key_values\.(\d+)\.key$/);
      if (attn) attnLayerIndices.push(Number(attn[1]));
      const conv = name.match(/^past_conv\.(\d+)$/);
      if (conv) convLayerIndices.push(Number(conv[1]));
    }
    attnLayerIndices.sort((a, b) => a - b);
    convLayerIndices.sort((a, b) => a - b);
    console.log(
      `${LOG_PREFIX} Discovered ${attnLayerIndices.length} attention layers ` +
        `[${attnLayerIndices.join(",")}] and ${convLayerIndices.length} conv layers ` +
        `[${convLayerIndices.join(",")}]`,
    );

    console.log(`${LOG_PREFIX} Model session created successfully`);
    self.postMessage({ type: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load model";
    console.error(`${LOG_PREFIX} Init error:`, err);
    self.postMessage({ type: "error", message });
  }
}

// ---------------------------------------------------------------------------
// Prompt building (LFM2 ChatML format)
// ---------------------------------------------------------------------------

/**
 * Build the LFM2 ChatML prompt.
 *
 * Format (from chat_template.jinja):
 *   <|im_start|>system
 *   {SYSTEM_PROMPT}<|im_end|>
 *   <|im_start|>user
 *   [Context: {context}.]
 *   "{partial}" →<|im_end|>
 *   <|im_start|>assistant
 *
 * Context (time of day + recent messages) is prefixed as a bracketed
 * aside so it doesn't fuse into the partial sentence and confuse the
 * model's continuation. The leading <|startoftext|> BOS token is NOT
 * part of this string — the tokenizer's TemplateProcessing post-processor
 * prepends it automatically.
 */
function buildPrompt(
  partial: string,
  context: string | undefined,
  priorPhrases: string[],
  fewShot: FewShotExample[],
): string {
  // Normalize the partial to sentence case so it matches the few-shot
  // examples. Without this, lowercase inputs ("i feel") push the model
  // away from the patterns and toward chatbot-assistant voice.
  const normalized =
    partial.length > 0
      ? partial.charAt(0).toUpperCase() + partial.slice(1)
      : partial;

  // Inject per-patient vocabulary into the SYSTEM turn (not the live user
  // turn) so it appears once per prompt and doesn't create an asymmetry
  // between few-shot turns and the live turn. Framed as phrases the
  // patient has "recently said" — the model reads this as a vocabulary
  // bank to echo, not a list to copy verbatim.
  const systemBody =
    priorPhrases.length > 0
      ? `${SYSTEM_PROMPT}\n\nPhrases this patient has recently said: ${priorPhrases
          .map((p) => `"${p}"`)
          .join("; ")}.`
      : SYSTEM_PROMPT;

  let prompt = `${LFM2_CHAT_TOKENS.turnStart}system\n${systemBody}${LFM2_CHAT_TOKENS.turnEnd}\n`;

  // Few-shot exchanges as real turns. Source is the curated tree for this
  // partial (see suggestion-trees.ts:buildLLMFewShot). Real ChatML turns
  // get much better pattern-following than the same examples jammed into
  // the system prompt.
  for (const shot of fewShot) {
    prompt +=
      `${LFM2_CHAT_TOKENS.turnStart}user\n${shot.user}${LFM2_CHAT_TOKENS.turnEnd}\n` +
      `${LFM2_CHAT_TOKENS.turnStart}assistant\n${shot.assistant}${LFM2_CHAT_TOKENS.turnEnd}\n`;
  }

  const contextLine = context ? `[Context: ${context}] ` : "";
  prompt +=
    `${LFM2_CHAT_TOKENS.turnStart}user\n${contextLine}Continue: "${normalized}"${LFM2_CHAT_TOKENS.turnEnd}\n` +
    `${LFM2_CHAT_TOKENS.turnStart}assistant\n`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Cache handling (dual: attention KV + conv state)
// ---------------------------------------------------------------------------

/**
 * Build the initial cache feed.
 *
 * Attention entries are zero-length — the model grows them each step.
 * Conv entries are zero-filled but fully shaped [1, HIDDEN, CONV_L] — they
 * are a rolling fixed-size buffer, not a growing cache.
 */
function createInitialCache(): Record<string, ort.Tensor> {
  const cache: Record<string, ort.Tensor> = {};
  for (const i of attnLayerIndices) {
    cache[`past_key_values.${i}.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, KV_HEADS, 0, HEAD_DIM],
    );
    cache[`past_key_values.${i}.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, KV_HEADS, 0, HEAD_DIM],
    );
  }
  for (const i of convLayerIndices) {
    cache[`past_conv.${i}`] = new ort.Tensor(
      "float32",
      new Float32Array(HIDDEN_SIZE * CONV_L_CACHE),
      [1, HIDDEN_SIZE, CONV_L_CACHE],
    );
  }
  return cache;
}

/** Copy `present.*` outputs back into the `past_*` input slots for the next step. */
function extractCache(
  results: ort.InferenceSession.OnnxValueMapType,
): Record<string, ort.Tensor> {
  const cache: Record<string, ort.Tensor> = {};
  for (const i of attnLayerIndices) {
    const k = results[`present.${i}.key`];
    const v = results[`present.${i}.value`];
    if (k) cache[`past_key_values.${i}.key`] = k;
    if (v) cache[`past_key_values.${i}.value`] = v;
  }
  for (const i of convLayerIndices) {
    const c = results[`present_conv.${i}`];
    if (c) cache[`past_conv.${i}`] = c;
  }
  return cache;
}

function modelUsesCache(): boolean {
  return attnLayerIndices.length > 0 || convLayerIndices.length > 0;
}

// ---------------------------------------------------------------------------
// Sampling — LFM2 defaults (repetition penalty, temperature, min-p)
// ---------------------------------------------------------------------------

/**
 * Sample the next token from logits using LFM2 recommended sampling:
 *   1. Repetition penalty: divide logits for tokens we've already emitted.
 *   2. Temperature scaling.
 *   3. Softmax to probabilities.
 *   4. Min-p filter: zero out tokens whose prob < minP × max_prob.
 *   5. Renormalize and sample.
 */
function sampleToken(
  logits: ort.Tensor,
  seqLen: number,
  generated: readonly number[],
): number {
  const vocabSize = logits.dims[2] as number;
  const data = logits.data as Float32Array;
  const offset = (seqLen - 1) * vocabSize;

  const scores = new Float32Array(vocabSize);
  for (let i = 0; i < vocabSize; i++) scores[i] = data[offset + i];

  // 1. Repetition penalty
  const rp = LFM2_SAMPLING.repetitionPenalty;
  for (const id of generated) {
    if (id >= 0 && id < vocabSize) {
      scores[id] = scores[id] > 0 ? scores[id] / rp : scores[id] * rp;
    }
  }

  // 2. Temperature + running max for stable softmax
  const t = LFM2_SAMPLING.temperature;
  let max = -Infinity;
  for (let i = 0; i < vocabSize; i++) {
    scores[i] = scores[i] / t;
    if (scores[i] > max) max = scores[i];
  }

  // 3. Softmax
  let sum = 0;
  for (let i = 0; i < vocabSize; i++) {
    scores[i] = Math.exp(scores[i] - max);
    sum += scores[i];
  }
  for (let i = 0; i < vocabSize; i++) scores[i] /= sum;

  // 4. Min-p
  let maxProb = 0;
  for (let i = 0; i < vocabSize; i++) if (scores[i] > maxProb) maxProb = scores[i];
  const threshold = LFM2_SAMPLING.minP * maxProb;
  let remaining = 0;
  for (let i = 0; i < vocabSize; i++) {
    if (scores[i] < threshold) {
      scores[i] = 0;
    } else {
      remaining += scores[i];
    }
  }
  if (remaining === 0) {
    // Degenerate case: return argmax
    let argmax = 0;
    for (let i = 1; i < vocabSize; i++) if (scores[i] > scores[argmax]) argmax = i;
    return argmax;
  }

  // 5. Sample
  const r = Math.random() * remaining;
  let cum = 0;
  for (let i = 0; i < vocabSize; i++) {
    if (scores[i] === 0) continue;
    cum += scores[i];
    if (r < cum) return i;
  }
  return vocabSize - 1;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

async function handleComplete(
  partial: string,
  maxTokens: number,
  context: string | undefined,
  priorPhrases: string[] | undefined,
  fewShot: FewShotExample[] | undefined,
  requestId: number | undefined,
): Promise<void> {
  if (!session || !tokenizer) {
    self.postMessage({ type: "error", message: "Model not initialized", requestId });
    return;
  }

  try {
    const fullPrompt = buildPrompt(
      partial,
      context,
      priorPhrases ?? [],
      fewShot && fewShot.length > 0 ? fewShot : FALLBACK_FEW_SHOT,
    );
    const inputIds = tokenizer.encode(fullPrompt);

    console.log(
      `${LOG_PREFIX} Prompt encoded: ${inputIds.length} tokens, ` +
        `generating up to ${maxTokens} tokens`,
    );

    const useCache = modelUsesCache();
    const generatedIds: number[] = [];
    let currentIds = inputIds;
    let cache: Record<string, ort.Tensor> = useCache ? createInitialCache() : {};
    let totalSeqLen = inputIds.length;

    for (let step = 0; step < maxTokens; step++) {
      const inputIdsTensor = new ort.Tensor(
        "int64",
        new BigInt64Array(currentIds.map((id) => BigInt(id))),
        [1, currentIds.length],
      );
      const attentionMaskTensor = new ort.Tensor(
        "int64",
        new BigInt64Array(totalSeqLen).fill(1n),
        [1, totalSeqLen],
      );

      const feeds: Record<string, ort.Tensor> = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
        ...cache,
      };

      const results = await session.run(feeds);

      const logits = results["logits"];
      if (!logits) {
        throw new Error(
          "Model did not return 'logits' tensor. " +
            `Available outputs: ${Object.keys(results).join(", ")}`,
        );
      }

      const nextToken = sampleToken(logits, currentIds.length, generatedIds);
      generatedIds.push(nextToken);

      // Stop on EOS/turn-end/pad
      if (
        nextToken === tokenIds.eos ||
        nextToken === tokenIds.turnEnd ||
        nextToken === tokenIds.pad
      ) {
        console.log(
          `${LOG_PREFIX} Generation stopped at step ${step} (token ${nextToken})`,
        );
        break;
      }

      if (useCache) {
        cache = extractCache(results);
        currentIds = [nextToken];
      } else {
        currentIds = [...inputIds, ...generatedIds];
      }
      totalSeqLen = inputIds.length + generatedIds.length;
    }

    const rawOutput = tokenizer.decode(generatedIds);
    const completions = parseCompletions(rawOutput, partial);

    console.log(
      `${LOG_PREFIX} Generated ${completions.length} completions ` +
        `(${generatedIds.length} tokens) for: "${partial}"`,
    );

    self.postMessage({ type: "completions", data: completions, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inference failed";
    console.error(`${LOG_PREFIX} Completion error:`, err);
    self.postMessage({ type: "error", message, requestId });
  }
}

/**
 * Phrases that indicate the model drifted into caregiver voice — somebody
 * OTHER than the patient talking (nurse/doctor/chatbot). These are dropped
 * even when they form grammatically valid completions, because they defeat
 * the product's core purpose (letting the patient communicate in their
 * own voice). The model is ~1.2B and chat-tuned, so some drift is expected;
 * this filter is the safety net.
 */
const CAREGIVER_VOICE_PATTERNS: RegExp[] = [
  /\bthe patient\b/i,

  // "your X" where X is something the patient has/experiences
  /\byour (pain|condition|family|comfort|throat|body|chest|stomach|back|symptoms|vitals|breathing|glasses|water|blanket|medication|medicine|bed|call button|meal|room|IV|oxygen|dressing|bandage|chart|vitals|temperature)\b/i,

  // "you (verb)" — caregiver addressing patient
  /\byou (are|feel|need|should|might|can|will|want|look|seem|have|had|must|may|could) /i,

  // Caregiver actions: "getting/bringing/fetching your X", "I'll (do thing for you)"
  /\b(getting|bringing|fetching|grabbing|finding|preparing|calling) your\b/i,
  /\bI['’]?ll (stay|help|check|bring|call|assist|be|get|fetch|find|grab|prepare)\b/i,
  /\bI will (help|check|assist|bring|call|stay|get|fetch|find|grab|prepare)\b/i,
  /\bI['’]?m (getting|bringing|fetching|grabbing|finding|preparing|calling) (your|the) /i,

  // Acknowledgment-reflex phrases a listener says back (therapist/nurse
  // mirroring), not words a patient would add to their own sentence.
  /^I understand\b/i,
  /^I hear (you|that)\b/i,
  /^I see\b/i,
  /^I get (it|that)\b/i,
  /^(that|it)['’]?s (okay|ok|fine|alright)\b/i,
  /^(don['’]?t|do not) (worry|be (scared|afraid))\b/i,
  /^you['’]?ll be (okay|fine|alright)\b/i,
  /^you are (not alone|safe|in good hands)\b/i,
  /^take your time\b/i,
  /^everything (will|is going to) be\b/i,

  // Caregiver dialogue openers
  /\blet me (know|check|help|see|look|get|bring)\b/i,
  /\bI['’]?m here (to|for) (help|support|listen|assist|you)/i,
  /\btell me (what|how|if|about|where|when)\b/i,
  /\bhow (are|do|is) you\b/i,
  /\b(do you want to|do you need) (describe|tell|share|explain)\b/i,
  /^let['’]?s\b/i,

  // Plural / team voice ("we'll…", "we're here…")
  /\b(we|we['’]re|we are) (going to|here|trying|working|reassess|['’]ll|going)\b/i,
  /\bwe['’]ll /i,

  // Third-person hospital-staff references
  /\bthe nurse (is|will|says|should|can|came|should be|is coming)\b/i,
  /\bthe doctor (is|will|says|should|can|came|should be|is coming)\b/i,

  // Generic "help/support the patient" phrasing
  /\bto (help|assist|support|comfort) (you|the patient)\b/i,
  /\btrying to (understand|help|support)\b/i,
  /\bmatters most\b/i,
  /\bfind a way forward\b/i,
  /\byour (comfort|safety|recovery|well[\s-]?being) (matters|is|comes)\b/i,
  /\bI need your help\b/i,
];

function isCaregiverVoice(s: string): boolean {
  return CAREGIVER_VOICE_PATTERNS.some((re) => re.test(s));
}

/**
 * Try to extract a JSON array of strings from the model's raw output.
 *
 * The prompt asks for ONLY a bare JSON array, but small models occasionally
 * prepend/append commentary or wrap in a code fence. This pulls the first
 * `[...]` block out (if any) and attempts to parse it. Returns null if
 * nothing parseable was found.
 */
function tryParseJsonArray(raw: string): string[] | null {
  // Strip code fences the model sometimes adds despite the "no code fence"
  // instruction.
  const stripped = raw.replace(/```(?:json)?/gi, "").trim();
  const match = stripped.match(/\[[\s\S]*?\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

/**
 * Heuristic fallback for when the model emits something other than a
 * valid JSON array. Walks through line-splitting, comma-splitting, and
 * common list-prefix cleanup.
 */
function parseHeuristic(rawOutput: string): string[] {
  const lines = rawOutput.split("\n");
  let items: string[] = [];
  for (const line of lines) {
    if (line.includes(",") && !/[.?!]$/.test(line.trim())) {
      items.push(...line.split(","));
    } else {
      items.push(line);
    }
  }
  if (items.length <= 1 && rawOutput.length > 30) {
    const numbered = rawOutput.split(/(?=\d+[\.\)])/);
    if (numbered.length > 2) items = numbered;
  }
  return items;
}

/**
 * Parse the model's raw text output into individual completion strings.
 *
 * Primary path: the model returns a JSON array like `["scared", "dizzy"]`
 * and we JSON.parse it. Fallback path: heuristic line/comma splitting for
 * the cases where the model ignored the JSON instruction.
 *
 * Finally a cleanup pipeline: strip echoed partial, enforce length bounds,
 * drop caregiver-voice and duplicates.
 */
function parseCompletions(rawOutput: string, partial?: string): string[] {
  const json = tryParseJsonArray(rawOutput);
  const items = json !== null ? json : parseHeuristic(rawOutput);
  const partialLower = partial?.toLowerCase().trim() ?? "";

  return items
    .map((s) => s.trim())
    .map((s) => s.replace(/^\d+[\.\)]\s*/, ""))
    .map((s) => s.replace(/^[-•*]\s*/, ""))
    .map((s) => s.replace(/^["'""]|["'""]$/g, ""))
    .map((s) => s.replace(/[.,]$/, ""))
    .map((s) => s.trim())
    .map((s) => {
      if (partialLower && s.toLowerCase().startsWith(partialLower)) {
        return s.slice(partialLower.length).trim();
      }
      return s;
    })
    .filter((s) => s.length >= 3 && s.length <= 60)
    .filter((s) => !isCaregiverVoice(s))
    .filter((s, i, arr) => arr.findIndex((t) => t.toLowerCase() === s.toLowerCase()) === i)
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;

  switch (type) {
    case "init": {
      const { modelUrl } = event.data as { type: "init"; modelUrl: string };
      await handleInit(modelUrl);
      break;
    }

    case "complete": {
      const { prompt, partial, context, priorPhrases, maxTokens, fewShot, requestId } = event.data as {
        type: "complete";
        prompt?: string;
        partial?: string;
        context?: string;
        priorPhrases?: string[];
        maxTokens: number;
        fewShot?: FewShotExample[];
        requestId?: number;
      };
      await handleComplete(
        partial ?? prompt ?? "",
        maxTokens,
        context,
        priorPhrases,
        fewShot,
        requestId,
      );
      break;
    }

    default:
      console.warn(`${LOG_PREFIX} Unknown message type: ${type}`);
  }
};
