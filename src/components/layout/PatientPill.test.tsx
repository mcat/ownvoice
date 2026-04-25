import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientPill } from "./PatientPill";
import { light } from "../../theme/tokens";
import type { Patient } from "../../types";

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
});
