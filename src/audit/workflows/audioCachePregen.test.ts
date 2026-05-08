import { describe, it, expect } from "vitest";
import { pregenAudio } from "./audioCachePregen";

describe("pregenAudio runner", () => {
  it("invokes synthesize → post_process → persist in order", async () => {
    const calls: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await pregenAudio(ctx, {
      phrase: "Yes",
      voiceFingerprint: "fp-1",
      synthesize: async () => { calls.push("synthesize"); return new Float32Array([0.1]); },
      postProcess: async (audio) => { calls.push("post_process"); return audio; },
      persist: async (phrase, audio) => {
        calls.push("persist");
        expect(phrase).toBe("Yes");
        expect(audio.length).toBe(1);
      },
    });
    expect(calls).toEqual(["synthesize", "post_process", "persist"]);
  });

  it("propagates synthesis errors", async () => {
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await expect(pregenAudio(ctx, {
      phrase: "x",
      voiceFingerprint: "fp",
      synthesize: async () => { throw new Error("worker dead"); },
      postProcess: async (a) => a,
      persist: async () => {},
    })).rejects.toThrow("worker dead");
  });
});
