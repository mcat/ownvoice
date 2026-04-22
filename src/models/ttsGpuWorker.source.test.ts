/**
 * Source-level smoke tests for the WebGPU TTS worker.
 *
 * The worker in `public/tts-gpu-worker.js` runs in a DedicatedWorker with
 * real WebGPU + ONNX Runtime — neither available in unit-test environments.
 * These tests therefore read the worker source as text and assert against
 * known anti-patterns that previously caused production regressions.
 *
 * This is a **scaffold**, not a comprehensive test. Extend it when new
 * bug classes are discovered in the worker.
 *
 * How to add a new check:
 *   1. Find a production bug whose root cause had a mechanical signature
 *      in the source (an anti-pattern, a missing pattern, a constant that
 *      must stay in sync with another file).
 *   2. Add an `it(...)` that fails when the signature is present/absent.
 *   3. Include the commit hash in the comment so the next engineer can
 *      understand why the check exists.
 *
 * These tests run in the normal Vitest suite; no browser or model
 * artifacts required.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Vitest's jsdom env doesn't give a file-scheme import.meta.url, so we
// resolve the worker path from the project root (the vitest cwd) instead.
// The worker lives at a stable path so this doesn't move.
const WORKER_PATH = path.resolve(process.cwd(), "public/tts-gpu-worker.js");
const WORKER_SRC = fs.readFileSync(WORKER_PATH, "utf-8");

/**
 * Pull the text of `async function handleInit(…) { … }` out of the
 * worker source so tests can check patterns within it without false
 * positives from other functions.
 */
function extractHandleInitBody(): string {
  const match = WORKER_SRC.match(
    /async\s+function\s+handleInit[\s\S]*?\n}\s*(?=\n(?:async\s+)?function\s|\n\/\*\*|$)/,
  );
  if (!match) {
    throw new Error("handleInit function not found in worker source");
  }
  return match[0];
}

describe("tts-gpu-worker source — known-regression anti-patterns", () => {
  it("does not pass .subarray() views to ort.Tensor (regression: commit 63f30a5)", () => {
    // Background: commit a819118 "optimized" the decode loop by
    // pre-allocating Int32Arrays and handing out .subarray() views as
    // Tensor inputs across successive run() calls. On WebGPU this
    // produced `GatherBlockQuantized: idx=<garbage> must be within
    // [-8196,8195]` because ORT Web's WebGPU backend does not reliably
    // handle input Tensors whose backing ArrayBuffer is shared via
    // subarray views. Fixed in 63f30a5 by switching to fresh typed
    // arrays per run.
    //
    // This test guards against accidental re-introduction.
    const antipattern = /new\s+ort\.Tensor\s*\([^)]*\.subarray\s*\(/g;
    const matches = WORKER_SRC.match(antipattern) ?? [];
    expect(
      matches,
      `Found ${matches.length} \`ort.Tensor(…, x.subarray(…), …)\` pattern(s). ` +
      `The backing ArrayBuffer of a .subarray() view is shared with the parent ` +
      `TypedArray and any sibling views, which ORT Web's WebGPU backend does ` +
      `not handle safely across run() calls. Pass a freshly-allocated typed ` +
      `array instead.\n\nMatches: ${JSON.stringify(matches, null, 2)}`,
    ).toEqual([]);
  });

  it("does not reuse a mutated single-slot TypedArray across run() calls", () => {
    // Same regression class as the subarray check. The original fix also
    // removed a pattern like:
    //   const stepPosIds = new Int32Array(1);
    //   for (...) { stepPosIds[0] = newLen - 1; run({position_ids: stepPosIds}); }
    // In-place mutation of a single-element array passed to ORT across
    // successive runs has the same "shared backing" hazard. A fresh
    // `new Int32Array([newLen - 1])` per step is the safe idiom.
    //
    // Heuristic check: look for a TypedArray declared OUTSIDE the decode
    // loop whose name ends in "PosIds" (or similar) and is mutated
    // inside the loop. A perfect static detector is out of scope; this
    // matches the specific shape that bit us.
    const suspectDecl = /const\s+\w*[pP]osIds\w*\s*=\s*new\s+Int32Array\(1\)\s*;/;
    expect(
      WORKER_SRC.match(suspectDecl),
      "Found a single-slot Int32Array (likely a reused position_ids buffer) " +
      "declared outside the decode loop. Use `new Int32Array([value])` inside " +
      "the loop instead — ORT Web cannot safely reuse the backing across runs.",
    ).toBeNull();
  });
});

describe("tts-gpu-worker source — performance-sensitive patterns", () => {
  it("parallelizes model loads in handleInit via Promise.all", () => {
    // Regression guard: commit a819118 replaced sequential
    // `await createSession(...)` calls with `Promise.all([...])` that
    // loads the tokenizer alongside ORT sessions. On iPad this saves
    // 1-3s of cold boot. A future refactor that accidentally fully
    // serializes these would regress that win silently.
    const handleInitBody = extractHandleInitBody();
    expect(
      handleInitBody,
      "handleInit must load models via Promise.all — fully sequential " +
      "awaits add 1-3s of cold-boot latency on iPad.",
    ).toMatch(/Promise\.all\s*\(/);
    // Spot-check: the full handleInit should orchestrate at least three
    // createSession calls (embed_tokens, language_model, decoder).
    const createSessionCount = (handleInitBody.match(/createSession\s*\(/g) ?? [])
      .length;
    expect(createSessionCount).toBeGreaterThanOrEqual(3);
  });

  it("does not create multiple ORT sessions concurrently (regressions: initWasm race, webgpuRegisterBuffer)", () => {
    // Three races have bitten handleInit while trying to parallelize
    // model loads:
    //   1. Fully-parallel creation throws
    //      "multiple calls to 'initWasm()' detected" because ORT Web's
    //      WASM runtime init is one-time-per-worker.
    //   2. Even serializing ONE session first and parallelizing the
    //      other two (LM + decoder) silently leaves the LM's WebGPU EP
    //      init half-baked — it falls back to WASM but keeps its
    //      gpu-buffer preferredOutputLocation, so every subsequent
    //      run() fails with:
    //        "Invalid session handle passed to webgpuRegisterBuffer"
    //   3. On pure WASM EP the LM is 100-1000× slower — effectively
    //      unusable.
    //
    // Empirically the only parallelism safe in handleInit is
    //   [non-ORT work] + [ONE createSession]
    // which lets us keep the tokenizer fetch overlapping one session
    // without risking ORT's runtime setup. All session creations are
    // otherwise sequential.
    //
    // This test encodes that invariant: no Promise.all block inside
    // handleInit may contain 2+ createSession calls.
    const handleInitBody = extractHandleInitBody();
    const promiseAllBlocks = handleInitBody.matchAll(
      /Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/g,
    );
    const violations: Array<{ block: string; count: number }> = [];
    for (const match of promiseAllBlocks) {
      const inner = match[1];
      const count = (inner.match(/createSession\s*\(/g) ?? []).length;
      if (count >= 2) violations.push({ block: match[0], count });
    }
    expect(
      violations,
      "Found Promise.all block(s) containing 2+ createSession calls. " +
      "ORT Web's runtime setup is not concurrency-safe for multiple " +
      "session creations. Serialize session creations; parallelism is " +
      "only safe when paired with non-ORT work (e.g. the tokenizer fetch).\n\n" +
      JSON.stringify(violations, null, 2),
    ).toEqual([]);
  });

  it("disposes prior-step GPU-backed KV cache tensors inside the decode loop", () => {
    // Regression guard: the 702-phrase pain-matrix pre-gen pass would
    // exhaust iPad memory if the LM's KV cache output tensors (pinned
    // to gpu-buffer via preferredOutputLocation) weren't explicitly
    // disposed after each run consumed them as past_key_values.* inputs.
    //
    // This check is coarse on purpose — it only verifies the tracking
    // array and the disposal call exist. A missing `priorGpuKV.push()`
    // or `t.dispose()` would make the pain-matrix run OOM on device.
    expect(
      WORKER_SRC,
      "Worker must track GPU-backed KV tensors per step in a `priorGpuKV` " +
      "array (or equivalent) and dispose them after the next run consumes them.",
    ).toMatch(/priorGpuKV/);
    expect(
      WORKER_SRC,
      "Worker must call `.dispose?.()` on prior GPU-backed KV tensors.",
    ).toMatch(/dispose\?\.\(\)/);
  });
});

describe("tts-gpu-worker source — concurrency invariants", () => {
  it("serializes per-session access with lmChain and decoderChain", () => {
    // Regression guard: without per-session serialization, a main-thread
    // timeout+retry posted a second synth while the first was still
    // mid-decode. Concurrent .run() on the same ORT session corrupts
    // both runs and effectively stalled the 702-phrase pain matrix
    // (2 phrases in hours, observed pre-fix).
    //
    // Issue #56 split the old `synthChain` into two independent chains
    // so that phrase N+1's LM (WebGPU) can overlap phrase N's decoder
    // (WASM). Both chains must still exist — removing either would
    // either re-introduce the concurrent-session corruption (no chain)
    // or collapse the pipeline back to serial (one chain).
    expect(
      WORKER_SRC,
      "Worker must maintain an `lmChain` promise chain to serialize " +
        "LM runs on languageModelSession.",
    ).toMatch(/let\s+lmChain\s*=\s*Promise\.resolve\s*\(\s*\)/);
    expect(
      WORKER_SRC,
      "Worker must maintain a `decoderChain` promise chain to serialize " +
        "decoder runs on conditionalDecoderSession.",
    ).toMatch(/let\s+decoderChain\s*=\s*Promise\.resolve\s*\(\s*\)/);
    // LM[N] must be enqueued behind LM[N-1]: the synthesize handler
    // builds `lmPromise` from `lmChain.then(...)` and reassigns lmChain
    // to that promise (with its error swallowed — see next test).
    expect(
      WORKER_SRC,
      "Synthesize handler must extend lmChain via `lmChain.then(...)`.",
    ).toMatch(/lmChain\.then\s*\(/);
  });

  it("lets phrase N+1 LM overlap phrase N decoder via Promise.all", () => {
    // The whole point of issue #56: the decoder chain must await BOTH
    // (a) its own LM result and (b) the previous decoder's completion,
    // while the LM chain for the next phrase is already free to start.
    // That cross-phase synchronization is expressed as
    // `Promise.all([lmPromise, decoderChain...])` in the message handler.
    //
    // If a refactor replaces that with `decoderChain.then(() => runDecoder)`
    // alone, we serialize end-to-end again and lose the pipeline win —
    // hence the explicit Promise.all assertion.
    expect(
      WORKER_SRC,
      "decoderChain must await both its own LM result and the previous " +
        "decoder via Promise.all([lmPromise, ...]) — otherwise phrase N+1 " +
        "LM cannot overlap phrase N decoder and #56's throughput gain is lost.",
    ).toMatch(/Promise\.all\s*\(\s*\[\s*lmPromise\s*,\s*decoderChain/);
  });

  it("resets chain rejection so one bad phrase doesn't wedge the pipeline", () => {
    // Loose error policy (chosen when implementing #56): a single phrase
    // failure posts an error for its own id but leaves both chains in a
    // resolved state so subsequent phrases pipeline normally. Both
    // chains must therefore be reassigned to a `.catch(() => {})` form
    // after their primary work — a rejected chain would poison every
    // later `.then()`.
    //
    // We expect at least two `.catch(() => {})` patterns: one for the
    // lmChain reset, one for the decoderChain input to Promise.all
    // (so a previous decoder's rejection doesn't cascade into this
    // phrase's id).
    const resetCatches = WORKER_SRC.match(/\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g) ?? [];
    expect(
      resetCatches.length,
      "Expected at least two `.catch(() => {})` chain-resets in the " +
        "synthesize handler — one for lmChain, one for the previous " +
        "decoderChain passed into Promise.all. Removing either risks " +
        "wedging the pipeline after the first failure.",
    ).toBeGreaterThanOrEqual(2);
  });

  it("echoes the request `id` on both audio and error responses", () => {
    // Regression guard: without request IDs the main-thread listener for
    // synth N can receive the late "audio" message from a timed-out
    // synth M and resolve with M's audio — caching the wrong bytes for
    // N's phrase. Every outgoing response must include the originating
    // request's `id` so the main thread can discard mismatches.
    //
    // Heuristic: both postMessage shapes for "audio" and "error"
    // emitted by the synth path must include an `id` key.
    const audioPost = WORKER_SRC.match(
      /postMessage\s*\(\s*\{\s*type:\s*["']audio["'][\s\S]*?\}/,
    );
    expect(
      audioPost,
      "Could not find the `audio` postMessage in the worker source.",
    ).not.toBeNull();
    expect(
      audioPost?.[0] ?? "",
      "Worker must include `id` on the `audio` response message.",
    ).toMatch(/\bid\b/);

    // Synth-path error responses must also include id. With the dual
    // chain, per-phrase error posts live inside `decoderChain.catch(...)`
    // — we don't check the init-path error, which has no request id by
    // design.
    const synthErrorPost = WORKER_SRC.match(
      /decoderChain[\s\S]*?postMessage\s*\(\s*\{\s*type:\s*["']error["'][\s\S]*?\}\s*\)/,
    );
    expect(
      synthErrorPost,
      "Could not find the synth-path `error` postMessage (inside the " +
        "decoderChain .catch).",
    ).not.toBeNull();
    expect(
      synthErrorPost?.[0] ?? "",
      "Synth-path error responses must include `id` so the main thread can " +
        "correlate them with the originating request.",
    ).toMatch(/\bid\b/);
  });
});

describe("all ORT workers — multi-threaded WASM gating", () => {
  // The WASM conditional decoder is ~24× real-time on single-thread;
  // enabling threading requires COOP+COEP (which the dev server and
  // sw.js both provide) to make `crossOriginIsolated === true`. Every
  // worker that touches ORT must fall back cleanly when those headers
  // are absent — e.g. first-load before the SW installs — so we never
  // trip a SharedArrayBuffer-unavailable runtime error.
  //
  // All five sources get the same gate; a refactor that removes it from
  // any one of them would silently regress pre-gen throughput on that
  // path. Assert on all of them in one place.
  const sources = [
    { path: "public/tts-gpu-worker.js", label: "tts-gpu-worker" },
    { path: "public/stt-gpu-worker.js", label: "stt-gpu-worker" },
    { path: "src/models/ttsWorker.ts", label: "ttsWorker" },
    { path: "src/models/llmWorker.ts", label: "llmWorker" },
    { path: "src/models/sttWorker.ts", label: "sttWorker" },
  ];

  for (const { path: relPath, label } of sources) {
    it(`${label}: gates numThreads on crossOriginIsolated`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(
        src,
        `${label} must gate numThreads on self.crossOriginIsolated rather ` +
          "than setting a fixed thread count. Without the gate, " +
          "single-thread environments would hit a SharedArrayBuffer error.",
      ).toMatch(/numThreads\s*=\s*self\.crossOriginIsolated/);
    });
  }
});

describe("tts-gpu-worker source — token-constant invariants", () => {
  it("uses vocab-size-consistent speech control tokens", () => {
    // Chatterbox Turbo's vocab_size is 6563 (per config.json). The
    // control tokens live at the top of the range:
    //   START_SPEECH_TOKEN = 6561
    //   STOP_SPEECH_TOKEN  = 6562
    // A drift between these and the model would cause the decoder to
    // receive control tokens in its speech-only stream or clip the
    // generation prematurely. Hard-check the numeric values so a
    // refactor that accidentally changes one trips the test.
    expect(WORKER_SRC).toMatch(/const\s+START_SPEECH_TOKEN\s*=\s*6561\s*;/);
    expect(WORKER_SRC).toMatch(/const\s+STOP_SPEECH_TOKEN\s*=\s*6562\s*;/);
    expect(WORKER_SRC).toMatch(/const\s+SILENCE_TOKEN\s*=\s*4299\s*;/);
  });
});
