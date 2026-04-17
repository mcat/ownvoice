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
 * Chatterbox Turbo ONNX files (q4f16 variant).
 * 4-component pipeline: speech_encoder (setup only) + embed_tokens + language_model + conditional_decoder.
 */
export const CHATTERBOX_FILES = {
  speechEncoder: { onnx: "speech_encoder_q4f16.onnx", data: "speech_encoder_q4f16.onnx_data" },
  embedTokens: { onnx: "embed_tokens_q4f16.onnx", data: "embed_tokens_q4f16.onnx_data" },
  languageModel: { onnx: "language_model_q4f16.onnx", data: "language_model_q4f16.onnx_data" },
  conditionalDecoder: { onnx: "conditional_decoder_q4f16.onnx", data: "conditional_decoder_q4f16.onnx_data" },
  tokenizer: "tokenizer.json",
} as const;

export const CHATTERBOX_TOKENS = {
  START_SPEECH: 6561,
  STOP_SPEECH: 6562,
  MAX_NEW_TOKENS: 1024,
  SAMPLE_RATE: 24000,
} as const;

/** Base URLs for model downloads. Dev uses local paths, production uses CDN. */
export const MODEL_URLS = {
  tts: "/models/chatterbox-turbo/",
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
