import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppSettings } from "../types";
import { backoffPregenOnHidden } from "./pregenVisibility";

vi.mock("./audioCacheRunner", () => ({
  pauseAll: vi.fn(),
  resumeAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../stores/settingsStore", () => ({
  useSettingsStore: { getState: vi.fn() },
}));

import { pauseAll, resumeAll } from "./audioCacheRunner";
import { useSettingsStore } from "../stores/settingsStore";

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function setCfg(cfg: AppSettings | null): void {
  vi.mocked(useSettingsStore).getState.mockReturnValue({ cfg } as never);
}

const CFG = { activePatientId: "p1" } as unknown as AppSettings;

describe("backoffPregenOnHidden", () => {
  let cleanups: Array<() => void> = [];

  function install(): () => void {
    const unsub = backoffPregenOnHidden();
    cleanups.push(unsub);
    return unsub;
  }

  beforeEach(() => {
    cleanups = [];
    vi.mocked(pauseAll).mockReset();
    vi.mocked(resumeAll).mockReset().mockResolvedValue(undefined);
    setCfg(CFG);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    for (const c of cleanups) c();
  });

  it("calls pauseAll on visibilitychange → hidden", () => {
    install();
    setVisibility("hidden");
    expect(pauseAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).not.toHaveBeenCalled();
  });

  it("calls resumeAll with the latest cfg on visibilitychange → visible", () => {
    install();
    setVisibility("hidden");
    // Patient switch happens while the tab is hidden — the resume on
    // the way back must read the *current* cfg, not the one captured
    // at install time.
    const SWITCHED = { activePatientId: "p2" } as unknown as AppSettings;
    setCfg(SWITCHED);
    setVisibility("visible");
    expect(resumeAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).toHaveBeenCalledWith(SWITCHED);
  });

  it("skips resumeAll when cfg is null (pre-gen path not ready)", () => {
    install();
    setVisibility("hidden");
    setCfg(null);
    setVisibility("visible");
    expect(pauseAll).toHaveBeenCalledTimes(1);
    expect(resumeAll).not.toHaveBeenCalled();
  });

  it("removes the listener on unsubscribe", () => {
    const unsub = install();
    unsub();
    setVisibility("hidden");
    setVisibility("visible");
    expect(pauseAll).not.toHaveBeenCalled();
    expect(resumeAll).not.toHaveBeenCalled();
  });

  it("warns instead of throwing when resumeAll rejects", async () => {
    install();
    setVisibility("hidden");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(resumeAll).mockRejectedValueOnce(new Error("boom"));
    setVisibility("visible");
    // Let the .catch handler run.
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pregen resume failed"),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});
