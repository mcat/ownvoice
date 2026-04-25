import { render, screen, fireEvent, act } from "@testing-library/preact";
import { SettingsLockPill } from "./SettingsLockPill";
import { light } from "../../theme/tokens";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { STAFF_SESSION_TIMEOUT_MS } from "../shared/StaffSessionTimer";
import { makeTestCfg } from "../../test/makeCfg";

function seedUnauthed() {
  useSettingsStore.setState({
    cfg: makeTestCfg({
      patient: { name: "Maria" },
      cfg: { pin: "1234", caregiverLang: "en" },
    }),
    speakerData: null,
    _hasHydrated: true,
  });
  useUIStore.setState({ staffAuthed: false, staffAuthedAt: null });
}

function seedAuthed(staffAuthedAt = Date.now()) {
  seedUnauthed();
  useUIStore.setState({ staffAuthed: true, staffAuthedAt });
}

describe("SettingsLockPill", () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Unauthed: solo Settings button ─────────────────────────── */

  it("renders ONLY the Settings half when staff session is not authed", () => {
    seedUnauthed();
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lock staff session now/i })).toBeNull();
  });

  it("Settings half fires onOpenSettings when tapped (unauthed)", () => {
    seedUnauthed();
    const onOpenSettings = vi.fn();
    render(<SettingsLockPill onOpenSettings={onOpenSettings} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  /* ── Authed: compound pill ──────────────────────────────────── */

  it("renders BOTH halves when staff session is authed", () => {
    seedAuthed();
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    const lockBtn = screen.getByRole("button", { name: /Lock staff session now/i });
    expect(lockBtn).toBeInTheDocument();
    expect(lockBtn.textContent).toMatch(/5:00|4:59/);
  });

  it("Settings half still routes to onOpenSettings when authed (independent tap target)", () => {
    seedAuthed();
    const onOpenSettings = vi.fn();
    render(<SettingsLockPill onOpenSettings={onOpenSettings} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    // Lock state must NOT change from a Settings tap.
    expect(useUIStore.getState().staffAuthed).toBe(true);
  });

  it("Lock half ends the staff session immediately", () => {
    seedAuthed();
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /Lock staff session now/i }));
    expect(useUIStore.getState().staffAuthed).toBe(false);
    expect(useUIStore.getState().staffAuthedAt).toBeNull();
  });

  /* ── Countdown behavior ─────────────────────────────────────── */

  it("countdown ticks down once per second", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);

    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toContain("5:00");
    act(() => { vi.advanceTimersByTime(30 * 1000); });
    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toContain("4:30");
    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });
    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toContain("0:30");
  });

  it("countdown resets when staffAuthedAt is bumped", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);

    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); });
    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toContain("3:00");

    act(() => { useUIStore.setState({ staffAuthedAt: Date.now() }); });
    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toMatch(/5:00|4:59/);
  });

  it("clamps countdown at 0:00 once timeout elapses", () => {
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    seedAuthed(start);
    render(<SettingsLockPill onOpenSettings={() => {}} t={light} />);

    act(() => { vi.advanceTimersByTime(STAFF_SESSION_TIMEOUT_MS + 30_000); });
    expect(screen.getByRole("button", { name: /Lock staff session now/i }).textContent).toContain("0:00");
  });
});
