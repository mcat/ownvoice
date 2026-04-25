import { render, screen, fireEvent } from "@testing-library/preact";
import { BottomSheet } from "./BottomSheet";
import { light } from "../../theme/tokens";

describe("BottomSheet.BackButton", () => {
  function renderInSheet(onBack: () => void) {
    return render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.BackButton parentLabel="Settings" onClick={onBack} />
          <BottomSheet.Title>Care Team</BottomSheet.Title>
        </BottomSheet.Header>
        <BottomSheet.Body>body</BottomSheet.Body>
      </BottomSheet>,
    );
  }

  it("renders the parent label next to a chevron", () => {
    renderInSheet(() => {});
    const back = screen.getByRole("button", { name: /Back to Settings/ });
    expect(back).toBeInTheDocument();
    // The visible text includes the parent label.
    expect(back.textContent).toContain("Settings");
  });

  it("fires onClick when tapped", () => {
    const onBack = vi.fn();
    renderInSheet(onBack);
    fireEvent.click(screen.getByRole("button", { name: /Back to Settings/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
