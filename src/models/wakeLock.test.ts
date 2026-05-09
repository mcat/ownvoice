import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

interface FakeSentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (ev: string, cb: () => void) => void;
}

let sentinels: FakeSentinel[];
let requestCalls: number;
let nextRequestRejects: Error | null;

function installFakeWakeLock(): void {
  sentinels = [];
  requestCalls = 0;
  nextRequestRejects = null;

  const wakeLock = {
    request: async (_kind: string): Promise<FakeSentinel> => {
      requestCalls += 1;
      if (nextRequestRejects) {
        const err = nextRequestRejects;
        nextRequestRejects = null;
        throw err;
      }
      const listeners: Array<() => void> = [];
      const sentinel: FakeSentinel = {
        released: false,
        release: async () => {
          if (sentinel.released) return;
          sentinel.released = true;
          for (const l of listeners) l();
        },
        addEventListener: (ev, cb) => {
          if (ev === "release") listeners.push(cb);
        },
      };
      sentinels.push(sentinel);
      return sentinel;
    },
  };

  Object.defineProperty(navigator, "wakeLock", {
    value: wakeLock,
    configurable: true,
  });
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

const baseCfg = {
  caregiverLang: "en",
  pin: "",
  providers: [],
  patients: [],
  activePatientId: null,
};

// Each test loads fresh `wakeLock.ts` AND `settingsStore.ts` modules so
// the wake-lock controller subscribes to the same store instance the
// test mutates. Without this dance, vi.resetModules() gives the
// controller a new store while the test still holds the old one.
async function loadFresh() {
  vi.resetModules();
  const wakeLockMod = await import("./wakeLock");
  const storeMod = await import("../stores/settingsStore");
  return { startWakeLock: wakeLockMod.startWakeLock, useSettingsStore: storeMod.useSettingsStore };
}

describe("startWakeLock", () => {
  beforeEach(() => {
    installFakeWakeLock();
  });

  afterEach(() => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it("acquires a lock when cfg.keepScreenAwake defaults true", async () => {
    const { startWakeLock, useSettingsStore } = await loadFresh();
    useSettingsStore.setState({ cfg: { ...baseCfg }, _hasHydrated: true } as never);

    startWakeLock();
    await flush();

    expect(requestCalls).toBe(1);
    expect(sentinels[0]?.released).toBe(false);
  });

  it("releases the lock when keepScreenAwake flips false", async () => {
    const { startWakeLock, useSettingsStore } = await loadFresh();
    useSettingsStore.setState({
      cfg: { ...baseCfg, keepScreenAwake: true },
      _hasHydrated: true,
    } as never);

    startWakeLock();
    await flush();
    expect(sentinels[0]?.released).toBe(false);

    useSettingsStore.setState({
      cfg: { ...baseCfg, keepScreenAwake: false },
    } as never);
    await flush();

    expect(sentinels[0]?.released).toBe(true);
  });

  it("does not throw when navigator.wakeLock.request rejects", async () => {
    nextRequestRejects = new Error("not allowed (low power)");
    const { startWakeLock, useSettingsStore } = await loadFresh();
    useSettingsStore.setState({ cfg: { ...baseCfg }, _hasHydrated: true } as never);

    expect(() => startWakeLock()).not.toThrow();
    await flush();
    expect(requestCalls).toBe(1);
    expect(sentinels.length).toBe(0);
  });
});
