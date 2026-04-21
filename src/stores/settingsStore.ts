import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import type { AppSettings } from "../types";

// 300 ms debounce on IDB persistence — avoids a round-trip per keystroke
// when the Settings panel auto-saves text fields as the user types.
// In-memory Zustand updates stay synchronous so controlled inputs don't
// lag; only the disk write is batched.
const PERSIST_DEBOUNCE_MS = 300;

interface SettingsPersistedState {
  cfg: AppSettings | null;
  speakerData: unknown | null;
}

interface SettingsState extends SettingsPersistedState {
  _hasHydrated: boolean;

  setCfg: (cfg: AppSettings) => void;
  updateCfg: (partial: Partial<AppSettings>) => void;
  setSpeakerData: (data: unknown) => void;
  setHasHydrated: (v: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cfg: null,
      speakerData: null,
      _hasHydrated: false,

      setCfg: (cfg) => set({ cfg }),
      updateCfg: (partial) =>
        set((s) => (s.cfg ? { cfg: { ...s.cfg, ...partial } } : {})),
      setSpeakerData: (speakerData) => set({ speakerData }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      reset: () => set({ cfg: null, speakerData: null }),
    }),
    {
      name: "ov-settings",
      storage: createJSONStorage(() => createDebouncedIDBStorage(PERSIST_DEBOUNCE_MS)),
      partialize: (s): SettingsPersistedState => ({
        cfg: s.cfg,
        speakerData: s.speakerData,
      }),
      onRehydrateStorage: () => {
        // Return the post-hydration callback.
        // IMPORTANT: Do NOT reference useSettingsStore here — it's not
        // initialized yet (we're inside create()). Use the `state` param
        // or defer with queueMicrotask.
        return () => {
          queueMicrotask(() => {
            useSettingsStore.setState({ _hasHydrated: true });
          });
        };
      },
    },
  ),
);
