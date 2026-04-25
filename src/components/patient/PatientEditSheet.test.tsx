import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientEditSheet } from "./PatientEditSheet";
import { ConfirmDialogHost } from "../shared/ConfirmDialog";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

vi.mock("../../models/ttsEngine", () => ({
  isGPUReady: () => false,
}));

// BottomSheet's close path defers onClose until a transitionend event fires
// — jsdom doesn't reliably dispatch those. Force reduced-motion so the close
// path resolves synchronously, matching the pattern in other sheet tests.
vi.mock("../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const cfg = makeTestCfg({
  patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: true },
});

function activePatient() {
  return cfg.patients.find((p) => p.id === cfg.activePatientId)!;
}

beforeEach(() => {
  useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
});

describe("PatientEditSheet", () => {
  it("renders the patient's name in the sheet title", () => {
    const onClose = vi.fn();
    render(
      <>
        <PatientEditSheet
          patientId={activePatient().id}
          onClose={onClose}
          t={light}
          theme="light"
        />
        <ConfirmDialogHost />
      </>,
    );
    expect(
      screen.getByRole("heading", { name: /Edit Maria/ }),
    ).toBeInTheDocument();
  });

  it("renders PatientInfoSection inputs pre-filled with the patient's data", () => {
    const onClose = vi.fn();
    render(
      <>
        <PatientEditSheet
          patientId={activePatient().id}
          onClose={onClose}
          t={light}
          theme="light"
        />
        <ConfirmDialogHost />
      </>,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
    expect(screen.getByLabelText("Bed / Room")).toHaveValue("4A");
  });

  it("editing a non-active patient writes to the correct patient by id (not active)", () => {
    // Add a second non-active patient and target it.
    const second = useSettingsStore.getState().addPatient({
      name: "Sam",
      bed: "5B",
      patientLang: "en",
      hasVoice: false,
      speakerData: null,
      fallbackVoice: null,
    });
    // addPatient always sets active — switch back to the original "Maria"
    useSettingsStore.getState().switchPatient(activePatient().id);
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe(activePatient().id);

    const onClose = vi.fn();
    render(
      <>
        <PatientEditSheet
          patientId={second.id}
          onClose={onClose}
          t={light}
          theme="light"
        />
        <ConfirmDialogHost />
      </>,
    );

    fireEvent.input(screen.getByLabelText("Name"), {
      target: { value: "Sam-Updated" },
    });

    const stored = useSettingsStore
      .getState()
      .cfg?.patients.find((p) => p.id === second.id);
    expect(stored?.name).toBe("Sam-Updated");
    // Active patient (Maria) is untouched.
    const maria = useSettingsStore
      .getState()
      .cfg?.patients.find((p) => p.id === activePatient().id);
    expect(maria?.name).toBe("Maria");
    // activePatientId should NOT have changed — editing must not switch.
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe(activePatient().id);
  });

  it("renders nothing when the patient id is unknown", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PatientEditSheet
        patientId="nonexistent-id"
        onClose={onClose}
        t={light}
        theme="light"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("clicking the Done close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <>
        <PatientEditSheet
          patientId={activePatient().id}
          onClose={onClose}
          t={light}
          theme="light"
        />
        <ConfirmDialogHost />
      </>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Close patient editor/ }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
