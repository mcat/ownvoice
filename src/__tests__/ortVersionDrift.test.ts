/**
 * Drift guard: the plain-JS GPU workers in public/ hardcode the ORT
 * asset path because they live outside the Vite/TS build — the bundler
 * can't interpolate ORT_VERSION for them. When assetVersions.ts bumps,
 * these strings silently keep loading the old runtime (best case a 404
 * after the R2 prune; worst case a subtle .mjs/.wasm version mismatch).
 * This test fails the build until every reference is updated.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ORT_VERSION } from "../models/assetVersions";

const WORKERS = ["tts-gpu-worker.js", "stt-gpu-worker.js"] as const;

describe.each(WORKERS)("public/%s ORT version pinning", (worker) => {
  const src = readFileSync(
    resolve(__dirname, "../../public", worker),
    "utf-8",
  );

  it(`imports the ORT runtime from /ort/${ORT_VERSION}/`, () => {
    expect(src).toContain(`from "/ort/${ORT_VERSION}/ort.webgpu.min.mjs"`);
  });

  it(`points wasmPaths at /ort/${ORT_VERSION}/`, () => {
    expect(src).toContain(`ort.env.wasm.wasmPaths = "/ort/${ORT_VERSION}/"`);
  });

  it("references no other ORT version anywhere", () => {
    const versions = [...src.matchAll(/\/ort\/(v[\d.]+)\//g)].map((m) => m[1]);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(new Set(versions)).toEqual(new Set([ORT_VERSION]));
  });
});
