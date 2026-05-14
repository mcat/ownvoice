import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/preact";
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

describe("useStorageHealth — persistence", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("reports `persisted: true` when navigator.storage.persisted() resolves true", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted: vi.fn(async () => true),
        persist: vi.fn(async () => true),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(true));
  });

  it("reports `persisted: false` when navigator.storage.persisted() resolves false", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted: vi.fn(async () => false),
        persist: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(false));
  });

  it("reports `persisted: null` when navigator.storage.persisted is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        // No `persisted` method present.
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.usage).toBe(100));
    expect(result.current.persisted).toBeNull();
  });

  it("`requestPersist()` calls navigator.storage.persist() and re-polls persisted()", async () => {
    const persist = vi.fn(async () => true);
    const persisted = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted,
        persist,
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(false));

    await act(async () => {
      await result.current.requestPersist();
    });

    expect(persist).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.persisted).toBe(true));
  });
});
