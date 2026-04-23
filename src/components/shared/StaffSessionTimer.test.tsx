import { render, screen, cleanup, act } from "@testing-library/preact";
import { StaffSessionTimer } from "./StaffSessionTimer";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

beforeEach(() => {
  vi.useFakeTimers();
  // Reset stores to clean state
  useUIStore.setState({
    staffAuthed: false,
    staffAuthedAt: null,
  });
  useSettingsStore.setState({
    cfg: makeTestCfg({ cfg: { caregiverLang: "en" } }),
    _hasHydrated: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StaffSessionTimer", () => {
  it("renders nothing when staffAuthed=false", () => {
    const { container } = render(<StaffSessionTimer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing immediately when staffAuthed=true, staffAuthedAt=now", () => {
    useUIStore.setState({
      staffAuthed: true,
      staffAuthedAt: Date.now(),
    });
    const { container } = render(<StaffSessionTimer />);
    expect(container.innerHTML).toBe("");
  });

  it("shows WarningToast after 4 minutes", () => {
    useUIStore.setState({
      staffAuthed: true,
      staffAuthedAt: Date.now(),
    });
    render(<StaffSessionTimer />);

    // Just before 4 minutes — no toast
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000 - 100);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // At 4 minutes — toast appears
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Staff session ending")).toBeInTheDocument();
  });

  it("bumpStaffAuthed at 3:30 resets the schedule — no warning at 4:00", () => {
    useUIStore.setState({
      staffAuthed: true,
      staffAuthedAt: Date.now(),
    });
    render(<StaffSessionTimer />);

    // Advance to 3:30
    act(() => {
      vi.advanceTimersByTime(3.5 * 60 * 1000);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Bump — this resets staffAuthedAt to now (which is 3:30 into the fake clock)
    act(() => {
      useUIStore.getState().bumpStaffAuthed();
    });

    // Advance to what was the original 4:00 mark (30s more)
    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });
    // No toast — the schedule was reset to 4 minutes from the bump
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Advance to the new 4 minute mark (3.5 more minutes)
    act(() => {
      vi.advanceTimersByTime(3.5 * 60 * 1000);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("extend callback bumps staffAuthedAt and hides toast", () => {
    useUIStore.setState({
      staffAuthed: true,
      staffAuthedAt: Date.now(),
    });
    render(<StaffSessionTimer />);

    // Trigger warning
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    const beforeBump = useUIStore.getState().staffAuthedAt;

    // Click extend
    act(() => {
      screen.getByText("Extend session").click();
    });

    // Toast hidden
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // staffAuthedAt was bumped
    expect(useUIStore.getState().staffAuthedAt).toBeGreaterThan(beforeBump!);
    // Still authed
    expect(useUIStore.getState().staffAuthed).toBe(true);
  });
});
