import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createIDBStorage } from "./idbStorage";
import type { AppSettings } from "../types";

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
      storage: createJSONStorage(() => createIDBStorage()),
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
