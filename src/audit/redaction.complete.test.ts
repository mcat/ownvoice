import { describe, it, expect } from "vitest";
import { ATTR, PHI_ATTR_KEYS } from "./attrs";

/** Closed-set policy: every ATTR key is either declared PHI (in
 *  PHI_ATTR_KEYS) or declared non-PHI (in NON_PHI_ATTR_KEYS below).
 *  Adding a new ATTR without listing it in one of the two sets fails
 *  this test, forcing a deliberate decision. */
const NON_PHI_ATTR_KEYS: ReadonlySet<string> = new Set([
  ATTR.APP_VERSION,
  ATTR.SESSION_ID,
  ATTR.PATIENT_ID_HASH,
  ATTR.PATIENT_LANG,
  ATTR.CAREGIVER_LANG,
  ATTR.ACTOR,
  ATTR.PROVIDER_NAME,
  ATTR.VIA,
  ATTR.SPEECH_ICON,
  ATTR.SPEECH_ENGINE,
  ATTR.SPEECH_LANG,
  ATTR.SPEECH_CACHE_HIT,
  ATTR.SPEECH_LATENCY_MS,
  ATTR.SPEECH_PHRASE_KEY,
  ATTR.WORKFLOW_ID,
  ATTR.WORKFLOW_NAME,
  ATTR.STEP_NAME,
  ATTR.STEP_ATTEMPT,
  ATTR.ERROR_TYPE,
  ATTR.ERROR_MESSAGE,
  ATTR.ERROR_STACK,
  ATTR.MODEL_NAME,
  ATTR.MODEL_SIZE_BYTES,
  ATTR.MODEL_VERSION,
  ATTR.AUDIT_DROPPED_COUNT,
  ATTR.AUDIT_DEGRADED_REASON,
  ATTR.AUDIT_BYTES_USED,
  ATTR.GRANTED,
  // Memory-crash tombstone — stage labels are workflow descriptors
  // (e.g. "boot:tts-gpu-init", "pregen:patient:42/700"). Patient
  // UUIDs are stripped at the recordStage call site (see
  // speakerKindForLog in audioCacheRunner.ts), so the value is safe.
  ATTR.DIAG_LAST_STAGE,
  ATTR.DIAG_LAST_STAGE_AGE_MS,
]);

describe("PHI redaction policy completeness", () => {
  it("classifies every ATTR key as either PHI or non-PHI", () => {
    const declared = new Set([...PHI_ATTR_KEYS, ...NON_PHI_ATTR_KEYS]);
    const undeclared = Object.values(ATTR).filter((v) => !declared.has(v));
    expect(undeclared).toEqual([]);
  });

  it("PHI and non-PHI sets are disjoint", () => {
    for (const k of PHI_ATTR_KEYS) {
      expect(NON_PHI_ATTR_KEYS.has(k)).toBe(false);
    }
  });
});
