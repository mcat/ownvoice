import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import { useSettingsStore } from "./settingsStore";
import type { Message } from "../types";

interface ConversationState {
  messagesByPatientId: Record<string, Message[]>;

  addMessage: (
    text: string,
    from: "patient" | "provider",
    label: string,
    gloss?: string,
    icon?: string,
  ) => void;
  /** Clears the currently-active patient's thread. */
  clear: () => void;
  /** Clears a specific patient's thread (used by Remove cascade). */
  clearForPatient: (patientId: string) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      messagesByPatientId: {},

      addMessage: (text, from, label, gloss, icon) => {
        const activeId = useSettingsStore.getState().cfg?.activePatientId;
        if (!activeId) return;
        const time = new Date().toLocaleTimeString([], {
          hour: "numeric", minute: "2-digit",
        });
        set((s) => {
          const existing = s.messagesByPatientId[activeId] ?? [];
          return {
            messagesByPatientId: {
              ...s.messagesByPatientId,
              [activeId]: [...existing, { from, text, time, label, gloss, icon }],
            },
          };
        });
      },

      clear: () => {
        const activeId = useSettingsStore.getState().cfg?.activePatientId;
        if (!activeId) return;
        set((s) => {
          const next = { ...s.messagesByPatientId };
          delete next[activeId];
          return { messagesByPatientId: next };
        });
      },

      clearForPatient: (patientId) => {
        set((s) => {
          const next = { ...s.messagesByPatientId };
          delete next[patientId];
          return { messagesByPatientId: next };
        });
      },
    }),
    {
      name: "ov-conversation",
      version: 2,
      storage: createJSONStorage(() => createDebouncedIDBStorage(500)),
      migrate: (persisted, fromVersion) => {
        const typed = persisted as { messages?: Message[]; messagesByPatientId?: Record<string, Message[]> } | null;
        if (!typed) return { messagesByPatientId: {} };

        if (fromVersion < 2 && typed.messages && !typed.messagesByPatientId) {
          // v1 had flat messages[]. Reattach them to the active patient
          // if settingsStore has already migrated; otherwise drop them
          // (fresh install or no active patient means no meaningful place
          // to land them). This is destructive but the alternative is
          // stashing orphan messages with no owner.
          const activeId = useSettingsStore.getState().cfg?.activePatientId;
          if (activeId) {
            return { messagesByPatientId: { [activeId]: typed.messages } };
          }
          return { messagesByPatientId: {} };
        }
        return { messagesByPatientId: typed.messagesByPatientId ?? {} };
      },
    },
  ),
);
