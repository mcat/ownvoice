import { render, screen, fireEvent } from "@testing-library/preact";
import { AccessibilitySection } from "./AccessibilitySection";
import { light } from "../../../theme/tokens";
import { makeTestCfg } from "../../../test/makeCfg";

const baseCfg = makeTestCfg();

let pointerFineValue = false;
vi.mock("../../../hooks/usePointerFine", () => ({
  usePointerFine: () => pointerFineValue,
}));

beforeEach(() => {
  pointerFineValue = false;
});

describe("AccessibilitySection", () => {
  it("renders the Assistive Input Mode toggle", () => {
    render(
      <AccessibilitySection cfg={baseCfg} updateCfg={vi.fn()} t={light} />,
    );
    expect(
      screen.getByRole("switch", { name: /assistive input mode/i }),
    ).toBeInTheDocument();
  });

  it("toggle reflects off state when cfg.assistiveInput is undefined", () => {
    render(
      <AccessibilitySection cfg={baseCfg} updateCfg={vi.fn()} t={light} />,
    );
    expect(
      screen.getByRole("switch", { name: /assistive input mode/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("toggle reflects on state when cfg.assistiveInput is true", () => {
    render(
      <AccessibilitySection
        cfg={{ ...baseCfg, assistiveInput: true }}
        updateCfg={vi.fn()}
        t={light}
      />,
    );
    expect(
      screen.getByRole("switch", { name: /assistive input mode/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("clicking toggle calls updateCfg with flipped value", () => {
    const updateCfg = vi.fn();
    render(
      <AccessibilitySection cfg={baseCfg} updateCfg={updateCfg} t={light} />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: /assistive input mode/i }),
    );
    expect(updateCfg).toHaveBeenCalledWith({ assistiveInput: true });
  });

  it("clicking toggle when on calls updateCfg with false", () => {
    const updateCfg = vi.fn();
    render(
      <AccessibilitySection
        cfg={{ ...baseCfg, assistiveInput: true }}
        updateCfg={updateCfg}
        t={light}
      />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: /assistive input mode/i }),
    );
    expect(updateCfg).toHaveBeenCalledWith({ assistiveInput: false });
  });

  describe("external-pointer hint", () => {
    it("is hidden when pointer is coarse (touch-only iPad)", () => {
      pointerFineValue = false;
      render(
        <AccessibilitySection cfg={baseCfg} updateCfg={vi.fn()} t={light} />,
      );
      expect(screen.queryByText(/external pointer/i)).toBeNull();
    });

    it("is shown when pointer is fine and assistive mode is off", () => {
      pointerFineValue = true;
      render(
        <AccessibilitySection cfg={baseCfg} updateCfg={vi.fn()} t={light} />,
      );
      expect(screen.getByText(/external pointer/i)).toBeInTheDocument();
    });

    it("is hidden when pointer is fine but assistive mode is already on", () => {
      pointerFineValue = true;
      render(
        <AccessibilitySection
          cfg={{ ...baseCfg, assistiveInput: true }}
          updateCfg={vi.fn()}
          t={light}
        />,
      );
      expect(screen.queryByText(/external pointer/i)).toBeNull();
    });
  });
});
