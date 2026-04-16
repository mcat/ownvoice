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
});
