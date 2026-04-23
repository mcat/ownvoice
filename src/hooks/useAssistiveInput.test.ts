import { renderHook, act } from "@testing-library/preact";
import { useAssistiveInput } from "./useAssistiveInput";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings } from "../types";

const baseCfg: AppSettings = {
  patientName: "",
  bed: "",
  patientLang: "en",
  caregiverLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
};

beforeEach(() => {
  document.documentElement.removeAttribute("data-assistive");
  useSettingsStore.setState({ cfg: baseCfg });
});

describe("useAssistiveInput", () => {
  it("omits data-assistive when cfg is null", () => {
    useSettingsStore.setState({ cfg: null });
    renderHook(() => useAssistiveInput());
    expect(document.documentElement.hasAttribute("data-assistive")).toBe(false);
  });

  it("omits data-assistive when assistiveInput is undefined", () => {
    renderHook(() => useAssistiveInput());
    expect(document.documentElement.hasAttribute("data-assistive")).toBe(false);
  });

  it("omits data-assistive when assistiveInput is false", () => {
    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: false } });
    renderHook(() => useAssistiveInput());
    expect(document.documentElement.hasAttribute("data-assistive")).toBe(false);
  });

  it('sets data-assistive="on" when assistiveInput is true', () => {
    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    renderHook(() => useAssistiveInput());
    expect(document.documentElement.getAttribute("data-assistive")).toBe("on");
  });

  it("reacts to settings changes", () => {
    renderHook(() => useAssistiveInput());
    expect(document.documentElement.hasAttribute("data-assistive")).toBe(false);

    act(() => {
      useSettingsStore.setState({
        cfg: { ...baseCfg, assistiveInput: true },
      });
    });
    expect(document.documentElement.getAttribute("data-assistive")).toBe("on");

    act(() => {
      useSettingsStore.setState({
        cfg: { ...baseCfg, assistiveInput: false },
      });
    });
    expect(document.documentElement.hasAttribute("data-assistive")).toBe(false);
  });
});
