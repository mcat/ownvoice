/**
 * Denoiser Web Worker — DeepFilterNet3 (DF3), combined-graph ONNX export.
 *
 * One-shot denoise of a short (≤30 s) audio clip — designed for the
 * voice-clone enrollment path, where a recording made in a hospital room
 * is cleaned before it reaches the Chatterbox speech encoder. Not a
 * realtime streaming worker; the whole clip is processed in one pass.
 *
 * Model contract (from our re-traced export, see ownvoice-denoiser repo):
 *   - Input frame:  480 samples (10 ms @ 48 kHz)
 *   - Output frame: 480 samples, delayed by 30 ms (3-frame lookahead)
 *   - State: 12 named tensors round-tripped frame-to-frame as new_* → *
 *   - State init MUST be non-zero for two tensors (see STATE_INIT below);
 *     zero-init produces NaN via divide-by-sqrt(0).
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "denoise", audio: Float32Array, sampleRate: number }
 *   { type: "shutdown" }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "progress", loaded: number, total: number }
 *   { type: "denoised", audio: Float32Array, sampleRate: number }
 *   { type: "error", message: string }
 */

import * as ort from "onnxruntime-web";
import { ORT_VERSION } from "./assetVersions";
import { linearResample } from "./resample";

ort.env.logLevel = "error";
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = `/ort/${ORT_VERSION}/`;
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
    : 1;
}

const LOG_PREFIX = "[OwnVoice:Denoiser]";

const TARGET_SAMPLE_RATE = 48_000;
const FRAME_SAMPLES = 480; // 10 ms hop @ 48 kHz
const LOOKAHEAD_FRAMES = 3; // df_lookahead=2 + framing → 30 ms output lag

// ─── State shapes ──────────────────────────────────────────────────
//
// Names + dims match the ONNX graph inputs (and corresponding `new_*`
// outputs). Order is not significant for `session.run` feeds, but the
// list is kept stable here so the post-step output→input rotation
// stays readable.
const STATE_SPECS: ReadonlyArray<{ name: string; dims: number[] }> = [
  { name: "erb_norm_state", dims: [32] },
  { name: "band_unit_norm_state", dims: [1, 96, 1] },
  { name: "analysis_mem", dims: [480] },
  { name: "synthesis_mem", dims: [480] },
  { name: "rolling_erb_buf", dims: [1, 1, 3, 32] },
  { name: "rolling_feat_spec_buf", dims: [1, 2, 3, 96] },
  { name: "rolling_c0_buf", dims: [1, 64, 5, 96] },
  { name: "rolling_spec_buf_x", dims: [5, 481, 2] },
  { name: "rolling_spec_buf_y", dims: [7, 481, 2] },
  { name: "enc_hidden", dims: [1, 1, 256] },
  { name: "erb_dec_hidden", dims: [2, 1, 256] },
  { name: "df_dec_hidden", dims: [2, 1, 256] },
] as const;

/**
 * Build the initial state. Two tensors require non-zero priming —
 * zero-init divides through a sqrt(0) inside the graph and produces
 * NaN output forever after. The linspace ranges come from the
 * grazder/torchDF reference export.
 */
function initialState(): Record<string, ort.Tensor> {
  const state: Record<string, ort.Tensor> = {};
  for (const spec of STATE_SPECS) {
    const length = spec.dims.reduce((a, b) => a * b, 1);
    const data = new Float32Array(length);
    if (spec.name === "erb_norm_state") {
      // linspace(-60, -90, 32) — log-amplitude scale, descending.
      for (let i = 0; i < 32; i++) data[i] = -60 + ((-90 - -60) * i) / 31;
    } else if (spec.name === "band_unit_norm_state") {
      // linspace(0.001, 0.0001, 96) — small positive values to avoid
      // divide-by-zero in the per-band normalization layer.
      for (let i = 0; i < 96; i++) data[i] = 0.001 + ((0.0001 - 0.001) * i) / 95;
    }
    state[spec.name] = new ort.Tensor("float32", data, spec.dims);
  }
  return state;
}

/** Move each `new_<name>` output back to the bare `<name>` input slot. */
function rotateState(
  results: ort.InferenceSession.OnnxValueMapType,
): Record<string, ort.Tensor> {
  const next: Record<string, ort.Tensor> = {};
  for (const spec of STATE_SPECS) {
    const t = results[`new_${spec.name}`];
    if (!t) throw new Error(`denoiser missing output: new_${spec.name}`);
    next[spec.name] = t as ort.Tensor;
  }
  return next;
}

// ─── Session lifecycle ─────────────────────────────────────────────

let session: ort.InferenceSession | null = null;

async function downloadModel(url: string): Promise<ArrayBuffer> {
  console.log(`${LOG_PREFIX} Downloading model from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
    self.postMessage({ type: "progress", loaded, total });
  }
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  console.log(`${LOG_PREFIX} Download complete (${(loaded / 1e6).toFixed(1)} MB)`);
  return combined.buffer;
}

async function handleInit(modelUrl: string): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing with URL: ${modelUrl}`);
  const bytes = await downloadModel(modelUrl);
  session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    logSeverityLevel: 3,
  });
  console.log(
    `${LOG_PREFIX} Session ready. inputs=[${session.inputNames.length}] outputs=[${session.outputNames.length}]`,
  );
  self.postMessage({ type: "ready" });
}

// ─── Denoise ───────────────────────────────────────────────────────

/**
 * Denoise an audio buffer. The model emits each output frame 30 ms
 * after the corresponding input frame, so we append 3 frames of silence
 * to the input to let the lookahead drain, then trim the leading 30 ms
 * off the result so the output aligns with the input timeline.
 */
async function handleDenoise(
  audio: Float32Array,
  sampleRate: number,
): Promise<void> {
  if (!session) throw new Error("Denoiser not initialized");

  const inputDurationSec = audio.length / sampleRate;
  console.log(
    `${LOG_PREFIX} Denoising ${inputDurationSec.toFixed(2)} s (in: ${sampleRate} Hz)`,
  );

  const audio48k = linearResample(audio, sampleRate, TARGET_SAMPLE_RATE);

  // Pad to whole frames + drain frames for the 30 ms lookahead.
  const inputFrames = Math.ceil(audio48k.length / FRAME_SAMPLES);
  const totalFrames = inputFrames + LOOKAHEAD_FRAMES;
  const padded = new Float32Array(totalFrames * FRAME_SAMPLES);
  padded.set(audio48k);

  const enhanced = new Float32Array(totalFrames * FRAME_SAMPLES);
  let state = initialState();
  const t0 = performance.now();

  for (let f = 0; f < totalFrames; f++) {
    // ort.Tensor copies the data on construction in WASM EP, so handing it
    // a subarray view of `padded` is safe and avoids a per-frame allocation.
    const frame = padded.subarray(f * FRAME_SAMPLES, (f + 1) * FRAME_SAMPLES);
    const inputTensor = new ort.Tensor("float32", frame, [FRAME_SAMPLES]);
    const results = await session.run({ input_frame: inputTensor, ...state });
    const out = results["enhanced_audio_frame"];
    if (!out) throw new Error("denoiser missing output: enhanced_audio_frame");
    enhanced.set(out.data as Float32Array, f * FRAME_SAMPLES);
    state = rotateState(results);
  }

  // Discard the lookahead delay at the start, then trim trailing pad
  // to match the original 48 kHz length.
  const lookaheadSamples = LOOKAHEAD_FRAMES * FRAME_SAMPLES;
  const aligned = enhanced.subarray(
    lookaheadSamples,
    lookaheadSamples + audio48k.length,
  );

  const out = linearResample(aligned, TARGET_SAMPLE_RATE, sampleRate);
  const elapsed = (performance.now() - t0) / 1000;
  const rtf = elapsed / inputDurationSec;
  console.log(
    `${LOG_PREFIX} Done in ${elapsed.toFixed(2)} s (RTF ${rtf.toFixed(2)}x)`,
  );

  self.postMessage({ type: "denoised", audio: out, sampleRate });
}

// ─── Message handler ───────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "init":
        await handleInit(msg.modelUrl);
        break;
      case "denoise":
        await handleDenoise(msg.audio, msg.sampleRate);
        break;
      case "shutdown":
        try {
          await session?.release();
        } catch {
          /* swallow — tearing down */
        }
        session = null;
        self.close();
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
