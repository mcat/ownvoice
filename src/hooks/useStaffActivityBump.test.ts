import { renderHook } from "@testing-library/preact";
import { useStaffActivityBump } from "./useStaffActivityBump";
import { useUIStore } from "../stores/uiStore";

describe("useStaffActivityBump", () => {
  beforeEach(() => {
    useUIStore.setState({ staffAuthed: false, staffAuthedAt: null });
  });

  it("bumps staffAuthedAt when staffAuthed is true", () => {
    useUIStore.setState({ staffAuthed: true, staffAuthedAt: 1000 });
    const { result } = renderHook(() => useStaffActivityBump());
    const before = Date.now();
    result.current();
    const after = Date.now();
    const ts = useUIStore.getState().staffAuthedAt!;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("is a no-op when staffAuthed is false", () => {
    useUIStore.setState({ staffAuthed: false, staffAuthedAt: null });
    const { result } = renderHook(() => useStaffActivityBump());
    result.current();
    expect(useUIStore.getState().staffAuthedAt).toBeNull();
  });
});
