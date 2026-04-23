import { render, screen, fireEvent } from "@testing-library/preact";
import { SuggestionChip } from "./SuggestionChip";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

const baseCfg = makeTestCfg();

beforeEach(() => {
  useSettingsStore.setState({ cfg: baseCfg });
});

describe("SuggestionChip", () => {
  it("renders text", () => {
    render(<SuggestionChip text="I can't sleep" onTap={vi.fn()} t={light} theme="light" />);
    expect(screen.getByRole("button", { name: /I can't sleep/ })).toBeInTheDocument();
  });

  it("calls onTap with text on click", () => {
    const onTap = vi.fn();
    render(<SuggestionChip text="I can't sleep" onTap={onTap} t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith("I can't sleep");
  });

  it("mouse hover changes background; touch does not", () => {
    render(<SuggestionChip text="X" onTap={vi.fn()} t={light} theme="light" />);
    const chip = screen.getByRole("button");
    const baseBg = chip.style.background;

    fireEvent.pointerEnter(chip, { pointerType: "touch" });
    expect(chip.style.background).toBe(baseBg);

    fireEvent.pointerEnter(chip, { pointerType: "mouse" });
    expect(chip.style.background).not.toBe(baseBg);

    fireEvent.pointerLeave(chip, { pointerType: "mouse" });
    expect(chip.style.background).toBe(baseBg);
  });

  it("assistive mode strengthens hover background", () => {
    const { unmount } = render(
      <SuggestionChip text="X" onTap={vi.fn()} t={light} theme="light" />,
    );
    const defaultChip = screen.getByRole("button");
    fireEvent.pointerEnter(defaultChip, { pointerType: "mouse" });
    const defaultHoverBg = defaultChip.style.background;
    unmount();

    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    render(<SuggestionChip text="X" onTap={vi.fn()} t={light} theme="light" />);
    const assistiveChip = screen.getByRole("button");
    fireEvent.pointerEnter(assistiveChip, { pointerType: "mouse" });
    expect(assistiveChip.style.background).not.toBe(defaultHoverBg);
  });

  it("debounces rapid taps (inherits Btn behavior)", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    render(<SuggestionChip text="X" onTap={onTap} t={light} theme="light" />);
    const chip = screen.getByRole("button");

    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(onTap).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
