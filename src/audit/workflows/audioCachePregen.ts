import type { StepCtx } from "../workflow";

export interface PregenArgs {
  phrase: string;
  voiceFingerprint: string;
  synthesize: () => Promise<Float32Array>;
  postProcess: (audio: Float32Array) => Promise<Float32Array>;
  persist: (phrase: string, audio: Float32Array) => Promise<void>;
}

/** Three steps: synthesize (worker) → post_process (FFT pipeline on
 *  main thread) → persist (OPFS write). NOTE: Float32Array is not
 *  natively JSON-serialisable, so step.result memoisation across
 *  tab-kill replay won't restore the audio buffer. Acceptable for v1
 *  because the underlying cache write is idempotent — a phrase already
 *  in OPFS is skipped by hasCachedAudio in the next pre-gen pass. */
export async function pregenAudio(ctx: StepCtx, args: PregenArgs): Promise<void> {
  const raw = await ctx.step("synthesize", () => args.synthesize());
  const processed = await ctx.step("post_process", () => args.postProcess(raw));
  await ctx.step("persist", () => args.persist(args.phrase, processed));
}
