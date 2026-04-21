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

  it("does not start 3+ ORT sessions concurrently on a cold worker (regression: initWasm race)", () => {
    // ORT Web's initWasm() is a one-time routine. The WebGPU backend's
    // JSEP shim and all WASM-EP sessions touch it, so creating 3 sessions
    // concurrently on a cold worker throws:
    //   Error: multiple calls to 'initWasm()' detected
    // which cascades to "removing requested execution provider 'webgpu'"
    // and silently downgrades synthesis to pure WASM (100-1000× slower).
    //
    // The safe pattern is to serialize ONE session first (to drive the
    // one-time initWasm) then parallelize the rest. This test guards the
    // constraint by ensuring no single Promise.all group contains 3+
    // createSession calls.
    const handleInitBody = extractHandleInitBody();
    const promiseAllBlocks = handleInitBody.matchAll(
      /Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/g,
    );
    const violations: Array<{ block: string; count: number }> = [];
    for (const match of promiseAllBlocks) {
      const inner = match[1];
      const count = (inner.match(/createSession\s*\(/g) ?? []).length;
      if (count >= 3) violations.push({ block: match[0], count });
    }
    expect(
      violations,
      "Found Promise.all block(s) containing 3+ createSession calls. " +
      "ORT Web's initWasm() is not concurrency-safe on a cold worker — " +
      "serialize one session first, then parallelize the rest.\n\n" +
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
