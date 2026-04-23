import { render, screen, fireEvent } from "@testing-library/preact";
import { SwitchSheet } from "./SwitchSheet";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useConversationStore } from "../../stores/conversationStore";
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

const now = Date.now();

const patientA: Patient = {
  id: "patient-a",
  name: "Alice",
  bed: "4B-12",
  patientLang: "en",
  hasVoice: true,
  speakerData: { fake: true },
  addedAt: now - 3_600_000,
  lastActiveAt: now - 60_000, // 1 minute ago
};

const patientB: Patient = {
  id: "patient-b",
  name: "Bob",
  bed: "4B-14",
  patientLang: "es",
  hasVoice: false,
  speakerData: null,
  addedAt: now - 7_200_000,
  lastActiveAt: now - 7_200_000, // 2 hours ago
};

const patientC: Patient = {
  id: "patient-c",
  name: "Carol",
  bed: "4B-16",
  patientLang: "zh",
  hasVoice: true,
  speakerData: { fake: true },
  addedAt: now - 86_400_000,
  lastActiveAt: now, // just now — most recent
};

function setupStore(activeId: string = "patient-a") {
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
        { from: "provider", text: "Bien", time: "10:02 AM", label: "Dr. X" },
      ],
    },
  });
}

/** Flush one microtask turn so queueMicrotask callbacks fire. */
function flushMicrotask(): Promise<void> {
  return new Promise((r) => queueMicrotask(r));
}

beforeEach(() => {
  setupStore();
  useUIStore.getState().resetUI();
  vi.mocked(audioCacheRunner.pauseAll).mockReset();
});

describe("SwitchSheet", () => {
  it("renders each patient as role=option", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const options = screen.getAllByRole("option");
    // 3 patient options only (Add button is outside the listbox)
    expect(options).toHaveLength(3);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("sorts patients by lastActiveAt descending", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const options = screen.getAllByRole("option");
    // option[0] = Carol (lastActiveAt = now, most recent)
    // option[1] = Alice (lastActiveAt = now - 1 min)
    // option[2] = Bob (lastActiveAt = now - 2 hours)
    expect(options[0]).toHaveTextContent("Carol");
    expect(options[1]).toHaveTextContent("Alice");
    expect(options[2]).toHaveTextContent("Bob");
  });

  it("active patient has aria-current='true'", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const options = screen.getAllByRole("option");
    const aliceOption = options.find((o) => o.textContent?.includes("Alice"))!;
    expect(aliceOption).toHaveAttribute("aria-current", "true");
    // Others should NOT have aria-current
    const bobOption = options.find((o) => o.textContent?.includes("Bob"))!;
    expect(bobOption).not.toHaveAttribute("aria-current");
    const carolOption = options.find((o) => o.textContent?.includes("Carol"))!;
    expect(carolOption).not.toHaveAttribute("aria-current");
  });

  it("tapping non-active patient switches + pauses + closes", async () => {
    const onClose = vi.fn();
    render(<SwitchSheet open onClose={onClose} t={light} theme="light" />);
    const bobOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Bob"))!;
    fireEvent.click(bobOption);

    expect(audioCacheRunner.pauseAll).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-b");
    // onClose fires after queueMicrotask
    await flushMicrotask();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("tapping active patient is a no-op", () => {
    const onClose = vi.fn();
    render(<SwitchSheet open onClose={onClose} t={light} theme="light" />);
    const aliceOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Alice"))!;
    fireEvent.click(aliceOption);

    expect(audioCacheRunner.pauseAll).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-a");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("+ Add Patient tap closes SwitchSheet and opens addPatient overlay", () => {
    const onClose = vi.fn();
    render(<SwitchSheet open onClose={onClose} t={light} theme="light" />);
    const addBtn = screen.getByRole("button", { name: /\+ Add Patient/i });
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);

    expect(onClose).toHaveBeenCalledOnce();
    expect(useUIStore.getState().addPatientOpen).toBe(true);
  });

  it("shows voice-readiness chip", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const aliceOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Alice"))!;
    expect(aliceOption).toHaveTextContent("Voice captured");
    const bobOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Bob"))!;
    expect(bobOption).toHaveTextContent("No voice");
  });

  it("shows locale flag and label", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const bobOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Bob"))!;
    expect(bobOption).toHaveTextContent("Espa");
  });

  it("shows bed info", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const aliceOption = screen.getAllByRole("option").find((o) => o.textContent?.includes("Alice"))!;
    expect(aliceOption).toHaveTextContent("Bed 4B-12");
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <SwitchSheet open={false} onClose={() => {}} t={light} theme="light" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("has a live region for announcements", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});

describe("SwitchSheet keyboard navigation", () => {
  it("Arrow Down moves focus between options", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");

    // Press ArrowDown to focus first patient (Carol — most recent)
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(document.activeElement).toBe(options[0]); // Carol

    // Press ArrowDown again to focus Alice
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]); // Alice
  });

  it("Arrow Up moves focus backwards", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    // Move down twice then back up
    fireEvent.keyDown(listbox, { key: "ArrowDown" }); // Carol
    fireEvent.keyDown(listbox, { key: "ArrowDown" }); // Alice
    fireEvent.keyDown(listbox, { key: "ArrowUp" });   // Carol
    expect(document.activeElement).toBe(options[0]);   // Carol
  });

  it("Home jumps to first item", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "End" });
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(document.activeElement).toBe(options[0]); // Carol (first)
  });

  it("End jumps to last item", () => {
    render(<SwitchSheet open onClose={() => {}} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(options[2]); // Bob (last)
  });

  it("Enter on focused patient option selects it", async () => {
    const onClose = vi.fn();
    render(<SwitchSheet open onClose={onClose} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");

    // Navigate to Bob (last — index 2 = End)
    fireEvent.keyDown(listbox, { key: "End" });
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(audioCacheRunner.pauseAll).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-b");
    await flushMicrotask();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Space on focused patient option selects it", async () => {
    const onClose = vi.fn();
    render(<SwitchSheet open onClose={onClose} t={light} theme="light" />);
    const listbox = screen.getByRole("listbox");

    // Navigate to Bob (End)
    fireEvent.keyDown(listbox, { key: "End" });
    fireEvent.keyDown(listbox, { key: " " });

    expect(audioCacheRunner.pauseAll).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().cfg?.activePatientId).toBe("patient-b");
    await flushMicrotask();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
