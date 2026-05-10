import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { makeTestCfg } from "../../test/makeCfg";

vi.mock("../../models/audioCacheRunner", () => ({
  retryFailed: vi.fn(),
  resumeAll: vi.fn(),
  pauseAll: vi.fn(),
  discardRun: vi.fn(),
  runPreGeneration: vi.fn(),
  abort: vi.fn(),
}));

vi.mock("../../models/audioCache", async () => {
  const actual = await vi.importActual<typeof import("../../models/audioCache")>(
    "../../models/audioCache",
  );
  return {
    ...actual,
    countCached: vi.fn(),
    embeddingFingerprint: vi.fn(() => "fp-test"),
  };
});

vi.mock("../../hooks/useModels", () => ({
  useModels: () => ({
    isWarm: () => true,
    humanCountdown: () => null,
    isAlmostReady: () => false,
  }),
}));

import { VoiceCloneStatus } from "./VoiceCloneStatus";
import { useAudioCacheStore } from "../../stores/audioCacheStore";
import * as audioCacheRunner from "../../models/audioCacheRunner";
import * as audioCache from "../../models/audioCache";
import type { SpeakerData } from "../../models/types";

const TEST_PATIENT_ID = "test-patient-1";
const KEY = `patient:${TEST_PATIENT_ID}` as const;

const SPEAKER: SpeakerData = {
  condEmb: new Float32Array(1),
  promptToken: new Int32Array(1),
  speakerEmbeddings: new Float32Array(1),
  speakerFeatures: new Float32Array(1),
} as unknown as SpeakerData;

const CFG = makeTestCfg({
  patient: {
    id: TEST_PATIENT_ID,
    name: "Alice",
    bed: "1",
    patientLang: "en",
    hasVoice: true,
    speakerData: SPEAKER,
  },
  cfg: { pin: "0000" },
});

beforeEach(() => {
  useAudioCacheStore.setState({ runs: {}, activeKey: null });
  vi.mocked(audioCacheRunner.retryFailed).mockReset();
  vi.mocked(audioCacheRunner.resumeAll).mockReset();
  vi.mocked(audioCacheRunner.discardRun).mockReset();
  vi.mocked(audioCache.countCached).mockReset();
});

describe("VoiceCloneStatus", () => {
  it("renders nothing when no run, no extraction state, and no cache", async () => {
    vi.mocked(audioCache.countCached).mockResolvedValue(0);
    const { container } = render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    // Wait for the reconciler effect to settle (it's a no-op in this case).
    await waitFor(() => {
      expect(audioCache.countCached).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("shows extracting badge while cloneStatus is extracting", () => {
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="extracting"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    expect(screen.getByText(/Creating voice clone/)).toBeTruthy();
  });

  it("shows extraction-failed row with Retry that calls onRetryExtraction", () => {
    const onRetry = vi.fn();
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="failed"
        speakerData={SPEAKER}
        fallbackVoice={{ voiceURI: "Daniel-en-GB", name: "Daniel", lang: "en-GB" }}
        cfg={CFG}
        phraseCorpus="patient-core"
        onRetryExtraction={onRetry}
      />,
    );
    expect(screen.getByText(/Voice clone unavailable.*using backup.*Daniel/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders queued state from store", () => {
    useAudioCacheStore.setState({
      runs: {
        [KEY]: {
          status: "queued",
          current: 0,
          total: 25,
          currentPhrase: null,
          failedPhrases: [],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Dr. Smith"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    expect(
      screen.getByText(/Queued — Dr\. Smith's voice will prepare next \(25 phrases\)/),
    ).toBeTruthy();
  });

  it("renders running with progress", () => {
    useAudioCacheStore.setState({
      runs: {
        [KEY]: {
          status: "running",
          current: 47,
          total: 150,
          currentPhrase: "Water",
          failedPhrases: [],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: KEY,
    });
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    expect(screen.getByText(/Preparing Alice's voice… 47 \/ 150/)).toBeTruthy();
  });

  it("renders done state with quality suffix when speakerData has quality", () => {
    const speakerWithQuality = {
      ...SPEAKER,
      quality: {
        score: 92,
        breakdown: { snr: 90, clipping: 100, coverage: 95, voicedFraction: 85, loudnessConsistency: 90, pitchVariation: 80 },
        spectralTiltDirection: null,
      },
    } as unknown as SpeakerData;
    useAudioCacheStore.setState({
      runs: {
        [KEY]: {
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
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={speakerWithQuality}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    expect(
      screen.getByText(/Voice clone active — all 150 phrases ready in Alice's voice · quality: Good/),
    ).toBeTruthy();
  });

  it("renders pre-gen failed row with Retry calling retryFailed", () => {
    useAudioCacheStore.setState({
      runs: {
        [KEY]: {
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
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    expect(screen.getByText(/3 phrases failed for Alice/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(audioCacheRunner.retryFailed).toHaveBeenCalledWith(CFG, KEY);
  });

  it("reconciler seeds done when all phrases are cached", async () => {
    vi.mocked(audioCache.countCached).mockImplementation(async (phrases) => phrases.length);
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    await waitFor(() => {
      const run = useAudioCacheStore.getState().runs[KEY];
      expect(run?.status).toBe("done");
    });
    // Status surfaces afterwards.
    expect(screen.getByText(/Voice clone active — all/)).toBeTruthy();
  });

  it("reconciler seeds paused when partial cache", async () => {
    vi.mocked(audioCache.countCached).mockResolvedValue(7);
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="ready"
        speakerData={SPEAKER}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    await waitFor(() => {
      const run = useAudioCacheStore.getState().runs[KEY];
      expect(run?.status).toBe("paused");
      expect(run?.current).toBe(7);
    });
    expect(screen.getByText(/Paused — Alice's voice/)).toBeTruthy();
  });

  it("reconciler skips when speakerData is null", async () => {
    render(
      <VoiceCloneStatus
        speakerKey={KEY}
        speakerLabel="Alice"
        cloneStatus="idle"
        speakerData={null}
        fallbackVoice={null}
        cfg={CFG}
        phraseCorpus="patient-core"
      />,
    );
    // Give microtasks a chance.
    await waitFor(() => {
      // No-op assertion — countCached should NOT have been called.
      expect(audioCache.countCached).not.toHaveBeenCalled();
    });
  });
});
