import * as ort from "onnxruntime-web";
import { ORT_VERSION } from "./assetVersions";

/**
 * Configure the ORT WASM env for a Web Worker context.
 *
 * Multi-threaded WASM is gated on `crossOriginIsolated` (page + SW
 * must serve COOP+COEP); silently falls back to single-thread otherwise.
 * Thread count is capped at 4 to match the GPU worker — see
 * `public/tts-gpu-worker.js` for the rationale.
 *
 * `wasmPaths` resolves to `/ort/<ORT_VERSION>/`, served in prod by a
 * Pages Function backed by R2 (`functions/ort/[[path]].ts`) and in
 * dev by a Vite middleware that rewrites to `public/ort/<file>` (see
 * `vite.config.ts`).
 */
export function configureOrtWasmEnv(): void {
  ort.env.logLevel = "error";
  if (ort.env?.wasm) {
    ort.env.wasm.wasmPaths = `/ort/${ORT_VERSION}/`;
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
      : 1;
  }
}
