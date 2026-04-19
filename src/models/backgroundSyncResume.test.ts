import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock offlineResume before importing the module under test
const maybeResumeMock = vi.fn();
vi.mock("./offlineResume", () => ({
  maybeResume: () => maybeResumeMock(),
}));

// Import after mocks are set up
const { registerResumeSync, listenForSyncMessages } = await import(
  "./backgroundSyncResume"
);

describe("registerResumeSync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a no-op when SyncManager is not available", async () => {
    // Ensure SyncManager is absent
    const origSM = (globalThis as Record<string, unknown>).SyncManager;
    delete (globalThis as Record<string, unknown>).SyncManager;

    const origSW = navigator.serviceWorker;
    // Even if serviceWorker exists, SyncManager absence should short-circuit
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          sync: { register: vi.fn() },
        }),
      },
      configurable: true,
      writable: true,
    });

    await expect(registerResumeSync()).resolves.toBeUndefined();

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      value: origSW,
      configurable: true,
      writable: true,
    });
    if (origSM !== undefined) {
      (globalThis as Record<string, unknown>).SyncManager = origSM;
    }
  });

  it("is a no-op when serviceWorker is not available", async () => {
    // Set SyncManager but remove serviceWorker
    (globalThis as Record<string, unknown>).SyncManager = class {};
    const origSW = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(registerResumeSync()).resolves.toBeUndefined();

    // Restore
    if (origSW) {
      Object.defineProperty(navigator, "serviceWorker", origSW);
    }
    delete (globalThis as Record<string, unknown>).SyncManager;
  });

  it("registers sync tag 'resume-model-dl' when SyncManager is available", async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    (globalThis as Record<string, unknown>).SyncManager = class {};
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          sync: { register: registerMock },
        }),
      },
      configurable: true,
      writable: true,
    });

    await registerResumeSync();

    expect(registerMock).toHaveBeenCalledWith("resume-model-dl");
    expect(registerMock).toHaveBeenCalledTimes(1);

    delete (globalThis as Record<string, unknown>).SyncManager;
  });

  it("does not throw when sync.register rejects", async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error("denied"));
    (globalThis as Record<string, unknown>).SyncManager = class {};
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          sync: { register: registerMock },
        }),
      },
      configurable: true,
      writable: true,
    });

    await expect(registerResumeSync()).resolves.toBeUndefined();

    delete (globalThis as Record<string, unknown>).SyncManager;
  });
});

describe("listenForSyncMessages", () => {
  beforeEach(() => {
    maybeResumeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls maybeResume when a 'resume-partials' message is received", () => {
    const listeners: Array<(ev: MessageEvent) => void> = [];
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        addEventListener: vi.fn((_type: string, fn: (ev: MessageEvent) => void) => {
          listeners.push(fn);
        }),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    const unsub = listenForSyncMessages();

    expect(listeners).toHaveLength(1);

    // Dispatch a resume-partials message
    listeners[0](new MessageEvent("message", { data: { type: "resume-partials" } }));

    expect(maybeResumeMock).toHaveBeenCalledTimes(1);

    unsub();
  });

  it("ignores messages with other types", () => {
    const listeners: Array<(ev: MessageEvent) => void> = [];
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        addEventListener: vi.fn((_type: string, fn: (ev: MessageEvent) => void) => {
          listeners.push(fn);
        }),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    const unsub = listenForSyncMessages();
    listeners[0](new MessageEvent("message", { data: { type: "something-else" } }));

    expect(maybeResumeMock).not.toHaveBeenCalled();

    unsub();
  });

  it("returns a no-op unsubscribe when serviceWorker is unavailable", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const unsub = listenForSyncMessages();
    expect(typeof unsub).toBe("function");
    // Should not throw
    unsub();
  });

  it("removes the message listener on unsubscribe", () => {
    const removeMock = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: removeMock,
      },
      configurable: true,
      writable: true,
    });

    const unsub = listenForSyncMessages();
    unsub();

    expect(removeMock).toHaveBeenCalledWith("message", expect.any(Function));
  });
});
