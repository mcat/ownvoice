import { render, screen, fireEvent, act } from "@testing-library/preact";
import { HeaderLockButton } from "./HeaderLockButton";
import { light } from "../../theme/tokens";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { STAFF_SESSION_TIMEOUT_MS } from "../shared/StaffSessionTimer";
import { makeTestCfg } from "../../test/makeCfg";

function seedAuthed(staffAuthedAt = Date.now()) {
  useSettingsStore.setState({
    cfg: makeTestCfg({ patient: { name: "Maria" }, cfg: { pin: "1234", caregiverLang: "en" } }),
    speakerData: null,
    _hasHydrated: true,
  });
  useUIStore.setState({ staffAuthed: true, staffAuthedAt });
}

describe("HeaderLockButton", () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when staff session is NOT authed", () => {
    useUIStore.setState({ staffAuthed: false, staffAuthedAt: null });
    const { container } = render(<HeaderLockButton t={light} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the lock icon and a MM:SS countdown when authed", () => {
    seedAuthed();
    render(<HeaderLockButton t={light} />);
    const btn = screen.getByRole("button", { name: /Lock staff session now/i });
    expect(btn).toBeInTheDocument();
    // Initial countdown ≈ 5:00 (the timeout is exactly 5 minutes).
    expect(btn.textContent).toMatch(/5:00|4:59/);
  });

  it("ticks down approximately one second per second", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<HeaderLockButton t={light} />);

    expect(screen.getByRole("button").textContent).toContain("5:00");

    // advanceTimersByTime moves the fake clock (Date.now()) AND fires
    // due intervals — so the on-screen countdown reflects the new time
    // after exactly the advanced amount.
    act(() => { vi.advanceTimersByTime(30 * 1000); });
    expect(screen.getByRole("button").textContent).toContain("4:30");

    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });
    expect(screen.getByRole("button").textContent).toContain("0:30");
  });

  it("resets the visible countdown when staffAuthedAt is bumped", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<HeaderLockButton t={light} />);

    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); });
    expect(screen.getByRole("button").textContent).toContain("3:00");

    // Activity bump — staffAuthedAt updates to current time, countdown
    // springs back to ~5:00 without remounting the component.
    act(() => { useUIStore.setState({ staffAuthedAt: Date.now() }); });
    expect(screen.getByRole("button").textContent).toMatch(/5:00|4:59/);
  });

  it("clicking ends the staff session immediately", () => {
    seedAuthed();
    render(<HeaderLockButton t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /Lock staff session now/i }));
    expect(useUIStore.getState().staffAuthed).toBe(false);
    expect(useUIStore.getState().staffAuthedAt).toBeNull();
  });

  it("clamps the countdown at 0:00 once the timeout has elapsed", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<HeaderLockButton t={light} />);

    act(() => { vi.advanceTimersByTime(STAFF_SESSION_TIMEOUT_MS + 30_000); });
    expect(screen.getByRole("button").textContent).toContain("0:00");
  });
});
