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

function seed() {
  useSettingsStore.setState({
    cfg: makeTestCfg({
      patient: { name: "Maria", patientLang: "en", hasVoice: false },
      cfg: { caregiverLang: "en" },
    }),
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
    renderSheet();
    expect(screen.getByText("Erase and Reset All Patient Data")).toBeInTheDocument();
    expect(screen.getByText("Erase and Reset All Care Team Data")).toBeInTheDocument();
    expect(screen.getByText("Erase and Reset Everything")).toBeInTheDocument();
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
