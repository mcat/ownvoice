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

import { MODELS_ASSET_PREFIX } from "./assetVersions";

export type ModelId = "tts" | "tts-encoder" | "stt";

export type ModelStatus =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "warm"
  | "error";

export interface LoadProgress {
  model: ModelId;
  status: ModelStatus;
  loaded: number; // bytes downloaded
  total: number; // total bytes
  error?: string;
}

/**
 * Advisory quality score for an enrollment recording. Computed by
 * `scoreVoiceSample` in voiceQuality.ts. Persisted alongside SpeakerData
 * to enable later clone-health views without a schema migration.
 */
export interface VoiceQualityResult {
  /** Overall 0-100 weighted score. */
  score: number;
  /** Per-dimension 0-100 sub-scores. Sub-scores are null when they cannot
   *  be measured meaningfully:
   *   - `pitchVariation` when median voicing confidence is below the
   *     dysphonia threshold (autocorrelation can't trust the F0 estimates).
   *   - `clipping`, `loudnessConsistency`, `spectralTilt` when the recording
   *     has too little voiced content (no-speech guard) — these dimensions
   *     measure "absence of degradation" and would otherwise reward silence
   *     with full marks.
   *  The aggregate ignores null entries and renormalises remaining weights. */
  breakdown: {
    snr: number;
    clipping: number | null;
    coverage: number;
    voicedFraction: number;
    pitchVariation: number | null;
    loudnessConsistency: number | null;
    spectralTilt: number | null;
  };
  /** Direction of spectral-tilt deviation, used by the tip selector. */
  spectralTiltDirection: "boomy" | "tinny" | "neutral";
  /** Bumped when the algorithm or weights change. */
  qualityVersion: number;
}

/**
 * Outputs from the Chatterbox-Multilingual speech encoder, stored and reused
 * for all synthesis calls. All arrays use JSON-safe types (number[]) so the
 * data can be persisted via zustand's JSON storage. BigInt64Array values
 * from ONNX are converted to number[] at extraction time and back at
 * synthesis time.
 */
export interface SpeakerData {
  condEmb: number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: number[];
  speakerFeaturesShape: number[];
  /** Optional: undefined for speakers enrolled before this feature shipped. */
  quality?: VoiceQualityResult;
}

/** Messages sent TO a model worker */
export type WorkerRequest =
  | { type: "init"; modelUrl: string; bench?: boolean }
  | { type: "warmup" }
  | { type: "embed"; audio: Float32Array; sampleRate: number; requestId: number }
  | { type: "synthesize"; text: string; embedding: Float32Array }
  | { type: "transcribe"; audio: Float32Array; sampleRate: number };

/** Messages sent FROM a model worker */
export type WorkerResponse =
  | { type: "ready" }
  | { type: "warm" }
  | { type: "progress"; loaded: number; total: number }
  | {
      type: "embed-progress";
      stage: "loading-model";
      loaded?: number;
      total?: number;
    }
  | {
      type: "embedding";
      data: SpeakerData;
      requestId: number;
    }
  | { type: "audio"; data: Float32Array; sampleRate: number }
  | { type: "transcript"; text: string }
  | {
      type: "error";
      message: string;
      requestId?: number;
      /** Phase the failure happened in. Lets the boot wiring tell apart
       *  init failures (mark model error), warmup failures (mark model
       *  error so UI can recover), and synthesis failures (log only,
       *  user can retry). */
      phase?: "init" | "warmup" | "synthesis" | "embed";
    };

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

/**
 * Base URLs for model downloads. Composed from MODELS_ASSET_PREFIX so a
 * single bump of MODELS_RELEASE in assetVersions.ts updates worker fetch
 * paths, the R2 upload key, the manifest baseUrl, and the prune keep-set
 * together. Both dev (Vite serves public/) and prod (Pages Function reads
 * R2) resolve the same versioned path.
 */
export const MODEL_URLS = {
  tts: `/${MODELS_ASSET_PREFIX}/chatterbox-multilingual/`,
  stt: `/${MODELS_ASSET_PREFIX}/whisper-small/`,
  denoiser: `/${MODELS_ASSET_PREFIX}/denoiser/denoiser_model.onnx`,
} as const;
