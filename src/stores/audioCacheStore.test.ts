import { useAudioCacheStore } from "./audioCacheStore";

beforeEach(() => {
  useAudioCacheStore.setState({ runs: {}, activeKey: null });
});

describe("audioCacheStore", () => {
  it("start initialises a running state and marks the key active", () => {
    useAudioCacheStore.getState().start("patient", 150, "en", "fp-123");

    const s = useAudioCacheStore.getState();
    expect(s.activeKey).toBe("patient");
    expect(s.runs.patient).toEqual({
      status: "running",
      current: 0,
      total: 150,
      currentPhrase: null,
      failedPhrases: [],
      locale: "en",
      fingerprint: "fp-123",
    });
  });

  it("progress updates current and currentPhrase without clobbering total/locale", () => {
    const { start, progress } = useAudioCacheStore.getState();
    start("patient", 100, "en", "fp");
    progress("patient", "Hello", 1);
    progress("patient", "World", 2);

    const run = useAudioCacheStore.getState().runs.patient!;
    expect(run.current).toBe(2);
    expect(run.currentPhrase).toBe("World");
    expect(run.total).toBe(100);
    expect(run.locale).toBe("en");
  });

  it("fail accumulates failed phrases", () => {
    const { start, fail, progress } = useAudioCacheStore.getState();
    start("patient", 3, "en", "fp");
    progress("patient", "Ok", 1);
    fail("patient", "Broken A", 2);
    fail("patient", "Broken B", 3);

    const run = useAudioCacheStore.getState().runs.patient!;
    expect(run.failedPhrases).toEqual(["Broken A", "Broken B"]);
  });

  it("finish transitions to 'done' when no failures, 'failed' otherwise", () => {
    const { start, progress, fail, finish } = useAudioCacheStore.getState();

    start("patient", 2, "en", "fp");
    progress("patient", "Ok", 1);
    progress("patient", "Also ok", 2);
    finish("patient");
    expect(useAudioCacheStore.getState().runs.patient!.status).toBe("done");

    start("provider:0", 2, "en", "fp2");
    progress("provider:0", "Ok", 1);
    fail("provider:0", "Nope", 2);
    finish("provider:0");
    expect(useAudioCacheStore.getState().runs["provider:0"]!.status).toBe(
      "failed",
    );
  });

  it("finish clears activeKey only when it matches", () => {
    const { start, finish } = useAudioCacheStore.getState();
    start("patient", 1, "en", "fp");
    start("provider:0", 1, "en", "fp2");
    // Second start made provider:0 active
    expect(useAudioCacheStore.getState().activeKey).toBe("provider:0");
    // Finishing patient doesn't touch activeKey
    finish("patient");
    expect(useAudioCacheStore.getState().activeKey).toBe("provider:0");
    // Finishing provider:0 clears it
    finish("provider:0");
    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });

  it("keeps per-speaker state isolated", () => {
    const { start, progress, fail } = useAudioCacheStore.getState();
    start("patient", 5, "en", "fp-p");
    start("provider:0", 3, "en", "fp-0");

    progress("patient", "P1", 1);
    fail("provider:0", "X", 1);

    const p = useAudioCacheStore.getState().runs.patient!;
    const prov = useAudioCacheStore.getState().runs["provider:0"]!;
    expect(p.current).toBe(1);
    expect(p.failedPhrases).toEqual([]);
    expect(prov.current).toBe(1);
    expect(prov.failedPhrases).toEqual(["X"]);
  });

  it("resetFailed clears only the given key's failedPhrases", () => {
    const { start, fail, resetFailed } = useAudioCacheStore.getState();
    start("patient", 1, "en", "fp");
    fail("patient", "bad", 1);
    expect(useAudioCacheStore.getState().runs.patient!.failedPhrases).toEqual(["bad"]);
    resetFailed("patient");
    expect(useAudioCacheStore.getState().runs.patient!.failedPhrases).toEqual([]);
  });

  it("abortAll wipes all runs and clears activeKey", () => {
    const { start, abortAll } = useAudioCacheStore.getState();
    start("patient", 5, "en", "fp");
    start("provider:0", 3, "en", "fp2");

    abortAll();

    const s = useAudioCacheStore.getState();
    expect(s.runs).toEqual({});
    expect(s.activeKey).toBeNull();
  });

  it("pauseAllRuns flips running status to 'paused' without losing progress", () => {
    const { start, progress, pauseAllRuns } = useAudioCacheStore.getState();
    start("patient", 10, "en", "fp");
    progress("patient", "phrase 5", 5);

    pauseAllRuns();

    const r = useAudioCacheStore.getState().runs.patient!;
    expect(r.status).toBe("paused");
    expect(r.current).toBe(5);
    expect(r.total).toBe(10);
    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });

  it("pauseAllRuns leaves non-running statuses untouched", () => {
    const { start, finish, pauseAllRuns } = useAudioCacheStore.getState();
    start("patient", 5, "en", "fp");
    finish("patient"); // status becomes "done"

    pauseAllRuns();

    expect(useAudioCacheStore.getState().runs.patient!.status).toBe("done");
  });

  it("discard removes a single key without affecting others", () => {
    const { start, discard } = useAudioCacheStore.getState();
    start("patient", 5, "en", "fp");
    start("provider:0", 3, "en", "fp2");

    discard("patient");

    const s = useAudioCacheStore.getState();
    expect(s.runs.patient).toBeUndefined();
    expect(s.runs["provider:0"]).toBeDefined();
    // activeKey was "provider:0" (the most recent start), so discarding
    // patient should NOT clear it.
    expect(s.activeKey).toBe("provider:0");
  });

  it("discard clears activeKey when it matches the discarded speaker", () => {
    const { start, discard } = useAudioCacheStore.getState();
    start("patient", 5, "en", "fp");

    discard("patient");

    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });
});
