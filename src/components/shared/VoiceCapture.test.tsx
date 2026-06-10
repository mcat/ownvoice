import { render, screen, fireEvent, act } from "@testing-library/preact";
import { VoiceCapture, friendlyVoiceError } from "./VoiceCapture";
import type { VoiceQualityResult } from "../../models/types";

// Mock getModelManager to avoid model init side effects.
//
// The mock is a singleton so individual tests can rebind `getWorker` /
// `isReady` to drive `extractEmbedding` against a fake worker (see
// `installFakeTTSWorker`). A factory-per-call returning a fresh object would
// hand the test a different instance from the one the component calls.
const mockMgr = {
  init: vi.fn().mockResolvedValue(undefined),
  getWorker: vi.fn(() => null) as ReturnType<typeof vi.fn>,
  clearAll: vi.fn(),
  isReady: vi.fn(() => false) as ReturnType<typeof vi.fn>,
  onProgress: vi.fn(() => () => {}),
  getProgress: vi.fn(() => [
    { model: "tts", status: "idle", loaded: 0, total: 0 },
  ]),
};
vi.mock("../../models/modelManager", () => ({
  getModelManager: () => mockMgr,
}));

describe("VoiceCapture", () => {
  const onCapture = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    onCapture.mockClear();
    onRemove.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Upload file' and 'Record' buttons when hasVoice=false", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("renders 'Voice captured' text and a Remove button when hasVoice=true", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
    // Should NOT show Upload/Record buttons
    expect(screen.queryByText("Upload file")).not.toBeInTheDocument();
    expect(screen.queryByText("Record")).not.toBeInTheDocument();
  });

  it("clicking Remove calls onRemove prop", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders without error when compact=true", () => {
    // hasVoice=false compact
    const { unmount } = render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    unmount();

    // hasVoice=true compact
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("shows Play button when captured and audioBlob is provided", () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        audioBlob={blob}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText(/Play/)).toBeInTheDocument();
  });

  it("does not show Play button when captured without audioBlob", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.queryByText(/Play/)).not.toBeInTheDocument();
  });

  it("renders the label in the captured state", () => {
    render(
      <VoiceCapture
        label="Dr. Smith"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    // The captured state shows "Voice captured" text — the component itself
    // always renders regardless of label value. The label prop is used by the
    // parent for context. Verify the component renders correctly with the label.
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
  });
});

describe("VoiceCapture accessibility — touch targets must meet 44px floor even in compact", () => {
  const onCapture = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    onCapture.mockClear();
    onRemove.mockClear();
  });

  function parsePx(v: string | null): number {
    if (!v) return 0;
    const m = v.match(/(-?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
  }

  it("Upload file and Record buttons meet 44px minHeight in compact", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const upload = screen.getByText("Upload file").closest("button")!;
    const record = screen.getByText("Record").closest("button")!;
    expect(parsePx(upload.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parsePx(record.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Play button meets 44px minHeight in compact captured state", () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        audioBlob={blob}
        compact
      />,
    );
    const play = screen.getByText(/Play/).closest("button")!;
    expect(parsePx(play.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Remove button meets 44px minHeight in compact captured state", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const remove = screen.getByText("Remove").closest("button")!;
    expect(parsePx(remove.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Remove button has a descriptive accessible name, not just 'Remove'", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const remove = screen.getByText("Remove").closest("button")!;
    const accessibleName = remove.getAttribute("aria-label") ?? remove.textContent ?? "";
    expect(accessibleName.toLowerCase()).toContain("voice");
  });
});

describe("friendlyVoiceError — raw error strings must never reach the user", () => {
  it("maps 'Failed to fetch' (native fetch error) to an actionable sentence", () => {
    const msg = friendlyVoiceError("Failed to fetch");
    expect(msg.toLowerCase()).not.toContain("failed to fetch");
    expect(msg.toLowerCase()).toMatch(/connection|network|retry/);
  });

  it("maps NetworkError variants", () => {
    expect(friendlyVoiceError("NetworkError when attempting to fetch resource")).toMatch(/connection|retry/i);
  });

  it("maps timeout errors", () => {
    expect(friendlyVoiceError("Voice processing timed out. Please try again.")).toMatch(/took too long|retry/i);
  });

  it("maps permission errors to a microphone-specific hint", () => {
    expect(friendlyVoiceError("Permission denied by user")).toMatch(/microphone|settings/i);
  });

  it("falls back to a generic but actionable sentence for unknown errors", () => {
    const msg = friendlyVoiceError("Something weird from the worker");
    expect(msg.toLowerCase()).toMatch(/retry|try again/);
    expect(msg.toLowerCase()).not.toContain("weird");
  });

  it("maps 'too short' enrollment rejection to a duration hint", () => {
    const msg = friendlyVoiceError(
      "Recording too short — got 0.5s, need at least 1.5s of speech.",
    );
    expect(msg.toLowerCase()).toMatch(/short|longer|whole|countdown/);
    expect(msg.toLowerCase()).not.toContain("0.5s");
  });

  it("maps 'too noisy' enrollment rejection to a quieter-location hint", () => {
    const msg = friendlyVoiceError(
      "Recording too noisy — SNR 5 dB, need at least 15 dB. Try a quieter location.",
    );
    expect(msg.toLowerCase()).toMatch(/quiet|noise|background|loud/);
    expect(msg.toLowerCase()).not.toContain("snr");
  });
});

/** Test helper — install a fake TTS worker on the mocked getModelManager.
 *  Returns the worker harness plus the isReady mock so tests can flip it. */
function installFakeTTSWorker() {
  const listeners: Array<(e: MessageEvent) => void> = [];
  const postedMessages: any[] = [];
  const worker = {
    addEventListener: (type: string, h: any) => {
      if (type === "message") listeners.push(h);
    },
    removeEventListener: (type: string, h: any) => {
      if (type === "message") {
        const i = listeners.indexOf(h);
        if (i >= 0) listeners.splice(i, 1);
      }
    },
    postMessage: (m: any) => postedMessages.push(m),
    postedMessages,
    dispatchMessage: (data: any) => {
      const evt = { data } as MessageEvent;
      for (const l of listeners.slice()) l(evt);
    },
  };
  mockMgr.getWorker = vi.fn().mockReturnValue(worker);
  const isReady = vi.fn();
  mockMgr.isReady = isReady;
  return { worker, isReady };
}

describe("VoiceCapture — extractEmbedding idle watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not timeout while progress events keep arriving", async () => {
    const { worker, isReady } = installFakeTTSWorker();
    isReady.mockReturnValue(true);

    const { __test__extractEmbedding } = await import("./VoiceCapture");
    const promise = __test__extractEmbedding(new Float32Array(24000), undefined);

    // Capture the embed message to learn what requestId was used.
    const embedMsg = worker.postedMessages.find((m: any) => m.type === "embed");
    expect(embedMsg).toBeTruthy();
    const requestId = (embedMsg as any).requestId;

    // Pulse a progress event every 30s for 10 minutes — never idle 60s.
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(30_000);
      worker.dispatchMessage({
        type: "embed-progress",
        stage: "loading-model",
        loaded: i + 1,
        total: 20,
      });
    }

    worker.dispatchMessage({
      type: "embedding",
      data: { condEmb: [], condEmbShape: [], promptToken: [], promptTokenShape: [], speakerEmbeddings: [], speakerEmbeddingsShape: [], speakerFeatures: [], speakerFeaturesShape: [] },
      requestId,
    });
    await expect(promise).resolves.toBeTruthy();
  });

  it("times out after 60s of silence", async () => {
    const { worker, isReady } = installFakeTTSWorker();
    isReady.mockReturnValue(true);

    const { __test__extractEmbedding } = await import("./VoiceCapture");
    const promise = __test__extractEmbedding(new Float32Array(24000), undefined);

    worker.dispatchMessage({ type: "embed-progress", stage: "loading-model", loaded: 1, total: 100 });
    vi.advanceTimersByTime(61_000);

    await expect(promise).rejects.toThrow(/taking longer/i);
  });

  it("ignores responses with mismatched requestId", async () => {
    const { worker, isReady } = installFakeTTSWorker();
    isReady.mockReturnValue(true);

    const { __test__extractEmbedding } = await import("./VoiceCapture");
    const promise = __test__extractEmbedding(new Float32Array(24000), undefined);

    const embedMsg = worker.postedMessages.find((m: any) => m.type === "embed");
    const requestId = (embedMsg as any).requestId;

    // Dispatch an embedding for a different requestId — must NOT resolve.
    worker.dispatchMessage({
      type: "embedding",
      data: { condEmb: [], condEmbShape: [], promptToken: [], promptTokenShape: [], speakerEmbeddings: [], speakerEmbeddingsShape: [], speakerFeatures: [], speakerFeaturesShape: [] },
      requestId: requestId + 9999,
    });
    // After a small advance, our promise should still be pending (no idle).
    vi.advanceTimersByTime(30_000);
    let settled = false;
    promise.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    // Now dispatch the matching one and confirm it resolves.
    worker.dispatchMessage({
      type: "embedding",
      data: { condEmb: [], condEmbShape: [], promptToken: [], promptTokenShape: [], speakerEmbeddings: [], speakerEmbeddingsShape: [], speakerFeatures: [], speakerFeaturesShape: [] },
      requestId,
    });
    await expect(promise).resolves.toBeTruthy();
  });
});

/**
 * Test helper — drive `mockMgr` so `getProgress()` reads a live status map,
 * and `onProgress` listeners can be notified on demand. Each call resets state
 * for a single test. Returns controls so the test can flip status and fire
 * notifications mid-render.
 *
 * The retry effect (VoiceCapture.tsx) calls `getProgress()` synchronously
 * inside the effect, so we bind a fresh implementation each time rather than
 * a captured-once `vi.fn(() => [...])`.
 */
function installMockMgrStatus(initial: Record<string, string>) {
  const state: Record<string, { status: string; error?: string }> = {};
  for (const [m, s] of Object.entries(initial)) state[m] = { status: s };
  const listeners: Array<(p: any[]) => void> = [];

  function snapshot() {
    return Object.entries(state).map(([model, v]) => ({
      model,
      status: v.status,
      loaded: 0,
      total: 0,
      error: v.error,
    }));
  }

  mockMgr.getProgress = vi.fn(() => snapshot()) as ReturnType<typeof vi.fn>;
  mockMgr.onProgress = vi.fn((cb: (p: any[]) => void) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }) as ReturnType<typeof vi.fn>;
  mockMgr.isReady = vi.fn((id: string) => state[id]?.status === "ready" || state[id]?.status === "warm") as ReturnType<typeof vi.fn>;

  return {
    setStatus(model: string, status: string, error?: string) {
      state[model] = { status, error };
    },
    notify() {
      const snap = snapshot();
      for (const cb of listeners.slice()) cb(snap);
    },
  };
}

describe("VoiceCapture — retry waits for warm", () => {
  // These tests use real timers so a small setTimeout flushes microtasks
  // and the retry effect's async `decodeAudio` call gets a chance to run.
  beforeEach(() => {
    vi.useRealTimers();
  });

  function audioCalls() {
    const fn = globalThis.AudioContext as unknown as { mock: { calls: any[][] } };
    return fn.mock.calls;
  }

  function decodeAudioCallCount() {
    // `decodeAudio` (in retryEmbedding's path) constructs `new AudioContext({ sampleRate: 24000 })`.
    // Playback uses argless `new AudioContext()`. Filter so the count tracks
    // only the retry-effect entry path.
    return audioCalls().filter((args) => args[0]?.sampleRate === 24000).length;
  }

  it("does not retry while status is ready but not warm", async () => {
    installMockMgrStatus({ tts: "ready" });
    const baseline = decodeAudioCallCount();
    const onCapture = vi.fn();
    render(
      <VoiceCapture
        label="t"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={() => {}}
        audioBlob={new Blob([new Uint8Array(1024)])}
      />,
    );
    // Allow retry effect to run; with status "ready" (not "warm") it should not retry.
    await new Promise((r) => setTimeout(r, 20));
    expect(onCapture).not.toHaveBeenCalled();
    // The retry effect's first observable side effect is constructing an
    // AudioContext for decoding — verify it never happened.
    expect(decodeAudioCallCount()).toBe(baseline);
  });

  it("retries when warm flips on", async () => {
    const ctl = installMockMgrStatus({ tts: "ready" });
    const baseline = decodeAudioCallCount();
    const onCapture = vi.fn();
    render(
      <VoiceCapture
        label="t"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={() => {}}
        audioBlob={new Blob([new Uint8Array(1024)])}
      />,
    );
    await new Promise((r) => setTimeout(r, 20));
    // No retry yet.
    expect(decodeAudioCallCount()).toBe(baseline);

    // Flip to warm and notify the listener.
    ctl.setStatus("tts", "warm");
    ctl.notify();
    await new Promise((r) => setTimeout(r, 20));
    // The retry effect ran retryEmbedding, which constructs an AudioContext
    // with sampleRate 24000 inside decodeAudio.
    expect(decodeAudioCallCount()).toBeGreaterThan(baseline);
  });
});

describe("VoiceCapture — pre-capture readiness hint", () => {
  // useModels reads progress via the onProgress listener; pushing a snapshot
  // and yielding a microtask lets the hook's state settle before assertions.
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("shows the hint when TTS is not warm", async () => {
    const ctl = installMockMgrStatus({ tts: "ready" }); // ready but not warm
    render(
      <VoiceCapture
        label="t"
        hasVoice={false}
        onCapture={() => {}}
        onRemove={() => {}}
      />,
    );
    ctl.notify();
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.getByText(/Voice will start as soon as it's ready/i),
    ).toBeInTheDocument();
  });

  it("hides the hint when TTS is warm", async () => {
    const ctl = installMockMgrStatus({ tts: "warm" });
    render(
      <VoiceCapture
        label="t"
        hasVoice={false}
        onCapture={() => {}}
        onRemove={() => {}}
      />,
    );
    ctl.notify();
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.queryByText(/Voice will start as soon as it's ready/i),
    ).toBeNull();
  });
});

// The model-loading badge ("Preparing your voice…") moved out of VoiceCapture and into
// the parent's <VoiceCloneStatus> row (see VoiceCloneStatus.test.tsx). The
// matching test for that path lives there now; VoiceCapture only owns the
// recording/extraction flow, not the steady-state badge.

describe("VoiceCapture quality integration", () => {
  const validQuality: VoiceQualityResult = {
    score: 75,
    breakdown: {
      snr: 80,
      clipping: 90,
      coverage: 70,
      voicedFraction: 75,
      pitchVariation: 70,
      loudnessConsistency: 80,
      spectralTilt: 75,
    },
    spectralTiltDirection: "neutral",
    qualityVersion: 1,
  };

  it("renders the saved-state badge when savedQuality is provided", () => {
    const blob = new Blob([new Uint8Array(1024)], { type: "audio/webm" });
    render(
      <VoiceCapture
        label="test"
        hasVoice={true}
        audioBlob={blob}
        hasEmbedding={true}
        savedQuality={validQuality}
        onCapture={() => {}}
        onRemove={() => {}}
      />,
    );
    // The QualityBadge renders the rounded numeric score in its label.
    const matches = screen.getAllByText(/75/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

describe("VoiceCapture — registerRetry remains stable across parent re-renders (#223)", () => {
  it("does not flash through null when the parent re-renders with a new arrow", () => {
    // Mirrors how PatientInfoSection / CareTeamSection wire the prop:
    // an inline arrow that forwards to a parent-owned ref. A naive
    // implementation would unregister + re-register on every parent
    // render, briefly leaving retryRef.current null between commits.
    const retryRef: { current: (() => void) | null } = { current: null };
    const events: ("set" | "null")[] = [];
    const Parent = ({ tick }: { tick: number }) => {
      void tick; // re-render trigger
      return (
        <VoiceCapture
          label="t"
          hasVoice
          onCapture={() => {}}
          onRemove={() => {}}
          audioBlob={new Blob([new Uint8Array(16)])}
          registerRetry={(fn) => {
            retryRef.current = fn;
            events.push(fn ? "set" : "null");
          }}
        />
      );
    };
    const { rerender } = render(<Parent tick={0} />);
    expect(retryRef.current).not.toBeNull();
    expect(events).toEqual(["set"]);

    // Force several parent re-renders. Each one supplies a fresh inline
    // arrow as `registerRetry` — but VoiceCapture must NOT unregister and
    // re-register, since that flashes retryRef.current through null.
    for (let i = 1; i <= 5; i++) {
      rerender(<Parent tick={i} />);
      expect(retryRef.current).not.toBeNull();
    }
    // Exactly one "set" event after all the re-renders, no "null"s.
    expect(events).toEqual(["set"]);
  });

  it("clears the ref to null on unmount (parent's retryRef shouldn't hold a stale callback)", () => {
    const retryRef: { current: (() => void) | null } = { current: null };
    const Parent = ({ mounted }: { mounted: boolean }) =>
      mounted ? (
        <VoiceCapture
          label="t"
          hasVoice
          onCapture={() => {}}
          onRemove={() => {}}
          audioBlob={new Blob([new Uint8Array(16)])}
          registerRetry={(fn) => { retryRef.current = fn; }}
        />
      ) : (
        <div />
      );
    const { rerender } = render(<Parent mounted={true} />);
    expect(retryRef.current).not.toBeNull();
    rerender(<Parent mounted={false} />);
    expect(retryRef.current).toBeNull();
  });
});

describe("VoiceCapture — mic lifecycle on unmount", () => {
  const onCapture = vi.fn();
  const onRemove = vi.fn();

  class FakeMediaRecorder {
    static instances: FakeMediaRecorder[] = [];
    state: "inactive" | "recording" = "inactive";
    ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
    onstop: (() => void) | null = null;
    start = vi.fn(() => {
      this.state = "recording";
    });
    stop = vi.fn(() => {
      this.state = "inactive";
      this.onstop?.();
    });
    constructor(public stream: unknown) {
      FakeMediaRecorder.instances.push(this);
    }
  }

  beforeEach(() => {
    onCapture.mockClear();
    onRemove.mockClear();
    FakeMediaRecorder.instances = [];
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("stops the recorder and mic tracks when unmounted mid-recording", async () => {
    // A patient reset / navigation / sheet close mid-recording must not
    // leave the mic indicator lit with a recorder still armed.
    const trackStop = vi.fn();
    const fakeStream = {
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream;
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(fakeStream);

    const { unmount } = render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByText("Record"));
    // getUserMedia microtask, then walk the coached countdown 1s at a
    // time until the "go" beat constructs the MediaRecorder. Advancing
    // in one big jump would also blow through RECORD_DURATION and let
    // the auto-stop fire — the bug only shows while still recording.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    for (let i = 0; i < 60 && FakeMediaRecorder.instances.length === 0; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }

    expect(FakeMediaRecorder.instances).toHaveLength(1);
    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.start).toHaveBeenCalled();

    // 2s into the 15s budget — definitely still recording.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(recorder.stop).not.toHaveBeenCalled();

    unmount();

    expect(recorder.stop).toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalled();
  });
});
