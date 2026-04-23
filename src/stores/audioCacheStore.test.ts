import { useAudioCacheStore } from "./audioCacheStore";

beforeEach(() => {
  useAudioCacheStore.setState({ runs: {}, activeKey: null });
});

describe("audioCacheStore", () => {
  it("queue seeds a 'queued' run without claiming activeKey", () => {
    useAudioCacheStore.getState().queue("provider:0", 25, "en", "fp-p0");

    const s = useAudioCacheStore.getState();
    expect(s.runs["provider:0"]?.status).toBe("queued");
    expect(s.runs["provider:0"]?.total).toBe(25);
    expect(s.runs["provider:0"]?.locale).toBe("en");
    expect(s.runs["provider:0"]?.fingerprint).toBe("fp-p0");
    // Queueing must not steal activeKey — another speaker is actively running.
    expect(s.activeKey).toBeNull();
  });

  it("start transitions a queued run into 'running' and claims activeKey", () => {
    const { queue, start } = useAudioCacheStore.getState();
    queue("provider:0", 25, "en", "fp-p0");
    start("provider:0", 25, "en", "fp-p0");

    const s = useAudioCacheStore.getState();
    expect(s.runs["provider:0"]?.status).toBe("running");
    expect(s.activeKey).toBe("provider:0");
  });

  it("start initialises a running state and marks the key active", () => {
    useAudioCacheStore.getState().start("patient:p1", 150, "en", "fp-123");

    const s = useAudioCacheStore.getState();
    expect(s.activeKey).toBe("patient:p1");
    expect(s.runs["patient:p1"]).toEqual({
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
    start("patient:p1", 100, "en", "fp");
    progress("patient:p1", "Hello", 1);
    progress("patient:p1", "World", 2);

    const run = useAudioCacheStore.getState().runs["patient:p1"]!;
    expect(run.current).toBe(2);
    expect(run.currentPhrase).toBe("World");
    expect(run.total).toBe(100);
    expect(run.locale).toBe("en");
  });

  it("fail accumulates failed phrases", () => {
    const { start, fail, progress } = useAudioCacheStore.getState();
    start("patient:p1", 3, "en", "fp");
    progress("patient:p1", "Ok", 1);
    fail("patient:p1", "Broken A", 2);
    fail("patient:p1", "Broken B", 3);

    const run = useAudioCacheStore.getState().runs["patient:p1"]!;
    expect(run.failedPhrases).toEqual(["Broken A", "Broken B"]);
  });

  it("finish transitions to 'done' when no failures, 'failed' otherwise", () => {
    const { start, progress, fail, finish } = useAudioCacheStore.getState();

    start("patient:p1", 2, "en", "fp");
    progress("patient:p1", "Ok", 1);
    progress("patient:p1", "Also ok", 2);
    finish("patient:p1");
    expect(useAudioCacheStore.getState().runs["patient:p1"]!.status).toBe("done");

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
    start("patient:p1", 1, "en", "fp");
    start("provider:0", 1, "en", "fp2");
    // Second start made provider:0 active
    expect(useAudioCacheStore.getState().activeKey).toBe("provider:0");
    // Finishing patient doesn't touch activeKey
    finish("patient:p1");
    expect(useAudioCacheStore.getState().activeKey).toBe("provider:0");
    // Finishing provider:0 clears it
    finish("provider:0");
    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });

  it("keeps per-speaker state isolated", () => {
    const { start, progress, fail } = useAudioCacheStore.getState();
    start("patient:p1", 5, "en", "fp-p");
    start("provider:0", 3, "en", "fp-0");

    progress("patient:p1", "P1", 1);
    fail("provider:0", "X", 1);

    const p = useAudioCacheStore.getState().runs["patient:p1"]!;
    const prov = useAudioCacheStore.getState().runs["provider:0"]!;
    expect(p.current).toBe(1);
    expect(p.failedPhrases).toEqual([]);
    expect(prov.current).toBe(1);
    expect(prov.failedPhrases).toEqual(["X"]);
  });

  it("resetFailed clears failedPhrases without disturbing status or total", () => {
    const { start, fail, resetFailed } = useAudioCacheStore.getState();
    start("patient:p1", 7, "en", "fp");
    fail("patient:p1", "bad", 1);
    expect(useAudioCacheStore.getState().runs["patient:p1"]!.failedPhrases).toEqual(["bad"]);

    resetFailed("patient:p1");

    const run = useAudioCacheStore.getState().runs["patient:p1"]!;
    expect(run.failedPhrases).toEqual([]);
    // Guards against a bug where `const prev = s.runs[key] ?? IDLE` flips to
    // `&& IDLE` (or similar) and the reset silently replaces everything with
    // IDLE — which would wipe status/total/fingerprint too.
    expect(run.status).toBe("running");
    expect(run.total).toBe(7);
    expect(run.fingerprint).toBe("fp");
  });

  // Covers the `?? IDLE` fallback for actions called on a key that was never
  // seeded via start/queue. Without this test, IDLE's status string is
  // unreachable and `status: "idle"` can be mutated to anything.
  it("resetFailed on an unseeded key installs the IDLE default state", () => {
    useAudioCacheStore.getState().resetFailed("provider:3");

    const run = useAudioCacheStore.getState().runs["provider:3"];
    expect(run).toBeDefined();
    expect(run?.status).toBe("idle");
    expect(run?.total).toBe(0);
    expect(run?.current).toBe(0);
    expect(run?.failedPhrases).toEqual([]);
    expect(run?.locale).toBeNull();
    expect(run?.fingerprint).toBeNull();
  });

  it("abortAll wipes all runs and clears activeKey", () => {
    const { start, abortAll } = useAudioCacheStore.getState();
    start("patient:p1", 5, "en", "fp");
    start("provider:0", 3, "en", "fp2");

    abortAll();

    const s = useAudioCacheStore.getState();
    expect(s.runs).toEqual({});
    expect(s.activeKey).toBeNull();
  });

  it("pauseAllRuns flips running status to 'paused' without losing progress", () => {
    const { start, progress, pauseAllRuns } = useAudioCacheStore.getState();
    start("patient:p1", 10, "en", "fp");
    progress("patient:p1", "phrase 5", 5);

    pauseAllRuns();

    const r = useAudioCacheStore.getState().runs["patient:p1"]!;
    expect(r.status).toBe("paused");
    expect(r.current).toBe(5);
    expect(r.total).toBe(10);
    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });

  it("pauseAllRuns leaves non-running statuses untouched", () => {
    const { start, finish, pauseAllRuns } = useAudioCacheStore.getState();
    start("patient:p1", 5, "en", "fp");
    finish("patient:p1"); // status becomes "done"

    pauseAllRuns();

    expect(useAudioCacheStore.getState().runs["patient:p1"]!.status).toBe("done");
  });

  it("discard removes a single key without affecting others", () => {
    const { start, discard } = useAudioCacheStore.getState();
    start("patient:p1", 5, "en", "fp");
    start("provider:0", 3, "en", "fp2");

    discard("patient:p1");

    const s = useAudioCacheStore.getState();
    expect(s.runs["patient:p1"]).toBeUndefined();
    expect(s.runs["provider:0"]).toBeDefined();
    // activeKey was "provider:0" (the most recent start), so discarding
    // patient should NOT clear it.
    expect(s.activeKey).toBe("provider:0");
  });

  it("discard clears activeKey when it matches the discarded speaker", () => {
    const { start, discard } = useAudioCacheStore.getState();
    start("patient:p1", 5, "en", "fp");

    discard("patient:p1");

    expect(useAudioCacheStore.getState().activeKey).toBeNull();
  });

  describe("discardByPatientId", () => {
    it("removes base and :pain entries for the target patient, leaves others", () => {
      const { start, discardByPatientId } = useAudioCacheStore.getState();
      // Seed two patients + a provider
      start("patient:p1", 100, "en", "fp-p1");
      start("patient:p1:pain", 700, "en", "fp-p1");
      start("patient:p2", 50, "es", "fp-p2");
      start("patient:p2:pain", 350, "es", "fp-p2");
      start("provider:0", 25, "en", "fp-prov");

      discardByPatientId("p1");

      const s = useAudioCacheStore.getState();
      expect(s.runs["patient:p1"]).toBeUndefined();
      expect(s.runs["patient:p1:pain"]).toBeUndefined();
      // p2 and provider untouched
      expect(s.runs["patient:p2"]).toBeDefined();
      expect(s.runs["patient:p2:pain"]).toBeDefined();
      expect(s.runs["provider:0"]).toBeDefined();
    });

    it("clears activeKey when it matches a discarded key", () => {
      const { start, discardByPatientId } = useAudioCacheStore.getState();
      start("patient:p1", 100, "en", "fp-p1");
      // activeKey is now "patient:p1"
      expect(useAudioCacheStore.getState().activeKey).toBe("patient:p1");

      discardByPatientId("p1");

      expect(useAudioCacheStore.getState().activeKey).toBeNull();
    });

    it("is a no-op when no keys match the patient id", () => {
      const { start, discardByPatientId } = useAudioCacheStore.getState();
      start("patient:p2", 50, "es", "fp-p2");
      start("provider:0", 25, "en", "fp-prov");

      discardByPatientId("p1");

      const s = useAudioCacheStore.getState();
      expect(s.runs["patient:p2"]).toBeDefined();
      expect(s.runs["provider:0"]).toBeDefined();
    });
  });
});
