import { describe, it, expect } from "vitest";
import { MODEL_URLS, LFM2_SAMPLING, LFM2_CHAT_TOKENS } from "./types";
import { MODELS_ASSET_PREFIX } from "./assetVersions";

describe("LFM2 model configuration", () => {
  it("points llm URL at the LFM2-1.2B-Instruct directory under the versioned prefix", () => {
    expect(MODEL_URLS.llm).toBe(`/${MODELS_ASSET_PREFIX}/lfm2-1.2b-instruct/`);
  });

  it("exposes the LFM2 sampling defaults from the model card", () => {
    expect(LFM2_SAMPLING.temperature).toBe(0.3);
    expect(LFM2_SAMPLING.minP).toBe(0.15);
    expect(LFM2_SAMPLING.repetitionPenalty).toBe(1.05);
  });

  it("exposes LFM2 chat template marker strings", () => {
    expect(LFM2_CHAT_TOKENS.bos).toBe("<|startoftext|>");
    expect(LFM2_CHAT_TOKENS.turnStart).toBe("<|im_start|>");
    expect(LFM2_CHAT_TOKENS.turnEnd).toBe("<|im_end|>");
  });
});
