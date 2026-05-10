import { describe, it, expect } from "vitest";
import { primeModels } from "./modelPriming";

describe("primeModels runner", () => {
  it("steps through primer events", async () => {
    const events = [
      { kind: "download", file: "tts/encoder.onnx" } as const,
      { kind: "verified", file: "tts/encoder.onnx" } as const,
      { kind: "download", file: "tts/decoder.onnx" } as const,
      { kind: "verified", file: "tts/decoder.onnx" } as const,
    ];
    const stepNames: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(name: string, fn: () => Promise<T>) => {
        stepNames.push(name);
        return fn();
      },
    };
    await primeModels(ctx, {
      runPrimer: async function* () { for (const e of events) yield e; },
    });
    expect(stepNames).toEqual([
      "download_tts/encoder.onnx",
      "verify_tts/encoder.onnx",
      "download_tts/decoder.onnx",
      "verify_tts/decoder.onnx",
    ]);
  });

  it("ignores skipped/failed events for step boundaries", async () => {
    const events = [
      { kind: "skipped", file: "tts/encoder.onnx" } as const,
      { kind: "download", file: "tts/decoder.onnx" } as const,
      { kind: "failed", file: "tts/decoder.onnx" } as const,
    ];
    const stepNames: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(name: string, fn: () => Promise<T>) => {
        stepNames.push(name);
        return fn();
      },
    };
    await primeModels(ctx, {
      runPrimer: async function* () { for (const e of events) yield e; },
    });
    // Only the download event registers as a step here — skipped/failed are observability events.
    expect(stepNames).toEqual(["download_tts/decoder.onnx"]);
  });
});
