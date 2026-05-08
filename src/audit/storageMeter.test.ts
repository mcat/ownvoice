import { describe, it, expect, beforeEach } from "vitest";
import { StorageMeter, AUDIT_BYTES_CAP } from "./storageMeter";

describe("StorageMeter", () => {
  let meter: StorageMeter;
  let saved = 0;
  beforeEach(() => {
    saved = 0;
    meter = new StorageMeter({
      load: () => saved,
      save: (n) => { saved = n; },
    });
  });

  it("starts at the loaded total", () => {
    saved = 1234;
    meter = new StorageMeter({ load: () => 1234, save: () => {} });
    expect(meter.bytes()).toBe(1234);
  });

  it("adds bytes and persists the new total", () => {
    meter.add(500);
    meter.add(250);
    expect(meter.bytes()).toBe(750);
    expect(saved).toBe(750);
  });

  it("subtracts bytes (clamps to zero)", () => {
    meter.add(100);
    meter.subtract(150);
    expect(meter.bytes()).toBe(0);
  });

  it("flags overage when over the cap", () => {
    meter.add(AUDIT_BYTES_CAP + 1);
    expect(meter.isOver()).toBe(true);
  });

  it("computes record byte estimate from JSON length", () => {
    const r = { id: "abc", name: "x" };
    expect(StorageMeter.estimate(r)).toBe(JSON.stringify(r).length);
  });
});
