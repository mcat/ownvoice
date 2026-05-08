export const ATTR = {
  APP_VERSION:         "ownvoice.app.version",
  SESSION_ID:          "ownvoice.session_id",

  PATIENT_ID_HASH:     "ownvoice.patient.id_hash",
  PATIENT_LANG:        "ownvoice.patient.lang",
  CAREGIVER_LANG:      "ownvoice.caregiver.lang",

  ACTOR:               "ownvoice.actor",
  PROVIDER_NAME:       "ownvoice.provider.name",

  SPEECH_TEXT:         "ownvoice.speech.text",
  SPEECH_GLOSS:        "ownvoice.speech.gloss",
  SPEECH_ICON:         "ownvoice.speech.icon",
  SPEECH_ENGINE:       "ownvoice.speech.engine",
  SPEECH_LANG:         "ownvoice.speech.lang",
  SPEECH_CACHE_HIT:    "ownvoice.speech.cache_hit",
  SPEECH_LATENCY_MS:   "ownvoice.speech.latency_ms",
  SPEECH_PHRASE_KEY:   "ownvoice.speech.phrase_key",

  WORKFLOW_ID:         "ownvoice.workflow.id",
  WORKFLOW_NAME:       "ownvoice.workflow.name",
  STEP_NAME:           "ownvoice.step.name",
  STEP_ATTEMPT:        "ownvoice.step.attempt",

  ERROR_TYPE:          "ownvoice.error.type",
  ERROR_MESSAGE:       "ownvoice.error.message",
  ERROR_STACK:         "ownvoice.error.stack",

  MODEL_NAME:          "ownvoice.model.name",
  MODEL_SIZE_BYTES:    "ownvoice.model.size_bytes",
  MODEL_VERSION:       "ownvoice.model.version",

  AUDIT_DROPPED_COUNT:    "ownvoice.audit.dropped_count",
  AUDIT_DEGRADED_REASON:  "ownvoice.audit.degraded_reason",
  AUDIT_BYTES_USED:       "ownvoice.audit.bytes_used",
} as const;

export const PHI_ATTR_KEYS: ReadonlySet<string> = new Set([
  ATTR.SPEECH_TEXT,
  ATTR.SPEECH_GLOSS,
]);
