import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import { WarningToast } from "./WarningToast";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import { act } from "@testing-library/preact";

const baseProps = {
  secondsTotal: 5,
  onExtend: vi.fn(),
  onEndNow: vi.fn(),
  onAutoDismiss: vi.fn(),
  t: light,
  theme: "light" as const,
};

beforeEach(() => {
  vi.useFakeTimers();
  useSettingsStore.setState({
    cfg: makeTestCfg({ cfg: { caregiverLang: "en" } }),
    _hasHydrated: true,
  });
  baseProps.onExtend = vi.fn();
  baseProps.onEndNow = vi.fn();
  baseProps.onAutoDismiss = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WarningToast", () => {
  it("renders with role=alertdialog and aria-live=assertive", () => {
    render(<WarningToast {...baseProps} />);
    const el = screen.getByRole("alertdialog");
    expect(el).toHaveAttribute("aria-live", "assertive");
    expect(el).toHaveAttribute("aria-modal", "false");
  });

  it("countdown decrements every second", () => {
    render(<WarningToast {...baseProps} />);
    expect(screen.getByText(/5 seconds/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/4 seconds/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/3 seconds/)).toBeInTheDocument();
  });

  it("calls onAutoDismiss when countdown reaches 0", () => {
    const onAutoDismiss = vi.fn();
    render(<WarningToast {...baseProps} onAutoDismiss={onAutoDismiss} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onAutoDismiss).toHaveBeenCalledOnce();
  });

  it("extend button calls onExtend, not onAutoDismiss", () => {
    const onExtend = vi.fn();
    const onAutoDismiss = vi.fn();
    render(
      <WarningToast
        {...baseProps}
        onExtend={onExtend}
        onAutoDismiss={onAutoDismiss}
      />,
    );
    fireEvent.click(screen.getByText("Extend session"));
    expect(onExtend).toHaveBeenCalledOnce();
    expect(onAutoDismiss).not.toHaveBeenCalled();
  });

  it("end-now button calls onEndNow", () => {
    const onEndNow = vi.fn();
    render(<WarningToast {...baseProps} onEndNow={onEndNow} />);
    fireEvent.click(screen.getByText("End now"));
    expect(onEndNow).toHaveBeenCalledOnce();
  });

  it("unmount clears interval — onAutoDismiss not called after unmount", () => {
    const onAutoDismiss = vi.fn();
    const { unmount } = render(
      <WarningToast {...baseProps} onAutoDismiss={onAutoDismiss} />,
    );

    // Advance partway
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onAutoDismiss).not.toHaveBeenCalled();

    // Unmount — should clear the interval
    unmount();

    // Advance past when countdown would have hit 0
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onAutoDismiss).not.toHaveBeenCalled();
  });

  it("buttons have at least 64px min-height via inline style", () => {
    render(<WarningToast {...baseProps} />);
    const extendBtn = screen.getByText("Extend session");
    const endNowBtn = screen.getByText("End now");

    expect(extendBtn.style.minHeight).toBe("64px");
    expect(endNowBtn.style.minHeight).toBe("64px");
    expect(extendBtn.style.minWidth).toBe("64px");
    expect(endNowBtn.style.minWidth).toBe("64px");
  });
});
