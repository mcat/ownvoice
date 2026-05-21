import { create } from "zustand";
import type { ModelId } from "../models/modelsManifest";

interface FileProgress {
  loaded: number;
  total: number;
}

/**
 * Per-model verification state tri-state.
 * - "verified": all manifest files present in OPFS and pass size + magic checks
 * - "not-primed": no files present in OPFS yet (user hasn't run "Prepare for offline")
 * - "needs-retry": some files present but fail verification (corrupt or partial download)
 */
export type ModelVerifyStatus = "verified" | "not-primed" | "needs-retry";

interface OfflineState {
  /** True while a primer run is active. */
  primerRunning: boolean;
  /** Progress keyed `${model}/${file}`. */
  progress: Record<string, FileProgress>;
  /**
   * Total expected bytes for the current/most-recent primer run, derived from
   * the manifest at run start. The UI uses this as a fixed denominator so the
   * progress bar advances monotonically — summing `progress[].total` would
   * grow each time a new file begins downloading.
   */
  expectedBytes: number;
  /**
   * Total bytes summed across all files in the loaded manifest, independent
   * of any primer run. Populated by `verifyAllOnBoot` so the Diagnostics UI
   * can show "X MB on device" for returning users whose models are already
   * in OPFS — unlike `expectedBytes`, which only reflects in-flight primer
   * runs and is 0 on cold boot.
   */
  manifestTotalBytes: number;
  /** Per-model verification results from the last check. */
  verified: Partial<Record<ModelId, ModelVerifyStatus>>;
  /** Last primer-complete timestamp (ms since epoch) or null. */
  lastVerifiedAt: number | null;

  setPrimerRunning(v: boolean): void;
  setManifestTotalBytes(bytes: number): void;
  /**
   * Snap the store to a fresh starting state for a new primer run: clear
   * stale per-file progress and publish the expected total. Does NOT change
   * `primerRunning` — the caller flips that early (on click) so the UI
   * reflects the run before the manifest finishes loading.
   */
  beginPrimerRun(expectedBytes: number): void;
  reportProgress(model: ModelId, file: string, loaded: number, total: number): void;
  setModelVerified(model: ModelId, status: ModelVerifyStatus): void;
  markPrimerComplete(): void;
  reset(): void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  primerRunning: false,
  progress: {},
  expectedBytes: 0,
  manifestTotalBytes: 0,
  verified: {},
  lastVerifiedAt: null,

  setPrimerRunning: (v) => set({ primerRunning: v }),
  setManifestTotalBytes: (bytes) => set({ manifestTotalBytes: bytes }),
  beginPrimerRun: (expectedBytes) => set({ progress: {}, expectedBytes }),
  reportProgress: (model, file, loaded, total) =>
    set((s) => ({
      progress: { ...s.progress, [`${model}/${file}`]: { loaded, total } },
    })),
  setModelVerified: (model, status) =>
    set((s) => ({ verified: { ...s.verified, [model]: status } })),
  markPrimerComplete: () => set({ lastVerifiedAt: Date.now() }),
  reset: () =>
    set({
      primerRunning: false,
      progress: {},
      expectedBytes: 0,
      manifestTotalBytes: 0,
      verified: {},
      lastVerifiedAt: null,
    }),
}));
