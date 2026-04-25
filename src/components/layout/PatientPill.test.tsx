import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientPill } from "./PatientPill";
import { light } from "../../theme/tokens";
import { useUIStore } from "../../stores/uiStore";
import type { Patient } from "../../types";

beforeEach(() => {
  useUIStore.getState().resetUI();
});

const maria: Patient = {
  id: "p1",
  name: "Maria",
  bed: "4A",
  patientLang: "en",
  hasVoice: true,
  speakerData: { fake: true },
  addedAt: 0,
  lastActiveAt: 0,
};

describe("PatientPill", () => {
  it("renders the patient's name and bed", () => {
    render(
      <PatientPill
        patient={maria}
        caregiverLang="en"
        onEditPatient={() => {}}
        t={light}
        theme="light"
      />,
    );
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText(/4A/)).toBeInTheDocument();
  });

  it("includes the patient's name in the trigger button's accessible name", () => {
    render(
      <PatientPill
        patient={maria}
        caregiverLang="en"
        onEditPatient={() => {}}
        t={light}
        theme="light"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Edit patient: Maria/ }),
    ).toBeInTheDocument();
  });

  it("calls onEditPatient when tapped", () => {
    const onEditPatient = vi.fn();
    render(
      <PatientPill
        patient={maria}
        caregiverLang="en"
        onEditPatient={onEditPatient}
        t={light}
        theme="light"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Edit patient: Maria/ }));
    expect(onEditPatient).toHaveBeenCalledTimes(1);
  });

  it("renders without bed when the patient has none", () => {
    render(
      <PatientPill
        patient={{ ...maria, bed: "" }}
        caregiverLang="en"
        onEditPatient={() => {}}
        t={light}
        theme="light"
      />,
    );
    expect(screen.queryByText(/4A/)).toBeNull();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("hides the trailing chevron when staff is not authenticated", () => {
    useUIStore.setState({ staffAuthed: false });
    render(
      <PatientPill
        patient={maria}
        caregiverLang="en"
        onEditPatient={() => {}}
        t={light}
        theme="light"
      />,
    );
    // The chevron is the only "›" character in the pill — search the trigger
    // button for it.
    const trigger = screen.getByRole("button", { name: /Edit patient: Maria/ });
    expect(trigger.textContent).not.toContain("›");
  });

  it("shows the trailing chevron when staff is authenticated", () => {
    useUIStore.setState({ staffAuthed: true });
    render(
      <PatientPill
        patient={maria}
        caregiverLang="en"
        onEditPatient={() => {}}
        t={light}
        theme="light"
      />,
    );
    const trigger = screen.getByRole("button", { name: /Edit patient: Maria/ });
    expect(trigger.textContent).toContain("›");
  });
});
