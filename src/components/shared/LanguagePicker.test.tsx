import { render, screen, fireEvent } from "@testing-library/preact";
import { LanguagePicker } from "./LanguagePicker";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

beforeEach(() => {
  // BottomSheet reads cfg.assistiveInput; seed a default cfg so it doesn't crash.
  useSettingsStore.setState({ cfg: makeTestCfg() });
});

const baseProps = {
  fieldLabel: "Patient language",
  pickerTitle: "Choose language",
  changeLabel: "Change language",
  t: light,
  isDark: false,
};

describe("LanguagePicker", () => {
  it("renders the current language as a collapsed field by default", () => {
    render(
      <LanguagePicker
        {...baseProps}
        value="en"
        onChange={() => {}}
      />,
    );
    // The grid is hidden until the field is tapped.
    expect(screen.queryByRole("radiogroup")).toBeNull();
    // The selected language is visible.
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("includes the field label and current language in the trigger button's accessible name", () => {
    render(
      <LanguagePicker
        {...baseProps}
        value="es"
        onChange={() => {}}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: /Patient language: Spanish\. Change language/,
    });
    expect(trigger).toBeInTheDocument();
  });

  it("opens the bottom sheet when the field is tapped, exposing all 24 languages", () => {
    render(
      <LanguagePicker
        {...baseProps}
        value="en"
        onChange={() => {}}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Patient language/ }),
    );
    const group = screen.getByRole("radiogroup");
    const radios = group.querySelectorAll("[role=radio]");
    expect(radios.length).toBe(24);
  });

  it("marks the current language's radio as checked inside the sheet", () => {
    render(
      <LanguagePicker
        {...baseProps}
        value="es"
        onChange={() => {}}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Patient language/ }),
    );
    const checked = screen.getAllByRole("radio", { checked: true });
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toMatch(/Spanish/);
  });

  it("calls onChange with the picked locale and closes the sheet", () => {
    const onChange = vi.fn();
    render(
      <LanguagePicker
        {...baseProps}
        value="en"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Patient language/ }),
    );
    const esRadio = screen
      .getAllByText("Spanish")
      .map((el) => el.closest("button")!)[0];
    fireEvent.click(esRadio);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("es");
    // Sheet collapses back to the field — radiogroup is gone.
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("does NOT call onChange when the already-selected language is tapped", () => {
    const onChange = vi.fn();
    render(
      <LanguagePicker
        {...baseProps}
        value="en"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Patient language/ }),
    );
    const enRadio = screen.getAllByRole("radio", { checked: true })[0];
    fireEvent.click(enRadio);

    expect(onChange).not.toHaveBeenCalled();
    // Sheet still closes so the user isn't trapped.
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("renders the helper text when provided", () => {
    render(
      <LanguagePicker
        {...baseProps}
        value="en"
        helper="The language your care team understands."
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByText("The language your care team understands."),
    ).toBeInTheDocument();
  });
});
