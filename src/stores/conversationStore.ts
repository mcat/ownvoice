import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import type { Message } from "../types";

interface ConversationState {
  messages: Message[];

  addMessage: (
    text: string,
    from: "patient" | "provider",
    label: string,
  ) => void;
  clear: () => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (text, from, label) => {
        const time = new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        set((s) => ({ messages: [...s.messages, { from, text, time, label }] }));
      },

      clear: () => set({ messages: [] }),
    }),
    {
      name: "ov-conversation",
      storage: createJSONStorage(() => createDebouncedIDBStorage(500)),
    },
  ),
);
