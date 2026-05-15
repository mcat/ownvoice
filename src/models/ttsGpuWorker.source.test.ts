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
  it("serializes synthesize calls through a promise chain", () => {
    // Regression guard: without serialization, a main-thread timeout+retry
    // posted a second synth while the first was still mid-decode. Two
    // concurrent handleSynthesize calls contend for the same ORT sessions
    // and WebGPU queue, corrupting both runs and effectively stalling the
    // 702-phrase pain matrix (2 phrases in hours, observed pre-fix).
    //
    // Require the worker to chain synths onto a single promise so at
    // most one handleSynthesize is active at a time.
    expect(
      WORKER_SRC,
      "Worker must maintain a `synthChain` (or equivalent) promise chain " +
        "to serialize synthesize calls. Concurrent ORT session.run() is " +
        "not safe.",
    ).toMatch(/synthChain\s*=\s*Promise\.resolve\s*\(\s*\)/);
    expect(
      WORKER_SRC,
      "Worker must chain each synthesize onto synthChain via .then().",
    ).toMatch(/synthChain\s*=\s*synthChain\.then\s*\(/);
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

    // Error responses in the synth path (inside the synthChain .catch)
    // must also include id. We don't check the init-path error, which
    // has no request id by design.
    const synthErrorPost = WORKER_SRC.match(
      /synthChain[\s\S]*?postMessage\s*\(\s*\{\s*type:\s*["']error["'][\s\S]*?\}\s*\)/,
    );
    expect(
      synthErrorPost,
      "Could not find the synth-path `error` postMessage.",
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
  // The Vite-bundled workers share `workerOrtEnv.ts` and just call
  // `configureOrtWasmEnv()`; the plain-JS GPU worker inlines the gate.
  // A refactor that removes the gate from either site would silently
  // regress pre-gen throughput.
  it("workerOrtEnv: gates numThreads on crossOriginIsolated", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/models/workerOrtEnv.ts"),
      "utf-8",
    );
    expect(
      src,
      "workerOrtEnv must gate numThreads on self.crossOriginIsolated " +
        "rather than setting a fixed thread count. Without the gate, " +
        "single-thread environments would hit a SharedArrayBuffer error.",
    ).toMatch(/numThreads\s*=\s*self\.crossOriginIsolated/);
  });

  it("tts-gpu-worker: gates numThreads on crossOriginIsolated", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "public/tts-gpu-worker.js"),
      "utf-8",
    );
    expect(src).toMatch(/numThreads\s*=\s*self\.crossOriginIsolated/);
  });

  const bundledWorkers = [
    { path: "src/models/ttsWorker.ts", label: "ttsWorker" },
    { path: "src/models/sttWorker.ts", label: "sttWorker" },
    { path: "src/models/denoiserWorker.ts", label: "denoiserWorker" },
  ];

  for (const { path: relPath, label } of bundledWorkers) {
    it(`${label}: invokes configureOrtWasmEnv at module top`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(
        src,
        `${label} must call configureOrtWasmEnv() so it inherits the ` +
          "crossOriginIsolated-gated thread count from the shared helper.",
      ).toMatch(/configureOrtWasmEnv\s*\(\s*\)/);
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
