import { describe, it, expect } from "vitest";
import { ATTR, PHI_ATTR_KEYS } from "./attrs";
import { EVENT, type EventName } from "./events";

describe("ATTR registry", () => {
  it("namespaces every key under ownvoice.", () => {
    for (const v of Object.values(ATTR)) {
      expect(v.startsWith("ownvoice.")).toBe(true);
    }
  });

  it("declares PHI keys as a subset of ATTR values", () => {
    const allValues = new Set(Object.values(ATTR));
    for (const k of PHI_ATTR_KEYS) {
      expect(allValues.has(k)).toBe(true);
    }
  });
});

describe("EVENT registry", () => {
  it("uses dot-namespaced names", () => {
    for (const v of Object.values(EVENT)) {
      expect(v).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    }
  });

  it("EventName narrows to declared values only", () => {
    const e: EventName = EVENT.SPEAK_TAP;
    expect(e).toBe("speak.tap");
  });
});
