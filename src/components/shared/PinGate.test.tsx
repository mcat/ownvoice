import { render, screen, fireEvent, act } from "@testing-library/preact";
import { PinGate } from "./PinGate";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";

const baseProps = {
  pin: "1234",
  onSuccess: vi.fn(),
  onClose: vi.fn(),
  t: light,
  theme: "light" as const,
};

beforeEach(() => {
  useSettingsStore.setState({
    cfg: {
      patientName: "Patient",
      bed: "1",
      patientLang: "en",
      caregiverLang: "en",
      providers: [],
    } as import("../../types").AppSettings,
    _hasHydrated: true,
  });
});

/** Click digit buttons to enter a PIN sequence.
 *  Advances fake timers 300ms between clicks to clear Btn debounce lockout. */
function enterPin(digits: string) {
  for (const d of digits) {
    const btns = screen.getAllByText(d);
    const btn = btns.find((el) => el.closest("button"));
    fireEvent.click(btn!);
    // Advance past the 300ms Btn debounce lockout so next click registers
    act(() => {
      vi.advanceTimersByTime(300);
    });
  }
}

describe("PinGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders keypad with digits 0-9 and delete", () => {
    render(<PinGate {...baseProps} />);
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
    // Delete key uses erase-to-the-left symbol
    expect(screen.getByText("\u232B")).toBeInTheDocument();
  });

  it("renders title and subtitle", () => {
    render(<PinGate {...baseProps} />);
    expect(screen.getByText("Enter PIN")).toBeInTheDocument();
    expect(screen.getByText("Staff access only")).toBeInTheDocument();
  });

  it("entering correct PIN calls onSuccess", () => {
    const onSuccess = vi.fn();
    render(<PinGate {...baseProps} onSuccess={onSuccess} />);
    enterPin("1234");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("wrong PIN shows error state", () => {
    const onSuccess = vi.fn();
    render(<PinGate {...baseProps} onSuccess={onSuccess} />);
    enterPin("0000");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText("Incorrect PIN")).toBeInTheDocument();
  });

  it("wrong PIN clears after 800ms", () => {
    render(<PinGate {...baseProps} />);
    enterPin("0000");
    expect(screen.getByText("Incorrect PIN")).toBeInTheDocument();

    // enterPin already advanced 300ms (debounce after last digit) out of the
    // 800ms error timeout. Advance the remaining 500ms to clear it.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText("Incorrect PIN")).not.toBeInTheDocument();
  });

  it("cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(<PinGate {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores key presses during error state", () => {
    const onSuccess = vi.fn();
    render(<PinGate {...baseProps} onSuccess={onSuccess} />);
    enterPin("0000"); // wrong PIN — triggers error
    // Try pressing more keys during error state
    enterPin("12");
    // Still in error; onSuccess should not fire
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
