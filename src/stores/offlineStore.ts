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
  /** Per-model verification results from the last check. */
  verified: Partial<Record<ModelId, ModelVerifyStatus>>;
  /** Last primer-complete timestamp (ms since epoch) or null. */
  lastVerifiedAt: number | null;

  setPrimerRunning(v: boolean): void;
  reportProgress(model: ModelId, file: string, loaded: number, total: number): void;
  setModelVerified(model: ModelId, status: ModelVerifyStatus): void;
  markPrimerComplete(): void;
  reset(): void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  primerRunning: false,
  progress: {},
  verified: {},
  lastVerifiedAt: null,

  setPrimerRunning: (v) => set({ primerRunning: v }),
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
      verified: {},
      lastVerifiedAt: null,
    }),
}));
