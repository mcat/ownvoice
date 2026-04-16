import { renderHook, act } from "@testing-library/preact";
import { useDebouncedTap } from "./useDebouncedTap";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedTap", () => {
  it("fires callback on first tap", () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useDebouncedTap(onTap));

    act(() => {
      result.current();
    });

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("suppresses second tap within 300ms", () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useDebouncedTap(onTap));

    act(() => {
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    // Tap again immediately
    act(() => {
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    // Tap again at 200ms — still suppressed
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("fires again after 300ms debounce expires", () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useDebouncedTap(onTap));

    act(() => {
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    // Advance past 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(2);
  });

  it("suppresses rapid bursts but fires once per 300ms window", () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useDebouncedTap(onTap));

    // Rapid burst of 5 taps
    act(() => {
      result.current();
      result.current();
      result.current();
      result.current();
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    // Wait 300ms, then another burst
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current();
      result.current();
      result.current();
    });
    expect(onTap).toHaveBeenCalledTimes(2);
  });

  it("uses the latest callback when it changes", () => {
    const onTap1 = vi.fn();
    const onTap2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useDebouncedTap(cb),
      { initialProps: { cb: onTap1 } },
    );

    act(() => {
      result.current();
    });
    expect(onTap1).toHaveBeenCalledTimes(1);
    expect(onTap2).toHaveBeenCalledTimes(0);

    // Update the callback and wait for debounce to expire
    rerender({ cb: onTap2 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current();
    });
    expect(onTap2).toHaveBeenCalledTimes(1);
  });
});
