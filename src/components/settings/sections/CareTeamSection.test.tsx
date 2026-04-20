import { render, screen, fireEvent } from "@testing-library/preact";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import type { AppSettings } from "../../../types";

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

const cfg: AppSettings = {
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: true,
  pin: "1234",
  providers: [{ name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" }],
};

function seedStore(next: AppSettings = cfg) {
  useSettingsStore.setState({ cfg: next, speakerData: null, _hasHydrated: true });
}

const baseProps = {
  cfg,
  t: light,
  theme: "light" as const,
};

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
});
