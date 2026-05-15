/**
 * Behavioural tests for `configureOrtWasmEnv`. These complement the
 * source-grep assertion in ttsGpuWorker.source.test.ts — that one gates
 * "the gate text exists in the source"; these gate "the gate produces
 * the right numThreads under each input."
 *
 * Strategy: stub the global `crossOriginIsolated` + `navigator`, mock
 * `onnxruntime-web` to capture env writes, `vi.resetModules` + dynamic
 * import per test so the helper picks up the freshly-stubbed globals
 * (the helper reads them only when it's called).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const envWrites: Array<{ key: string; value: unknown }> = [];

vi.mock("onnxruntime-web", () => {
  const wasm: Record<string, unknown> = {};
  return {
    env: {
      get logLevel() {
        return (envWrites.find((w) => w.key === "logLevel")?.value as string) ?? "";
      },
      set logLevel(v: string) {
        envWrites.push({ key: "logLevel", value: v });
      },
      wasm: new Proxy(wasm, {
        set(target, prop, value) {
          envWrites.push({ key: `wasm.${String(prop)}`, value });
          target[String(prop)] = value;
          return true;
        },
        get(target, prop) {
          return target[String(prop)];
        },
      }),
    },
  };
});

beforeEach(() => {
  envWrites.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadFreshly() {
  vi.resetModules();
  return import("./workerOrtEnv");
}

function get(key: string): unknown {
  return envWrites.find((w) => w.key === key)?.value;
}

describe("configureOrtWasmEnv", () => {
  it("sets ort.env.logLevel to 'error'", async () => {
    const { configureOrtWasmEnv } = await loadFreshly();
    configureOrtWasmEnv();
    expect(get("logLevel")).toBe("error");
  });

  it("sets wasmPaths from the ORT_VERSION constant", async () => {
    const { configureOrtWasmEnv } = await loadFreshly();
    const { ORT_VERSION } = await import("./assetVersions");
    configureOrtWasmEnv();
    expect(get("wasm.wasmPaths")).toBe(`/ort/${ORT_VERSION}/`);
  });

  it("uses single thread when crossOriginIsolated is false", async () => {
    vi.stubGlobal("crossOriginIsolated", false);
    const { configureOrtWasmEnv } = await loadFreshly();
    configureOrtWasmEnv();
    expect(get("wasm.numThreads")).toBe(1);
  });

  it("caps thread count at 4 even when hardware reports more cores", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    vi.stubGlobal("navigator", { hardwareConcurrency: 16 });
    const { configureOrtWasmEnv } = await loadFreshly();
    configureOrtWasmEnv();
    expect(get("wasm.numThreads")).toBe(4);
  });

  it("uses the available core count when below the cap", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    vi.stubGlobal("navigator", { hardwareConcurrency: 2 });
    const { configureOrtWasmEnv } = await loadFreshly();
    configureOrtWasmEnv();
    expect(get("wasm.numThreads")).toBe(2);
  });

  it("falls back to 4 threads when hardwareConcurrency is undefined", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    vi.stubGlobal("navigator", { hardwareConcurrency: undefined });
    const { configureOrtWasmEnv } = await loadFreshly();
    configureOrtWasmEnv();
    expect(get("wasm.numThreads")).toBe(4);
  });

  it("does not write wasm.* when ort.env.wasm is missing (defensive guard)", async () => {
    // Some ORT builds (e.g. a future webgpu-only build) might not expose
    // a wasm sub-module. The helper's `if (ort.env?.wasm)` guard prevents
    // a TypeError; verify by deleting the wasm proxy and confirming no
    // wasm.* writes are emitted. logLevel still gets set.
    const ort = await import("onnxruntime-web");
    const originalWasm = ort.env.wasm;
    // @ts-expect-error — deliberately violating the type for the defensive path
    delete (ort.env as { wasm?: unknown }).wasm;
    try {
      const { configureOrtWasmEnv } = await loadFreshly();
      configureOrtWasmEnv();
      expect(get("logLevel")).toBe("error");
      expect(envWrites.some((w) => w.key.startsWith("wasm."))).toBe(false);
    } finally {
      (ort.env as { wasm?: unknown }).wasm = originalWasm;
    }
  });
});
