import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientsSection } from "./PatientsSection";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useUIStore } from "../../../stores/uiStore";
import { makeTestCfg } from "../../../test/makeCfg";

describe("PatientsSection", () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  function setup(patientCount = 1) {
    const cfg = makeTestCfg({
      patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: false },
      cfg: {
        // Pad the roster with extra rows so we can verify the count badge.
        patients: Array.from({ length: patientCount }, (_, i) => ({
          id: `p${i}`,
          name: `Patient ${i}`,
          bed: "",
          patientLang: "en",
          hasVoice: false,
          speakerData: null,
          fallbackVoice: null,
          createdAt: 0,
          lastActiveAt: 0,
        })),
      },
    });
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
    return render(<PatientsSection t={light} />);
  }

  it("renders the Patients label and description", () => {
    setup();
    expect(screen.getByRole("button", { name: /Patients/ })).toBeInTheDocument();
    expect(screen.getByText("Switch, add, or edit patients")).toBeInTheDocument();
  });

  it("shows the patient count next to the label", () => {
    setup(3);
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("tapping the row closes Settings and opens the switch overlay", () => {
    setup();
    useUIStore.setState({ settingsOpen: true });

    fireEvent.click(screen.getByRole("button", { name: /Patients/ }));

    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().switchSheetOpen).toBe(true);
  });
});
