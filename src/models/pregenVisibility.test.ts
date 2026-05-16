import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backoffPregenOnHidden } from "./pregenVisibility";

vi.mock("./audioCacheRunner", () => ({
  pauseAll: vi.fn(),
  resumeAll: vi.fn().mockResolvedValue(undefined),
}));

import { pauseAll, resumeAll } from "./audioCacheRunner";

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

const CFG = { activePatientId: "p1" } as never;

describe("backoffPregenOnHidden", () => {
  let cleanups: Array<() => void> = [];

  function install(getCfg: () => unknown): () => void {
    const unsub = backoffPregenOnHidden(getCfg as () => never);
    cleanups.push(unsub);
    return unsub;
  }

  beforeEach(() => {
    cleanups = [];
    vi.mocked(pauseAll).mockReset();
    vi.mocked(resumeAll).mockReset().mockResolvedValue(undefined);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    for (const c of cleanups) c();
  });

  it("calls pauseAll on visibilitychange → hidden", () => {
    install(() => CFG);
    setVisibility("hidden");
    expect(pauseAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).not.toHaveBeenCalled();
  });

  it("calls resumeAll with the latest cfg on visibilitychange → visible", () => {
    let current: unknown = CFG;
    install(() => current);
    setVisibility("hidden");
    // Patient switch happens while the tab is hidden.
    const SWITCHED = { activePatientId: "p2" } as never;
    current = SWITCHED;
    setVisibility("visible");
    expect(resumeAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).toHaveBeenCalledWith(SWITCHED);
  });

  it("skips resumeAll when getCfg returns null (pre-gen path not ready)", () => {
    install(() => null);
    setVisibility("hidden");
    setVisibility("visible");
    expect(pauseAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).not.toHaveBeenCalled();
  });

  it("removes the listener on unsubscribe", () => {
    const unsub = install(() => CFG);
    unsub();
    setVisibility("hidden");
    setVisibility("visible");
    expect(pauseAll).not.toHaveBeenCalled();
    expect(resumeAll).not.toHaveBeenCalled();
  });
});
