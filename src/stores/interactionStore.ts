import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";

// Throttle: at most one recorded interaction per minute. The value feeds
// the Diagnostics "Last used" line — minute granularity is plenty.
const INTERACTION_THROTTLE_MS = 60_000;
const PERSIST_DEBOUNCE_MS = 300;

interface InteractionState {
  /** Wall-clock ms of the last user interaction. Null until the first
   *  interaction (seeded on first hydration so "Last used" reads
   *  honestly). */
  lastInteractionAt: number | null;
  recordInteraction: () => void;
}

/**
 * Tiny persisted store for the "last used" timestamp, deliberately
 * SEPARATE from settingsStore: zustand persist re-serializes the full
 * partialized state on every setState, and the settings state carries
 * multi-MB speaker embeddings. recordInteraction fires on pointerdown
 * (throttled), so keeping the timestamp inside settingsStore cost a
 * multi-MB main-thread JSON.stringify every minute of active use; here
 * a write costs a few bytes.
 *
 * Persisted to IDB row `ov-interaction` in the same `ownvoice`/`kv`
 * store — resetAll()'s clearAll() wipes it with everything else.
 */
export const useInteractionStore = create<InteractionState>()(
  persist(
    (set, get) => ({
      lastInteractionAt: null,

      recordInteraction: () => {
        const { lastInteractionAt } = get();
        const now = Date.now();
        // `lastInteractionAt <= now` guards a future timestamp from clock
        // skew (NTP backward jump, manual clock change) — otherwise the
        // action would no-op forever until wall-clock catches up.
        if (
          lastInteractionAt != null &&
          lastInteractionAt <= now &&
          now - lastInteractionAt < INTERACTION_THROTTLE_MS
        ) {
          return;
        }
        set({ lastInteractionAt: now });
      },
    }),
    {
      name: "ov-interaction",
      version: 0,
      storage: createJSONStorage(() => createDebouncedIDBStorage(PERSIST_DEBOUNCE_MS)),
      partialize: (s) => ({ lastInteractionAt: s.lastInteractionAt }),
      onRehydrateStorage: () => {
        return (state) => {
          // Seed on first hydration (fresh device or migration from the
          // legacy settingsStore field) so "Last used" reads honestly.
          if (state && state.lastInteractionAt == null) {
            queueMicrotask(() => {
              useInteractionStore.setState({ lastInteractionAt: Date.now() });
            });
          }
        };
      },
    },
  ),
);
