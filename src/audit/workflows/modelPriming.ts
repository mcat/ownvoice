import type { StepCtx } from "../workflow";

export interface PrimerEvent {
  kind: "download" | "verified" | "skipped" | "failed";
  file: string;
}

export interface PrimeModelsArgs {
  runPrimer: () => AsyncIterable<PrimerEvent>;
}

/** Translates primer yields to ctx.step calls so each download/verify
 *  pair is a journaled step. Generator state isn't replay-safe, so on
 *  resume the runner re-enters from the start; primeOffline already
 *  skips files already in OPFS via integrity check, so the loop only
 *  re-does failed/missing files. */
export async function primeModels(ctx: StepCtx, args: PrimeModelsArgs): Promise<void> {
  for await (const ev of args.runPrimer()) {
    if (ev.kind === "download") {
      await ctx.step(`download_${ev.file}`, async () => {});
    } else if (ev.kind === "verified") {
      await ctx.step(`verify_${ev.file}`, async () => {});
    }
    // skipped / failed are observability events the primer's audit.log
    // calls already emit; no step boundary needed.
  }
}
