import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/preact";
import { useStorageHealth } from "./useStorageHealth";

describe("useStorageHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the current estimate on first paint", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await vi.waitFor(() => {
      expect(result.current.usage).toBe(100);
      expect(result.current.quota).toBe(1000);
      expect(result.current.percentUsed).toBeCloseTo(10);
    });
  });

  it("flags warning at >= 85% usage", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 900, quota: 1000 })),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await vi.waitFor(() => {
      expect(result.current.warning).toBe(true);
    });
  });

  it("returns null fields when navigator.storage.estimate is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {},
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useStorageHealth());
    expect(result.current.usage).toBeNull();
    expect(result.current.quota).toBeNull();
  });
});
