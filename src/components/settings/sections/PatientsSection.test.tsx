import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { PatientsSection } from "./PatientsSection";
import { ConfirmDialogHost } from "../../shared/ConfirmDialog";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useConversationStore } from "../../../stores/conversationStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
import { useUIStore } from "../../../stores/uiStore";
import { makeTestCfg } from "../../../test/makeCfg";
import type { Patient } from "../../../types";

vi.mock("../../../stores/patientIndex", () => ({
  removePatientHashes: vi.fn().mockResolvedValue(new Set<string>()),
}));

// Re-import the mock so we can assert against it
import { removePatientHashes } from "../../../stores/patientIndex";

const now = Date.now();

const patientA: Patient = {
  id: "patient-a",
  name: "Alice",
  bed: "4B-12",
  patientLang: "en",
  hasVoice: true,
  speakerData: { fake: true },
  addedAt: now - 3_600_000,
  lastActiveAt: now - 60_000,
};

const patientB: Patient = {
  id: "patient-b",
  name: "Bob",
  bed: "4B-14",
  patientLang: "es",
  hasVoice: false,
  speakerData: null,
  addedAt: now - 7_200_000,
  lastActiveAt: now - 7_200_000,
};

const patientC: Patient = {
  id: "patient-c",
  name: "Carol",
  bed: "4B-16",
  patientLang: "zh",
  hasVoice: true,
  speakerData: { fake: true },
  addedAt: now - 86_400_000,
  lastActiveAt: now,
};

function setupStore(activeId = "patient-a") {
  const cfg = makeTestCfg({
    patients: [patientA, patientB, patientC],
    cfg: { activePatientId: activeId },
  });
  useSettingsStore.setState({ cfg, _hasHydrated: true });
  useConversationStore.setState({
    messagesByPatientId: {
      "patient-a": [
        { from: "patient", text: "Hello", time: "10:00 AM", label: "Alice" },
      ],
      "patient-b": [
        { from: "patient", text: "Hola", time: "10:01 AM", label: "Bob" },
      ],
    },
  });
}

function renderSection() {
  return render(
    <>
      <ConfirmDialogHost />
      <PatientsSection t={light} theme="light" />
    </>,
  );
}

beforeEach(() => {
  setupStore();
  useUIStore.getState().resetUI();
  vi.mocked(removePatientHashes).mockClear();
});

describe("PatientsSection", () => {
  it("renders all patients with name, bed, and voice chip", () => {
    renderSection();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.getByText("Bed 4B-12")).toBeInTheDocument();
    expect(screen.getByText("Bed 4B-14")).toBeInTheDocument();
  });

  it("disables Remove on the active patient", () => {
    renderSection();
    // Alice is active — her Remove button should be disabled
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    // Find the Remove button associated with Alice (first patient in order)
    const aliceRemove = removeButtons[0];
    expect(aliceRemove).toBeDisabled();

    // Check aria-describedby points to a hint
    const hintId = aliceRemove.getAttribute("aria-describedby");
    expect(hintId).toBeTruthy();
    const hintEl = document.getElementById(hintId!);
    expect(hintEl).toBeInTheDocument();
    expect(hintEl!.textContent).toMatch(/Switch to another patient/);
  });

  it("tapping Remove on inactive patient opens ConfirmDialog", async () => {
    renderSection();
    // Bob is inactive — his Remove button (second patient card) should be enabled
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    // Patient order: Alice (active), Bob (inactive), Carol (inactive)
    const bobRemove = removeButtons[1];
    expect(bobRemove).not.toBeDisabled();

    fireEvent.click(bobRemove);

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Remove Bob?")).toBeInTheDocument();
  });

  it("confirm cascades: removes from settingsStore, clears conversation, calls discardByPatientId, clears patientIndex", async () => {
    const discardSpy = vi.spyOn(useAudioCacheStore.getState(), "discardByPatientId");
    const clearForPatientSpy = vi.spyOn(useConversationStore.getState(), "clearForPatient");

    renderSection();

    // Click Remove on Bob (inactive)
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    const bobRemove = removeButtons[1];
    fireEvent.click(bobRemove);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click the confirm button inside the dialog
    const dialog = screen.getByRole("dialog");
    const dialogButtons = dialog.querySelectorAll("button");
    const dialogConfirm = Array.from(dialogButtons).find(
      (btn) => btn.textContent === "Remove",
    )!;
    fireEvent.click(dialogConfirm);

    // Wait for the async cascade to complete
    await waitFor(() => {
      // Patient should be removed from settingsStore
      const patients = useSettingsStore.getState().cfg?.patients ?? [];
      expect(patients.find((p) => p.id === "patient-b")).toBeUndefined();
    });

    // Conversation cleared
    expect(clearForPatientSpy).toHaveBeenCalledWith("patient-b");

    // Patient index cleared
    expect(removePatientHashes).toHaveBeenCalledWith("patient-b");

    // Audio cache store discarded
    expect(discardSpy).toHaveBeenCalledWith("patient-b");

    discardSpy.mockRestore();
    clearForPatientSpy.mockRestore();
  });

  it("cancel leaves state unchanged", async () => {
    renderSection();

    const patientsBefore = useSettingsStore.getState().cfg?.patients;

    // Click Remove on Bob (inactive)
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    const bobRemove = removeButtons[1];
    fireEvent.click(bobRemove);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Cancel
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // State unchanged
    expect(useSettingsStore.getState().cfg?.patients).toEqual(patientsBefore);
    expect(removePatientHashes).not.toHaveBeenCalled();
  });

  it("renders empty state appropriately when only one patient exists", () => {
    // Single patient who is active — Remove must be disabled
    const solePatient: Patient = {
      id: "sole-patient",
      name: "Solo",
      bed: "1A",
      patientLang: "en",
      hasVoice: false,
      speakerData: null,
      addedAt: now,
      lastActiveAt: now,
    };
    const cfg = makeTestCfg({
      patients: [solePatient],
      cfg: { activePatientId: "sole-patient" },
    });
    useSettingsStore.setState({ cfg, _hasHydrated: true });

    renderSection();

    expect(screen.getByText("Solo")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]).toBeDisabled();
  });

  it("+ Add Patient tap opens addPatient overlay", () => {
    renderSection();
    const addBtn = screen.getByRole("button", { name: /\+ Add Patient/i });
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);

    expect(useUIStore.getState().addPatientOpen).toBe(true);
  });
});
