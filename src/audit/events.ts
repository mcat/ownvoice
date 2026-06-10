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

  /** A debounced IndexedDB settings write failed (quota exceeded, blocked
   *  upgrade, broken IDB). In-memory state is ahead of disk until a later
   *  write succeeds — a reload before then loses the delta. */
  PERSIST_ERROR:           "persist.error",
  /** A patient's speakerData was re-attached from the speaker vault after
   *  going missing from the settings blob (corrupt/torn write recovery). */
  SPEAKER_VAULT_RESTORE:   "speaker_vault.restore",

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

  /** Previous session ended without firing the `pagehide` handler that
   *  clears the memory-diagnostics tombstone. Emitted at most once per
   *  boot, only when `?memdiag=true` was active on the previous session.
   *  Attributes carry the last recorded lifecycle stage and the time
   *  since it was written, to pinpoint where Safari's memory ceiling
   *  killed the renderer. See `src/diagnostics/crashTombstone.ts`. */
  DIAG_PREVIOUS_CRASH:     "diagnostics.previous_crash",

  WAKE_LOCK_ACQUIRED:      "wake_lock.acquired",
  WAKE_LOCK_RELEASED:      "wake_lock.released",
  WAKE_LOCK_FAILED:        "wake_lock.failed",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];
