import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { installModelLifecycleCleanup } from "./lifecycleCleanup";
import { getModelManager } from "./modelManager";

function makeMockWorker(): Worker & {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
} {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onmessage: null,
    onmessageerror: null,
    onerror: null,
  } as unknown as Worker & {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  };
}

describe("installModelLifecycleCleanup", () => {
  let handler: ((e: Event & { persisted: boolean }) => void) | null;
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    handler = null;
    addSpy = vi.spyOn(window, "addEventListener").mockImplementation(
      (event: string, cb: EventListenerOrEventListenerObject) => {
        if (event === "pagehide") {
          handler = cb as (e: Event & { persisted: boolean }) => void;
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    addSpy.mockRestore();
  });

  function fire(persisted: boolean): void {
    if (!handler) throw new Error("handler not registered");
    const ev = new Event("pagehide") as Event & { persisted: boolean };
    Object.defineProperty(ev, "persisted", { value: persisted });
    handler(ev);
  }

  it("posts shutdown to every registered worker on real pagehide", () => {
    const mgr = getModelManager();
    const tts = makeMockWorker();
    const stt = makeMockWorker();
    mgr.setWorker("tts", tts);
    mgr.setWorker("stt", stt);

    installModelLifecycleCleanup();
    fire(false);

    expect(tts.postMessage).toHaveBeenCalledWith({ type: "shutdown" });
    expect(stt.postMessage).toHaveBeenCalledWith({ type: "shutdown" });
  });

  it("calls worker.terminate() synchronously on pagehide", () => {
    const mgr = getModelManager();
    const tts = makeMockWorker();
    mgr.setWorker("tts", tts);

    installModelLifecycleCleanup();
    fire(false);

    // Synchronous: no timer advance needed — the document may not survive
    // long enough on manual refresh to fire a queued setTimeout.
    expect(tts.terminate).toHaveBeenCalled();
  });

  it("posts shutdown BEFORE terminate (best-effort release ordering)", () => {
    const mgr = getModelManager();
    const tts = makeMockWorker();
    mgr.setWorker("tts", tts);

    const calls: string[] = [];
    tts.postMessage.mockImplementation(() => calls.push("postMessage"));
    tts.terminate.mockImplementation(() => calls.push("terminate"));

    installModelLifecycleCleanup();
    fire(false);

    expect(calls).toEqual(["postMessage", "terminate"]);
  });

  it("skips cleanup when entering bfcache (persisted=true)", () => {
    const mgr = getModelManager();
    const tts = makeMockWorker();
    mgr.setWorker("tts", tts);

    installModelLifecycleCleanup();
    fire(true);

    expect(tts.postMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(tts.terminate).not.toHaveBeenCalled();
  });
});
