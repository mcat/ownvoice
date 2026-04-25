import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import { makeTestCfg } from "../../../test/makeCfg";
import type { AppSettings } from "../../../types";
import { ConfirmDialogHost } from "../../shared/ConfirmDialog";

vi.mock("../../../models/ttsEngine", () => ({
  isGPUReady: () => false,
}));

// VoiceCapture normally drives microphone + ONNX worker flows. Swap it for
// a minimal stub that surfaces two buttons — one simulating a successful
// clone extraction, one simulating removal — so we can cover the handler
// paths without booting the TTS worker.
vi.mock("../../shared/VoiceCapture", () => ({
  VoiceCapture: ({
    onCapture,
    onRemove,
    label,
  }: {
    onCapture: (blob: Blob, embedding?: unknown) => void;
    onRemove: () => void;
    label: string;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onCapture(new Blob(["x"]), {
            speakerEmbeddings: [0.1, 0.2, 0.3, 0.4],
          })
        }
      >
        {`capture-${label}`}
      </button>
      <button type="button" onClick={onRemove}>{`remove-${label}`}</button>
    </div>
  ),
}));

vi.mock("../VoiceCacheProgress", () => ({
  VoiceCacheProgress: () => null,
}));

import { CareTeamSection } from "./CareTeamSection";

const cfg = makeTestCfg({
  patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: true },
  cfg: { pin: "1234", providers: [{ name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" }] },
});

function seedStore(next: AppSettings = cfg) {
  useSettingsStore.setState({ cfg: next, speakerData: null, _hasHydrated: true });
}

const baseProps = {
  cfg,
  t: light,
  theme: "light" as const,
};

function renderWithHost(props = baseProps) {
  return render(
    <>
      <CareTeamSection {...props} />
      <ConfirmDialogHost />
    </>,
  );
}

describe("CareTeamSection", () => {
  beforeEach(() => {
    seedStore();
  });

  it("renders existing providers from the store", () => {
    render(<CareTeamSection {...baseProps} />);
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });

  it("adds a provider to the store when the Add button is clicked", () => {
    seedStore({ ...cfg, providers: [] });
    render(<CareTeamSection {...baseProps} cfg={{ ...cfg, providers: [] }} />);
    fireEvent.input(screen.getByLabelText("Name"), {
      target: { value: "Nurse Lee" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    const stored = useSettingsStore.getState().cfg?.providers ?? [];
    expect(stored.map((p) => p.name)).toEqual(["Nurse Lee"]);
  });

  it("removing a provider updates the store immediately (no Save button)", () => {
    render(<CareTeamSection {...baseProps} />);
    fireEvent.click(screen.getByText("\u2715"));

    expect(useSettingsStore.getState().cfg?.providers).toEqual([]);
    // No Save changes gate — providers commit live.
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });

  // Regression: capturing a provider's voice must commit the embedding to
  // cfg.providers[i].embedding immediately. Previously it lived only in
  // SettingsPanel's local draft state, so App.tsx's embeddingKey memo
  // never changed and runPreGeneration skipped the provider — the cloned
  // voice was never pre-generated and playback fell back to Web Speech.
  it("capturing a provider's voice writes hasVoice + embedding to the store on the same tick", () => {
    render(<CareTeamSection {...baseProps} />);

    fireEvent.click(screen.getByText("capture-Dr. Smith"));

    const updated = useSettingsStore.getState().cfg?.providers?.[0];
    expect(updated?.hasVoice).toBe(true);
    expect(updated?.embedding).toEqual({
      speakerEmbeddings: [0.1, 0.2, 0.3, 0.4],
    });
  });

  it("removing a captured voice clears the embedding in the store", () => {
    seedStore({
      ...cfg,
      providers: [
        {
          name: "Dr. Smith",
          hasVoice: true,
          emoji: "👩‍⚕️",
          embedding: { speakerEmbeddings: [0.1, 0.2, 0.3, 0.4] },
        },
      ],
    });
    render(<CareTeamSection {...baseProps} />);

    fireEvent.click(screen.getByText("remove-Dr. Smith"));

    const updated = useSettingsStore.getState().cfg?.providers?.[0];
    expect(updated?.hasVoice).toBe(false);
    expect(updated?.embedding).toBeUndefined();
  });

  // ── Care team language picker ──────────────────────────────────
  //
  // The picker is now collapsed by default — clicking the field opens a
  // BottomSheet that holds the radiogroup.

  function openCaregiverLangSheet() {
    fireEvent.click(screen.getByRole("button", { name: /Care team language/ }));
  }

  it("renders care team language chip grid with all 24 languages", () => {
    renderWithHost();
    openCaregiverLangSheet();
    const group = screen.getByRole("radiogroup");
    const radios = group.querySelectorAll("[role=radio]");
    expect(radios.length).toBe(24);
  });

  it("tapping a different care-team language chip opens ConfirmDialog", async () => {
    renderWithHost();
    openCaregiverLangSheet();
    const frButton = screen.getAllByText("Français").map((el) => el.closest("button")!)[0];
    fireEvent.click(frButton);

    await waitFor(() => {
      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByText(/Changer la langue de l'équipe soignante en Français/)).toBeTruthy();
  });

  it("confirming care-team language dialog updates caregiverLang in the store", async () => {
    renderWithHost();
    openCaregiverLangSheet();
    const frButton = screen.getAllByText("Français").map((el) => el.closest("button")!)[0];
    fireEvent.click(frButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Changer la langue"));

    await waitFor(() => {
      expect(useSettingsStore.getState().cfg?.caregiverLang).toBe("fr");
    });
  });
});
