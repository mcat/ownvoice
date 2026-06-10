/**
 * recordToEntry is the pure audit-record → ThreadEntry mapping used by
 * useThreadView. Tested directly (not through the live-subscribe hook,
 * which needs fake-indexeddb and has a history of CI flake — see #351).
 */
import { recordToEntry } from "./useThreadView";
import { ATTR } from "./attrs";
import type { AuditRecord } from "./types";

function makeRecord(attributes: Record<string, unknown>): AuditRecord {
  return {
    id: "rec-1",
    name: "speak.tap",
    time: 1_700_000_000_000,
    severity: "INFO",
    attributes,
  } as unknown as AuditRecord;
}

describe("recordToEntry", () => {
  it("carries the phrase key through to the thread entry", () => {
    const entry = recordToEntry(
      makeRecord({
        [ATTR.ACTOR]: "provider",
        [ATTR.SPEECH_TEXT]: "¿Cómo te sientes?",
        [ATTR.SPEECH_PHRASE_KEY]: "provider.questions.feeling",
        [ATTR.PROVIDER_NAME]: "Dr. Ruiz",
      }),
      "Maria",
    );
    expect(entry.key).toBe("provider.questions.feeling");
    expect(entry.from).toBe("provider");
    expect(entry.label).toBe("Dr. Ruiz");
  });

  it("normalizes an empty phrase-key attribute (free text) to undefined", () => {
    const entry = recordToEntry(
      makeRecord({
        [ATTR.ACTOR]: "patient",
        [ATTR.SPEECH_TEXT]: "water please",
        [ATTR.SPEECH_PHRASE_KEY]: "",
      }),
      "Maria",
    );
    expect(entry.key).toBeUndefined();
  });
});
