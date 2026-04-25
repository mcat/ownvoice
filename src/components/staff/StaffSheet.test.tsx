import { render, screen, fireEvent } from "@testing-library/preact";
import { StaffSheet } from "./StaffSheet";
import { light } from "../../theme/tokens";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

// BottomSheet's close path defers onClose until transitionend — jsdom
// doesn't reliably fire those, so force reduced motion.
vi.mock("../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

beforeEach(() => {
  useSettingsStore.setState({ cfg: makeTestCfg(), _hasHydrated: true });
  useUIStore.getState().resetUI();
});

describe("StaffSheet", () => {
  it("renders Patients and Settings actions by default", () => {
    render(<StaffSheet onClose={() => {}} t={light} />);
    expect(screen.getByRole("button", { name: /Patients/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Settings/ })).toBeInTheDocument();
  });

  it("does NOT render End Session when staff is not authenticated", () => {
    useUIStore.setState({ staffAuthed: false });
    render(<StaffSheet onClose={() => {}} t={light} />);
    expect(screen.queryByRole("button", { name: /End staff session/i })).toBeNull();
  });

  it("renders End Session when staff is authenticated", () => {
    useUIStore.setState({ staffAuthed: true });
    render(<StaffSheet onClose={() => {}} t={light} />);
    expect(
      screen.getByRole("button", { name: /End staff session/i }),
    ).toBeInTheDocument();
  });

  it("Patients action closes the sheet then opens the patients (switch) overlay", () => {
    const onClose = vi.fn();
    render(<StaffSheet onClose={onClose} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /Patients/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().switchSheetOpen).toBe(true);
  });

  it("Settings action closes the sheet then opens the settings overlay", () => {
    const onClose = vi.fn();
    render(<StaffSheet onClose={onClose} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /Settings/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().settingsOpen).toBe(true);
  });

  it("End Session closes the sheet then ends the staff session", () => {
    useUIStore.setState({ staffAuthed: true, staffAuthedAt: 12345 });
    const onClose = vi.fn();
    render(<StaffSheet onClose={onClose} t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /End staff session/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().staffAuthed).toBe(false);
    expect(useUIStore.getState().staffAuthedAt).toBeNull();
  });

  it("clicking the close button calls onClose", () => {
    const onClose = vi.fn();
    render(<StaffSheet onClose={onClose} t={light} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Close staff menu/i }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
