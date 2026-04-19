import { create } from "zustand";
import type { ModelId } from "../models/modelsManifest";

interface FileProgress {
  loaded: number;
  total: number;
}

interface OfflineState {
  /** True while a primer run is active. */
  primerRunning: boolean;
  /** Progress keyed `${model}/${file}`. */
  progress: Record<string, FileProgress>;
  /** Per-model verification results from the last primer pass. */
  verified: Partial<Record<ModelId, boolean>>;
  /** Last primer-complete timestamp (ms since epoch) or null. */
  lastVerifiedAt: number | null;

  setPrimerRunning(v: boolean): void;
  reportProgress(model: ModelId, file: string, loaded: number, total: number): void;
  setModelVerified(model: ModelId, ok: boolean): void;
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
  setModelVerified: (model, ok) =>
    set((s) => ({ verified: { ...s.verified, [model]: ok } })),
  markPrimerComplete: () => set({ lastVerifiedAt: Date.now() }),
  reset: () =>
    set({
      primerRunning: false,
      progress: {},
      verified: {},
      lastVerifiedAt: null,
    }),
}));
