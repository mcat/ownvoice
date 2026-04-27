/**
 * Chatterbox-Multilingual ONNX component contracts
 * (verified via Phase 1.2 model inspection)
 *
 * embed_tokens.onnx
 *   inputs:  input_ids (int64), position_ids (int64), exaggeration (fp32 [batch_size])
 *   outputs: inputs_embeds (fp32 [batch, seq, 1024])
 *
 * speech_encoder.onnx (same as Turbo)
 *   inputs:  audio_values (fp32)
 *   outputs: audio_features, audio_tokens (int64), speaker_embeddings (fp32 [batch, 192]),
 *            speaker_features (fp32 [batch, feat, 80])
 *
 * language_model_q4.onnx (Llama, 30 layers, int4 weights + fp32 activations)
 *   inputs:  inputs_embeds (fp32 [batch, seq, 1024]), attention_mask (int64),
 *            past_key_values.0..29.{key,value} (fp16 [batch, 16, past, 64])
 *   outputs: logits (fp32 [batch, seq, 8194]),
 *            present.0..29.{key,value} (fp16)
 *   No position_ids input (positions are absorbed into embed_tokens).
 *
 * conditional_decoder.onnx (same as Turbo)
 *   inputs:  speech_tokens (int64), speaker_embeddings (fp32 [batch, 192]),
 *            speaker_features (fp32 [batch, feat, 80])
 *   outputs: waveform (fp32 [batch, num_samples])
 *
 * T3Config constants verified upstream:
 *   START_SPEECH_TOKEN = 6561
 *   STOP_SPEECH_TOKEN = 6562
 *   speech_tokens_dict_size = 8194 (logits last dim)
 *   max_speech_tokens = 4096
 */

export type ModelId = "tts" | "tts-encoder" | "llm" | "stt";

export type ModelStatus = "idle" | "downloading" | "loading" | "ready" | "error";

export interface LoadProgress {
  model: ModelId;
  status: ModelStatus;
  loaded: number; // bytes downloaded
  total: number; // total bytes
  error?: string;
}

/** A single user/assistant exchange used as few-shot in the LLM prompt. */
export interface FewShotExample {
  user: string;
  assistant: string;
}

/** Messages sent TO a model worker */
export type WorkerRequest =
  | { type: "init"; modelUrl: string }
  | { type: "embed"; audio: Float32Array; sampleRate: number }
  | { type: "synthesize"; text: string; embedding: Float32Array }
  | {
      type: "complete";
      partial?: string;
      prompt?: string;
      context?: string;
      maxTokens: number;
      fewShot?: FewShotExample[];
      requestId?: number;
    }
  | { type: "transcribe"; audio: Float32Array; sampleRate: number };

/** Messages sent FROM a model worker */
export type WorkerResponse =
  | { type: "ready" }
  | { type: "progress"; loaded: number; total: number }
  | { type: "embedding"; data: Float32Array }
  | { type: "audio"; data: Float32Array; sampleRate: number }
  | { type: "completions"; data: string[] }
  | { type: "transcript"; text: string }
  | { type: "error"; message: string };

/**
 * Chatterbox-Multilingual ONNX files.
 * 4-component pipeline: speech_encoder (setup only) + embed_tokens + language_model + conditional_decoder.
 * Speech encoder is fp32 (one-time enrollment, embedding quality is permanent).
 * Language model is q4 (int4 weights + fp32 activations) — bumped from
 * q4f16 to recover activation precision across 30 layers; embed_tokens and
 * conditional_decoder are unquantised.
 */
export const CHATTERBOX_FILES = {
  speechEncoder: { onnx: "speech_encoder.onnx", data: "speech_encoder.onnx_data" },
  embedTokens: { onnx: "embed_tokens.onnx", data: "embed_tokens.onnx_data" },
  languageModel: { onnx: "language_model_q4.onnx", data: "language_model_q4.onnx_data" },
  conditionalDecoder: { onnx: "conditional_decoder.onnx", data: "conditional_decoder.onnx_data" },
  tokenizer: "tokenizer.json",
} as const;

export const CHATTERBOX_TOKENS = {
  START_SPEECH: 6561,
  STOP_SPEECH: 6562,
  // logits last dim — speech vocab size; positions 6563..8193 are not valid speech codes,
  // mask them in the autoregressive sampling loop alongside START.
  SPEECH_VOCAB_SIZE: 8194,
  MAX_NEW_TOKENS: 1024,
  SAMPLE_RATE: 24000,
  // LM architecture (Llama, 30 layers vs Turbo's 24-layer GPT-2).
  NUM_LAYERS: 30,
  NUM_HEADS: 16,
  HEAD_DIM: 64,
  EMBED_DIM: 1024,
} as const;

/** Base URLs for model downloads. Dev uses local paths, production uses CDN. */
export const MODEL_URLS = {
  tts: "/models/chatterbox-multilingual/",
  llm: "/models/lfm2-1.2b-instruct/",
  stt: "/models/whisper-small/",
} as const;

/**
 * Sampling defaults recommended by the LFM2 model card.
 * https://huggingface.co/LiquidAI/LFM2-1.2B
 */
export const LFM2_SAMPLING = {
  temperature: 0.3,
  minP: 0.15,
  repetitionPenalty: 1.05,
  topK: 40,
} as const;

/** Chat-template marker strings in the LFM2 tokenizer. */
export const LFM2_CHAT_TOKENS = {
  bos: "<|startoftext|>",
  turnStart: "<|im_start|>",
  turnEnd: "<|im_end|>",
} as const;
