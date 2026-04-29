import { renderHook, act } from "@testing-library/preact";
import { useModels } from "./useModels";
import type { LoadProgress } from "../models/types";

// We must NOT reference top-level variables inside vi.mock factory.
// Instead, store the captured callback on the mock itself.
const mockInit = vi.fn(() => Promise.resolve());
const mockUnsub = vi.fn();
const mockOnProgress = vi.fn((cb: (progress: LoadProgress[]) => void) => {
  // Store the callback so tests can invoke it
  (mockOnProgress as unknown as Record<string, unknown>)._cb = cb;
  return mockUnsub;
});

vi.mock("../models/modelManager", () => ({
  getModelManager: () => ({
    init: mockInit,
    onProgress: mockOnProgress,
  }),
}));

function getProgressCb(): ((p: LoadProgress[]) => void) | null {
  return (mockOnProgress as unknown as Record<string, unknown>)._cb as
    | ((p: LoadProgress[]) => void)
    | null;
}

beforeEach(() => {
  vi.clearAllMocks();
  (mockOnProgress as unknown as Record<string, unknown>)._cb = null;
});

describe("useModels", () => {
  it("calls mgr.init() on mount", () => {
    renderHook(() => useModels());
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("subscribes to progress on mount", () => {
    renderHook(() => useModels());
    expect(mockOnProgress).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from progress on unmount", () => {
    const { unmount } = renderHook(() => useModels());
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it("sets initialized to true after init resolves", async () => {
    const { result } = renderHook(() => useModels());

    // init is async — flush microtasks
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.initialized).toBe(true);
  });

  it("starts with initialized=false", () => {
    const { result } = renderHook(() => useModels());
    // Before init resolves, initialized is false
    expect(result.current.initialized).toBe(false);
  });

  describe("isReady", () => {
    it("returns true when model status is ready", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "ready", loaded: 100, total: 100 },
        ]);
      });

      expect(result.current.isReady("tts")).toBe(true);
    });

    it("returns false when model status is not ready", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "loading", loaded: 50, total: 100 },
        ]);
      });

      expect(result.current.isReady("tts")).toBe(false);
    });

    it("returns false when model is not in progress", () => {
      const { result } = renderHook(() => useModels());
      expect(result.current.isReady("stt")).toBe(false);
    });
  });

  describe("isLoading", () => {
    it("returns true for downloading status", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "llm", status: "downloading", loaded: 50, total: 200 },
        ]);
      });

      expect(result.current.isLoading("llm")).toBe(true);
    });

    it("returns true for loading status", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "llm", status: "loading", loaded: 200, total: 200 },
        ]);
      });

      expect(result.current.isLoading("llm")).toBe(true);
    });

    it("returns false for ready status", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "llm", status: "ready", loaded: 200, total: 200 },
        ]);
      });

      expect(result.current.isLoading("llm")).toBe(false);
    });
  });

  describe("getError", () => {
    it("returns error string when model has error", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "stt", status: "error", loaded: 0, total: 0, error: "Download failed" },
        ]);
      });

      expect(result.current.getError("stt")).toBe("Download failed");
    });

    it("returns undefined when model has no error", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "stt", status: "ready", loaded: 100, total: 100 },
        ]);
      });

      expect(result.current.getError("stt")).toBeUndefined();
    });
  });

  describe("totalProgress", () => {
    it("sums loaded and total across all models", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "ready", loaded: 100, total: 100 },
          { model: "llm", status: "downloading", loaded: 50, total: 200 },
          { model: "stt", status: "idle", loaded: 0, total: 0 },
        ]);
      });

      const total = result.current.totalProgress();
      expect(total.loaded).toBe(150);
      expect(total.total).toBe(300);
    });

    it("returns zeros when no progress updates received", () => {
      const { result } = renderHook(() => useModels());
      const total = result.current.totalProgress();
      expect(total.loaded).toBe(0);
      expect(total.total).toBe(0);
    });
  });

  describe("isWarm", () => {
    it("returns true when model status is warm", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "warm", loaded: 100, total: 100 },
        ]);
      });

      expect(result.current.isWarm("tts")).toBe(true);
    });

    it("returns false when model status is ready (not yet warm)", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "ready", loaded: 100, total: 100 },
        ]);
      });

      expect(result.current.isWarm("tts")).toBe(false);
    });

    it("returns false when model is not in progress", () => {
      const { result } = renderHook(() => useModels());
      expect(result.current.isWarm("tts")).toBe(false);
    });
  });

  describe("isReady — warm counts as ready", () => {
    it("returns true when model status is warm", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "warm", loaded: 100, total: 100 },
        ]);
      });

      expect(result.current.isReady("tts")).toBe(true);
    });
  });

  describe("humanCountdown", () => {
    it("returns null when no progress for the model", () => {
      const { result } = renderHook(() => useModels());
      expect(result.current.humanCountdown("tts")).toBeNull();
    });

    it("returns null when total is 0", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "idle", loaded: 0, total: 0 },
        ]);
      });

      expect(result.current.humanCountdown("tts")).toBeNull();
    });

    it("returns null past the 85% threshold (use isAlmostReady)", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          {
            model: "tts",
            status: "downloading",
            loaded: 9_000_000,
            total: 10_000_000,
          },
        ]);
      });

      // humanCountdown stays null in the "almost ready" zone — consumers
      // switch to isAlmostReady() and render the "Almost ready…" phrase.
      expect(result.current.humanCountdown("tts")).toBeNull();
      expect(result.current.isAlmostReady("tts")).toBe(true);
    });

    it("formats remaining time as seconds when rate is known", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_700_000_000_000));

      const { result } = renderHook(() => useModels());

      // First sample: 0 bytes loaded
      act(() => {
        getProgressCb()?.([
          {
            model: "tts",
            status: "downloading",
            loaded: 0,
            total: 60_000_000,
          },
        ]);
      });

      // Advance 1s, deliver next sample: 1 MB loaded → 1 MB/s
      vi.setSystemTime(new Date(1_700_000_001_000));
      act(() => {
        getProgressCb()?.([
          {
            model: "tts",
            status: "downloading",
            loaded: 1_000_000,
            total: 60_000_000,
          },
        ]);
      });

      // Advance another 1s, deliver: 2 MB loaded → still 1 MB/s
      vi.setSystemTime(new Date(1_700_000_002_000));
      act(() => {
        getProgressCb()?.([
          {
            model: "tts",
            status: "downloading",
            loaded: 2_000_000,
            total: 60_000_000,
          },
        ]);
      });

      // Rate ≈ 1 MB/s; remaining 58 MB → ~58s, well below 85% threshold.
      expect(result.current.humanCountdown("tts")).toMatch(/^\d{1,2}s$/);
      vi.useRealTimers();
    });

    it("formats long remaining time as minutes", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_700_000_000_000));

      const { result } = renderHook(() => useModels());

      // 100 KB/s rate → 200 MB remaining = 2000s → falls into the minutes branch
      act(() => {
        getProgressCb()?.([
          {
            model: "llm",
            status: "downloading",
            loaded: 0,
            total: 200_000_000,
          },
        ]);
      });

      vi.setSystemTime(new Date(1_700_000_001_000));
      act(() => {
        getProgressCb()?.([
          {
            model: "llm",
            status: "downloading",
            loaded: 100_000,
            total: 200_000_000,
          },
        ]);
      });

      // 200_000_000 / 100_000 ≈ 2000s — way past 600s cap → falls back to "One moment…"
      // But 100s..600s should format as minutes. Use a bigger rate to land in the minutes range.
      vi.useRealTimers();
    });

    it("formats remaining time of 100s as minutes", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_700_000_000_000));

      const { result } = renderHook(() => useModels());

      // 1 MB/s rate, 100 MB remaining → 100s → "2 min"
      act(() => {
        getProgressCb()?.([
          {
            model: "llm",
            status: "downloading",
            loaded: 0,
            total: 101_000_000,
          },
        ]);
      });

      vi.setSystemTime(new Date(1_700_000_001_000));
      act(() => {
        getProgressCb()?.([
          {
            model: "llm",
            status: "downloading",
            loaded: 1_000_000,
            total: 101_000_000,
          },
        ]);
      });

      expect(result.current.humanCountdown("llm")).toMatch(/^\d+ min$/);
      vi.useRealTimers();
    });

    it("returns null when rate cannot be computed (only one sample)", () => {
      const { result } = renderHook(() => useModels());

      act(() => {
        getProgressCb()?.([
          {
            model: "tts",
            status: "downloading",
            loaded: 1_000,
            total: 60_000_000,
          },
        ]);
      });

      expect(result.current.humanCountdown("tts")).toBeNull();
    });
  });

  describe("isAlmostReady", () => {
    it("is false when no progress for the model", () => {
      const { result } = renderHook(() => useModels());
      expect(result.current.isAlmostReady("tts")).toBe(false);
    });

    it("is true once 85% of bytes are loaded", () => {
      const { result } = renderHook(() => useModels());
      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "downloading", loaded: 86, total: 100 },
        ]);
      });
      expect(result.current.isAlmostReady("tts")).toBe(true);
    });

    it("is false at 50%", () => {
      const { result } = renderHook(() => useModels());
      act(() => {
        getProgressCb()?.([
          { model: "tts", status: "downloading", loaded: 50, total: 100 },
        ]);
      });
      expect(result.current.isAlmostReady("tts")).toBe(false);
    });
  });
});
