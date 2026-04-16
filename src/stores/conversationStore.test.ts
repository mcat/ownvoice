import { useConversationStore } from "./conversationStore";

// Reset store before each test
beforeEach(() => {
  useConversationStore.setState({ messages: [] });
});

describe("useConversationStore", () => {
  describe("initial state", () => {
    it("has an empty messages array", () => {
      expect(useConversationStore.getState().messages).toEqual([]);
    });
  });

  describe("addMessage", () => {
    it("appends a message with correct shape", () => {
      useConversationStore.getState().addMessage("Hello", "patient", "greeting");
      const msgs = useConversationStore.getState().messages;
      expect(msgs).toHaveLength(1);

      const msg = msgs[0];
      expect(msg.from).toBe("patient");
      expect(msg.text).toBe("Hello");
      expect(msg.label).toBe("greeting");
      expect(typeof msg.time).toBe("string");
      expect(msg.time.length).toBeGreaterThan(0);
    });

    it("appends multiple messages in order", () => {
      const store = useConversationStore.getState();
      store.addMessage("First", "patient", "quick");
      store.addMessage("Second", "provider", "response");

      const msgs = useConversationStore.getState().messages;
      expect(msgs).toHaveLength(2);
      expect(msgs[0].text).toBe("First");
      expect(msgs[0].from).toBe("patient");
      expect(msgs[1].text).toBe("Second");
      expect(msgs[1].from).toBe("provider");
    });

    it("generates a time string", () => {
      useConversationStore.getState().addMessage("Hi", "patient", "test");
      const msg = useConversationStore.getState().messages[0];
      // time is a formatted time string like "3:45 PM" or "15:45"
      expect(msg.time).toMatch(/\d/);
    });
  });

  describe("clear", () => {
    it("empties the messages array", () => {
      const store = useConversationStore.getState();
      store.addMessage("A", "patient", "a");
      store.addMessage("B", "provider", "b");
      expect(useConversationStore.getState().messages).toHaveLength(2);

      store.clear();
      expect(useConversationStore.getState().messages).toEqual([]);
    });

    it("is safe to call when already empty", () => {
      useConversationStore.getState().clear();
      expect(useConversationStore.getState().messages).toEqual([]);
    });
  });
});
