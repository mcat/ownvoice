import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { axe } from "vitest-axe";
import { PatientsScreen } from "./PatientsScreen";
import { ConfirmDialogHost } from "../shared/ConfirmDialog";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { makeTestCfg } from "../../test/makeCfg";
import type { Patient } from "../../types";
import * as audioCacheRunner from "../../models/audioCacheRunner";

vi.mock("../../models/audioCacheRunner", () => ({
  pauseAll: vi.fn(),
  runPreGeneration: vi.fn(),
  retryFailed: vi.fn(),
  abort: vi.fn(),
}));

// BottomSheet's close path resolves async via transitionend, which jsdom
// doesn't reliably fire. Force reduced-motion so onClose runs synchronously.
vi.mock("../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

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

function setupStore(activeId: string = "patient-a") {
  const cfg = makeTestCfg({
    patients: [patientA, patientB, patientC],
    cfg: { activePatientId: activeId },
  });
  useSettingsStore.setState({ cfg, _hasHydrated: true });
}

function flushMicrotask(): Promise<void> {
  return new Promise((r) => queueMicrotask(r));
}

function renderWithHost(props: { onClose?: () => void } = {}) {
  return render(
    <>
      <PatientsScreen
        open
        onClose={props.onClose ?? (() => {})}
        t={light}
        theme="light"
      />
      <ConfirmDialogHost />
    </>,
  );
}

beforeEach(() => {
  setupStore();
  useUIStore.getState().resetUI();
  vi.mocked(audioCacheRunner.pauseAll).mockReset();
});

describe("PatientsScreen — switching", () => {
  it("renders one card button per patient", () => {
    renderWithHost();
    // Card buttons are aria-labeled by the patient name (or name + active suffix).
    expect(screen.getByRole("button", { name: /^Alice/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bob/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Carol/ })).toBeInTheDocument();
  });

  it("sorts patients by lastActiveAt descending", () => {
    renderWithHost();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Carol");
    expect(items[1]).toHaveTextContent("Alice");
    expect(items[2]).toHaveTextContent("Bob");
  });

  it("active patient's card is disabled and carries aria-current=true", () => {
    renderWithHost();
    const aliceCard = screen.getByRole("button", { name: /^Alice/ });
    expect(aliceCard).toBeDisabled();
    expect(aliceCard).toHaveAttribute("aria-current", "true");
    const bobCard = screen.getByRole("button", { name: /^Bob/ });
    expect(bobCard).not.toBeDisabled();
    expect(bobCard).not.toHaveAttribute("aria-current");
  });

  it("tapping non-active card switches + pauses audio + closes", async () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /^Bob/ }));

    expect(audioCacheRunner.pauseAll).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-b");
    await flushMicrotask();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("tapping the active card is a no-op (button is disabled, click suppressed by browser)", () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /^Alice/ }));
    expect(audioCacheRunner.pauseAll).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-a");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clicking the kebab does NOT trigger a switch", () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /Actions for Bob/ }));
    expect(audioCacheRunner.pauseAll).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-a");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("+ Add Patient closes the screen and opens addPatient overlay", () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Patient/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().addPatientOpen).toBe(true);
  });

  it("renders bed and locale info on each card", () => {
    renderWithHost();
    expect(screen.getByRole("button", { name: /^Alice/ })).toHaveTextContent("Bed 4B-12");
    // Spanish endonym
    expect(screen.getByRole("button", { name: /^Bob/ })).toHaveTextContent("Espa");
  });

  it("renders voice-status chip on each card", () => {
    // Distinct from the old SwitchSheet behavior — the Patients roster
    // shows voice readiness because it's now the management surface, not a
    // bedside fast-switcher.
    renderWithHost();
    const alice = screen.getByRole("button", { name: /^Alice/ });
    expect(alice).toHaveTextContent("Voice captured");
    const bob = screen.getByRole("button", { name: /^Bob/ });
    expect(bob).toHaveTextContent("No voice");
  });
});

describe("PatientsScreen — Edit", () => {
  it("Edit on a non-active patient closes the screen and opens patientEdit for that id", () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /Actions for Bob/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().patientEditId).toBe("patient-b");
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-a");
    expect(audioCacheRunner.pauseAll).not.toHaveBeenCalled();
  });

  it("Edit on the active patient also opens the edit sheet", () => {
    const onClose = vi.fn();
    renderWithHost({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /Actions for Alice/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().patientEditId).toBe("patient-a");
  });
});

describe("PatientsScreen — Discharge", () => {
  it("Discharge is disabled on the active patient and shows the hint", () => {
    renderWithHost();
    fireEvent.click(screen.getByRole("button", { name: /Actions for Alice/ }));
    expect(screen.getByRole("menuitem", { name: "Discharge" })).toBeDisabled();
    expect(
      screen.getByText("Switch to another patient before discharging this one."),
    ).toBeInTheDocument();
  });

  it("Discharge on a non-active patient opens the destructive confirm dialog", async () => {
    renderWithHost();
    fireEvent.click(screen.getByRole("button", { name: /Actions for Bob/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Discharge" }));

    // The PatientsScreen BottomSheet is itself role=dialog, so locate the
    // confirm dialog specifically via its title text rather than getByRole.
    expect(await screen.findByText(/Discharge Bob\?/)).toBeInTheDocument();
  });

  it("confirming Discharge deletes the non-active patient from the store", async () => {
    renderWithHost();
    fireEvent.click(screen.getByRole("button", { name: /Actions for Bob/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Discharge" }));

    const titleEl = await screen.findByText(/Discharge Bob\?/);
    // Walk up to the confirm dialog and click its destructive "Discharge" button.
    const confirmDialog = titleEl.closest('[role="dialog"]') as HTMLElement | null;
    expect(confirmDialog).toBeTruthy();
    const confirmBtn = Array.from(
      confirmDialog!.querySelectorAll("button"),
    ).find((b) => b.textContent === "Discharge");
    expect(confirmBtn).toBeTruthy();
    fireEvent.click(confirmBtn!);

    await waitFor(() => {
      const ids = (useSettingsStore.getState().cfg?.patients ?? []).map((p) => p.id);
      expect(ids).not.toContain("patient-b");
    });
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-a");
  });
});

describe("PatientsScreen — accessibility", () => {
  it("has no WCAG AA a11y violations", async () => {
    const { container } = render(
      <PatientsScreen open onClose={() => {}} t={light} theme="light" />,
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <PatientsScreen open={false} onClose={() => {}} t={light} theme="light" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("has a polite live region for switch announcements", () => {
    renderWithHost();
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
