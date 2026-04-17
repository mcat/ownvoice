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
import { LFM2_CHAT_TOKENS, LFM2_SAMPLING } from "./types";

ort.env.logLevel = "error";
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  ort.env.wasm.numThreads = 1;
}

const LOG_PREFIX = "[OwnVoice:LLM]";

/**
 * System prompt uses pattern-completion format. See PRD §Layer-2 for the
 * rationale. Two things it has to get right:
 *   1. Voice. The patient is speaking TO a nurse/doctor, first-person. The
 *      model must not slip into caregiver voice ("I'm here to support you")
 *      or third-person ("The patient is feeling...").
 *   2. Grammar. Every completion must append cleanly: reading the partial
 *      followed by the completion aloud must form one grammatical sentence.
 *      Few-shot examples all demonstrate direct append (no lead-ins like
 *      "I am scared" following "I feel" — that produces "I feel I am scared").
 */
const SYSTEM_PROMPT = `You are a hospitalized patient texting your nurse. Finish your own sentence in your own voice. Write ONLY the next few words that naturally continue it — each completion is 1-6 words that read as one sentence when joined to the start. Return 6-8 different short completions, comma-separated.

"I feel" → scared, dizzy, better today, cold, nauseous, weak, lonely, confused
"I am" → thirsty, tired, in pain, scared, cold, hungry, ready to rest, feeling a little better
"My pain is" → getting worse, in my stomach, sharp, about a 7, unbearable, in my back, spreading, less than before
"it hurts" → when I breathe, a lot, every time I move, right here, to swallow, more now, less than before
"I need" → water, the nurse, my glasses, to use the bathroom, more blankets, help sitting up, my family here
"can you" → call my family, get the nurse, explain what's happening, stay with me, adjust my bed, turn off the light
"please" → call my family, help me sit up, bring me water, get the doctor, stay with me, come closer`;

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
function buildPrompt(partial: string, context?: string): string {
  // Normalize the partial to match the case of the few-shot examples.
  // Without this, lowercase inputs ("i feel") push the model away from the
  // few-shot patterns and toward chatbot-assistant voice ("I'm here to
  // listen…"), which the caregiver filter then drops — leaving the UI's
  // AI suggestion row empty.
  const normalized =
    partial.length > 0
      ? partial.charAt(0).toUpperCase() + partial.slice(1)
      : partial;
  const contextLine = context ? `[Context: ${context}]\n` : "";
  return (
    `${LFM2_CHAT_TOKENS.turnStart}system\n` +
    `${SYSTEM_PROMPT}${LFM2_CHAT_TOKENS.turnEnd}\n` +
    `${LFM2_CHAT_TOKENS.turnStart}user\n` +
    `${contextLine}"${normalized}" →${LFM2_CHAT_TOKENS.turnEnd}\n` +
    `${LFM2_CHAT_TOKENS.turnStart}assistant\n`
  );
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
  context?: string,
): Promise<void> {
  if (!session || !tokenizer) {
    self.postMessage({ type: "error", message: "Model not initialized" });
    return;
  }

  try {
    const fullPrompt = buildPrompt(partial, context);
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

    self.postMessage({ type: "completions", data: completions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inference failed";
    console.error(`${LOG_PREFIX} Completion error:`, err);
    self.postMessage({ type: "error", message });
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
 * Parse the model's raw text output into individual completion strings.
 *
 * Handles multiple formats the small model may produce:
 * - Newline-separated lines (ideal)
 * - Comma-separated items: "water, help, the nurse"
 * - Numbered items with dots/parens: "1. text" or "1) text"
 *
 * The `partial` parameter is used to strip echoed input from completions.
 * Small models often echo the partial: "I need a drink" instead of "a drink".
 * Stripping the partial recovers the actual continuation.
 *
 * Finally, a caregiver-voice post-filter drops items like "Your pain is…"
 * or "I'm here to help…" that defeat the patient-communication purpose.
 */
function parseCompletions(rawOutput: string, partial?: string): string[] {
  // Start with newline-split lines, then split further on commas. The model
  // frequently groups short completions comma-separated within a line, which
  // without this step would produce one huge pill per line.
  const lines = rawOutput.split("\n");
  let items: string[] = [];
  for (const line of lines) {
    if (line.includes(",") && !/[.?!]$/.test(line.trim())) {
      // Looks like a list — split on commas
      items.push(...line.split(","));
    } else {
      items.push(line);
    }
  }

  // Fallback if the entire output was one long line
  if (items.length <= 1 && rawOutput.length > 30) {
    const numbered = rawOutput.split(/(?=\d+[\.\)])/);
    if (numbered.length > 2) items = numbered;
  }

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
      const { prompt, partial, context, maxTokens } = event.data as {
        type: "complete";
        prompt?: string;
        partial?: string;
        context?: string;
        maxTokens: number;
      };
      await handleComplete(partial ?? prompt ?? "", maxTokens, context);
      break;
    }

    default:
      console.warn(`${LOG_PREFIX} Unknown message type: ${type}`);
  }
};
