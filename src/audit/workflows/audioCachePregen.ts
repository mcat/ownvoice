import type { StepCtx } from "../workflow";

export interface PregenArgs {
  phrase: string;
  voiceFingerprint: string;
  synthesize: () => Promise<Float32Array>;
  postProcess: (audio: Float32Array) => Promise<Float32Array>;
  persist: (phrase: string, audio: Float32Array) => Promise<void>;
}

/** Three steps: synthesize (worker) → post_process (FFT pipeline on
 *  main thread) → persist (OPFS write). The audio buffer flowing
 *  between steps is multi-MB; we opt out of memoisation so the journal
 *  records timing and status only. Re-execution on replay is safe
 *  because hasCachedAudio short-circuits any phrase already in OPFS. */
export async function pregenAudio(ctx: StepCtx, args: PregenArgs): Promise<void> {
  const raw = await ctx.step("synthesize", () => args.synthesize(), { memoize: false });
  const processed = await ctx.step("post_process", () => args.postProcess(raw), { memoize: false });
  await ctx.step("persist", () => args.persist(args.phrase, processed), { memoize: false });
}
