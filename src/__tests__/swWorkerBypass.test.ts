/**
 * Drift guard for the service worker's worker-script bypass.
 *
 * public/sw.js is plain JS outside the Vite/TS build, so nothing else
 * type-checks or tests it. These tests parse the WORKER_SCRIPT_PATTERN
 * literal out of the source and verify it against the worker URLs the
 * app actually creates. Context: on iPad Safari, worker scripts served
 * through the SW's wrapped responses fail with "access control checks"
 * (WebKit mediation quirk) — every bundled worker entry MUST be listed
 * in the bypass pattern. The denoiser worker was missed when the
 * stt/tts bypass landed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const swSource = readFileSync(
  resolve(__dirname, "../../public/sw.js"),
  "utf-8",
);

function extractWorkerScriptPattern(src: string): RegExp {
  const m = src.match(/const WORKER_SCRIPT_PATTERN =\s*([\s\S]*?);/);
  if (!m) throw new Error("WORKER_SCRIPT_PATTERN not found in public/sw.js");
  const literal = m[1].trim();
  if (!literal.startsWith("/") || !literal.endsWith("/")) {
    throw new Error(`WORKER_SCRIPT_PATTERN is not a bare regex literal: ${literal}`);
  }
  return new RegExp(literal.slice(1, -1));
}

const pattern = extractWorkerScriptPattern(swSource);

describe("sw.js WORKER_SCRIPT_PATTERN", () => {
  it.each([
    "/stt-gpu-worker.js",
    "/tts-gpu-worker.js",
    "/assets/sttWorker-CuX2alHH.js",
    "/assets/ttsWorker-Ab12_-.js",
    // src/models/denoiserClient.ts creates this worker with the same
    // `new Worker(new URL(...), { type: "module" })` shape as stt/tts,
    // so Vite emits /assets/denoiserWorker-<hash>.js and it needs the
    // same SW bypass.
    "/assets/denoiserWorker-Zx9q3kPa.js",
  ])("bypasses %s", (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each([
    "/assets/logSink-abc123.js",
    "/assets/index-abc123.js",
    "/models/2026-05-24/whisper-small.en/encoder.onnx",
    "/assets/sttWorker-abc123.js.map",
    "/assets/denoiserWorker-.js", // empty hash is not a Vite output name
    "/app/",
  ])("does not bypass %s", (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});

describe("sw.js cache versioning", () => {
  it("declares a numbered ownvoice-v<N> cache name", () => {
    expect(swSource).toMatch(/const CACHE_NAME = "ownvoice-v\d+"/);
  });
});
