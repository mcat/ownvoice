/**
 * interactionStore: tiny persisted store for the "last used" timestamp.
 *
 * Why it is separate from settingsStore: zustand's persist middleware
 * re-serializes the FULL partialized state on every setState — and the
 * settings state carries multi-MB speaker embeddings. recordInteraction
 * fires on pointerdown (throttled to once per 60s), so keeping it inside
 * settingsStore meant a multi-MB JSON.stringify on the main thread every
 * minute of active use. Here a write costs a few bytes.
 */
import { useInteractionStore } from "./interactionStore";
import { useSettingsStore } from "./settingsStore";

describe("interactionStore", () => {
  beforeEach(() => {
    useInteractionStore.setState({ lastInteractionAt: null });
  });

  it("starts null before any interaction", () => {
    expect(useInteractionStore.getState().lastInteractionAt).toBeNull();
  });

  it("recordInteraction() sets lastInteractionAt to now when previously null", () => {
    const before = Date.now();
    useInteractionStore.getState().recordInteraction();
    const value = useInteractionStore.getState().lastInteractionAt;
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThanOrEqual(before);
    expect(value!).toBeLessThanOrEqual(Date.now());
  });

  it("recordInteraction() is a no-op within 60s of the previous call", () => {
    const t0 = Date.now() - 1_000;
    useInteractionStore.setState({ lastInteractionAt: t0 });
    useInteractionStore.getState().recordInteraction();
    expect(useInteractionStore.getState().lastInteractionAt).toBe(t0);
  });

  it("recordInteraction() updates when more than 60s have passed", () => {
    const t0 = Date.now() - 61_000;
    useInteractionStore.setState({ lastInteractionAt: t0 });
    useInteractionStore.getState().recordInteraction();
    expect(useInteractionStore.getState().lastInteractionAt).not.toBe(t0);
  });

  it("recordInteraction() recovers from a future timestamp (clock skew)", () => {
    const future = Date.now() + 10 * 60_000;
    useInteractionStore.setState({ lastInteractionAt: future });
    useInteractionStore.getState().recordInteraction();
    expect(useInteractionStore.getState().lastInteractionAt!).toBeLessThanOrEqual(
      Date.now(),
    );
  });

  it("recordInteraction() does not touch the settings store at all", () => {
    // The whole point of the split: a tap must not trigger a multi-MB
    // re-serialization of the settings state.
    const before = useSettingsStore.getState();
    useInteractionStore.getState().recordInteraction();
    expect(useSettingsStore.getState()).toBe(before);
  });
});
