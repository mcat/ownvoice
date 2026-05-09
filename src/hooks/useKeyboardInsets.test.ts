import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useKeyboardInsets } from "./useKeyboardInsets";

interface FakeVV {
  height: number;
  width: number;
  listeners: Map<string, Array<() => void>>;
  addEventListener: (ev: string, cb: () => void) => void;
  removeEventListener: (ev: string, cb: () => void) => void;
  dispatch: (ev: string) => void;
}

function makeFakeVV(initialHeight: number): FakeVV {
  const listeners = new Map<string, Array<() => void>>();
  return {
    height: initialHeight,
    width: 1024,
    listeners,
    addEventListener: (ev, cb) => {
      const list = listeners.get(ev) ?? [];
      list.push(cb);
      listeners.set(ev, list);
    },
    removeEventListener: (ev, cb) => {
      const list = listeners.get(ev) ?? [];
      listeners.set(ev, list.filter((l) => l !== cb));
    },
    dispatch: (ev) => {
      for (const cb of listeners.get(ev) ?? []) cb();
    },
  };
}

describe("useKeyboardInsets", () => {
  let originalVV: VisualViewport | null;
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;
  let rafQueue: Array<() => void>;

  beforeEach(() => {
    originalVV = window.visualViewport;
    originalRaf = window.requestAnimationFrame;
    originalCaf = window.cancelAnimationFrame;
    rafQueue = [];
    window.requestAnimationFrame = ((cb: () => void) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as unknown as typeof requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      rafQueue[id - 1] = () => {};
    }) as unknown as typeof cancelAnimationFrame;
    Object.defineProperty(window, "innerHeight", { value: 834, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      value: originalVV,
      configurable: true,
    });
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCaf;
  });

  function flushRaf(): void {
    const queue = rafQueue;
    rafQueue = [];
    for (const cb of queue) cb();
  }

  it("returns 0 when keyboard is closed (visual height ≈ layout height)", () => {
    const vv = makeFakeVV(834);
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });

    const { result } = renderHook(() => useKeyboardInsets());
    flushRaf();
    expect(result.current.keyboardHeight).toBe(0);
  });

  it("reports keyboard height when visual viewport shrinks past threshold", () => {
    const vv = makeFakeVV(834);
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });

    const { result } = renderHook(() => useKeyboardInsets());
    flushRaf();
    expect(result.current.keyboardHeight).toBe(0);

    act(() => {
      vv.height = 500;
      vv.dispatch("resize");
      flushRaf();
    });

    expect(result.current.keyboardHeight).toBe(334);
  });

  it("ignores small deltas (UI chrome, below 60 px)", () => {
    const vv = makeFakeVV(834);
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });

    const { result } = renderHook(() => useKeyboardInsets());

    act(() => {
      vv.height = 800; // 34 px delta — below threshold
      vv.dispatch("resize");
      flushRaf();
    });

    expect(result.current.keyboardHeight).toBe(0);
  });

  it("returns 0 when VisualViewport API is unavailable", () => {
    Object.defineProperty(window, "visualViewport", { value: null, configurable: true });
    const { result } = renderHook(() => useKeyboardInsets());
    expect(result.current.keyboardHeight).toBe(0);
  });
});
