export const EVENT = {
  SPEAK_TAP:               "speak.tap",
  SPEAK_CACHE_HIT:         "speak.cache.hit",
  SPEAK_CACHE_MISS:        "speak.cache.miss",
  SPEAK_FALLBACK_WEB:      "speak.fallback.web_speech",
  SPEAK_FALLBACK_TONE:     "speak.fallback.tone",
  SPEAK_ERROR:             "speak.error",
  THREAD_COMPOSE:          "thread.compose",

  MODEL_BOOT_START:        "model.boot.start",
  MODEL_BOOT_COMPLETE:     "model.boot.complete",
  MODEL_VERIFY_SUCCESS:    "model.verify.success",
  MODEL_VERIFY_FAILURE:    "model.verify.failure",
  MODEL_DOWNLOAD_START:    "model.download.start",
  MODEL_DOWNLOAD_COMPLETE: "model.download.complete",
  MODEL_DOWNLOAD_RESUME:   "model.download.resume",
  MODEL_DOWNLOAD_FAILURE:  "model.download.failure",
  MODEL_PERSIST_RESULT:    "model.persist.result",

  SETTINGS_PATIENT_ADD:      "settings.patient.add",
  SETTINGS_PATIENT_REMOVE:   "settings.patient.remove",
  SETTINGS_PATIENT_ACTIVATE: "settings.patient.activate",
  SETTINGS_LANG_CHANGE:      "settings.lang.change",
  SETTINGS_PROVIDER_ADD:     "settings.provider.add",

  AUDIT_EXPORT:            "audit.export",
  AUDIT_RETENTION_SWEEP:   "audit.retention.sweep",
  AUDIT_BUFFER_OVERFLOW:   "audit.buffer_overflow",
  AUDIT_DEGRADED:          "audit.degraded",

  WORKFLOW_START:          "workflow.start",
  WORKFLOW_COMPLETE:       "workflow.complete",
  WORKFLOW_FAILED:         "workflow.failed",
  WORKFLOW_ABANDONED:      "workflow.abandoned",
  WORKFLOW_RESUMED:        "workflow.resumed",
  STEP_START:              "step.start",
  STEP_COMPLETE:           "step.complete",
  STEP_FAILED:             "step.failed",
  STEP_REPLAY_HIT:         "step.replay.hit",

  ERROR_UNHANDLED:         "error.unhandled",
  ERROR_REJECTION:         "error.unhandled_rejection",

  WAKE_LOCK_ACQUIRED:      "wake_lock.acquired",
  WAKE_LOCK_RELEASED:      "wake_lock.released",
  WAKE_LOCK_FAILED:        "wake_lock.failed",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];
