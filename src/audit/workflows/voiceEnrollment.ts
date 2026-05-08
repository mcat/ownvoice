import type { StepCtx } from "../workflow";

export interface EnrollVoiceArgs {
  base64: string;
  patientId: string;
  decode: (base64: string) => Promise<Float32Array>;
  extract: (audio: Float32Array) => Promise<unknown>;
  persist: (patientId: string, data: unknown) => Promise<void>;
}

/** Three idempotent steps: decode is pure, extract is pure modulo
 *  encoder FP non-determinism (acceptable for replay because we only
 *  re-execute on user-initiated recovery), persist is a settings-store
 *  update keyed on patientId. */
export async function enrollVoice(ctx: StepCtx, args: EnrollVoiceArgs): Promise<void> {
  const audio = await ctx.step("decode_audio", () => args.decode(args.base64));
  const data = await ctx.step("extract_embedding", () => args.extract(audio));
  await ctx.step("persist_speaker_data", () => args.persist(args.patientId, data));
}
