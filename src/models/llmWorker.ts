/**
 * Web Worker for Gemma 3 1B ONNX inference.
 *
 * Handles sentence completion for the Sentence Builder (Layer 2).
 * Receives prompts, runs inference via ONNX Runtime, and returns
 * completion suggestions for hospitalized patients.
 *
 * Model: onnx-community/gemma-3-1b-it-ONNX (q4 variant)
 * Files: model_q4.onnx + model_q4.onnx_data (~860 MB), tokenizer.json (19 MB)
 *
 * ONNX tensor names (standard Transformers causal LM export):
 *   Inputs:  input_ids (int64 [batch, seq_len])
 *            attention_mask (int64 [batch, seq_len])
 *            past_key_values.{0..25}.key (float32, KV cache — q4 variant uses float32)
 *            past_key_values.{0..25}.value (float32, KV cache)
 *   Outputs: logits (float32 [batch, seq_len, vocab_size])
 *            present.{0..25}.key (float32, updated KV cache)
 *            present.{0..25}.value (float32, updated KV cache)
 */

import * as ort from "onnxruntime-web/webgpu";

ort.env.logLevel = "error";
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  ort.env.wasm.numThreads = 1;
}

const LOG_PREFIX = "[OwnVoice:LLM]";

/** Gemma 3 1B has 26 transformer layers. */
const NUM_LAYERS = 26;

/** Gemma 3 1B head dimensions (1 merged KV head, head_dim=256 in ONNX export). */
const NUM_KV_HEADS = 1;
const HEAD_DIM = 256;

/** Gemma special token IDs (from tokenizer.json added_tokens). */
const TOKEN_PAD = 0;
const TOKEN_EOS = 1;
const TOKEN_BOS = 2;
const TOKEN_UNK = 3;

/**
 * System prompt uses pattern-completion format.
 *
 * The model sees examples of "partial" → comma-separated completions,
 * then must continue the pattern for the actual input. Examples show
 * completions at DIFFERENT DEPTHS to teach the model that continuations
 * must naturally append to the partial sentence:
 *
 * - Short partial ("I feel") → topic words ("scared", "dizzy")
 * - Longer partial ("I am scared") → continuation phrases ("of the surgery")
 * - Action partial ("can you") → specific requests ("call my family")
 *
 * This teaches the model: if you read "partial + completion" aloud,
 * it must sound like a natural sentence.
 */
const SYSTEM_PROMPT = `Finish the patient's sentence. Write ONLY the next few words that naturally continue it, comma-separated.

"I feel" → scared, dizzy, better today, cold, nauseous, weak, lonely, confused
"I am scared" → of the surgery, to be alone, about what's happening, and I need someone, of the needles, please stay with me
"I need help" → getting up, breathing, with the pain, reaching the button, right now, going to the bathroom
"can you" → call my family, get the nurse, explain what's happening, stay with me, adjust my bed, turn off the light`;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

interface TokenizerJSON {
  model: {
    type: string;
    vocab: Record<string, number>;
    merges: string[];
  };
  added_tokens: Array<{
    id: number;
    content: string;
    special: boolean;
  }>;
}

/**
 * Minimal BPE tokenizer that loads from HuggingFace tokenizer.json format.
 *
 * Implements:
 * - Vocab lookup (token string -> id)
 * - BPE merge pairs for subword tokenization
 * - Special token encoding (<bos>, <start_of_turn>, <end_of_turn>, etc.)
 * - Greedy decode (id -> token string)
 *
 * Gemma's tokenizer uses SentencePiece-style BPE where spaces are encoded
 * as the Unicode block character U+2581 (▁) in the vocab.
 */
class GemmaTokenizer {
  private vocab: Map<string, number> = new Map();
  private idToToken: Map<number, string> = new Map();
  private merges: Array<[string, string]> = [];
  private mergeRanks: Map<string, number> = new Map();
  private specialTokens: Map<string, number> = new Map();

  /** The "space" marker used in SentencePiece vocabularies. */
  private static readonly SPACE_MARKER = "\u2581";

  /** Token IDs for chat template markers. Populated during load. */
  startOfTurnId = -1;
  endOfTurnId = -1;

  async load(url: string): Promise<void> {
    console.log(`${LOG_PREFIX} Loading tokenizer from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tokenizer: HTTP ${response.status}`);
    }

    const data: TokenizerJSON = await response.json();

    // Load vocabulary
    for (const [token, id] of Object.entries(data.model.vocab)) {
      this.vocab.set(token, id);
      this.idToToken.set(id, token);
    }

    // Load special/added tokens (overwrite if they collide with vocab)
    for (const tok of data.added_tokens) {
      this.specialTokens.set(tok.content, tok.id);
      this.idToToken.set(tok.id, tok.content);
      if (tok.content === "<start_of_turn>") this.startOfTurnId = tok.id;
      if (tok.content === "<end_of_turn>") this.endOfTurnId = tok.id;
    }

    // Load BPE merge rules (handles both string and array formats)
    for (let i = 0; i < data.model.merges.length; i++) {
      const merge = data.model.merges[i];
      let a: string, b: string;
      if (Array.isArray(merge)) {
        // Array format: ["token_a", "token_b"]
        [a, b] = merge;
      } else {
        // String format: "token_a token_b"
        const parts = (merge as string).split(" ");
        if (parts.length !== 2) continue;
        [a, b] = parts;
      }
      this.merges.push([a, b]);
      this.mergeRanks.set(`${a} ${b}`, i);
    }

    console.log(
      `${LOG_PREFIX} Tokenizer loaded: ${this.vocab.size} vocab, ` +
        `${this.merges.length} merges, ${this.specialTokens.size} special tokens`,
    );

    // Verify critical special tokens were found
    if (this.startOfTurnId < 0 || this.endOfTurnId < 0) {
      console.warn(
        `${LOG_PREFIX} Chat template tokens not found in added_tokens. ` +
          `Falling back to vocab lookup.`,
      );
      // Try vocab as fallback
      if (this.startOfTurnId < 0) {
        this.startOfTurnId = this.vocab.get("<start_of_turn>") ?? -1;
      }
      if (this.endOfTurnId < 0) {
        this.endOfTurnId = this.vocab.get("<end_of_turn>") ?? -1;
      }
    }
  }

  /**
   * Encode text to token IDs.
   *
   * Handles the Gemma chat template format. Special tokens embedded in the
   * text (like <bos>, <start_of_turn>, etc.) are detected and mapped to their
   * IDs directly; remaining text segments are BPE-encoded.
   */
  encode(text: string): number[] {
    const ids: number[] = [];

    // Split text on special tokens, keeping the delimiters
    const specialPattern = this.buildSpecialTokenRegex();
    const segments = text.split(specialPattern);

    for (const segment of segments) {
      if (segment === "") continue;

      // Check if this segment is a special token
      const specialId = this.specialTokens.get(segment);
      if (specialId !== undefined) {
        ids.push(specialId);
        continue;
      }

      // BPE-encode the text segment
      const segmentIds = this.bpeEncode(segment);
      ids.push(...segmentIds);
    }

    return ids;
  }

  /**
   * Decode a single token ID back to its string representation.
   * Replaces the SentencePiece space marker (▁) with a regular space.
   */
  decode(ids: number[]): string {
    const pieces: string[] = [];
    for (const id of ids) {
      const token = this.idToToken.get(id);
      if (token !== undefined) {
        // Skip special tokens in decoded output
        if (this.specialTokens.has(token)) continue;
        pieces.push(token);
      }
    }
    return pieces
      .join("")
      .replaceAll(GemmaTokenizer.SPACE_MARKER, " ");
  }

  /**
   * Decode a single token ID to its raw string (for incremental decode).
   */
  decodeToken(id: number): string {
    const token = this.idToToken.get(id);
    if (token === undefined) return "";
    if (this.specialTokens.has(token)) return "";
    return token.replaceAll(GemmaTokenizer.SPACE_MARKER, " ");
  }

  // -----------------------------------------------------------------------
  // BPE internals
  // -----------------------------------------------------------------------

  /**
   * BPE-encode a text segment (no special tokens).
   *
   * Gemma/SentencePiece convention: leading space becomes ▁, and the
   * text is first split into individual UTF-8 characters (represented
   * as vocab entries), then iteratively merged using the merge table.
   */
  private bpeEncode(text: string): number[] {
    if (text.length === 0) return [];

    // SentencePiece-style: replace spaces with ▁
    const normalized = text.replaceAll(" ", GemmaTokenizer.SPACE_MARKER);

    // Start with individual characters
    let symbols: string[] = [...normalized];

    // Iteratively apply the lowest-ranked merge pair
    while (symbols.length > 1) {
      let bestIdx = -1;
      let bestRank = Infinity;

      for (let i = 0; i < symbols.length - 1; i++) {
        const pair = `${symbols[i]} ${symbols[i + 1]}`;
        const rank = this.mergeRanks.get(pair);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }

      if (bestIdx < 0) break; // No more merges possible

      // Apply the merge
      const merged = symbols[bestIdx] + symbols[bestIdx + 1];
      symbols = [
        ...symbols.slice(0, bestIdx),
        merged,
        ...symbols.slice(bestIdx + 2),
      ];
    }

    // Map symbols to IDs
    const ids: number[] = [];
    for (const sym of symbols) {
      const id = this.vocab.get(sym);
      if (id !== undefined) {
        ids.push(id);
      } else {
        // Character-level fallback: encode unknown chars as individual bytes
        // or use UNK token
        ids.push(TOKEN_UNK);
      }
    }

    return ids;
  }

  /**
   * Build a regex that splits text on special token boundaries
   * while keeping the special tokens as separate segments.
   */
  private buildSpecialTokenRegex(): RegExp {
    const escaped = Array.from(this.specialTokens.keys())
      .sort((a, b) => b.length - a.length) // longest first
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`(${escaped.join("|")})`);
  }
}

// ---------------------------------------------------------------------------
// ONNX Session + Generation
// ---------------------------------------------------------------------------

let session: ort.InferenceSession | null = null;
let tokenizer: GemmaTokenizer | null = null;

/**
 * Initialize the ONNX inference session and tokenizer.
 *
 * Loads tokenizer.json first (fast), then the ONNX model (slow).
 * Uses WebGPU execution provider when available, falls back to WASM.
 */
async function handleInit(modelUrl: string): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing from ${modelUrl}`);

  try {
    // 1. Load tokenizer
    tokenizer = new GemmaTokenizer();
    await tokenizer.load(modelUrl + "tokenizer.json");

    // 2. Load ONNX model
    console.log(`${LOG_PREFIX} Loading ONNX model...`);

    const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] =
      [];

    if ("gpu" in self.navigator) {
      executionProviders.push("webgpu");
      console.log(`${LOG_PREFIX} WebGPU available, using as primary EP`);
    } else {
      console.log(`${LOG_PREFIX} WebGPU not available, using WASM EP`);
    }
    executionProviders.push("wasm");

    // Fetch model as ArrayBuffer and specify external data file location
    // so ONNX Runtime resolves the companion _data file in worker context
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

    console.log(`${LOG_PREFIX} Model session created successfully`);
    console.log(
      `${LOG_PREFIX} Input names: ${session.inputNames.join(", ")}`,
    );
    console.log(
      `${LOG_PREFIX} Output names: ${session.outputNames.join(", ")}`,
    );

    self.postMessage({ type: "ready" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load model";
    console.error(`${LOG_PREFIX} Init error:`, err);
    self.postMessage({ type: "error", message });
  }
}

/**
 * Build the Gemma chat-template prompt.
 *
 * Format:
 *   <bos><start_of_turn>user
 *   {system}\n\n{user message}<end_of_turn>
 *   <start_of_turn>model
 *
 * The system message is folded into the first user turn per Gemma convention
 * (from the chat_template in tokenizer_config.json).
 */
function buildPrompt(partial: string, context?: string): string {
  // Pattern-completion: the model sees examples ending with " → completions"
  // and continues the same pattern for the actual input.
  // Context (time, conversation) goes between the examples and the input.
  const contextLine = context ? `(${context}) ` : "";
  return (
    `<bos><start_of_turn>user\n` +
    `${SYSTEM_PROMPT}\n` +
    `${contextLine}"${partial}" →<end_of_turn>\n` +
    `<start_of_turn>model\n`
  );
}

/**
 * Create empty KV cache tensors for the initial forward pass.
 *
 * Each layer has a key and value tensor of shape
 * [batch=1, num_kv_heads, seq_len=0, head_dim].
 */
function createEmptyKVCache(): Record<string, ort.Tensor> {
  const cache: Record<string, ort.Tensor> = {};
  for (let i = 0; i < NUM_LAYERS; i++) {
    cache[`past_key_values.${i}.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_KV_HEADS, 0, HEAD_DIM],
    );
    cache[`past_key_values.${i}.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, NUM_KV_HEADS, 0, HEAD_DIM],
    );
  }
  return cache;
}

/**
 * Extract updated KV cache tensors from model output.
 *
 * The ONNX model outputs `present.N.key` / `present.N.value` which become
 * the `past_key_values.N.key` / `past_key_values.N.value` inputs for the
 * next autoregressive step.
 */
function extractKVCache(
  results: ort.InferenceSession.OnnxValueMapType,
): Record<string, ort.Tensor> {
  const cache: Record<string, ort.Tensor> = {};
  for (let i = 0; i < NUM_LAYERS; i++) {
    const key = results[`present.${i}.key`];
    const value = results[`present.${i}.value`];
    if (key) cache[`past_key_values.${i}.key`] = key;
    if (value) cache[`past_key_values.${i}.value`] = value;
  }
  return cache;
}

/**
 * Check whether the ONNX model expects KV cache inputs.
 *
 * Some ONNX exports omit KV cache entirely (no past_key_values in the
 * input list). In that case we skip cache feeding and just re-run
 * the full sequence each step.
 */
function modelUsesKVCache(): boolean {
  if (!session) return false;
  return session.inputNames.some((n) => n.startsWith("past_key_values"));
}

/** Sampling parameters for sentence completion generation. */
const TEMPERATURE = 0.8;
const TOP_K = 40;

/**
 * Sample the next token from logits using temperature-scaled top-k sampling.
 *
 * 1. Extract logits for the last position in the sequence
 * 2. Apply temperature scaling (lower = more deterministic, higher = more random)
 * 3. Keep only the top-k highest logits, zero out the rest
 * 4. Convert to probabilities via softmax
 * 5. Sample from the resulting distribution
 *
 * This produces diverse completions from the model — critical for
 * generating 8 different suggestions from a single prompt.
 */
function sampleToken(logits: ort.Tensor, seqLen: number): number {
  const vocabSize = logits.dims[2];
  const data = logits.data as Float32Array;
  const offset = (seqLen - 1) * vocabSize;

  // Build (id, logit) pairs for the last position
  const candidates: Array<{ id: number; logit: number }> = [];
  for (let i = 0; i < vocabSize; i++) {
    candidates.push({ id: i, logit: data[offset + i] });
  }

  // Sort descending by logit and keep top-k
  candidates.sort((a, b) => b.logit - a.logit);
  const topK = candidates.slice(0, TOP_K);

  // Apply temperature scaling and softmax
  const scaled = topK.map((c) => c.logit / TEMPERATURE);
  const maxScaled = scaled[0]; // already sorted descending
  const exps = scaled.map((s) => Math.exp(s - maxScaled)); // subtract max for numerical stability
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sumExp);

  // Sample from the distribution
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) return topK[i].id;
  }
  return topK[topK.length - 1].id;
}

/**
 * Run autoregressive generation to produce sentence completions.
 *
 * Strategy:
 * 1. Encode the full prompt (system + partial sentence) to input_ids
 * 2. Run a prefill pass with the full input sequence
 * 3. Autoregressively generate tokens, feeding KV cache when supported
 * 4. Stop on EOS, newline-heavy output, or maxTokens
 * 5. Decode generated tokens and split into completion lines
 */
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

    const useCache = modelUsesKVCache();
    const generatedIds: number[] = [];
    let currentIds = inputIds;
    let kvCache: Record<string, ort.Tensor> = useCache
      ? createEmptyKVCache()
      : {};
    let totalSeqLen = inputIds.length;

    for (let step = 0; step < maxTokens; step++) {
      // Build input tensors
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
        ...kvCache,
      };

      // Run inference
      const results = await session.run(feeds);

      // Extract logits and sample next token
      const logits = results["logits"];
      if (!logits) {
        throw new Error(
          "Model did not return 'logits' tensor. " +
            `Available outputs: ${Object.keys(results).join(", ")}`,
        );
      }

      const nextToken = sampleToken(logits, currentIds.length);
      generatedIds.push(nextToken);

      // Stop conditions
      if (nextToken === TOKEN_EOS || nextToken === TOKEN_PAD) {
        console.log(
          `${LOG_PREFIX} Generation stopped: EOS/PAD at step ${step}`,
        );
        break;
      }

      // Stop if end_of_turn token is generated
      if (nextToken === tokenizer.endOfTurnId) {
        console.log(
          `${LOG_PREFIX} Generation stopped: <end_of_turn> at step ${step}`,
        );
        break;
      }

      // Update state for next step
      if (useCache) {
        kvCache = extractKVCache(results);
        // In cached mode, only feed the new token
        currentIds = [nextToken];
      } else {
        // Without cache, re-feed the full sequence
        currentIds = [...inputIds, ...generatedIds];
      }
      totalSeqLen = inputIds.length + generatedIds.length;
    }

    // Decode generated tokens to text
    const rawOutput = tokenizer.decode(generatedIds);
    const completions = parseCompletions(rawOutput, partial);

    console.log(
      `${LOG_PREFIX} Generated ${completions.length} completions ` +
        `(${generatedIds.length} tokens) for: "${partial}"`,
    );

    self.postMessage({ type: "completions", data: completions });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Inference failed";
    console.error(`${LOG_PREFIX} Completion error:`, err);
    self.postMessage({ type: "error", message });
  }
}

/**
 * Parse the model's raw text output into individual completion strings.
 *
 * Handles multiple output formats the small model may produce:
 * - Newline-separated lines (ideal)
 * - Comma-separated items: "water, help, the nurse"
 * - Numbered items without newlines: 1."text"2."text"
 * - Numbered items with dots/parens: "1. text" or "1) text"
 *
 * The `partial` parameter is used to strip echoed input from completions.
 * Small models often echo the partial: "I need a drink" instead of "a drink".
 * Stripping the partial recovers the actual continuation.
 */
function parseCompletions(rawOutput: string, partial?: string): string[] {
  // First try splitting on newlines
  let items = rawOutput.split("\n");

  // If we got a single long line, try other formats
  if (items.length <= 2 && rawOutput.length > 30) {
    // Try numbered patterns (e.g. "1." "2.")
    const numbered = rawOutput.split(/(?=\d+[\.\)])/);
    if (numbered.length > 2) {
      items = numbered;
    } else {
      // Try comma-separated
      items = rawOutput.split(",");
    }
  }

  const partialLower = partial?.toLowerCase().trim() ?? "";

  return items
    .map((s) => s.trim())
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "")) // strip "1. " or "1) "
    .map((s) => s.replace(/^[-•*]\s*/, "")) // strip bullet markers
    .map((s) => s.replace(/^["'""]|["'""]$/g, "")) // strip surrounding quotes
    .map((s) => s.replace(/\.$/, "")) // strip trailing period
    .map((s) => s.trim())
    .map((s) => {
      // Strip echoed partial from the start (model often echoes the input)
      if (partialLower && s.toLowerCase().startsWith(partialLower)) {
        return s.slice(partialLower.length).trim();
      }
      return s;
    })
    .filter((s) => s.length > 0 && s.length <= 40)
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
      // Support both old (prompt) and new (partial+context) message format
      await handleComplete(partial ?? prompt ?? "", maxTokens, context);
      break;
    }

    default:
      console.warn(`${LOG_PREFIX} Unknown message type: ${type}`);
  }
};
