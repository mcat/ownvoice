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

// ttsEngine.isGPUReady gates inclusion of the patient:pain plan entry.
// Default false so existing tests see the pre-pain-matrix behavior; the
// dedicated pain tests flip it per case.
const isGPUReadyMock = vi.fn(() => false);
vi.mock("./ttsEngine", () => ({
  isGPUReady: () => isGPUReadyMock(),
}));

import { generateAllPhrases, retryFailed as retryFailedGen } from "./audioCache";
import {
  runPreGeneration,
  retryFailed,
  abort,
  pauseAll,
  discardRun,
} from "./audioCacheRunner";

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
  isGPUReadyMock.mockReset();
  isGPUReadyMock.mockReturnValue(false);
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
    // `current` must advance from the progress yield — kills the block
    // mutant that elides the store.progress() call on successful phrases.
    expect(s.runs.patient?.current).toBe(1);
    expect(s.runs["provider:0"]?.status).toBe("done");
    expect(s.runs["provider:0"]?.current).toBe(1);
  });

  it("skips providers whose embedding is missing", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([{ phrase: phrases[0], current: 1, total: phrases.length }]),
    );

    const cfg: AppSettings = {
      ...BASE_CFG,
      providers: [
        { name: "Dr. No-Voice", hasVoice: false, embedding: null },
      ],
    };
    await runPreGeneration(cfg, PATIENT_EMBED);

    // Only patient is in the plan — the embedding-less provider is filtered
    // out by isRunnable() in buildPlan.
    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("done");
    expect(s.runs["provider:0"]).toBeUndefined();
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

  it("omits the patient:pain entry from the plan when GPU is not ready", async () => {
    isGPUReadyMock.mockReturnValue(false);
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([{ phrase: phrases[0], current: 1, total: phrases.length }]),
    );

    await runPreGeneration(BASE_CFG, PATIENT_EMBED);

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("done");
    expect(s.runs["patient:pain"]).toBeUndefined();
  });

  it("runs patient base phrases then the patient:pain matrix with gpuOnly when GPU is ready", async () => {
    isGPUReadyMock.mockReturnValue(true);
    const callOrder: Array<{ gpuOnly: boolean }> = [];
    vi.mocked(generateAllPhrases).mockImplementation(
      (phrases, _embedding, _signal, opts) => {
        callOrder.push({ gpuOnly: opts?.gpuOnly === true });
        return makeGenerator([
          { phrase: phrases[0], current: 1, total: phrases.length },
        ]);
      },
    );

    await runPreGeneration(BASE_CFG, PATIENT_EMBED);

    // Patient base phrases synthesized without gpuOnly; pain matrix with it.
    expect(callOrder).toEqual([{ gpuOnly: false }, { gpuOnly: true }]);

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("done");
    expect(s.runs["patient:pain"]?.status).toBe("done");
    // 9 descriptors × 13 regions × 6 severities = 702 composed sentences.
    expect(s.runs["patient:pain"]?.total).toBe(702);
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

  it("is a no-op when the key is not in the plan", async () => {
    // failed state exists in the store, but the plan has no provider:99.
    const orphanKey = "provider:99" as const;
    useAudioCacheStore.setState({
      runs: {
        [orphanKey]: {
          status: "failed",
          current: 1,
          total: 1,
          currentPhrase: null,
          failedPhrases: ["orphaned phrase"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    await retryFailed(BASE_CFG, PATIENT_EMBED, orphanKey);
    expect(retryFailedGen).not.toHaveBeenCalled();
  });

  it("records failed phrases emitted during retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 2,
          total: 2,
          currentPhrase: null,
          failedPhrases: ["still broken"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    vi.mocked(retryFailedGen).mockImplementation(() =>
      makeGenerator([
        { phrase: "still broken", current: 1, total: 1, failed: true },
      ]),
    );

    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient");

    const run = useAudioCacheStore.getState().runs.patient!;
    expect(run.status).toBe("failed");
    expect(run.failedPhrases).toEqual(["still broken"]);
  });

  it("records successful progress during retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 2,
          total: 2,
          currentPhrase: null,
          failedPhrases: ["recoverable"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    vi.mocked(retryFailedGen).mockImplementation(() =>
      makeGenerator([{ phrase: "recoverable", current: 1, total: 1 }]),
    );

    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient");

    const run = useAudioCacheStore.getState().runs.patient!;
    // current must reflect the successful yield, not the pre-retry value.
    expect(run.current).toBe(1);
    expect(run.currentPhrase).toBeNull(); // finish() clears it
    expect(run.status).toBe("done");
  });

  it("passes gpuOnly:false to the generator when retrying the patient base run", async () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 1,
          total: 1,
          currentPhrase: null,
          failedPhrases: ["base phrase"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    let captured: { gpuOnly?: boolean } | undefined;
    vi.mocked(retryFailedGen).mockImplementation(
      (_phrases, _embedding, _signal, opts) => {
        captured = opts;
        return makeGenerator([{ phrase: "base phrase", current: 1, total: 1 }]);
      },
    );

    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient");

    // Base-run retries must NOT be gated on GPU — the patient 150-phrase
    // pass works on WASM too. Only patient:pain carries gpuOnly.
    expect(captured?.gpuOnly).toBe(false);
  });

  it("passes gpuOnly:true to the generator when retrying patient:pain", async () => {
    isGPUReadyMock.mockReturnValue(true);
    useAudioCacheStore.setState({
      runs: {
        "patient:pain": {
          status: "failed",
          current: 5,
          total: 5,
          currentPhrase: null,
          failedPhrases: ["pain phrase"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    let captured: { gpuOnly?: boolean } | undefined;
    vi.mocked(retryFailedGen).mockImplementation(
      (_phrases, _embedding, _signal, opts) => {
        captured = opts;
        return makeGenerator([{ phrase: "pain phrase", current: 1, total: 1 }]);
      },
    );

    await retryFailed(BASE_CFG, PATIENT_EMBED, "patient:pain");

    expect(captured?.gpuOnly).toBe(true);
  });

  it("skips finish() when the run is aborted mid-retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        patient: {
          status: "failed",
          current: 1,
          total: 1,
          currentPhrase: null,
          failedPhrases: ["blocked"],
          locale: "en",
          fingerprint: "fp",
        },
      },
      activeKey: null,
    });

    vi.mocked(retryFailedGen).mockImplementation(
      (_phrases, _embedding, signal) =>
        (async function* () {
          await new Promise<void>((resolve) => {
            if (!signal) return;
            signal.addEventListener("abort", () => resolve());
          });
        })(),
    );

    const retry = retryFailed(BASE_CFG, PATIENT_EMBED, "patient");
    await Promise.resolve();
    // Newer run bumps currentRunId and aborts the in-flight retry signal.
    abort();
    await retry;

    // store.finish() must NOT run on the aborted path — the retry must
    // leave the slot in its pre-retry 'running' state untouched by finish.
    // `abort()` clears runs entirely, which is the observable signal that
    // finish() didn't fire (it would have set status to 'done').
    expect(useAudioCacheStore.getState().runs.patient).toBeUndefined();
  });
});

describe("audioCacheRunner.pauseAll", () => {
  it("is safe when no run is in flight", () => {
    expect(() => pauseAll()).not.toThrow();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });

  it("marks running speakers as paused and aborts in-flight work", async () => {
    // Generator blocks until aborted — simulates a real in-flight run.
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
    expect(useAudioCacheStore.getState().runs.patient?.status).toBe("running");

    pauseAll();
    await run;

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient?.status).toBe("paused");
    // Progress is preserved (not wiped like abort()).
    expect(s.runs.patient?.total).toBeGreaterThan(0);
  });
});

describe("audioCacheRunner.discardRun", () => {
  it("aborts the in-flight run and drops the given key from the store", async () => {
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
    expect(useAudioCacheStore.getState().runs.patient).toBeDefined();

    discardRun("patient");
    await run;

    // Only the targeted key is dropped; other speakers would remain if present.
    expect(useAudioCacheStore.getState().runs.patient).toBeUndefined();
  });

  it("is safe when no run is in flight", () => {
    // No setup — just verify no throw and store stays empty.
    expect(() => discardRun("patient")).not.toThrow();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });
});
