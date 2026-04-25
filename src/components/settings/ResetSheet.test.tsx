import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { ResetSheet } from "./ResetSheet";
import { ConfirmDialogHost } from "../shared/ConfirmDialog";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { makeTestCfg } from "../../test/makeCfg";

const resetPatientsMock = vi.fn(async () => {});
const resetCareTeamMock = vi.fn(async () => {});

vi.mock("../../stores/resetScoped", () => ({
  resetPatients: () => resetPatientsMock(),
  resetCareTeam: () => resetCareTeamMock(),
}));

function seed(opts?: { providers?: { name: string; hasVoice: boolean; emoji: string }[] }) {
  useSettingsStore.setState({
    cfg: makeTestCfg({
      patient: { name: "Maria", patientLang: "en", hasVoice: false },
      cfg: {
        caregiverLang: "en",
        providers: opts?.providers ?? [],
      },
    }),
    speakerData: null,
    _hasHydrated: true,
  });
}

function seedEmpty() {
  // Set cfg to a shape with zero patients and zero providers — the
  // legitimately-empty case (e.g. mid-onboarding or post-reset).
  useSettingsStore.setState({
    cfg: {
      patients: [],
      activePatientId: null,
      providers: [],
      caregiverLang: "en",
      pin: "",
      assistiveInput: false,
    },
    speakerData: null,
    _hasHydrated: true,
  });
}

describe("ResetSheet", () => {
  beforeEach(() => {
    resetPatientsMock.mockClear();
    resetCareTeamMock.mockClear();
    useUIStore.getState().resetUI();
    seed();
  });

  function renderSheet(onResetEverything = vi.fn()) {
    return {
      onResetEverything,
      ...render(
        <>
          <ResetSheet onResetEverything={onResetEverything} t={light} />
          <ConfirmDialogHost />
        </>,
      ),
    };
  }

  it("renders all three scoped reset rows", () => {
    seed({
      providers: [{ name: "Dr. Smith", hasVoice: true, emoji: "👩‍⚕️" }],
    });
    renderSheet();
    // Default seed has 1 patient (Maria) and we just added 1 provider, so
    // the patient + care-team rows render WITH counts; Everything stays
    // count-less.
    expect(screen.getByText("Erase and Reset All Patient Data (1)")).toBeInTheDocument();
    expect(screen.getByText("Erase and Reset All Care Team Data (1)")).toBeInTheDocument();
    expect(screen.getByText("Erase and Reset Everything")).toBeInTheDocument();
  });

  it("appends the count to the patient + care-team labels", () => {
    seed({
      providers: [
        { name: "Dr. Smith", hasVoice: true, emoji: "👩‍⚕️" },
        { name: "Nurse Jay", hasVoice: false, emoji: "🧑‍⚕️" },
        { name: "RT Lee", hasVoice: false, emoji: "👨‍⚕️" },
      ],
    });
    renderSheet();
    expect(screen.getByText("Erase and Reset All Patient Data (1)")).toBeInTheDocument();
    expect(screen.getByText("Erase and Reset All Care Team Data (3)")).toBeInTheDocument();
  });

  it("disables the patient row when there are no patients and shows 'No data to erase'", () => {
    seedEmpty();
    renderSheet();
    const row = screen.getByTestId("reset-patients") as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    // Label has no count appended; description swaps to the empty hint.
    expect(screen.getByText("Erase and Reset All Patient Data")).toBeInTheDocument();
    expect(row.textContent).toContain("No data to erase");
  });

  it("disables the care-team row when there are no providers", () => {
    seedEmpty();
    renderSheet();
    const row = screen.getByTestId("reset-care_team") as HTMLButtonElement;
    expect(row.disabled).toBe(true);
  });

  it("keeps 'Erase Everything' enabled even when both counts are zero", () => {
    seedEmpty();
    renderSheet();
    const row = screen.getByTestId("reset-everything") as HTMLButtonElement;
    expect(row.disabled).toBe(false);
  });

  it("clicking a disabled patient row does NOT open the confirm dialog", () => {
    seedEmpty();
    renderSheet();
    fireEvent.click(screen.getByTestId("reset-patients"));
    expect(screen.queryByText("Erase all patient data?")).not.toBeInTheDocument();
  });

  it("'Erase All Patient Data' opens a confirm dialog scoped to patients", async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("reset-patients"));
    await waitFor(() =>
      expect(screen.getByText("Erase all patient data?")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Care team configuration is preserved/)).toBeInTheDocument();
  });

  it("confirming the patient reset calls resetPatients()", async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("reset-patients"));
    await waitFor(() => screen.getByText("Erase all patient data?"));
    fireEvent.click(screen.getByText("Erase"));
    await waitFor(() => expect(resetPatientsMock).toHaveBeenCalledOnce());
  });

  it("confirming the care-team reset calls resetCareTeam()", async () => {
    seed({
      providers: [{ name: "Dr. Smith", hasVoice: true, emoji: "👩‍⚕️" }],
    });
    renderSheet();
    fireEvent.click(screen.getByTestId("reset-care_team"));
    await waitFor(() => screen.getByText("Erase all care team data?"));
    fireEvent.click(screen.getByText("Erase"));
    await waitFor(() => expect(resetCareTeamMock).toHaveBeenCalledOnce());
  });

  it("confirming 'Reset Everything' calls onResetEverything and closes the reset overlay", async () => {
    const { onResetEverything } = renderSheet();
    useUIStore.setState({ resetOpen: true });
    fireEvent.click(screen.getByTestId("reset-everything"));
    await waitFor(() => screen.getByText("Are you sure?"));
    fireEvent.click(screen.getByText("Reset everything"));
    await waitFor(() => expect(onResetEverything).toHaveBeenCalledOnce());
    expect(useUIStore.getState().resetOpen).toBe(false);
  });

  it("cancelling the patient reset does NOT call any reset action", async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("reset-patients"));
    await waitFor(() => screen.getByText("Erase all patient data?"));
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(screen.queryByText("Erase all patient data?")).not.toBeInTheDocument(),
    );
    expect(resetPatientsMock).not.toHaveBeenCalled();
  });
});
