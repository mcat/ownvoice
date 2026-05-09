import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setBadge, clearBadge, isBadgingSupported } from "./badge";

describe("badge", () => {
  let setCalls: Array<number | undefined>;
  let clearCalls: number;
  let nextRejects: Error | null;

  beforeEach(() => {
    setCalls = [];
    clearCalls = 0;
    nextRejects = null;
    Object.defineProperty(navigator, "setAppBadge", {
      value: async (n?: number) => {
        if (nextRejects) {
          const err = nextRejects;
          nextRejects = null;
          throw err;
        }
        setCalls.push(n);
      },
      configurable: true,
    });
    Object.defineProperty(navigator, "clearAppBadge", {
      value: async () => {
        if (nextRejects) {
          const err = nextRejects;
          nextRejects = null;
          throw err;
        }
        clearCalls += 1;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    delete (navigator as { setAppBadge?: unknown }).setAppBadge;
    delete (navigator as { clearAppBadge?: unknown }).clearAppBadge;
  });

  it("isBadgingSupported reports true when navigator.setAppBadge exists", () => {
    expect(isBadgingSupported()).toBe(true);
  });

  it("setBadge forwards the count and returns true", async () => {
    const ok = await setBadge(3);
    expect(ok).toBe(true);
    expect(setCalls).toEqual([3]);
  });

  it("setBadge swallows rejections and returns false", async () => {
    nextRejects = new Error("denied");
    const ok = await setBadge(1);
    expect(ok).toBe(false);
  });

  it("clearBadge calls clearAppBadge", async () => {
    const ok = await clearBadge();
    expect(ok).toBe(true);
    expect(clearCalls).toBe(1);
  });

  it("returns false when API is unsupported", async () => {
    delete (navigator as { setAppBadge?: unknown }).setAppBadge;
    delete (navigator as { clearAppBadge?: unknown }).clearAppBadge;
    expect(isBadgingSupported()).toBe(false);
    expect(await setBadge(2)).toBe(false);
    expect(await clearBadge()).toBe(false);
  });
});
