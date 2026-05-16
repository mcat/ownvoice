import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hasPendingDownloads, resumePendingOnVisible } from "./offlineResume";
import { useOfflineStore } from "../stores/offlineStore";
import { setVisibility } from "../test/visibility";

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
  it("does not auto-create the /models/ directory when scanning", async () => {
    // Guard against `create: false` → `create: true` mutation. hasPendingDownloads
    // is read-only — passing create:true would materialize an empty models dir
    // on a fresh install and silently mask "OPFS has nothing primed yet."
    const getDirHandle = vi.fn(async () => {
      throw new DOMException("Not found", "NotFoundError");
    });
    Object.defineProperty(navigator, "storage", {
      value: {
        getDirectory: vi.fn(async () => ({ getDirectoryHandle: getDirHandle })),
      },
      configurable: true,
      writable: true,
    });
    await hasPendingDownloads();
    expect(getDirHandle).toHaveBeenCalledWith("models", { create: false });
  });

  it("skips non-directory entries directly under /models/", async () => {
    // Guard against `entry.kind !== "directory"` → `false` mutation. If a stray
    // file sits at /models/orphan.txt (e.g. from a future bug), the outer loop
    // must skip it rather than try to recurse into it with .values().
    const root = {
      getDirectoryHandle: vi.fn(async (name: string) => {
        if (name !== "models") throw new DOMException("Not found", "NotFoundError");
        return {
          kind: "directory" as const,
          name: "models",
          values: async function* () {
            // Yields a FILE directly under /models/ — should be skipped, not recursed.
            yield { kind: "file" as const, name: "orphan.txt" };
            // Then a proper model dir with no partials.
            yield {
              kind: "directory" as const,
              name: "tts",
              values: async function* () {
                yield { kind: "file" as const, name: "a.onnx" };
              },
            };
          },
        };
      }),
    };
    Object.defineProperty(navigator, "storage", {
      value: { getDirectory: vi.fn(async () => root) },
      configurable: true,
      writable: true,
    });
    expect(await hasPendingDownloads()).toBe(false);
  });

  it("does not count a directory whose name happens to end in ._progress.json", async () => {
    // Guard against `child.kind === "file"` → `true` mutation. If someone
    // somehow lands a directory named X._progress.json, it must NOT be treated
    // as a pending-download marker (markers are files, by definition).
    const root = {
      getDirectoryHandle: vi.fn(async () => ({
        kind: "directory" as const,
        name: "models",
        values: async function* () {
          yield {
            kind: "directory" as const,
            name: "tts",
            values: async function* () {
              yield {
                kind: "directory" as const,
                name: "weirdname._progress.json",
                values: async function* () {},
              };
            },
          };
        },
      })),
    };
    Object.defineProperty(navigator, "storage", {
      value: { getDirectory: vi.fn(async () => root) },
      configurable: true,
      writable: true,
    });
    expect(await hasPendingDownloads()).toBe(false);
  });

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

  it("does not kick primer when primerRunning is already true, even with partials present", async () => {
    // Tight timing on this assertion — the prior two-microtask wait was too
    // short to surface the maybeResume primerRunning-guard mutation. Give the
    // full async chain (getDirectory → getDirectoryHandle → values() iteration
    // → would-have-called-drivePrimer) time to resolve.
    useOfflineStore.getState().setPrimerRunning(true);
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    const unsub = resumePendingOnVisible();
    await new Promise((r) => setTimeout(r, 20));
    expect(drivePrimerMock).not.toHaveBeenCalled();
    unsub();
  });

  it("does not kick primer when visibilitychange fires while tab is hidden", async () => {
    // Guard against the visibilityState !== "visible" check being mutated
    // to always-truthy. We fire the event while hidden and assert nothing
    // kicks even after the full microtask chain would have completed.
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    const unsub = resumePendingOnVisible();
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 20));
    expect(drivePrimerMock).not.toHaveBeenCalled();
    unsub();
  });

  it("swallows errors from drivePrimer without throwing", async () => {
    // Covers the try/catch around runPrimer in maybeResume — a resume that
    // fails (e.g. manifest fetch dies) must not take down the listener or
    // propagate an uncaught rejection.
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    drivePrimerMock.mockRejectedValueOnce(new Error("manifest fetch failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const unsub = resumePendingOnVisible();
    await vi.waitFor(() => {
      expect(drivePrimerMock).toHaveBeenCalledTimes(1);
    });
    await new Promise((r) => setTimeout(r, 20));
    // The warn includes our prefix and the error — assert both so string-mutants die.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("opportunistic resume failed"),
      expect.any(Error),
    );
    unsub();
  });

  it("skips resume when tab is hidden on mount but fires when it becomes visible", async () => {
    installOPFS({ "models/tts": ["a.onnx", "a.onnx._progress.json"] });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    const unsub = resumePendingOnVisible();
    await Promise.resolve();
    expect(drivePrimerMock).not.toHaveBeenCalled();

    setVisibility("visible");

    await vi.waitFor(() => {
      expect(drivePrimerMock).toHaveBeenCalledTimes(1);
    });
    unsub();
  });
});
