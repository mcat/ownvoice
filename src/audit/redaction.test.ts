import { describe, it, expect } from "vitest";
import { redactPHI } from "./redaction";
import { ATTR } from "./attrs";

describe("redactPHI", () => {
  it("replaces SPEECH_TEXT and SPEECH_GLOSS with [REDACTED]", () => {
    const input = [
      {
        id: "01",
        kind: "log" as const,
        time: 0,
        observed_time: 0,
        name: "speak.tap",
        attributes: {
          [ATTR.SPEECH_TEXT]: "I'm in pain",
          [ATTR.SPEECH_GLOSS]: "Tengo dolor",
          [ATTR.ACTOR]: "patient",
        },
      },
    ];
    const out = redactPHI(input);
    expect(out[0].attributes[ATTR.SPEECH_TEXT]).toBe("[REDACTED]");
    expect(out[0].attributes[ATTR.SPEECH_GLOSS]).toBe("[REDACTED]");
    expect(out[0].attributes[ATTR.ACTOR]).toBe("patient");
  });

  it("does not mutate the input", () => {
    const input = [
      {
        id: "01",
        kind: "log" as const,
        time: 0,
        observed_time: 0,
        name: "speak.tap",
        attributes: { [ATTR.SPEECH_TEXT]: "secret" },
      },
    ];
    redactPHI(input);
    expect(input[0].attributes[ATTR.SPEECH_TEXT]).toBe("secret");
  });

  it("leaves records without PHI attrs untouched", () => {
    const input = [
      {
        id: "02",
        kind: "log" as const,
        time: 0,
        observed_time: 0,
        name: "model.boot.complete",
        attributes: { [ATTR.MODEL_NAME]: "chatterbox" },
      },
    ];
    const out = redactPHI(input);
    expect(out[0].attributes[ATTR.MODEL_NAME]).toBe("chatterbox");
  });
});
