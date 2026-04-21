import { renderHook, act } from "@testing-library/preact";
import { usePointerFine } from "./usePointerFine";

type Listener = (e: MediaQueryListEvent) => void;

/** Mock matchMedia that lets the test toggle the media state and dispatch a change. */
function mockPointerFine(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mql: MediaQueryList = {
    matches: initialMatches,
    media: "(pointer: fine)",
    onchange: null,
    addEventListener: ((type: string, cb: Listener) => {
      if (type === "change") listeners.add(cb);
    }) as MediaQueryList["addEventListener"],
    removeEventListener: ((type: string, cb: Listener) => {
      if (type === "change") listeners.delete(cb);
    }) as MediaQueryList["removeEventListener"],
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  const setMatches = (matches: boolean) => {
    mql.matches = matches;
    const evt = { matches, media: "(pointer: fine)" } as MediaQueryListEvent;
    listeners.forEach((cb) => cb(evt));
  };
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => (query === "(pointer: fine)" ? mql : { ...mql, media: query, matches: false }),
    writable: true,
  });
  return { setMatches };
}

describe("usePointerFine", () => {
  it("returns false when matchMedia reports no fine pointer", () => {
    mockPointerFine(false);
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(false);
  });

  it("returns true when matchMedia reports a fine pointer", () => {
    mockPointerFine(true);
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes (pointer plugged in mid-session)", () => {
    const mock = mockPointerFine(false);
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(false);

    act(() => mock.setMatches(true));
    expect(result.current).toBe(true);

    act(() => mock.setMatches(false));
    expect(result.current).toBe(false);
  });
});
