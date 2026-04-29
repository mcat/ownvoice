import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useThrottledText } from "./useThrottledText";

describe("useThrottledText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial text immediately", () => {
    const { result } = renderHook(
      ({ text, cat }) => useThrottledText(text, cat, 5_000),
      { initialProps: { text: "10s", cat: "saving-cd" } },
    );
    expect(result.current).toBe("10s");
  });

  it("does NOT update on intra-throttle text changes", () => {
    const { result, rerender } = renderHook(
      ({ text, cat }) => useThrottledText(text, cat, 5_000),
      { initialProps: { text: "10s", cat: "saving-cd" } },
    );

    vi.advanceTimersByTime(1_000);
    rerender({ text: "9s", cat: "saving-cd" });
    expect(result.current).toBe("10s");

    vi.advanceTimersByTime(2_000);
    rerender({ text: "7s", cat: "saving-cd" });
    expect(result.current).toBe("10s");
  });

  it("updates after the throttle window elapses", () => {
    const { result, rerender } = renderHook(
      ({ text, cat }) => useThrottledText(text, cat, 5_000),
      { initialProps: { text: "10s", cat: "saving-cd" } },
    );

    rerender({ text: "9s", cat: "saving-cd" });
    act(() => {
      vi.advanceTimersByTime(5_001);
    });
    expect(result.current).toBe("9s");
  });

  it("updates immediately on category change", () => {
    const { result, rerender } = renderHook(
      ({ text, cat }) => useThrottledText(text, cat, 5_000),
      { initialProps: { text: "10s", cat: "saving-cd" } },
    );

    vi.advanceTimersByTime(1_000);
    rerender({ text: "Almost ready…", cat: "almost" });
    expect(result.current).toBe("Almost ready…");
  });
});
