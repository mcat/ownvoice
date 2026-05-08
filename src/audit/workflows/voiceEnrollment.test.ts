import { describe, it, expect } from "vitest";
import { enrollVoice } from "./voiceEnrollment";

describe("enrollVoice runner", () => {
  it("invokes decode → extract → persist in order", async () => {
    const calls: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await enrollVoice(ctx, {
      base64: "dummy-base64",
      patientId: "p1",
      decode: async () => { calls.push("decode"); return new Float32Array([0.1, 0.2]); },
      extract: async (audio: Float32Array) => {
        calls.push("extract");
        expect(audio.length).toBe(2);
        return { speakerData: "fake-data" };
      },
      persist: async (patientId: string, data: unknown) => {
        calls.push("persist");
        expect(patientId).toBe("p1");
        expect(data).toEqual({ speakerData: "fake-data" });
      },
    });
    expect(calls).toEqual(["decode", "extract", "persist"]);
  });

  it("rethrows on extract failure (workflow.failed propagation)", async () => {
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await expect(enrollVoice(ctx, {
      base64: "x",
      patientId: "p1",
      decode: async () => new Float32Array([0.1]),
      extract: async () => { throw new Error("encoder timeout"); },
      persist: async () => {},
    })).rejects.toThrow("encoder timeout");
  });
});
