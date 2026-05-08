import { describe, it, expect } from "vitest";
import { getSession, setActivePatientHash, resetSessionForTests } from "./session";

describe("audit session", () => {
  it("has a session id that persists across reads", () => {
    resetSessionForTests();
    const a = getSession().sessionId;
    const b = getSession().sessionId;
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("starts with no active patient hash", () => {
    resetSessionForTests();
    expect(getSession().patientIdHash).toBeUndefined();
  });

  it("captures a patient hash when set", () => {
    resetSessionForTests();
    setActivePatientHash("abcdef0123456789");
    expect(getSession().patientIdHash).toBe("abcdef0123456789");
  });

  it("clears the hash when set to null", () => {
    resetSessionForTests();
    setActivePatientHash("abcdef0123456789");
    setActivePatientHash(null);
    expect(getSession().patientIdHash).toBeUndefined();
  });
});
