/**
 * Source-level smoke tests for the TTS conditional decoder worker.
 *
 * The worker in `public/tts-decoder-worker.js` runs in a DedicatedWorker
 * with real ONNX Runtime WASM — neither available in unit-test
 * environments. These tests read the worker source as text and assert
 * against known-regression anti-patterns and invariants that must hold
 * for synthesis to be correct.
 *
 * This file is a scaffold, not comprehensive. Extend when new bug
 * classes are discovered.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const WORKER_PATH = path.resolve(
  process.cwd(),
  "public/tts-decoder-worker.js",
);
const WORKER_SRC = fs.readFileSync(WORKER_PATH, "utf-8");

describe("tts-decoder-worker source — session ownership", () => {
  it("owns exactly one ORT session (the conditional decoder)", () => {
    // The whole reason this worker exists is to isolate the conditional
    // decoder's WASM runtime from the LM worker's WASM runtime (see #56
    // postmortem). Introducing additional sessions here would either
    // (a) re-create the concurrent-WASM corruption we split the worker
    // to avoid, or (b) signal an unrelated scope creep that should be
    // its own worker instead.
    expect(
      WORKER_SRC,
      "Decoder worker must declare conditionalDecoderSession exactly once.",
    ).toMatch(/let\s+conditionalDecoderSession\s*=\s*null/);

    // Count unique session identifiers — none of the LM-worker sessions
    // should appear here.
    expect(WORKER_SRC).not.toMatch(/embedTokensSession/);
    expect(WORKER_SRC).not.toMatch(/languageModelSession/);
    expect(WORKER_SRC).not.toMatch(/language_model_q4f16/);
    expect(WORKER_SRC).not.toMatch(/embed_tokens_q4f16/);
  });

  it("loads conditional_decoder_q4f16.onnx with external data", () => {
    // The q4f16 variant ships its quantized weights in a separate
    // `.onnx_data` file. Missing externalData wiring means ORT tries
    // to resolve the weights from the graph and silently degrades or
    // outright fails. Check both that the filename is referenced and
    // that the loader wires externalData in its opts.
    expect(WORKER_SRC).toMatch(/conditional_decoder_q4f16\.onnx/);
    expect(
      WORKER_SRC,
      "Session creation must set an `externalData` entry so the " +
        "`.onnx_data` weights file loads alongside the graph.",
    ).toMatch(/\bexternalData\b\s*=\s*\[/);
  });
});

describe("tts-decoder-worker source — concurrency invariants", () => {
  it("serializes decode calls through a single promise chain", () => {
    // ORT Web forbids concurrent `.run()` against the same session. The
    // original synthChain in tts-gpu-worker.js exists for this reason;
    // the decoder worker needs the same guarantee since pipelined
    // callers send decoder requests back-to-back once the LM worker
    // starts emitting `lmResult` responses.
    expect(
      WORKER_SRC,
      "Worker must maintain a `decoderChain` promise chain to serialize " +
        "decode calls on conditionalDecoderSession.",
    ).toMatch(/let\s+decoderChain\s*=\s*Promise\.resolve\s*\(\s*\)/);
    expect(
      WORKER_SRC,
      "Decode handler must extend decoderChain via `decoderChain.then(...)`.",
    ).toMatch(/decoderChain\s*=\s*decoderChain\.then\s*\(/);
  });

  it("echoes the request `id` on both audio and error responses", () => {
    // Without request IDs the main-thread listener for synth N could
    // receive the late `audio` message from a timed-out synth M and
    // cache M's bytes under N's key. Every outgoing response must
    // include the originating request's `id`.
    const audioPost = WORKER_SRC.match(
      /postMessage\s*\(\s*\{\s*type:\s*["']audio["'][\s\S]*?\}/,
    );
    expect(
      audioPost,
      "Could not find the `audio` postMessage in the decoder worker source.",
    ).not.toBeNull();
    expect(
      audioPost?.[0] ?? "",
      "Worker must include `id` on the `audio` response message.",
    ).toMatch(/\bid\b/);

    // Decode-path error responses must also carry id. Init-path errors
    // have no request id by design and are not checked here.
    const decodeErrorPost = WORKER_SRC.match(
      /decoderChain[\s\S]*?postMessage\s*\(\s*\{\s*type:\s*["']error["'][\s\S]*?\}\s*\)/,
    );
    expect(
      decodeErrorPost,
      "Could not find the decode-path `error` postMessage (inside the " +
        "decoderChain handler).",
    ).not.toBeNull();
    expect(
      decodeErrorPost?.[0] ?? "",
      "Decode-path error responses must include `id` so the main thread " +
        "can correlate them with the originating request.",
    ).toMatch(/\bid\b/);
  });
});
