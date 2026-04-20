import type { AppSettings } from "../types";
import { useAudioCacheStore } from "../stores/audioCacheStore";

// Mock the underlying generators so we control progress without hitting
// the actual TTS worker. The runner should orchestrate across speakers
// regardless of how `generateAllPhrases` produces values.
vi.mock("./audioCache", async () => {
  const actual = await vi.importActual<typeof import("./audioCache")>(
    "./audioCache",
  );
  return {
    ...actual,
    generateAllPhrases: vi.fn(),
    retryFailed: vi.fn(),
  };
});

import { generateAllPhrases, retryFailed as retryFailedGen } from "./audioCache";
import { runPreGeneration, retryFailed, abort } from "./audioCacheRunner";

const PATIENT_EMBED = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
const PROV_EMBED = new Float32Array([0.9, 0.8, 0.7, 0.6, 0.5]);

const BASE_CFG: AppSettings = {
  patientName: "Alice",
  bed: "1",
  patientLang: "en",
  patientVoice: true,
  pin: "0000",
  providers: [],
};

function makeGenerator(
  progresses: Array<{ phrase: string; current: number; total: number; failed?: boolean }>,
) {
  return (async function* () {
    for (const p of progresses) yield p;
  })();
}

beforeEach(() => {
  useAudioCacheStore.setState({ runs: {}, activeKey: null });
  vi.mocked(generateAllPhrases).mockReset();
  vi.mocked(retryFailedGen).mockReset();
});

describe("audioCacheRunner.runPreGeneration", () => {
  it("does nothing when no embeddings are present", async () => {
    await runPreGeneration(BASE_CFG, null);
    expect(generateAllPhrases).not.toHaveBeenCalled();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });

  it("seeds every planned speaker as 'queued' before starting the first run", async () => {
    // Patient's generator blocks indefinitely so we can snapshot the store
    // while provider runs are still pending.
    let resolvePatient: (() => void) | null = null;
    vi.mocked(generateAllPhrases).mockImplementation((_phrases, embedding) => {
      const isPatient = embedding === PATIENT_EMBED;
      return (async function* () {
        if (isPatient) {
          await new Promise<void>((resolve) => {
            resolvePatient = resolve;
          });
        }
      })();
    });

    const cfg: AppSettings = {
      ...BASE_CFG,
      providers: [
        { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
      ],
    };

    const run = runPreGeneration(cfg, PATIENT_EMBED);
    // Yield once so runPreGeneration can run the initial synchronous
    // seeding + patient.start() before we inspect store state.
    await Promise.resolve();

    const s = useAudioCacheStore.getState();
    // Patient is actively running — claimed activeKey.
    expect(s.runs.patient?.status).toBe("running");
    // Provider is queued and visible, not undefined.
    expect(s.runs["provider:0"]?.status).toBe("queued");
    expect(s.runs["provider:0"]?.total).toBeGreaterThan(0);

    // Let the patient run finish so the runner can proceed / clean up.
    resolvePatient?.();
    await run;
  });

  it("runs patient then each provider sequentially", async () => {
    const calls: string[] = [];
    vi.mocked(generateAllPhrases).mockImplementation((phrases, embedding) => {
      const tag = embedding === PATIENT_EMBED ? "patient" : "provider";
      calls.push(tag);
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    const cfg: AppSettings = {
      ...BASE_CFG,
      providers: [
        { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
      ],
    };
    await runPreGeneration(cfg, PATIENT_EMBED);

    expect(calls).toEqual(["patient", "provider"]);

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("done");
    expect(s.runs["provider:0"]?.status).toBe("done");
  });

  it("marks status 'failed' when any phrase fails", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length, failed: true },
      ]),
    );

    await runPreGeneration(BASE_CFG, PATIENT_EMBED);

    const run = useAudioCacheStore.getState().runs.patient!;
    expect(run.status).toBe("failed");
    expect(run.failedPhrases.length).toBeGreaterThan(0);
  });

  it("a fresh call aborts the previous run", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(generateAllPhrases).mockImplementation(
      (_phrases, _embedding, signal) => {
        if (signal) signals.push(signal);
        return (async function* () {
          await new Promise<void>((resolve) => {
            if (!signal) return;
            signal.addEventListener("abort", () => resolve());
          });
        })();
      },
    );

    const first = runPreGeneration(BASE_CFG, PATIENT_EMBED);
    await Promise.resolve();
    // Starting a second run should abort the first's signal
    const second = runPreGeneration(BASE_CFG, PATIENT_EMBED);
    await first;

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    // Clean up the still-running second call
    abort();
    await second;
  });

  it("abort() stops in-flight work and clears the store", async () => {
    vi.mocked(generateAllPhrases).mockImplementation(
      (_phrases, _embedding, signal) =>
        (async function* () {
          await new Promise<void>((resolve) => {
            if (!signal) return;
            signal.addEventListener("abort", () => resolve());
          });
        })(),
    );

    const run = runPreGeneration(BASE_CFG, PATIENT_EMBED);
    await Promise.resolve();
    abort();
    await run;

    expect(useAudioCacheStore.getState().runs).toEqual({});
  });
});

describe("audioCacheRunner.retryFailed", () => {
  it("only regenerates the store's failedPhrases for the given key", async () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 3,
          total: 3,
          currentPhrase: null,
          failedPhrases: ["broken a", "broken b"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    vi.mocked(retryFailedGen).mockImplementation((phrases) => {
      expect(phrases).toEqual(["broken a", "broken b"]);
      return makeGenerator([
        { phrase: "broken a", current: 1, total: 2 },
        { phrase: "broken b", current: 2, total: 2 },
      ]);
    });

    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient");

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("done");
    expect(s.runs.patient?.failedPhrases).toEqual([]);
    expect(retryFailedGen).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when nothing failed", async () => {
    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient");
    expect(retryFailedGen).not.toHaveBeenCalled();
  });
});
