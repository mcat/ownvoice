import { render, screen, fireEvent } from "@testing-library/preact";
import { SubcategoryChips } from "./SubcategoryChips";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

const labels = ["All", "Comfort", "Medical", "Emotional"];

const baseCfg = makeTestCfg();

beforeEach(() => {
  useSettingsStore.setState({ cfg: baseCfg });
});

describe("SubcategoryChips", () => {
  it("renders as radiogroup with one radio aria-checked", () => {
    const { container } = render(
      <SubcategoryChips
        labels={["A", "B", "C"]}
        activeIndex={1}
        onSelect={vi.fn()}
        t={light}
        ariaLabel="Test"
      />,
    );
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].getAttribute("aria-checked")).toBe("false");
  });

  it("renders all chip labels", () => {
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the correct number of buttons", () => {
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("active chip has distinct background color", () => {
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={1}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    const activeBtn = screen.getByText("Comfort").closest("button")!;
    const inactiveBtn = screen.getByText("All").closest("button")!;

    // Active chip uses theme card (white) background with text color; inactive is transparent.
    expect(activeBtn.style.background).toBe("rgb(255, 255, 255)");
    expect(activeBtn.style.color).toBe("rgb(26, 26, 26)");
    expect(inactiveBtn.style.background).not.toBe("rgb(255, 255, 255)");
  });

  it("calls onSelect with the correct index when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={onSelect}
        t={light}
      />,
    );
    fireEvent.click(screen.getByText("Medical"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("calls onSelect with index 0 when first chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={2}
        onSelect={onSelect}
        t={light}
      />,
    );
    fireEvent.click(screen.getByText("All"));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("mouse hover changes inactive chip background", () => {
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    const chip = screen.getByText("Medical").closest("button")!;
    const baseBg = chip.style.background;

    fireEvent.pointerEnter(chip, { pointerType: "mouse" });
    expect(chip.style.background).not.toBe(baseBg);

    fireEvent.pointerLeave(chip, { pointerType: "mouse" });
    expect(chip.style.background).toBe(baseBg);
  });

  it("touch pointer does not trigger chip hover", () => {
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    const chip = screen.getByText("Medical").closest("button")!;
    const baseBg = chip.style.background;

    fireEvent.pointerEnter(chip, { pointerType: "touch" });
    expect(chip.style.background).toBe(baseBg);
  });

  it("assistive mode strengthens inactive-chip hover background", () => {
    const { unmount } = render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    const defaultChip = screen.getByText("Medical").closest("button")!;
    fireEvent.pointerEnter(defaultChip, { pointerType: "mouse" });
    const defaultHoverBg = defaultChip.style.background;
    unmount();

    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    render(
      <SubcategoryChips
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        t={light}
      />,
    );
    const assistiveChip = screen.getByText("Medical").closest("button")!;
    fireEvent.pointerEnter(assistiveChip, { pointerType: "mouse" });
    expect(assistiveChip.style.background).not.toBe(defaultHoverBg);
  });
});
