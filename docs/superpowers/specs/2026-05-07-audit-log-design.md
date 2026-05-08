# Audit Log + Durable Workflow Journal

## Problem

The app has no persistent record of what it does. `console.log` calls in
`src/speak.ts` and `src/models/*` are the only signal we have when a phrase
fails to play, an enrollment dies mid-extraction, or a model fails to verify on
boot. None of this survives a tab reload, an iPadOS background-eviction of the
WebGPU tab, or a switch back from another app — exactly the conditions where
bugs in this codebase are hardest to reproduce. There is also no record a
clinician or researcher could review for the four explicit asks already on the
table:

1. A healthcare worker reviewing a date/time log of phrases spoken at the
   bedside.
2. A researcher reviewing every action — system or user — with author, time,
   and outcome.
3. A researcher exporting that log for off-app analysis in standard tooling.
4. A developer reading errors with enough context to debug.

The same gap also produces a second-order UX problem: long-running flows
(voice enrollment, audio-cache pre-gen, model priming, patient-remove cascade)
have no journal to resume from when the tab dies, so users redo work the app
already partially completed.

## Goals

1. Record every speech event, system event, and error in a single
   OTLP-compatible store on-device.
2. Make long-running multi-step flows resumable across tab kills via a
   journaled workflow runtime.
3. Surface that store to three audiences — healthcare worker, researcher,
   developer — through one Settings-gated viewer with role-toggled defaults.
4. Export the store as spec-correct OTLP/JSON that drops into Honeycomb,
   Tempo, Jaeger, Datadog, or `otel-cli` without transformation.
5. Honour the existing privacy promise ("no data leaves the tablet after
   initial load") — the store is on-device; export is user-initiated; PHI is
   redacted by default at export time.
6. Add zero perceptible latency to the patient tap path.

Non-goals: live tail / push UI, cross-device aggregation, cloud upload,
encrypted exports, server-side workflow recovery.

The conversation thread (`ov-conversation`) is **subsumed**, not preserved
alongside the audit log. Phase 1 derives the thread from audit events and
drops the `ov-conversation` IDB store; spoken-text PHI then lives in
exactly one place. See Phase 1 below for the migration story.

## Decisions log

Nine questions from the brainstorming session, in order:

| Q | Decision |
|---|---|
| 1. Driver | All three audiences (healthcare / researcher / developer), one shared pipeline with filtered views. |
| 2. Architecture | Hybrid: passive `audit.log(...)` for fire-and-forget; durable workflow runtime for the four long-running flows. ~300 LOC runtime, hand-rolled. |
| 3. OTel library | `@opentelemetry/api` + `@opentelemetry/api-logs` + `@opentelemetry/otlp-transformer` (~17 KB gzipped). No SDK, no exporter, no auto-instrumentation. |
| 4. Schema | Two TypeScript shapes (`AuditRecord`, `WorkflowState`); closed attribute namespace; OTLP severity ladder; ULID primary key. |
| 5. PHI / privacy | Spoken text stored on-device as attribute; redacted by default at export; per-patient cascade + reset-all wipe `ov-audit`; 30-day retention with 50 MB hard cap. |
| 6. Storage | New IndexedDB database `ov-audit` with two object stores (`events`, `workflows`). Same database for cross-store transactional atomicity. `ov-conversation` is dropped — thread is derived from audit events. |
| 7. Workflow API | DBOS-shaped: `ov.workflow(name, async (ctx) => ctx.step(name, fn))`. Boot-time recovery sweep; per-workflow `recoveryMode`. |
| 8. Views | One viewer at Settings → Activity log, with "View as" segmented control (Healthcare worker / Researcher / Developer). PIN gating inherited from Settings. |
| 9. Export | OTLP/JSON canonical (single file), NDJSON optional convenience. Web Share API primary, anchor-download fallback. Audit-of-audit emitted on every export. |

DBOS Transact TS was evaluated and rejected for in-client use: hard
dependency on the Node `pg` driver, no pluggable storage adapter, and ~3.5 MB
of bundle if the dependency were force-shimmed via pglite. The DBOS API
shape is borrowed; the runtime is hand-rolled on IndexedDB.

## Phased delivery

Each phase is independently valuable and lands as its own PR.

### Phase 1 — Audit foundation + thread derivation (~750 LOC)

Land first. Delivers visibility into what the app does *and* makes the
audit log the single source of truth for spoken-text PHI by deriving the
conversation thread from it.

- New `ov-audit` IndexedDB database with both `events` and `workflows`
  object stores defined at v1 (workflows store stays empty until Phase 2).
- `src/audit/logger.ts` — single `audit.log(event)` writer; passive only.
  Emits a synchronous in-memory pub-sub notification for live readers.
- `src/audit/types.ts`, `src/audit/attrs.ts` — record shape + closed
  attribute namespace.
- `src/audit/ulid.ts` — ~30 LOC dependency-free ULID generator.
- `src/audit/otlp.ts` — OTLP/JSON envelope builder using
  `@opentelemetry/otlp-transformer`.
- Retrofit `audit.log(...)` calls into `src/speak.ts`, `src/main-app.tsx`,
  `src/models/modelManager.ts`, `src/models/integrityCheck.ts`,
  `src/stores/settingsStore.ts` setters, and global error handlers
  (`window.addEventListener("error" | "unhandledrejection")`).
- Boot-time retention sweep + hourly tick (uses `requestIdleCallback` so the
  tap path is never blocked).
- Hidden Settings → Diagnostics viewer (revealed by 5-tap on the Settings
  version string). Read-only table, severity filter, free-text search over
  `name`, JSON export button (no redaction — dev-only context).
- Per-patient cascade in `src/stores/resetScoped.ts`; `resetAll()` adds
  `indexedDB.deleteDatabase("ov-audit")`.

**Thread derivation (the new piece):**

- Drop `ov-conversation` IDB store entirely. `Message`, `addMessage`,
  `addToThread`, and `useConversationStore` are removed.
- New `src/audit/useThreadView.ts` hook: reads from `ov-audit.events`
  filtered to thread-visible event names (`speak.tap`, `thread.compose`,
  `thread.transcribed`) and the active patient's `patient_id_hash`.
  Memoised; subscribed to the audit pub-sub for live updates. Returns:

  ```ts
  export interface ThreadEntry {
    id: string;                        // event ULID; stable React key
    from: "patient" | "provider";
    text: string;
    gloss?: string;
    icon?: string;
    time: number;                      // ms epoch; renderer formats locally
    label: string;                     // resolved at read time:
                                       //   patient → cfg.patients[id].name
                                       //   provider → ATTR.PROVIDER_NAME
  }

  export function useThreadView(
    patientId: string | null,
  ): readonly ThreadEntry[];
  ```

  `App.tsx` swaps `s.messagesByPatientId[id] ?? EMPTY_MESSAGES` for
  `useThreadView(activePatientId)`. The renderer reads `entry.text`,
  `entry.gloss`, `entry.icon`, `entry.label`, and formats `entry.time`
  locally — the existing pre-formatted `Message.time` string is replaced
  by epoch-ms so the renderer chooses the format (which fixes a latent
  bug where stored timestamps weren't sortable across days).
- `useSpeakActions.speakAsPatient` / `speakAsProvider` → audit-log
  `speak.tap` (replaces `addMessage`).
- `useSpeakActions.addToThread` callers split by intent:
  - `MyWishes` (composed-but-not-voiced) → `thread.compose` event.
  - `ListenPanel` (provider STT — already spoken aloud, transcribed for
    the visible thread) → `thread.transcribed` event.
- `App.tsx` thread renderer switches from
  `useConversationStore((s) => s.messagesByPatientId[id])` to
  `useThreadView(activePatientId)`.

Phase 1 emits only `kind: "log"` records. The schema's span fields stay
optional and unused. The app is in development with no shipped users;
the `ov-conversation` IDB store is simply removed at deploy and any
local thread data on dev iPads goes with it.

### Phase 2 — Durable workflow runtime (~400 LOC)

- `src/audit/workflow.ts` — `ov.workflow(...)` and `StepCtx.step(...)`
  implementation. Reads/writes both object stores atomically.
- `src/audit/recovery.ts` — `sweepAbandonedWorkflows()` and
  `resumeWorkflow(id)`.
- Wire recovery sweep into `src/main-app.tsx` after settings hydrate.
- Retrofit four candidate flows:
  - `voice_enrollment` — `recoveryMode: "prompt"`. Steps:
    `record_to_blob` → `extract_embedding` → `persist_speaker_data`.
  - `audio_cache_pregen` — `recoveryMode: "auto"`. One step per phrase per
    voice; underlying cache write is already idempotent.
  - `model_priming` — `recoveryMode: "auto"`. One step per manifest entry;
    wraps the existing `primeOffline` generator.
  - `patient_remove` — `recoveryMode: "auto"`. Steps for each store the
    cascade touches (settings, audio cache, audit, OPFS). The conversation
    cascade collapses into the audit cascade since the thread is now
    derived from audit events.
- Resume prompt UI in `src/components/settings/` for the `prompt` mode
  workflows.

Phase 2 starts emitting `kind: "span"` records and populating the
`workflows` store. No DB schema migration — the fields were defined at v1.

### Phase 3 — Three views + redaction + polish (~500 LOC)

- Promote the viewer to a visible Settings link "Activity log".
- Role toggle (Healthcare worker / Researcher / Developer) with per-role
  filter and column defaults.
- Patient picker (defaults to active patient for healthcare role).
- Date-range picker.
- Export: OTLP/JSON canonical + NDJSON convenience + Print/PDF for
  healthcare role.
- PHI redaction at export (default on); raw export requires PIN re-prompt.
- Discharge-purge wrapper around `clearForPatient` in Settings.
- Audit-of-audit emission on export.

## Architecture

### Storage layout

```
ov-audit  (IndexedDB database, version 1)
├── events       (append-only)
│   keyPath: "id"  (ULID, time-sortable)
│
└── workflows    (mutable in-flight state — Phase 2 only)
    keyPath: "workflow_id"
```

Same database for IndexedDB cross-store transactional atomicity. Two
stores for lifecycle separation (append-only vs mutable) and clean export
boundary.

**Hoisted index columns.** The on-disk record carries `attributes` as a
nested object, but the hot lookup keys are also denormalised to the
record root so IndexedDB indexes can address them directly. `audit.log`
performs the hoisting on write; the canonical values still live in
`attributes` for OTLP export round-tripping.

Hoisted root fields on `events`:

- `id` (ULID, primary key)
- `time` (number)
- `name` (string)
- `severity_number` (number, optional)
- `patient_id_hash` (string, optional)
- `workflow_id` (string, optional)

Hoisted root fields on `workflows`:

- `workflow_id` (primary key)
- `status`, `started_at`, `patient_id_hash`

IndexedDB indexes:

| Store | Index name | keyPath | Purpose |
|---|---|---|---|
| events | `by_time` | `time` | Researcher full-range scans |
| events | `by_patient_time` | `["patient_id_hash", "time"]` | Healthcare-worker patient filter |
| events | `by_severity_time` | `["severity_number", "time"]` | Developer errors-only filter |
| events | `by_workflow_id` | `workflow_id` | Steps under their workflow span |
| events | `by_name_time` | `["name", "time"]` | Typed event filter (e.g. `speak.tap`) |
| workflows | `by_status_started` | `["status", "started_at"]` | Boot recovery sweep |
| workflows | `by_patient_id_hash` | `patient_id_hash` | Per-patient cascade |

### Record schema

```ts
// src/audit/types.ts

export interface AuditRecord {
  id: string;                          // ULID
  kind: "log" | "span";
  time: number;                        // ms epoch
  observed_time: number;
  name: string;                        // dot-namespaced event name
  body?: string;

  // Log fields (kind === "log")
  severity_number?: number;            // OTLP 1-24
  severity_text?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

  // Span fields (kind === "span"; Phase 2 populates)
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  span_name?: string;
  span_start_time?: number;
  span_end_time?: number;
  span_status_code?: "OK" | "ERROR" | "UNSET";

  attributes: Record<string, AttrValue>;
}

export type AttrValue = string | number | boolean | null;

export interface WorkflowState {
  workflow_id: string;                 // also serves as trace_id
  name: WorkflowName;
  status: "running" | "completed" | "failed" | "abandoned";
  started_at: number;
  ended_at?: number;
  patient_id_hash?: string;
  attempt: number;
  step_history: StepRecord[];          // inline; ≤50 per workflow
}

export interface StepRecord {
  step_name: string;
  span_id: string;
  attempt: number;
  status: "completed" | "failed";
  result?: string;                     // superjson-serialized
  error?: { type: string; message: string };
  started_at: number;
  ended_at: number;
}

export type WorkflowName =
  | "voice_enrollment"
  | "audio_cache_pregen"
  | "model_priming"
  | "patient_remove";
```

### Closed attribute namespace

```ts
// src/audit/attrs.ts

export const ATTR = {
  APP_VERSION:         "ownvoice.app.version",
  SESSION_ID:          "ownvoice.session_id",

  PATIENT_ID_HASH:     "ownvoice.patient.id_hash",
  PATIENT_LANG:        "ownvoice.patient.lang",
  CAREGIVER_LANG:      "ownvoice.caregiver.lang",

  ACTOR:               "ownvoice.actor",       // "patient" | "provider" | "system"
  PROVIDER_NAME:       "ownvoice.provider.name",

  SPEECH_TEXT:         "ownvoice.speech.text",   // PHI
  SPEECH_GLOSS:        "ownvoice.speech.gloss",  // PHI
  SPEECH_ICON:         "ownvoice.speech.icon",   // decorative emoji from phrase button
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
  ERROR_STACK:         "ownvoice.error.stack",   // first 5 frames

  MODEL_NAME:          "ownvoice.model.name",
  MODEL_SIZE_BYTES:    "ownvoice.model.size_bytes",
  MODEL_VERSION:       "ownvoice.model.version",
} as const;

export const PHI_ATTR_KEYS: ReadonlySet<string> = new Set([
  ATTR.SPEECH_TEXT,
  ATTR.SPEECH_GLOSS,
]);
```

Reviewer rule: any new attribute requires a key declared in this file. PRs
adding ad-hoc string keys at call sites should be rejected on review.

### Closed event-name registry

Same closure discipline as `ATTR`: every event name lands here or the PR
fails review. Keeping the set closed is what lets the viewer's filters
and the dev-mode autocomplete stay coherent as the codebase grows.

```ts
// src/audit/events.ts

export const EVENT = {
  // Speech & thread (Phase 1)
  SPEAK_TAP:               "speak.tap",
  SPEAK_CACHE_HIT:         "speak.cache.hit",
  SPEAK_CACHE_MISS:        "speak.cache.miss",
  SPEAK_FALLBACK_WEB:      "speak.fallback.web_speech",
  SPEAK_FALLBACK_TONE:     "speak.fallback.tone",
  SPEAK_ERROR:             "speak.error",
  THREAD_COMPOSE:          "thread.compose",
  THREAD_TRANSCRIBED:      "thread.transcribed",

  // Model lifecycle (Phase 1)
  MODEL_BOOT_START:        "model.boot.start",
  MODEL_BOOT_COMPLETE:     "model.boot.complete",
  MODEL_VERIFY_SUCCESS:    "model.verify.success",
  MODEL_VERIFY_FAILURE:    "model.verify.failure",
  MODEL_DOWNLOAD_START:    "model.download.start",
  MODEL_DOWNLOAD_COMPLETE: "model.download.complete",
  MODEL_DOWNLOAD_RESUME:   "model.download.resume",

  // Settings (Phase 1)
  SETTINGS_PATIENT_ADD:      "settings.patient.add",
  SETTINGS_PATIENT_REMOVE:   "settings.patient.remove",
  SETTINGS_PATIENT_ACTIVATE: "settings.patient.activate",
  SETTINGS_LANG_CHANGE:      "settings.lang.change",
  SETTINGS_PROVIDER_ADD:     "settings.provider.add",

  // Audit infrastructure (Phase 1)
  AUDIT_EXPORT:            "audit.export",
  AUDIT_RETENTION_SWEEP:   "audit.retention.sweep",
  AUDIT_BUFFER_OVERFLOW:   "audit.buffer_overflow",
  AUDIT_DEGRADED:          "audit.degraded",

  // Workflow lifecycle (Phase 2)
  WORKFLOW_START:          "workflow.start",
  WORKFLOW_COMPLETE:       "workflow.complete",
  WORKFLOW_FAILED:         "workflow.failed",
  WORKFLOW_ABANDONED:      "workflow.abandoned",
  WORKFLOW_RESUMED:        "workflow.resumed",
  STEP_START:              "step.start",
  STEP_COMPLETE:           "step.complete",
  STEP_FAILED:             "step.failed",
  STEP_REPLAY_HIT:         "step.replay.hit",

  // Errors (any phase)
  ERROR_UNHANDLED:         "error.unhandled",
  ERROR_REJECTION:         "error.unhandled_rejection",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];
```

### Logger API and write semantics

```ts
// src/audit/logger.ts

export interface AuditEvent {
  name: EventName;
  severity?: AuditRecord["severity_text"];   // default "INFO"
  body?: string;
  attributes?: Record<string, AttrValue>;
}

/** Fire-and-forget. Returns void; never throws past the caller. */
export function log(event: AuditEvent): void;

/** Subscribe to live emissions. Fires synchronously from log() BEFORE
 *  IDB write completes — readers see optimistic state. Persistence is
 *  best-effort; a tab kill before flush loses the in-flight buffer
 *  (≤500 records) but never the prior commits. */
export function subscribe(listener: (record: AuditRecord) => void): () => void;
```

**Buffering:** writes queue to an in-memory ring buffer (capacity 500).
A flush is scheduled via `requestIdleCallback` (`setTimeout(0)` fallback)
on each `log()` call. Each flush opens one `readwrite` IDB transaction
and `put`s the entire buffer. On overflow the oldest in-buffer records
are dropped and one `EVENT.AUDIT_BUFFER_OVERFLOW` WARN event is emitted
with the dropped count.

**Error policy:** any IDB failure during flush is caught; records stay in
the buffer for the next attempt; `console.warn` fires rate-limited to
once per minute. After 10 consecutive failed flushes the logger enters
degraded mode (`log()` becomes a no-op, one `EVENT.AUDIT_DEGRADED`
record fires via `console.error` only, the viewer surfaces a
"logging unavailable" banner). The app continues; the patient still
gets feedback.

**Synchronous patient-id hashing:** `crypto.subtle.digest` is async,
which would force `log()` async too. To preserve the synchronous
contract, the SHA-256 hash is precomputed once when a patient becomes
active (in `settingsStore.setActivePatient`) and stashed on an
in-memory session object. `log()` reads it synchronously. Re-hashed
only on patient switch.

### Severity ladder

| Text | OTLP number | When |
|---|---|---|
| DEBUG | 5 | Verbose lifecycle / cache stats; off by default in viewer |
| INFO | 9 | Tap events, settings changes, successful workflow completions |
| WARN | 13 | Fallback chain triggered; recoverable degradation |
| ERROR | 17 | Caught exceptions, integrity failures, TTS failures |
| FATAL | 21 | Unrecoverable: model load fail, IDB write fail, OPFS quota exceeded |

### Resource (per export)

Constructed at export time, attached to the OTLP envelope; never stored
per-record:

- `service.name = "ownvoice"`
- `service.version` from `package.json` + git SHA
- `service.instance.id` from a once-generated value persisted in settings
- `ownvoice.export.exported_at` / `range_start` / `range_end` /
  `redaction` / `row_count` / `schema_version`

### Workflow runtime API (Phase 2)

```ts
// src/audit/workflow.ts

export interface StepCtx {
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  readonly workflowId: string;
}

export interface WorkflowOpts {
  patientIdHash?: string;
  recoveryMode?: "auto" | "prompt" | "manual";
}

export const ov = {
  workflow<T>(
    name: WorkflowName,
    runner: (ctx: StepCtx) => Promise<T>,
    opts?: WorkflowOpts,
  ): Promise<T>,
};

export async function sweepAbandonedWorkflows(): Promise<AbandonedWorkflow[]>;
export async function resumeWorkflow(workflowId: string): Promise<void>;

/** Application code registers each workflow's runner at boot so
 *  resumeWorkflow can find it by name after a tab kill. */
export function registerWorkflow<T>(
  name: WorkflowName,
  runner: (ctx: StepCtx) => Promise<T>,
): void;
```

**Runner registration.** Workflow runners are application functions; they
cannot be serialised to IDB. The runtime maintains an in-memory registry
populated at boot in `src/main-app.tsx`, after settings hydrate and
before the recovery sweep:

```ts
registerWorkflow("voice_enrollment", enrollVoice);
registerWorkflow("audio_cache_pregen", pregenAudio);
registerWorkflow("model_priming", primeModels);
registerWorkflow("patient_remove", removePatient);

await sweepAbandonedWorkflows();
```

`resumeWorkflow(id)` reads the stored `WorkflowState.name`, looks up the
registered runner, and re-invokes it through the standard
`ov.workflow(...)` machinery. Replay does the rest — completed steps
return memoised results from `step_history`; the runner picks up where
it left off. Registering a workflow whose name doesn't match any
in-flight workflow is harmless; failing to register one whose name does
match leaves recovery a no-op (logged WARN, abandoned status preserved).

### Replay semantics

Inside `ctx.step(name, fn)`:

1. Look up `WorkflowState.step_history` for an entry with this
   `step_name` and current `attempt`.
2. If found with `status === "completed"`: return memoised `result`.
   `fn` does not run.
3. If found with `status === "failed"`: rethrow the recorded error.
4. Else: run `fn()`. On success, append `StepRecord` + Span to the
   journal in one IDB transaction. On throw, append failed
   `StepRecord` + Span (status ERROR), rethrow.

Determinism contract: branches inside the runner must depend only on
step return values, not on `Date.now()`, `Math.random()`, or live DOM
state. Capture non-deterministic values in steps so they're memoised.

### Cross-store atomicity invariant

Every state transition writes to both stores in one IDB transaction:

| Transition | events | workflows |
|---|---|---|
| Workflow start | Span-start record | put new row, status=running |
| Step complete | Span-end (OK) | put row with new step_history entry |
| Step fail | Span-end (ERROR) | put row, status=failed |
| Workflow complete | Span-end (OK) | put row, status=completed |
| Workflow fail | Span-end (ERROR) | put row, status=failed |
| Sweep marks abandoned | Span-end (ERROR, attr error.type=abandoned) | put row, status=abandoned |

A tab kill mid-transaction rolls back both stores. A tab kill between
transactions is detected by the boot-time recovery sweep.

### Boot sequence and failure tolerance

Ordered initialisation in `src/main-app.tsx` after settings hydrate:

1. **Open `ov-audit` IDB.** On failure (quota exceeded, denied, corrupt
   schema), enter degraded mode: `audit.log` becomes a no-op, the
   viewer shows a "logging unavailable" banner. **App boots.**
2. **Precompute active patient hash** if there is an active patient.
   On failure (no `crypto.subtle` — vanishingly unlikely on iPad
   Safari), `patient_id_hash` is undefined and per-patient queries
   return empty. **App boots.**
3. **Retention sweep** (Phase 1+). Failure logs WARN and continues.
   **App boots.**
4. **Register workflows** (Phase 2+). Synchronous, cannot fail.
5. **Recovery sweep** (Phase 2+). Failure logs WARN and continues;
   abandoned workflows surface as warnings in the viewer rather than
   blocking. Runners with `recoveryMode: "prompt"` queue a UI prompt;
   `"auto"` runners are kicked off immediately; `"manual"` ones are
   surfaced only in the dev viewer. **App boots.**
6. **App render.**

Invariant: nothing in this sequence is allowed to refuse boot. The
"patient must always get feedback" promise from `speak.ts` extends
upstream to "the app must always become interactive." Audit
unavailability is a degraded mode, not a fatal error.

### Per-workflow recovery defaults

```ts
const DEFAULT_RECOVERY: Record<WorkflowName, "auto" | "prompt" | "manual"> = {
  voice_enrollment:    "prompt",
  audio_cache_pregen:  "auto",
  model_priming:       "auto",
  patient_remove:      "auto",
};
```

## Privacy and retention

- Spoken text is stored on-device in `ATTR.SPEECH_TEXT`. The CLAUDE.md
  promise applies to network egress, not on-device storage; the audit log
  is on-device.
- 30-day retention; eviction at boot + hourly idle tick using
  `IDBKeyRange.upperBound(<ULID for 30 days ago>)`.
- 50 MB hard cap on `ov-audit` storage size; on hit, drop oldest 10% by
  ULID prefix. Belt-and-suspenders against runaway error storms.
- Per-patient cascade: `clearForPatient(id)` derives
  `patient_id_hash = sha256(id).slice(0, 16)` (16 hex chars) and sweeps
  matching rows in both stores under one IDB transaction. The hash is
  computed once at audit-write time and indexed in `events.by_patient_time`
  and `workflows.by_patient_id_hash`. Raw patient UUIDs never enter the
  audit store.
- `resetAll()` adds `indexedDB.deleteDatabase("ov-audit")`.
- Export redacts `PHI_ATTR_KEYS` to `[REDACTED]` by default. Unredacted
  export requires PIN re-prompt with explicit warning copy. Developer role
  exports unredacted without re-prompt (Settings access already implies
  IDB access via DevTools).
- Every export writes its own `audit.export` event with `row_count`,
  `redaction`, `format`, `range_start`, `range_end`. Tamper-evident
  insofar as deleting an export still leaves the on-device record.

## Viewer

Single screen at Settings → Activity log (Phase 1: hidden as
"Diagnostics" behind 5-tap on version string; Phase 3: visible). Inherits
the existing Settings PIN.

```
┌─ Activity log ───────────────────────────────────────────────┐
│  [Healthcare worker | Researcher | Developer]   [Export ▼]   │
│  Patient: [All ▼]   Date: [Today ▼]   Severity: [≥INFO ▼]    │
│  Search: [____________________________]                      │
├──────────────────────────────────────────────────────────────┤
│  Time     │ Actor   │ Event              │ Detail            │
│  09:14:02 │ Maria   │ speak.tap          │ "I'm in pain"     │
│  09:14:02 │ system  │ speak.cache.hit    │ engine=cache      │
│  09:14:18 │ Dr. Lee │ speak.tap          │ "Squeeze my hand" │
└──────────────────────────────────────────────────────────────┘
```

Per-role defaults:

| Role | Default filters | Columns | Export |
|---|---|---|---|
| Healthcare | `name LIKE "speak.%"`, severity ≥ INFO, today | Time, Actor, Spoken text, Engine | Print / PDF |
| Researcher | (all), last 7 days | Time, Actor, Event, Attributes, Workflow | OTLP/JSON redacted (default), unredacted (PIN) |
| Developer | severity ≥ WARN, retention window | Time, Severity, Event, Stack, Workflow status | OTLP/JSON unredacted |

Patient filtering: defaults to active patient for healthcare; All for
others. Sourced from `cfg.patients`.

Out of scope for the viewer: live tail / streaming, cross-device
aggregation, attribute-deep search (Phase 1: search over `name` only).

## Export

OTLP/JSON envelope (canonical), NDJSON convenience (researcher option),
Print/PDF (healthcare role). Generated via
`@opentelemetry/otlp-transformer`. Filename:
`ownvoice-audit-<deviceInstanceId>-<rangeStart>-<rangeEnd>.json`.

Mechanics: `navigator.share({ files })` primary (iPadOS share sheet →
AirDrop / Files / Mail / Messages); anchor-download fallback (lands in
Files → On My iPad). No native iOS code.

WYSIWYG: export honours the on-screen viewer's filters. Researcher's
"All time" is bounded by 30-day retention.

CSV deliberately not offered — flattening OTel attributes into columns
loses structure. NDJSON is the right tabular-ish answer.

## Testing notes

- Tap-path latency: micro-benchmark in `src/speak.ts` test that
  `audit.log` adds <1 ms p50 / <5 ms p99 to the cache-hit path.
- Replay: integration test for each candidate workflow that simulates a
  tab kill after step N and verifies resume completes the remaining steps
  exactly once. Use a fake IDB and synthetic crash points.
- Determinism: a workflow whose runner branches on `Math.random()`
  detected by a deterministic-replay assertion in dev builds.
- Cross-store atomicity: test that a forced IDB tx abort mid-step leaves
  neither store updated.
- Retention sweep: test that ULID-prefix bounds correctly evict
  >30-day records and respect the 50 MB cap.
- PHI redaction: test that `PHI_ATTR_KEYS` values are replaced with
  `[REDACTED]` at export and that no other attributes are touched.
- Reset / cascade: test that `clearForPatient` and `resetAll` correctly
  drop audit records for the right scope.

## Open questions / future work

- Encrypted exports (key management story; out of scope for v1).
- Cross-tab leadership election if multi-tab use ever becomes real.
- Per-step retry policy (Phase 2 fails the whole workflow on first
  step failure; retry-with-backoff is a plausible Phase 2.1).
- Researcher-mode separate PIN distinct from Settings PIN, for
  deployments where the bedside clinician must not be able to view raw
  spoken text.
- Span events nested *within* a step (OTel allows timestamped events
  inside a span; we don't surface this until a use case appears).
- **SQL-in-browser (sqlite-wasm) re-evaluation.** IndexedDB covers Phase
  1–2 query patterns. Re-evaluate when Phase 3+ researcher view wants
  full-text search over `speech.text`, multi-dimensional aggregation
  (per-patient × per-day × per-engine), or an ad-hoc SQL console. The
  OTLP-shaped schema migrates mechanically. Use sqlite-wasm-official,
  not libSQL — same capability, no single-vendor dependency, ~1–2 MB
  bundle cost paid only when the feature lands. Turso Cloud sync is
  expressly out of scope for the consumer app (conflicts with the
  on-device privacy promise); a future research-deployment build that
  needs sync should use OTLP/HTTP to a controlled endpoint, not a
  third-party database service.
- **Vector search / semantic retrieval.** Separate roadmap thread. The
  audit log is forward-compatible: per-event embeddings can be added as
  a `speech.embedding` attribute (base64 float32) or as a sibling
  `events_embeddings` object store keyed by event ULID. The expensive
  piece is the sentence-encoder model (~120 MB multilingual MiniLM
  variant on the existing WebGPU/ONNX infra), not the search engine —
  brute-force cosine over ≤10K vectors in JS is sub-10 ms. Most
  compelling first features to spec independently when this earns
  priority: semantic phrase finder in SentenceBuilder (patient-facing
  daily-driver) and end-of-shift clinical communication summary
  (healthcare-facing). Vector ops don't change the storage choice;
  libSQL specifically would only earn its bundle weight if vector ops
  needed to combine with SQL aggregation in a single query, which is a
  Phase 4+ analyst concern at earliest.
