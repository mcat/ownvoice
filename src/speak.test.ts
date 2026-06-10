import type { Speaker } from "./types";

// --- Mock modelManager ---
const mockGetWorker = vi.fn();
const mockIsReady = vi.fn();

vi.mock("./models/modelManager", () => ({
  getModelManager: () => ({
    isReady: mockIsReady,
    getWorker: mockGetWorker,
  }),
}));

// --- Mock audioCache ---
const mockGetCachedAudio = vi.fn();
vi.mock("./models/audioCache", () => ({
  getCachedAudio: mockGetCachedAudio,
  // The hot-cache key derives from this; deterministic non-"none" makes
  // every test phrase eligible for the in-memory cache.
  embeddingFingerprint: (_: unknown) => "test-fp",
}));

// --- Helpers ---

/** Build a minimal Speaker */
function makeSpeaker(overrides: Partial<Speaker> = {}): Speaker {
  return { name: "Alice", type: "patient", ...overrides };
}

/**
 * We re-import speak per test group via resetModules so each group
 * gets a fresh audioCtx = null (the module-level let).
 */
let speak: (text: string, speaker: Speaker) => Promise<void>;
let primeSpeechSynthesis: () => void;
let setFallbackVoice: (voiceURI: string | null) => void;

/** Re-install AudioContext mock (vi.restoreAllMocks in setup.ts may undo it) */
function installAudioContextMock() {
  // Must use `function` (not arrow) so that vi.fn wraps it as a constructor.
  // Arrow functions cannot be called with `new`.
  function MockAudioContext() {
    return {
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(16000)),
      })),
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as (() => void) | null,
        buffer: null,
      })),
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        type: "",
        frequency: { value: 0 },
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      })),
      destination: {},
      currentTime: 0,
      state: "running" as AudioContextState,
      resume: vi.fn(),
      close: vi.fn(),
      decodeAudioData: vi.fn(),
      sampleRate: 24000,
    };
  }

  const ctor = vi.fn(MockAudioContext);
  // setup.ts sets AudioContext with writable:true, so we can assign directly
   
  (globalThis as any).AudioContext = ctor;
  return ctor;
}

let audioCtxCtor: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.useFakeTimers();
  mockIsReady.mockReturnValue(false);
  mockGetWorker.mockReturnValue(null);
  mockGetCachedAudio.mockReset();
  mockGetCachedAudio.mockResolvedValue(null);
  // Drop the in-memory hot cache between tests so the second test in a
  // sequence still sees a cold OPFS path.
  const { _resetHotCacheForTests } = await import("./speak");
  _resetHotCacheForTests();

  // Re-install AudioContext mock before each test
  audioCtxCtor = installAudioContextMock();

  // Re-install speechSynthesis mock (vi.restoreAllMocks may undo it)
  // setup.ts defines it with writable:true, so we can assign directly
   
  (globalThis as any).speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
  };

  // Fresh import so the module-level audioCtx is reset
  vi.resetModules();
  const mod = await import("./speak");
  speak = mod.speak;
  primeSpeechSynthesis = mod.primeSpeechSynthesis;
  setFallbackVoice = mod.setFallbackVoice;
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// Priority 0: Pre-generated audio cache
// =============================================================================
describe("speak — Priority 0: pre-generated cache", () => {
  const embedding = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

  it("plays cached audio and bypasses synthesis when present", async () => {
    mockIsReady.mockReturnValue(true);
    const cachedAudio = new Float32Array([0.5, 0.4, 0.3]);
    mockGetCachedAudio.mockResolvedValue({ audio: cachedAudio, sampleRate: 24000 });

    const fakeWorker = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    mockGetWorker.mockReturnValue(fakeWorker);

    const promise = speak("Hello", makeSpeaker({ embedding }));
    await vi.advanceTimersByTimeAsync(0);

    // Let playAudioBuffer complete via onended
    const ctx = audioCtxCtor.mock.results[audioCtxCtor.mock.results.length - 1]?.value;
    const source = ctx?.createBufferSource?.mock?.results?.[0]?.value;
    source?.onended?.();
    await promise;

    expect(mockGetCachedAudio).toHaveBeenCalledWith("Hello", embedding);
    expect(fakeWorker.postMessage).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("falls through to Web Speech API on cache miss (never live synth)", async () => {
    mockGetCachedAudio.mockResolvedValue(null);

    const fakeWorker = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    mockGetWorker.mockReturnValue(fakeWorker);

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => queueMicrotask(() => utt.onend?.()),
    );

    const promise = speak("Hello", makeSpeaker({ embedding }));
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    // No synthesize message was posted — the tap path never touches the
    // TTS worker now; pre-gen owns it exclusively.
    expect(fakeWorker.postMessage).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("skips cache lookup when speaker has no embedding", async () => {
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => queueMicrotask(() => utt.onend?.()),
    );

    await speak("Hello", makeSpeaker({ embedding: undefined }));

    expect(mockGetCachedAudio).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Priority 1: Web Speech API
// =============================================================================
describe("speak — Priority 2: Web Speech API", () => {
  it("calls cancel() before speaking to clear stuck queue", async () => {
    const speaker = makeSpeaker();

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hi", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("sets rate and volume on the utterance", async () => {
    const speaker = makeSpeaker();
    let capturedUtterance: {
      rate: number;
      volume: number;
      onend?: (() => void) | null;
    } | null = null;

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { rate: number; volume: number; onend?: (() => void) | null }) => {
        capturedUtterance = utt;
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(capturedUtterance).not.toBeNull();
    expect(capturedUtterance!.rate).toBe(0.9);
    expect(capturedUtterance!.volume).toBe(1.0);
  });

  it("resolves when onend fires", async () => {
    const speaker = makeSpeaker();

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Priority 3: Confirmation tone
// =============================================================================
describe("speak — Priority 3: Confirmation tone", () => {
  it("plays confirmation tone when Web Speech API onerror fires", async () => {
    const speaker = makeSpeaker();

    // Make P2 fail via onerror
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onerror?: (() => void) | null }) => {
        queueMicrotask(() => utt.onerror?.());
      },
    );

    const promise = speak("Hello", speaker);
    // onerror fires via microtask + confirmation tone ~290ms
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    // Oscillator nodes should have been created
    const ctx = audioCtxCtor.mock.results[audioCtxCtor.mock.results.length - 1]?.value;
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it("plays confirmation tone when speechSynthesis.speaking remains false (safety timeout)", async () => {
    const speaker = makeSpeaker();

    // speak() is called but doesn't actually do anything — neither onend nor onerror fires
    // and speechSynthesis.speaking stays false
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        // intentionally do nothing
      },
    );
    (globalThis.speechSynthesis as unknown as Record<string, unknown>).speaking = false;

    const promise = speak("Hello", speaker);
    // 500ms safety timeout + tone timing (~290ms)
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    const ctx = audioCtxCtor.mock.results[audioCtxCtor.mock.results.length - 1]?.value;
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

// =============================================================================
// Fallback chain: P1 fails → P2
// =============================================================================
describe("speak — fallback chain", () => {
  it("falls through from P1 to P2 when TTS worker errors", async () => {
    mockIsReady.mockReturnValue(true);

    const fakeWorker = {
      addEventListener: vi.fn((_evt: string, handler: (e: MessageEvent) => void) => {
        queueMicrotask(() =>
          handler({
            data: { type: "error", message: "synthesis failed" },
          } as unknown as MessageEvent),
        );
      }),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    mockGetWorker.mockReturnValue(fakeWorker);

    const speaker = makeSpeaker({ embedding: { some: "data" } });

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    // P2 was used as fallback
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("falls through P1 → P2 → P3 when both fail", async () => {
    mockIsReady.mockReturnValue(true);

    const fakeWorker = {
      addEventListener: vi.fn((_evt: string, handler: (e: MessageEvent) => void) => {
        queueMicrotask(() =>
          handler({
            data: { type: "error", message: "synthesis failed" },
          } as unknown as MessageEvent),
        );
      }),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    mockGetWorker.mockReturnValue(fakeWorker);

    const speaker = makeSpeaker({ embedding: { some: "data" } });

    // P2 onerror
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onerror?: (() => void) | null }) => {
        queueMicrotask(() => utt.onerror?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    // P3 tone was played (oscillator created)
    const ctx = audioCtxCtor.mock.results[audioCtxCtor.mock.results.length - 1]?.value;
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

// =============================================================================
// getAudioContext: resume path
// =============================================================================
describe("speak — getAudioContext resume path", () => {
  it("calls resume() when AudioContext is in suspended state", async () => {
    const resumeFn = vi.fn();
    // Override AudioContext to return suspended state — must be a function (not arrow) for `new`
    function SuspendedAudioContext() {
      return {
        createBuffer: vi.fn(() => ({
          getChannelData: vi.fn(() => new Float32Array(16000)),
        })),
        createBufferSource: vi.fn(() => ({
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null as (() => void) | null,
          buffer: null,
        })),
        createOscillator: vi.fn(() => ({
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          type: "",
          frequency: { value: 0 },
        })),
        createGain: vi.fn(() => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        })),
        destination: {},
        currentTime: 0,
        state: "suspended" as AudioContextState,
        resume: resumeFn,
        close: vi.fn(),
        decodeAudioData: vi.fn(),
        sampleRate: 24000,
      };
    }
    (globalThis as any).AudioContext = vi.fn(SuspendedAudioContext);

    const speaker = makeSpeaker();

    // P2 onerror → falls to P3 which invokes getAudioContext
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onerror?: (() => void) | null }) => {
        queueMicrotask(() => utt.onerror?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    // resume() should have been called due to "suspended" state
    expect(resumeFn).toHaveBeenCalled();
  });
});

// =============================================================================
// synthesizeWithWorker: timeout path
// =============================================================================
describe("speak — TTS worker timeout", () => {
  it("falls to P2 when TTS worker times out (180s)", async () => {
    mockIsReady.mockReturnValue(true);

    // Worker that never responds
    const fakeWorker = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    mockGetWorker.mockReturnValue(fakeWorker);

    const speaker = makeSpeaker({ embedding: { some: "data" } });

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hello", speaker);
    // Advance past the 180s worker timeout defined in speak.ts:354
    await vi.advanceTimersByTimeAsync(180500);
    await promise;

    // P2 was used as fallback after timeout
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// primeSpeechSynthesis
// =============================================================================
describe("primeSpeechSynthesis", () => {
  it("calls getVoices and registers voiceschanged listener", () => {
    const addEventSpy = vi.fn();
    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      getVoices: vi.fn(() => []),
      addEventListener: addEventSpy,
    };

    primeSpeechSynthesis();

    expect(globalThis.speechSynthesis.getVoices).toHaveBeenCalled();
    expect(addEventSpy).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
  });

  it("caches voices so tryWebSpeech uses them", async () => {
    const fakeVoice = { lang: "en-US", name: "Test" } as SpeechSynthesisVoice;
    let voiceschangedCb: (() => void) | null = null;

    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      speak: vi.fn((utt: { onend?: (() => void) | null; voice?: SpeechSynthesisVoice }) => {
        queueMicrotask(() => utt.onend?.());
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [fakeVoice]),
      addEventListener: vi.fn((_: string, cb: () => void) => { voiceschangedCb = cb; }),
      speaking: false,
    };

    primeSpeechSynthesis();

    // Simulate Chrome firing voiceschanged.
    // TS narrows voiceschangedCb to `null` because the reassignment happens via
    // a mock callback it can't statically track; widen with an explicit cast.
    (voiceschangedCb as (() => void) | null)?.();

    const speaker = makeSpeaker();
    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    // The utterance should have been assigned the cached voice
    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(utterance?.voice).toBe(fakeVoice);
  });

  it("is safe to call multiple times", () => {
    const addEventSpy = vi.fn();
    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      getVoices: vi.fn(() => []),
      addEventListener: addEventSpy,
    };

    primeSpeechSynthesis();
    primeSpeechSynthesis();

    // Each call registers a listener, but doesn't throw
    expect(addEventSpy).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Web Speech: lang threading (PR 4)
// =============================================================================
describe("speak — Web Speech lang threading", () => {
  it("sets utterance.lang to speaker.lang when provided", async () => {
    const speaker = makeSpeaker({ lang: "es" });
    let capturedUtterance: { lang?: string; onend?: (() => void) | null } | null = null;

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { lang?: string; onend?: (() => void) | null }) => {
        capturedUtterance = utt;
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hola", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(capturedUtterance).not.toBeNull();
    expect(capturedUtterance!.lang).toBe("es");
  });

  it("does not set utterance.lang when speaker.lang is undefined", async () => {
    const speaker = makeSpeaker({ lang: undefined });
    let capturedUtterance: { lang?: string; onend?: (() => void) | null } | null = null;

    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { lang?: string; onend?: (() => void) | null }) => {
        capturedUtterance = utt;
        queueMicrotask(() => utt.onend?.());
      },
    );

    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(capturedUtterance).not.toBeNull();
    // lang should be empty string (default from SpeechSynthesisUtterance)
    expect(capturedUtterance!.lang).toBe("");
  });

  it("prefers a voice matching speaker.lang when fallbackVoiceURI is not set", async () => {
    const esVoice = { lang: "es-ES", name: "Spanish", voiceURI: "urn:es" } as SpeechSynthesisVoice;
    const enVoice = { lang: "en-US", name: "English", voiceURI: "urn:en" } as SpeechSynthesisVoice;

    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      speak: vi.fn((utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [enVoice, esVoice]),
      speaking: false,
    };

    setFallbackVoice(null);

    const speaker = makeSpeaker({ lang: "es" });
    const promise = speak("Hola", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(utterance?.voice).toBe(esVoice);
  });
});

// =============================================================================
// setFallbackVoice
// =============================================================================
describe("setFallbackVoice", () => {
  it("uses the explicitly selected voice when set", async () => {
    const selectedVoice = { lang: "en-US", name: "Selected", voiceURI: "urn:selected" } as SpeechSynthesisVoice;
    const otherVoice = { lang: "en-GB", name: "Other", voiceURI: "urn:other" } as SpeechSynthesisVoice;

    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      speak: vi.fn((utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [otherVoice, selectedVoice]),
      speaking: false,
    };

    setFallbackVoice("urn:selected");

    const speaker = makeSpeaker();
    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(utterance?.voice).toBe(selectedVoice);
  });

  it("falls back to English voice when selected URI is not found", async () => {
    const englishVoice = { lang: "en-US", name: "English", voiceURI: "urn:english" } as SpeechSynthesisVoice;

    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      speak: vi.fn((utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [englishVoice]),
      speaking: false,
    };

    // Set a voice URI that doesn't exist in the list
    setFallbackVoice("urn:nonexistent");

    const speaker = makeSpeaker();
    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(utterance?.voice).toBe(englishVoice);
  });

  it("clears the selection when set to null", async () => {
    const englishVoice = { lang: "en-US", name: "English", voiceURI: "urn:english" } as SpeechSynthesisVoice;

    (globalThis as any).speechSynthesis = {
      ...globalThis.speechSynthesis,
      speak: vi.fn((utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [englishVoice]),
      speaking: false,
    };

    // Set then clear
    setFallbackVoice("urn:something");
    setFallbackVoice(null);

    const speaker = makeSpeaker();
    const promise = speak("Hello", speaker);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    // Should fall back to English voice (no explicit selection)
    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(utterance?.voice).toBe(englishVoice);
  });
});

// =============================================================================
// Playback resilience — "The patient always gets feedback. No silent failures."
// =============================================================================
describe("speak — playback resilience", () => {
  const embedding = new Float32Array([0.1, 0.2, 0.3]);

  function lastCtx() {
    const results = audioCtxCtor.mock.results;
    return results[results.length - 1]?.value;
  }

  it("falls through to Web Speech when hot-cache playback fails", async () => {
    // 1) Successful cached play populates the in-memory hot cache.
    mockGetCachedAudio.mockResolvedValue({
      audio: new Float32Array([0.5, 0.4]),
      sampleRate: 24000,
    });
    const p1 = speak("Hello", makeSpeaker({ embedding }));
    await vi.advanceTimersByTimeAsync(0);
    const ctx = lastCtx();
    ctx.createBufferSource.mock.results[0]?.value?.onended?.();
    await p1;

    // 2) Break Web Audio playback (e.g. Safari refuses to resume the
    //    context outside a user gesture) and arrange Web Speech success.
    ctx.createBufferSource.mockImplementation(() => ({
      connect: vi.fn(),
      start: vi.fn(() => {
        throw new Error("AudioContext broken");
      }),
      stop: vi.fn(),
      onended: null,
      buffer: null,
    }));
    (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (utt: { onend?: (() => void) | null }) => {
        queueMicrotask(() => utt.onend?.());
      },
    );

    // 3) Second tap hits the hot cache, playback throws — the patient
    //    must still hear SOMETHING (Web Speech tier), and speak() must
    //    not reject into the void.
    await speak("Hello", makeSpeaker({ embedding }));
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("stops the previous source when a new speak starts (no double audio)", async () => {
    mockGetCachedAudio.mockResolvedValue({
      audio: new Float32Array([0.5, 0.4]),
      sampleRate: 24000,
    });

    const p1 = speak("One", makeSpeaker({ embedding }));
    await vi.advanceTimersByTimeAsync(0);
    const ctx = lastCtx();
    const s1 = ctx.createBufferSource.mock.results[0]?.value;
    expect(s1.start).toHaveBeenCalled();

    // Second tap while the first clip is still sounding.
    const p2 = speak("Two", makeSpeaker({ embedding }));
    await vi.advanceTimersByTimeAsync(0);
    const s2 = ctx.createBufferSource.mock.results[1]?.value;

    // The previous source must be stopped — two voices talking over each
    // other is the AAC equivalent of garbled speech.
    expect(s1.stop).toHaveBeenCalled();
    // Superseding must also settle the first speak() promise.
    await p1;

    s2?.onended?.();
    await p2;
  });

  it("escalates to the confirmation tone when Web Speech wedges silently", async () => {
    // Safari failure mode: utterance starts (speaking=true) but neither
    // onend nor onerror ever fires. The promise used to stay pending
    // forever — no tone, no telemetry.
    mockGetCachedAudio.mockResolvedValue(null);
    (globalThis as { speechSynthesis: { speaking: boolean } }).speechSynthesis.speaking = true;

    const p = speak("Hello there", makeSpeaker({ embedding }));

    // Past the 500ms didn't-start check (speaking=true so it no-ops),
    // then past the length-scaled wedge deadline.
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(20_000);

    const ctx = lastCtx();
    expect(ctx.createOscillator).toHaveBeenCalled();

    // Tone resolves via its own timer.
    await vi.advanceTimersByTimeAsync(500);
    await p;
  });
});
