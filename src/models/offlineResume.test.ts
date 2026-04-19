import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hasPendingDownloads, resumePendingOnVisible } from "./offlineResume";
import { useOfflineStore } from "../stores/offlineStore";

const drivePrimerMock = vi.fn(async () => {});
vi.mock("./drivePrimer", () => ({
  drivePrimer: () => drivePrimerMock(),
}));

/** Minimal OPFS mock supporting .values() async iteration. */
function installOPFS(layout: Record<string, string[]>): void {
  // layout: { "models/tts": ["a.onnx", "a.onnx._progress.json"], ... }
  function makeFile(name: string) {
    return { kind: "file" as const, name };
  }
  function makeDir(name: string, children: Array<{ kind: "file" | "directory"; name: string; children?: unknown[] }>) {
    return {
      kind: "directory" as const,
      name,
      values: async function* () {
        for (const child of children) yield child;
      },
    };
  }

  const modelSubdirs: ReturnType<typeof makeDir>[] = [];
  for (const [path, files] of Object.entries(layout)) {
    if (!path.startsWith("models/")) continue;
    const subName = path.slice("models/".length);
    modelSubdirs.push(makeDir(subName, files.map((f) => makeFile(f))));
  }

  const modelsDir = {
    kind: "directory" as const,
    name: "models",
    values: async function* () {
      for (const s of modelSubdirs) yield s;
    },
  };

  const root = {
    getDirectoryHandle: vi.fn(async (name: string) => {
      if (name === "models") return modelsDir;
      throw new DOMException("Not found", "NotFoundError");
    }),
  };

  Object.defineProperty(navigator, "storage", {
    value: {
      getDirectory: vi.fn(async () => root),
      persist: vi.fn(async () => true),
    },
    configurable: true,
    writable: true,
  });
}

describe("hasPendingDownloads", () => {
  it("returns false when /models/ does not exist", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        getDirectory: vi.fn(async () => ({
          getDirectoryHandle: async () => {
            throw new DOMException("Not found", "NotFoundError");
          },
        })),
      },
      configurable: true,
      writable: true,
    });
    expect(await hasPendingDownloads()).toBe(false);
  });

  it("returns false when /models/ has no _progress.json markers", async () => {
    installOPFS({
      "models/tts": ["a.onnx", "b.onnx"],
      "models/llm": ["model.onnx"],
    });
    expect(await hasPendingDownloads()).toBe(false);
  });

  it("returns true when any subdirectory contains a _progress.json file", async () => {
    installOPFS({
      "models/tts": ["a.onnx"],
      "models/llm": ["model.onnx", "model.onnx._progress.json"],
    });
    expect(await hasPendingDownloads()).toBe(true);
  });
});

describe("resumePendingOnVisible", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    drivePrimerMock.mockReset();
    drivePrimerMock.mockResolvedValue(undefined);
    // Default: visible + no partials
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    installOPFS({ "models/tts": ["a.onnx"] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers a visibilitychange listener and returns an unsubscribe that removes it", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const unsub = resumePendingOnVisible();
    expect(add).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    unsub();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("does not kick primer when no partials exist on mount", async () => {
    installOPFS({ "models/tts": ["a.onnx"] }); // no _progress.json
    const unsub = resumePendingOnVisible();
    // Give microtasks time to settle
    await Promise.resolve();
    await Promise.resolve();
    expect(drivePrimerMock).not.toHaveBeenCalled();
    unsub();
  });

  it("kicks primer when a partial exists and tab is visible on mount", async () => {
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    const unsub = resumePendingOnVisible();
    // Wait for async resume chain to complete
    await vi.waitFor(() => {
      expect(drivePrimerMock).toHaveBeenCalledTimes(1);
    });
    unsub();
  });

  it("does not kick primer when primerRunning is already true", async () => {
    useOfflineStore.getState().setPrimerRunning(true);
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    const unsub = resumePendingOnVisible();
    await Promise.resolve();
    await Promise.resolve();
    expect(drivePrimerMock).not.toHaveBeenCalled();
    unsub();
  });

  it("skips resume when tab is hidden on mount but fires when it becomes visible", async () => {
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    let visibility: DocumentVisibilityState = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });

    const unsub = resumePendingOnVisible();
    await Promise.resolve();
    expect(drivePrimerMock).not.toHaveBeenCalled();

    // Flip to visible and dispatch the event.
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => {
      expect(drivePrimerMock).toHaveBeenCalledTimes(1);
    });
    unsub();
  });
});
