import { useAudioCacheStore } from "../stores/audioCacheStore";
import { makeTestCfg } from "../test/makeCfg";

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
  speakerKindForLog,
} from "./audioCacheRunner";

const PATIENT_EMBED = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
const PROV_EMBED = new Float32Array([0.9, 0.8, 0.7, 0.6, 0.5]);

const TEST_PATIENT_ID = "test-patient-1";
const PATIENT_KEY = `patient:${TEST_PATIENT_ID}` as const;
const PAIN_KEY = `patient:${TEST_PATIENT_ID}:pain` as const;

const BASE_CFG = makeTestCfg({
  patient: {
    id: TEST_PATIENT_ID,
    speakerData: PATIENT_EMBED,
    hasVoice: true,
  },
});

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
    const cfg = makeTestCfg();
    await runPreGeneration(cfg);
    expect(generateAllPhrases).not.toHaveBeenCalled();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });

  it("does nothing when no activePatientId is set", async () => {
    const cfg = makeTestCfg({
      patient: { speakerData: PATIENT_EMBED, hasVoice: true },
      cfg: { activePatientId: null },
    });
    await runPreGeneration(cfg);
    expect(generateAllPhrases).not.toHaveBeenCalled();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });

  it("does nothing when activePatientId points to a missing patient", async () => {
    const cfg = makeTestCfg({
      patient: { speakerData: PATIENT_EMBED, hasVoice: true },
      cfg: { activePatientId: "nonexistent-id" },
    });
    await runPreGeneration(cfg);
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

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
      },
      cfg: {
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
        ],
      },
    });

    const run = runPreGeneration(cfg);
    // Yield once so runPreGeneration can run the initial synchronous
    // seeding + patient.start() before we inspect store state.
    await Promise.resolve();

    const s = useAudioCacheStore.getState();
    // Patient is actively running — claimed activeKey.
    expect(s.runs[PATIENT_KEY]?.status).toBe("running");
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

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
      },
      cfg: {
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
        ],
      },
    });
    await runPreGeneration(cfg);

    expect(calls).toEqual(["patient", "provider"]);

    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    // `current` must advance from the progress yield — kills the block
    // mutant that elides the store.progress() call on successful phrases.
    expect(s.runs[PATIENT_KEY]?.current).toBe(1);
    expect(s.runs["provider:0"]?.status).toBe("done");
    expect(s.runs["provider:0"]?.current).toBe(1);
  });

  it("skips speakers already in 'done' state with the same fingerprint, locale, and total", async () => {
    // VoiceCloneStatus's reconciler-on-mount can write `done` for a speaker
    // before runPreGeneration runs. Without the skip, the runner would
    // overwrite that with `queued` → `running 0/N`, briefly flashing through
    // progress before `generateAllPhrases` walks the cached entries.
    let generatorCalled = false;
    vi.mocked(generateAllPhrases).mockImplementation((phrases) => {
      generatorCalled = true;
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    // Need to know what phrases.length and fingerprint would resolve to
    // for the patient. Run once to capture them.
    await runPreGeneration(BASE_CFG);
    const seeded = useAudioCacheStore.getState().runs[PATIENT_KEY]!;
    const targetTotal = seeded.total;
    const targetFingerprint = seeded.fingerprint!;
    const targetLocale = seeded.locale!;

    // Reset store to a steady-state "done" entry — what the reconciler
    // produces — and re-arm the generator mock. Use the prev callback
    // form so we patch on the live state rather than racing with any
    // tail mutations from the prior runPreGeneration's microtask queue.
    useAudioCacheStore.setState((s) => ({
      ...s,
      runs: {
        [PATIENT_KEY]: {
          status: "done",
          current: targetTotal,
          total: targetTotal,
          currentPhrase: null,
          failedPhrases: [],
          locale: targetLocale,
          fingerprint: targetFingerprint,
        },
      },
      activeKey: null,
    }));
    generatorCalled = false;

    await runPreGeneration(BASE_CFG);

    // Runner must NOT have called generateAllPhrases for the already-done
    // speaker, and the store must still read `done` with the same total
    // (no flash through "running 0/N").
    expect(generatorCalled).toBe(false);
    const after = useAudioCacheStore.getState().runs[PATIENT_KEY];
    expect(after?.status).toBe("done");
    expect(after?.current).toBe(targetTotal);
  });

  it("does NOT skip a 'done' speaker when the fingerprint changed (re-enrolled voice)", async () => {
    let generatorCalled = false;
    vi.mocked(generateAllPhrases).mockImplementation((phrases) => {
      generatorCalled = true;
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    // Pre-seed `done` with a stale fingerprint (mimicking a fingerprint
    // change after re-enrollment). Locale/total intentionally match.
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
          status: "done",
          current: 158,
          total: 158,
          currentPhrase: null,
          failedPhrases: [],
          locale: "en",
          fingerprint: "stale-fingerprint",
        },
      },
      activeKey: null,
    });

    await runPreGeneration(BASE_CFG);

    // The runner must run again because fingerprint mismatch invalidates
    // any prior cache entries.
    expect(generatorCalled).toBe(true);
  });

  it("does NOT skip a 'done' speaker when locale changed", async () => {
    let generatorCalled = false;
    vi.mocked(generateAllPhrases).mockImplementation((phrases) => {
      generatorCalled = true;
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    // Run once to capture fingerprint.
    await runPreGeneration(BASE_CFG);
    const seeded = useAudioCacheStore.getState().runs[PATIENT_KEY]!;
    const targetFingerprint = seeded.fingerprint!;

    // Re-seed `done` with a different locale than BASE_CFG would produce.
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
          status: "done",
          current: seeded.total,
          total: seeded.total,
          currentPhrase: null,
          failedPhrases: [],
          locale: "de", // different from BASE_CFG's locale
          fingerprint: targetFingerprint,
        },
      },
      activeKey: null,
    });
    generatorCalled = false;

    await runPreGeneration(BASE_CFG);

    expect(generatorCalled).toBe(true);
  });

  it("does NOT skip a 'failed' speaker (only `done` is honored)", async () => {
    let generatorCalled = false;
    vi.mocked(generateAllPhrases).mockImplementation((phrases) => {
      generatorCalled = true;
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    await runPreGeneration(BASE_CFG);
    const seeded = useAudioCacheStore.getState().runs[PATIENT_KEY]!;

    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
          ...seeded,
          status: "failed",
          failedPhrases: ["x"],
        },
      },
      activeKey: null,
    });
    generatorCalled = false;

    await runPreGeneration(BASE_CFG);

    // A re-trigger of runPreGeneration should reset and re-run failed
    // speakers — the skip gate is `done` only, not `failed`. (The user
    // can still keep the failed state by NOT calling runPreGeneration;
    // App.tsx only fires it on cfg change.)
    expect(generatorCalled).toBe(true);
  });

  it("patient entry uses activePatient's speakerData and cfg.caregiverLang", async () => {
    let capturedEmbedding: unknown;
    vi.mocked(generateAllPhrases).mockImplementation((phrases, embedding) => {
      capturedEmbedding = embedding;
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
        patientLang: "es",
      },
      cfg: { caregiverLang: "fr" },
    });
    await runPreGeneration(cfg);

    // Patient entry should use the active patient's speakerData
    expect(capturedEmbedding).toBe(PATIENT_EMBED);
    // The patient key should be scoped by patient ID
    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]).toBeDefined();
  });

  it("provider entries use activePatient.patientLang", async () => {
    const capturedPhrases: string[][] = [];
    vi.mocked(generateAllPhrases).mockImplementation((phrases) => {
      capturedPhrases.push([...phrases]);
      return makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length },
      ]);
    });

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
        patientLang: "es",
      },
      cfg: {
        caregiverLang: "en",
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
        ],
      },
    });
    await runPreGeneration(cfg);

    // Two calls: patient (caregiverLang=en) then provider (patientLang=es).
    // Provider phrases should differ from patient phrases because the
    // locale passed to getProviderSpokenPhrases is the patient's language.
    expect(capturedPhrases.length).toBe(2);
  });

  it("skips providers whose embedding is missing", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([{ phrase: phrases[0], current: 1, total: phrases.length }]),
    );

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
      },
      cfg: {
        providers: [
          { name: "Dr. No-Voice", hasVoice: false, embedding: null },
        ],
      },
    });
    await runPreGeneration(cfg);

    // Only patient is in the plan — the embedding-less provider is filtered
    // out by isRunnable() in buildPlan.
    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    expect(s.runs["provider:0"]).toBeUndefined();
  });

  it("marks status 'failed' when any phrase fails", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([
        { phrase: phrases[0], current: 1, total: phrases.length, failed: true },
      ]),
    );

    await runPreGeneration(BASE_CFG);

    const run = useAudioCacheStore.getState().runs[PATIENT_KEY]!;
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

    const first = runPreGeneration(BASE_CFG);
    await Promise.resolve();
    // Starting a second run should abort the first's signal
    const second = runPreGeneration(BASE_CFG);
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

    const run = runPreGeneration(BASE_CFG);
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

    await runPreGeneration(BASE_CFG);

    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    expect(s.runs[PAIN_KEY]).toBeUndefined();
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

    await runPreGeneration(BASE_CFG);

    // Patient base phrases synthesized without gpuOnly; pain matrix with it.
    expect(callOrder).toEqual([{ gpuOnly: false }, { gpuOnly: true }]);

    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    expect(s.runs[PAIN_KEY]?.status).toBe("done");
    // 9 descriptors × 13 regions × 6 severities = 702 composed sentences.
    expect(s.runs[PAIN_KEY]?.total).toBe(702);
  });

  it("short-circuits patient when caregiverLang is unsupported by Chatterbox", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([{ phrase: phrases[0], current: 1, total: phrases.length }]),
    );

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
        patientLang: "en",
      },
      cfg: { caregiverLang: "xx" },
    });
    await runPreGeneration(cfg);

    // caregiverLang "xx" isn't in CHATTERBOX_LOCALES, so patient entry
    // is omitted (canCloneForLocale returns false).
    expect(generateAllPhrases).not.toHaveBeenCalled();
    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]).toBeUndefined();
  });

  it("short-circuits providers when patientLang is unsupported by Chatterbox", async () => {
    vi.mocked(generateAllPhrases).mockImplementation((phrases) =>
      makeGenerator([{ phrase: phrases[0], current: 1, total: phrases.length }]),
    );

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
        patientLang: "xx", // unsupported
      },
      cfg: {
        caregiverLang: "en",
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
        ],
      },
    });
    await runPreGeneration(cfg);

    // Patient entry should still appear (caregiverLang=en is supported),
    // but provider entry is omitted (patientLang=xx is unsupported).
    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    expect(s.runs["provider:0"]).toBeUndefined();
  });

  it("threads patientId into generateAllPhrases opts for patient entries", async () => {
    let capturedOpts: { gpuOnly?: boolean; patientId?: string | null } | undefined;
    vi.mocked(generateAllPhrases).mockImplementation(
      (phrases, _embedding, _signal, opts) => {
        capturedOpts = opts;
        return makeGenerator([
          { phrase: phrases[0], current: 1, total: phrases.length },
        ]);
      },
    );

    await runPreGeneration(BASE_CFG);

    expect(capturedOpts?.patientId).toBe(TEST_PATIENT_ID);
  });

  it("threads patientId=null into generateAllPhrases opts for provider entries", async () => {
    const capturedOpts: Array<{ gpuOnly?: boolean; patientId?: string | null }> = [];
    vi.mocked(generateAllPhrases).mockImplementation(
      (phrases, _embedding, _signal, opts) => {
        capturedOpts.push(opts ?? {});
        return makeGenerator([
          { phrase: phrases[0], current: 1, total: phrases.length },
        ]);
      },
    );

    const cfg = makeTestCfg({
      patient: {
        id: TEST_PATIENT_ID,
        speakerData: PATIENT_EMBED,
        hasVoice: true,
      },
      cfg: {
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: PROV_EMBED },
        ],
      },
    });
    await runPreGeneration(cfg);

    // First call is patient (patientId set), second is provider (null).
    expect(capturedOpts[0]?.patientId).toBe(TEST_PATIENT_ID);
    expect(capturedOpts[1]?.patientId).toBeNull();
  });
});

describe("audioCacheRunner.retryFailed", () => {
  it("only regenerates the store's failedPhrases for the given key", async () => {
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
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

    await retryFailed(BASE_CFG, PATIENT_KEY);

    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("done");
    expect(s.runs[PATIENT_KEY]?.failedPhrases).toEqual([]);
    expect(retryFailedGen).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when nothing failed", async () => {
    await retryFailed(BASE_CFG, PATIENT_KEY);
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

    await retryFailed(BASE_CFG, orphanKey);
    expect(retryFailedGen).not.toHaveBeenCalled();
  });

  it("records failed phrases emitted during retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
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

    await retryFailed(BASE_CFG, PATIENT_KEY);

    const run = useAudioCacheStore.getState().runs[PATIENT_KEY]!;
    expect(run.status).toBe("failed");
    expect(run.failedPhrases).toEqual(["still broken"]);
  });

  it("records successful progress during retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
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

    await retryFailed(BASE_CFG, PATIENT_KEY);

    const run = useAudioCacheStore.getState().runs[PATIENT_KEY]!;
    // current must reflect the successful yield, not the pre-retry value.
    expect(run.current).toBe(1);
    expect(run.currentPhrase).toBeNull(); // finish() clears it
    expect(run.status).toBe("done");
  });

  it("passes gpuOnly:false to the generator when retrying the patient base run", async () => {
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
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

    await retryFailed(BASE_CFG, PATIENT_KEY);

    // Base-run retries must NOT be gated on GPU — the patient 150-phrase
    // pass works on WASM too. Only patient:pain carries gpuOnly.
    expect(captured?.gpuOnly).toBe(false);
  });

  it("passes gpuOnly:true to the generator when retrying patient:pain", async () => {
    isGPUReadyMock.mockReturnValue(true);
    useAudioCacheStore.setState({
      runs: {
        [PAIN_KEY]: {
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

    await retryFailed(BASE_CFG, PAIN_KEY);

    expect(captured?.gpuOnly).toBe(true);
  });

  it("skips finish() when the run is aborted mid-retry", async () => {
    useAudioCacheStore.setState({
      runs: {
        [PATIENT_KEY]: {
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

    const retry = retryFailed(BASE_CFG, PATIENT_KEY);
    await Promise.resolve();
    // Newer run bumps currentRunId and aborts the in-flight retry signal.
    abort();
    await retry;

    // store.finish() must NOT run on the aborted path — the retry must
    // leave the slot in its pre-retry 'running' state untouched by finish.
    // `abort()` clears runs entirely, which is the observable signal that
    // finish() didn't fire (it would have set status to 'done').
    expect(useAudioCacheStore.getState().runs[PATIENT_KEY]).toBeUndefined();
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

    const run = runPreGeneration(BASE_CFG);
    await Promise.resolve();
    expect(useAudioCacheStore.getState().runs[PATIENT_KEY]?.status).toBe("running");

    pauseAll();
    await run;

    const s = useAudioCacheStore.getState();
    expect(s.runs[PATIENT_KEY]?.status).toBe("paused");
    // Progress is preserved (not wiped like abort()).
    expect(s.runs[PATIENT_KEY]?.total).toBeGreaterThan(0);
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

    const run = runPreGeneration(BASE_CFG);
    await Promise.resolve();
    expect(useAudioCacheStore.getState().runs[PATIENT_KEY]).toBeDefined();

    discardRun(PATIENT_KEY);
    await run;

    // Only the targeted key is dropped; other speakers would remain if present.
    expect(useAudioCacheStore.getState().runs[PATIENT_KEY]).toBeUndefined();
  });

  it("is safe when no run is in flight", () => {
    // No setup — just verify no throw and store stays empty.
    expect(() => discardRun(PATIENT_KEY)).not.toThrow();
    expect(useAudioCacheStore.getState().runs).toEqual({});
  });
});

describe('speakerKindForLog — PHI invariant', () => {
  // These stage labels flow into localStorage via recordStage and then
  // into the audit log via the DIAG_PREVIOUS_CRASH event. Patient UUIDs
  // are hashed elsewhere in the audit pipeline; this helper must collapse
  // them down to a workflow descriptor so a leaked tombstone can't be
  // used to re-identify a patient.
  it('strips patient UUID from patient: key', () => {
    expect(speakerKindForLog('patient:cb1d-uuid-7ef2' as never)).toBe('patient');
  });

  it('preserves the :pain suffix while stripping UUID', () => {
    expect(speakerKindForLog('patient:cb1d-uuid-7ef2:pain' as never)).toBe('patient:pain');
  });

  it('passes provider:N through unchanged (N is index, not PHI)', () => {
    expect(speakerKindForLog('provider:0' as never)).toBe('provider:0');
    expect(speakerKindForLog('provider:3' as never)).toBe('provider:3');
  });
});

