import { render, screen, fireEvent } from "@testing-library/preact";
import type { AppSettings } from "../../types";

vi.mock("../../models/audioCacheRunner", () => ({
  retryFailed: vi.fn(),
  runPreGeneration: vi.fn(),
  abort: vi.fn(),
}));

import { VoiceCacheProgress } from "./VoiceCacheProgress";
import { useAudioCacheStore } from "../../stores/audioCacheStore";
import * as audioCacheRunner from "../../models/audioCacheRunner";

const CFG: AppSettings = {
  patientName: "Alice",
  bed: "1",
  patientLang: "en",
  patientVoice: true,
  pin: "0000",
  providers: [],
};

beforeEach(() => {
  useAudioCacheStore.setState({ runs: {}, activeKey: null });
  vi.mocked(audioCacheRunner.retryFailed).mockReset();
});

describe("VoiceCacheProgress", () => {
  it("renders nothing when there's no run for the speaker", () => {
    const { container } = render(
      <VoiceCacheProgress
        speakerKey="patient"
        speakerLabel="Alice"
        cfg={CFG}
        patientSpeakerData={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a Queued state while an earlier speaker is still running", () => {
    useAudioCacheStore.setState({
      runs: {
        "provider:0": {
          status: "queued",
          current: 0,
          total: 25,
          currentPhrase: null,
          failedPhrases: [],
          locale: "en",
          fingerprint: "fp-p0",
        },
      },
      activeKey: "patient",
    });

    render(
      <VoiceCacheProgress
        speakerKey="provider:0"
        speakerLabel="Dr. Smith"
        cfg={CFG}
        patientSpeakerData={null}
      />,
    );
    expect(
      screen.getByText(/Queued — Dr\. Smith's voice will prepare next \(25 phrases\)/),
    ).toBeTruthy();
  });

  it("renders a progress bar while running", () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "running",
          current: 47,
          total: 150,
          currentPhrase: "Water",
          failedPhrases: [],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: "patient",
    });

    render(
      <VoiceCacheProgress
        speakerKey="patient"
        speakerLabel="Alice"
        cfg={CFG}
        patientSpeakerData={null}
      />,
    );
    expect(screen.getByText(/Preparing Alice's voice… 47 \/ 150/)).toBeTruthy();
  });

  it("renders success summary when status is done", () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "done",
          current: 150,
          total: 150,
          currentPhrase: null,
          failedPhrases: [],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    render(
      <VoiceCacheProgress
        speakerKey="patient"
        speakerLabel="Alice"
        cfg={CFG}
        patientSpeakerData={null}
      />,
    );
    expect(screen.getByText(/All 150 phrases ready in Alice's voice/)).toBeTruthy();
  });

  it("renders a retry button when status is failed", () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 150,
          total: 150,
          currentPhrase: null,
          failedPhrases: ["x", "y", "z"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    render(
      <VoiceCacheProgress
        speakerKey="patient"
        speakerLabel="Alice"
        cfg={CFG}
        patientSpeakerData={{ some: "embed" }}
      />,
    );

    expect(screen.getByText(/3 phrases failed for Alice/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(audioCacheRunner.retryFailed).toHaveBeenCalledWith(
      CFG,
      { some: "embed" },
      "patient",
    );
  });
});
