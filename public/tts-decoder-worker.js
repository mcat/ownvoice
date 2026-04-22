/**
 * WebGPU TTS — conditional decoder worker.
 *
 * This worker owns ONE ONNX session: `conditional_decoder_q4f16.onnx`, on
 * the WASM execution provider. It exists solely so the decoder runs in its
 * own ORT runtime, fully isolated from the LM worker.
 *
 * Why two workers instead of one: earlier attempts at pipelining LM and
 * decoder across phrases (see #56 / PR #82 original commit) tried to run
 * phrase N+1's LM concurrently with phrase N's decoder inside a single
 * worker. That worker also runs `embed_tokens` on WASM (Metal
 * GatherBlockQuantized bug prevents WebGPU for that op), so the LM loop's
 * per-step embed_tokens calls and the decoder's ConvTranspose ops ended up
 * sharing a single ORT WASM Module. Concurrent `session.run()` on two
 * different sessions against the same Module corrupted LM output
 * (generation stuttered / duplicated tokens — observed as drawn-out
 * speech on pre-gen audio). Each DedicatedWorker has its own ORT
 * runtime + WASM Module, so splitting the decoder off eliminates the
 * cross-session contention at the cost of one extra postMessage hop
 * per phrase.
 *
 * Messages IN:
 *   { type: "init", modelUrl: string }
 *   { type: "decode", decoderTokens: number[], speakerData: object, id: number }
 *
 * Messages OUT:
 *   { type: "ready" }
 *   { type: "audio", data: Float32Array, sampleRate: number, id: number }
 *   { type: "error", message: string, id?: number }
 *
 * Concurrency: `decoderChain` serializes decode requests. Only one
 * `conditionalDecoderSession.run()` runs at a time in this worker's
 * runtime — ORT Web forbids concurrent runs on the same session. Each
 * request's `id` is echoed on both audio and error responses so the
 * main thread can correlate responses with its in-flight promises.
 */

// Reuse the same ORT bundle as the other workers (already cached by the
// time this worker boots). The WebGPU build includes the WASM EP, which
// is all this worker actually uses — no WebGPU session is created here.
import * as ort from "/ort/ort.webgpu.min.mjs";

const LOG = "[OwnVoice:TTS:Dec]";
const SAMPLE_RATE = 24000;

// numThreads is gated on `crossOriginIsolated` — set only when COOP+COEP
// are in effect (prerequisite for SharedArrayBuffer and therefore
// multi-threaded WASM). Without threading the decoder is ~2-4× slower on
// iPad — pain-matrix pre-gen spends most of its wall clock here, so
// threading is the primary lever for pre-gen throughput.
// Capped at 4: iPad reports ~10 cores but this worker competes with the
// main thread, the LM worker's WebGPU queue, and any other ORT workers
// mid-inference. Past ~4 threads contention overhead outpaces parallelism
// on the decoder's ConvTranspose workload (ORT/Emscripten guidance).
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
    : 1;
}
ort.env.logLevel = "error";

let conditionalDecoderSession = null;

async function createSession(url) {
  const opts = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,
  };
  // q4f16 ONNX carries its quantized weights in an external `.onnx_data`
  // file sitting alongside the .onnx graph.
  const dataUrl = url + "_data";
  const dataFileName = url.split("/").pop() + "_data";
  opts.externalData = [{ path: dataFileName, data: dataUrl }];
  return ort.InferenceSession.create(url, opts);
}

async function handleInit(modelUrl) {
  const baseUrl = modelUrl.endsWith("/") ? modelUrl : modelUrl + "/";
  console.log(`${LOG} Initializing decoder worker...`);
  const t0 = performance.now();
  conditionalDecoderSession = await createSession(
    baseUrl + "conditional_decoder_q4f16.onnx",
  );
  console.log(
    `${LOG} Decoder loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`,
  );
  postMessage({ type: "ready" });
}

async function handleDecode(decoderTokens, speakerData, id) {
  if (!conditionalDecoderSession) {
    throw new Error("Decoder not initialized");
  }

  const t0 = performance.now();
  // Int64 inputs: this decoder variant uses the int64 typed graph (the
  // WebGPU-preferred int32 variant has ConvTranspose quantization
  // artifacts that trash audio quality — see closed PR #77).
  const speechTok = new ort.Tensor(
    "int64",
    BigInt64Array.from(decoderTokens.map(BigInt)),
    [1, decoderTokens.length],
  );
  const spkEmb = new ort.Tensor(
    "float32",
    new Float32Array(speakerData.speakerEmbeddings),
    speakerData.speakerEmbeddingsShape,
  );
  const spkFeat = new ort.Tensor(
    "float32",
    new Float32Array(speakerData.speakerFeatures),
    speakerData.speakerFeaturesShape,
  );

  const decResult = await conditionalDecoderSession.run({
    speech_tokens: speechTok,
    speaker_embeddings: spkEmb,
    speaker_features: spkFeat,
  });

  const wav = decResult["waveform"] ?? decResult["wav"];
  if (!wav) throw new Error("Decoder missing output: " + Object.keys(decResult));

  const audioData = new Float32Array(wav.data);
  console.log(
    `${LOG} Decoded ${decoderTokens.length} tokens → ${(
      audioData.length / SAMPLE_RATE
    ).toFixed(1)}s audio in ${((performance.now() - t0) / 1000).toFixed(1)}s`,
  );

  postMessage(
    { type: "audio", data: audioData, sampleRate: SAMPLE_RATE, id },
    [audioData.buffer],
  );
}

// Single-session serialization. Concurrent `conditionalDecoderSession.run()`
// calls on the same ORT session corrupt both runs (same ORT rule that
// forced the original synthChain in tts-gpu-worker.js). Decode requests
// from a pipelined caller arrive back-to-back; the chain ensures they
// run strictly in submission order.
//
// Errors are caught per-request and posted with the originating id so a
// single bad decode can't wedge the chain for subsequent phrases.
let decoderChain = Promise.resolve();

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

  if (msg.type === "decode") {
    decoderChain = decoderChain.then(() =>
      handleDecode(msg.decoderTokens, msg.speakerData, msg.id).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${LOG} Decode error:`, message);
        postMessage({ type: "error", message, id: msg.id });
      }),
    );
  }
});
