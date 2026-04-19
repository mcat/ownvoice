import { describe, it, expect } from "vitest";
import { getRecordingScript } from "./recordingScripts";

describe("getRecordingScript", () => {
  it("returns the Rainbow Passage for 'en'", () => {
    const s = getRecordingScript("en");
    expect(s.passage).toContain("sunlight strikes raindrops");
    expect(s.prompt).toBe("Read this aloud:");
  });

  it("falls back through region tags to the base language (en-US → en)", () => {
    const s = getRecordingScript("en-US");
    expect(s.passage).toContain("sunlight strikes raindrops");
  });

  it("also resolves en-GB to the Rainbow Passage (same base language)", () => {
    const s = getRecordingScript("en-GB");
    expect(s.passage).toContain("sunlight strikes raindrops");
  });

  it("returns free-speak coaching for an unsupported locale (no passage)", () => {
    const s = getRecordingScript("es-ES");
    expect(s.passage).toBeUndefined();
    expect(s.freeSpeakTemplate).toContain("{remaining}");
  });

  it("returns free-speak coaching when locale is undefined", () => {
    const s = getRecordingScript(undefined);
    expect(s.passage).toBeUndefined();
  });

  it("always provides an opening and closing hint regardless of locale", () => {
    for (const loc of ["en", "es", "fr-CA", undefined]) {
      const s = getRecordingScript(loc);
      expect(s.openingHint.length).toBeGreaterThan(0);
      expect(s.closingHint.length).toBeGreaterThan(0);
    }
  });
});
