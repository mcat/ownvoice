import { render, screen, fireEvent } from "@testing-library/preact";
import { SubcategoryChips } from "./SubcategoryChips";
import { light } from "../../theme/tokens";

const labels = ["All", "Comfort", "Medical", "Emotional"];

describe("SubcategoryChips", () => {
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
    expect(screen.getAllByRole("button")).toHaveLength(4);
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
});
