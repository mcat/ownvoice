# Audit Log Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 1 audit log foundation: an OTLP-shaped IndexedDB event store, a synchronous fire-and-forget logger, retention + cascade, and a virtualised dev viewer. Subsume `ov-conversation` so the conversation thread is derived from audit events.

**Architecture:** New IDB database `ov-audit` with two object stores (`events` append-only, `workflows` defined but unused until Phase 2). Logger has a 500-record ring buffer flushed on `requestIdleCallback`, snapshots `patient_id_hash` by value at log time, and exposes a synchronous pub-sub for live readers. The conversation thread becomes a derived view via `useThreadView(patientId)` hook. ULID primary keys; closed `EVENT` and `ATTR` namespaces; `@opentelemetry/otlp-transformer` for export envelope.

**Tech Stack:** TypeScript + Preact + Vite + Vitest. New runtime deps: `@opentelemetry/api`, `@opentelemetry/api-logs`, `@opentelemetry/otlp-transformer`, `superjson`, `@tanstack/virtual`. Existing dev: `fake-indexeddb`, `jsdom`, `@testing-library/preact`.

**Spec:** `docs/superpowers/specs/2026-05-07-audit-log-design.md`

**Reference rules from CLAUDE.md:**
- Touch-target / accessibility rules apply to the viewer (this is dev-only Phase 1, but observe).
- After SW changes, bump `CACHE_NAME` in `public/sw.js`.
- After model files change: `npm run manifest:regen`. Not relevant this phase.
- Inline style tokens from the `theme` module.

**File layout (new):**

| File | Responsibility |
|---|---|
| `src/audit/types.ts` | `AuditRecord`, `WorkflowState`, `StepRecord`, `AttrValue` shapes |
| `src/audit/attrs.ts` | `ATTR` namespace constants + `PHI_ATTR_KEYS` set |
| `src/audit/events.ts` | `EVENT` registry constants + `EventName` type |
| `src/audit/ulid.ts` | Dependency-free ULID generator |
| `src/audit/hash.ts` | SHA-256 patient-id-hash util (async) |
| `src/audit/db.ts` | IDB open / `onupgradeneeded` schema setup |
| `src/audit/session.ts` | In-memory session state (active-patient hash snapshot, session id) |
| `src/audit/storageMeter.ts` | Running byte counter; persisted in settings; cap eviction |
| `src/audit/logger.ts` | Public `log(event)` writer + ring buffer + pub-sub |
| `src/audit/redaction.ts` | PHI redactor for export |
| `src/audit/otlp.ts` | OTLP/JSON envelope builder |
| `src/audit/retention.ts` | Boot-time + idle-tick sweeps |
| `src/audit/cascade.ts` | `clearForPatient(idHash)` |
| `src/audit/useThreadView.ts` | Preact hook deriving thread from events |
| `src/components/diag/DiagnosticsView.tsx` | Phase 1 hidden viewer |
| `src/components/diag/DiagnosticsTable.tsx` | Virtualised table |
| `src/audit/init.ts` | Boot orchestrator: open DB → hydrate session → kick retention |

**File layout (modified):**

| File | What |
|---|---|
| `src/stores/settingsStore.ts` | Add explicit named setters; emit audit events |
| `src/hooks/useSpeakActions.ts` | Replace `addMessage`/`addToThread` calls with `audit.log(...)` |
| `src/App.tsx` | Swap `useConversationStore` → `useThreadView` |
| `src/speak.ts` | Replace `console.log` with `audit.log` for speak/cache/fallback events |
| `src/models/modelManager.ts` | Audit model lifecycle events |
| `src/models/integrityCheck.ts` | Audit verify success/failure |
| `src/main-app.tsx` | Wire boot sequence, error handlers |
| `src/stores/resetAll.ts` | `indexedDB.deleteDatabase("ov-audit")` |
| `src/stores/resetScoped.ts` | Audit per-patient cascade |
| `public/sw.js` | Bump `CACHE_NAME` |
| `package.json` | Dependencies |

**File layout (removed):**

| File | Why |
|---|---|
| `src/stores/conversationStore.ts` | Subsumed by audit log + `useThreadView` |
| `src/stores/conversationStore.test.ts` | Subsumed |

---

## Task 1: Add dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install OTel + helper libraries**

```bash
npm install @opentelemetry/api@^1.9.0 @opentelemetry/api-logs@^0.57.0 @opentelemetry/otlp-transformer@^0.57.0 superjson@^2.2.2 @tanstack/virtual-core@^3.10.9
```

- [ ] **Step 2: Verify package.json updated**

Run: `grep -E "opentelemetry|superjson|tanstack/virtual-core" package.json`
Expected: five new dependency lines printed.

- [ ] **Step 3: Verify no install errors and lockfile updated**

Run: `npm test -- --run src/stores/settingsStore.test.ts`
Expected: passes (we didn't touch logic, just deps).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(audit): add OTel + virtualisation dependencies"
```

---

## Task 2: ULID generator

**Files:**
- Create: `src/audit/ulid.ts`
- Test: `src/audit/ulid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/ulid.test.ts
import { describe, it, expect } from "vitest";
import { ulid, ulidForTime } from "./ulid";

describe("ulid", () => {
  it("produces 26-character Crockford base32 strings", () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("is monotonically sortable across times", () => {
    const a = ulidForTime(1000);
    const b = ulidForTime(2000);
    expect(a < b).toBe(true);
  });

  it("differs across two same-instant calls", () => {
    const a = ulid();
    const b = ulid();
    expect(a).not.toBe(b);
  });

  it("encodes timestamp recoverably from the first 10 chars", () => {
    const id = ulidForTime(1700000000000);
    const head = id.slice(0, 10);
    expect(head).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/ulid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/ulid.ts
/** Crockford base32 alphabet — excludes I/L/O/U to avoid ambiguity. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(ms: number): string {
  let t = ms;
  let out = "";
  for (let i = 0; i < 10; i++) {
    const mod = t % 32;
    out = ALPHABET[mod] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 16; i++) {
    // 16 base32 chars from 80 bits
    const byteIdx = (i * 5) >> 3;
    const bitOffset = (i * 5) & 7;
    const high = bytes[byteIdx] ?? 0;
    const low = bytes[byteIdx + 1] ?? 0;
    const combined = ((high << 8) | low) >> (11 - bitOffset);
    out += ALPHABET[combined & 31];
  }
  return out;
}

/** Generate a ULID for the current time. */
export function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/** Generate a ULID for a specific epoch-ms timestamp.
 *  Use for retention range bounds: any record whose id is < ulidForTime(cutoff)
 *  was emitted before cutoff. */
export function ulidForTime(epochMs: number): string {
  return encodeTime(epochMs) + encodeRandom();
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/ulid.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/ulid.ts src/audit/ulid.test.ts
git commit -m "feat(audit): add ULID generator"
```

---

## Task 3: Patient-id hash util

**Files:**
- Create: `src/audit/hash.ts`
- Test: `src/audit/hash.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/hash.test.ts
import { describe, it, expect } from "vitest";
import { patientIdHash } from "./hash";

describe("patientIdHash", () => {
  it("produces 16 lowercase hex characters", async () => {
    const h = await patientIdHash("patient-uuid-1234");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic across calls", async () => {
    const a = await patientIdHash("same-id");
    const b = await patientIdHash("same-id");
    expect(a).toBe(b);
  });

  it("differs across distinct ids", async () => {
    const a = await patientIdHash("id-a");
    const b = await patientIdHash("id-b");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/hash.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/hash.ts
/** SHA-256 hash of the patient id, truncated to 16 hex chars (64 bits).
 *  Stable across sessions; raw uuid never enters the audit log. */
export async function patientIdHash(patientId: string): Promise<string> {
  const enc = new TextEncoder().encode(patientId);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += arr[i].toString(16).padStart(2, "0");
  }
  return hex;
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/hash.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/hash.ts src/audit/hash.test.ts
git commit -m "feat(audit): add SHA-256 patient-id hash util"
```

---

## Task 4: Closed namespaces — types, ATTR, EVENT

**Files:**
- Create: `src/audit/types.ts`
- Create: `src/audit/attrs.ts`
- Create: `src/audit/events.ts`
- Test: `src/audit/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/registry.test.ts
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
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/registry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement types.ts**

```ts
// src/audit/types.ts
export type AttrValue = string | number | boolean | null;

export type SeverityText = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface AuditRecord {
  id: string;                          // ULID
  kind: "log" | "span";
  time: number;                        // ms epoch
  observed_time: number;
  name: string;
  body?: string;

  // Hoisted indexable columns (denormalised from attributes)
  patient_id_hash?: string;
  workflow_id?: string;
  severity_number?: number;
  severity_text?: SeverityText;

  // Span fields (Phase 2 populates)
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  span_name?: string;
  span_start_time?: number;
  span_end_time?: number;
  span_status_code?: "OK" | "ERROR" | "UNSET";

  attributes: Record<string, AttrValue>;
}

export type WorkflowName =
  | "voice_enrollment"
  | "audio_cache_pregen"
  | "model_priming";

export interface StepRecord {
  step_name: string;
  span_id: string;
  attempt: number;
  status: "completed" | "failed";
  result?: string;                     // superjson-serialised
  error?: { type: string; message: string };
  started_at: number;
  ended_at: number;
}

export interface WorkflowState {
  workflow_id: string;
  name: WorkflowName;
  status: "running" | "completed" | "failed" | "abandoned";
  started_at: number;
  ended_at?: number;
  patient_id_hash?: string;
  attempt: number;
  step_history: StepRecord[];
}
```

- [ ] **Step 4: Implement attrs.ts**

```ts
// src/audit/attrs.ts
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
```

- [ ] **Step 5: Implement events.ts**

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

  // Workflow lifecycle (Phase 2 — declared but unused)
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

- [ ] **Step 6: Verify it passes**

Run: `npx vitest run src/audit/registry.test.ts`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add src/audit/types.ts src/audit/attrs.ts src/audit/events.ts src/audit/registry.test.ts
git commit -m "feat(audit): closed ATTR + EVENT namespaces and core types"
```

---

## Task 5: IDB schema and open

**Files:**
- Create: `src/audit/db.ts`
- Test: `src/audit/db.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/db.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { openAuditDb, AUDIT_DB_NAME, AUDIT_DB_VERSION } from "./db";

describe("openAuditDb", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(AUDIT_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it("creates ov-audit at version 1 with both stores", async () => {
    const db = await openAuditDb();
    expect(db.name).toBe(AUDIT_DB_NAME);
    expect(db.version).toBe(AUDIT_DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(["events", "workflows"]);
    db.close();
  });

  it("creates all events indexes", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("events", "readonly");
    const store = tx.objectStore("events");
    expect([...store.indexNames].sort()).toEqual([
      "by_name_time",
      "by_patient_time",
      "by_severity_time",
      "by_time",
      "by_workflow_id",
    ]);
    db.close();
  });

  it("creates all workflows indexes", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("workflows", "readonly");
    const store = tx.objectStore("workflows");
    expect([...store.indexNames].sort()).toEqual([
      "by_patient_id_hash",
      "by_status_started",
    ]);
    db.close();
  });

  it("inserts and retrieves a record by primary key", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("events", "readwrite");
    tx.objectStore("events").put({
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      kind: "log",
      time: 1000,
      observed_time: 1000,
      name: "test.event",
      attributes: {},
    });
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    const tx2 = db.transaction("events", "readonly");
    const got = await new Promise<unknown>((res, rej) => {
      const r = tx2.objectStore("events").get("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    expect((got as { name: string }).name).toBe("test.event");
    db.close();
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/db.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/db.ts
export const AUDIT_DB_NAME = "ov-audit";
export const AUDIT_DB_VERSION = 1;

/** Open the audit database, creating schema on first run. Single source
 *  of truth for the IDB schema; called from boot and from tests. */
export function openAuditDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIT_DB_NAME, AUDIT_DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("events")) {
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("by_time", "time");
        events.createIndex("by_patient_time", ["patient_id_hash", "time"]);
        events.createIndex("by_severity_time", ["severity_number", "time"]);
        events.createIndex("by_workflow_id", "workflow_id");
        events.createIndex("by_name_time", ["name", "time"]);
      }

      if (!db.objectStoreNames.contains("workflows")) {
        const workflows = db.createObjectStore("workflows", {
          keyPath: "workflow_id",
        });
        workflows.createIndex("by_status_started", ["status", "started_at"]);
        workflows.createIndex("by_patient_id_hash", "patient_id_hash");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("ov-audit open blocked"));
  });
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/db.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/db.ts src/audit/db.test.ts
git commit -m "feat(audit): IDB schema with hoisted-column indexes"
```

---

## Task 6: Storage meter

**Files:**
- Create: `src/audit/storageMeter.ts`
- Test: `src/audit/storageMeter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/storageMeter.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { StorageMeter, AUDIT_BYTES_CAP } from "./storageMeter";

describe("StorageMeter", () => {
  let meter: StorageMeter;
  let saved = 0;
  beforeEach(() => {
    saved = 0;
    meter = new StorageMeter({
      load: () => saved,
      save: (n) => { saved = n; },
    });
  });

  it("starts at the loaded total", () => {
    saved = 1234;
    meter = new StorageMeter({ load: () => 1234, save: () => {} });
    expect(meter.bytes()).toBe(1234);
  });

  it("adds bytes and persists the new total", () => {
    meter.add(500);
    meter.add(250);
    expect(meter.bytes()).toBe(750);
    expect(saved).toBe(750);
  });

  it("subtracts bytes (clamps to zero)", () => {
    meter.add(100);
    meter.subtract(150);
    expect(meter.bytes()).toBe(0);
  });

  it("flags overage when over the cap", () => {
    meter.add(AUDIT_BYTES_CAP + 1);
    expect(meter.isOver()).toBe(true);
  });

  it("computes record byte estimate from JSON length", () => {
    const r = { id: "abc", name: "x" };
    expect(StorageMeter.estimate(r)).toBe(JSON.stringify(r).length);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/storageMeter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/storageMeter.ts

export const AUDIT_BYTES_CAP = 50 * 1024 * 1024; // 50 MB

export interface StorageMeterIO {
  load: () => number;
  save: (bytes: number) => void;
}

export class StorageMeter {
  private current: number;
  constructor(private io: StorageMeterIO) {
    this.current = io.load();
  }
  bytes(): number {
    return this.current;
  }
  add(n: number): void {
    this.current += n;
    this.io.save(this.current);
  }
  subtract(n: number): void {
    this.current = Math.max(0, this.current - n);
    this.io.save(this.current);
  }
  isOver(): boolean {
    return this.current > AUDIT_BYTES_CAP;
  }
  static estimate(record: unknown): number {
    return JSON.stringify(record).length;
  }
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/storageMeter.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/storageMeter.ts src/audit/storageMeter.test.ts
git commit -m "feat(audit): running byte counter with 50 MB cap"
```

---

## Task 7: Session state (active patient hash, session id)

**Files:**
- Create: `src/audit/session.ts`
- Test: `src/audit/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/session.test.ts
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
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/session.ts
import { ulid } from "./ulid";

interface Session {
  sessionId: string;
  patientIdHash: string | undefined;
}

let session: Session = { sessionId: ulid(), patientIdHash: undefined };

export function getSession(): Readonly<Session> {
  return session;
}

export function setActivePatientHash(hash: string | null): void {
  session = { ...session, patientIdHash: hash ?? undefined };
}

/** Test-only — resets the in-memory session. Not exported from a public
 *  index file; tests import directly from this module. */
export function resetSessionForTests(): void {
  session = { sessionId: ulid(), patientIdHash: undefined };
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/session.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/session.ts src/audit/session.test.ts
git commit -m "feat(audit): in-memory session for active-patient hash + session id"
```

---

## Task 8: PHI redaction

**Files:**
- Create: `src/audit/redaction.ts`
- Test: `src/audit/redaction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/redaction.test.ts
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
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/redaction.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/redaction.ts
import { PHI_ATTR_KEYS } from "./attrs";
import type { AuditRecord } from "./types";

export function redactPHI(records: readonly AuditRecord[]): AuditRecord[] {
  return records.map((r) => ({
    ...r,
    attributes: Object.fromEntries(
      Object.entries(r.attributes).map(([k, v]) =>
        PHI_ATTR_KEYS.has(k) ? [k, "[REDACTED]"] : [k, v],
      ),
    ),
  }));
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/redaction.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/redaction.ts src/audit/redaction.test.ts
git commit -m "feat(audit): PHI redaction utility"
```

---

## Task 9: PHI redaction completeness property test

**Files:**
- Test: `src/audit/redaction.complete.test.ts`

This is the acceptance check that any new ATTR key forces a deliberate
redaction policy decision. Without this, a future PR can add an ATTR
holding sensitive data and silently leak it through unredacted exports.

- [ ] **Step 1: Write the test**

```ts
// src/audit/redaction.complete.test.ts
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
```

- [ ] **Step 2: Verify it passes (already)**

Run: `npx vitest run src/audit/redaction.complete.test.ts`
Expected: 2 passed. If a key is added to ATTR without classification, this fails.

- [ ] **Step 3: Commit**

```bash
git add src/audit/redaction.complete.test.ts
git commit -m "test(audit): closed-set redaction-policy completeness check"
```

---

## Task 10: OTLP envelope builder

**Files:**
- Create: `src/audit/otlp.ts`
- Test: `src/audit/otlp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/otlp.test.ts
import { describe, it, expect } from "vitest";
import { buildOtlpEnvelope } from "./otlp";
import type { AuditRecord } from "./types";

describe("buildOtlpEnvelope", () => {
  it("produces an object with resourceLogs and resource attributes", () => {
    const records: AuditRecord[] = [
      {
        id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        kind: "log",
        time: 1700000000000,
        observed_time: 1700000000000,
        name: "speak.tap",
        severity_number: 9,
        severity_text: "INFO",
        attributes: { "ownvoice.actor": "patient" },
      },
    ];
    const env = buildOtlpEnvelope(records, {
      serviceVersion: "0.1.0",
      deviceInstanceId: "dev-123",
      rangeStart: 0,
      rangeEnd: 2000000000000,
      redaction: "redacted",
    });

    expect(env.resourceLogs).toHaveLength(1);
    const rl = env.resourceLogs[0];
    expect(rl.resource.attributes.find((a) => a.key === "service.name")?.value.stringValue).toBe("ownvoice");
    expect(rl.resource.attributes.find((a) => a.key === "ownvoice.export.row_count")?.value.intValue).toBe(1);
    expect(rl.scopeLogs[0].logRecords).toHaveLength(1);
    expect(rl.scopeLogs[0].logRecords[0].attributes[0].key).toBe("ownvoice.actor");
  });

  it("converts ms epoch to nanos in time fields", () => {
    const records: AuditRecord[] = [
      { id: "01", kind: "log", time: 1, observed_time: 1, name: "x", attributes: {} },
    ];
    const env = buildOtlpEnvelope(records, {
      serviceVersion: "0", deviceInstanceId: "d", rangeStart: 0, rangeEnd: 0, redaction: "raw",
    });
    expect(env.resourceLogs[0].scopeLogs[0].logRecords[0].timeUnixNano).toBe("1000000");
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/otlp.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/otlp.ts
import type { AuditRecord, AttrValue } from "./types";

export interface EnvelopeOpts {
  serviceVersion: string;
  deviceInstanceId: string;
  rangeStart: number;
  rangeEnd: number;
  redaction: "redacted" | "raw";
}

interface OtlpAttr {
  key: string;
  value: { stringValue?: string; intValue?: number; boolValue?: boolean; doubleValue?: number };
}

function attr(key: string, value: AttrValue): OtlpAttr {
  if (typeof value === "string") return { key, value: { stringValue: value } };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { key, value: { intValue: value } }
      : { key, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  return { key, value: { stringValue: "" } };
}

export function buildOtlpEnvelope(records: AuditRecord[], opts: EnvelopeOpts) {
  const resourceAttrs: OtlpAttr[] = [
    attr("service.name", "ownvoice"),
    attr("service.version", opts.serviceVersion),
    attr("service.instance.id", opts.deviceInstanceId),
    attr("ownvoice.export.exported_at", Date.now()),
    attr("ownvoice.export.range_start", opts.rangeStart),
    attr("ownvoice.export.range_end", opts.rangeEnd),
    attr("ownvoice.export.redaction", opts.redaction),
    attr("ownvoice.export.row_count", records.length),
    attr("ownvoice.export.schema_version", 1),
  ];

  return {
    resourceLogs: [
      {
        resource: { attributes: resourceAttrs },
        scopeLogs: [
          {
            scope: { name: "ownvoice-audit", version: "1" },
            logRecords: records.map((r) => ({
              timeUnixNano: String(r.time * 1_000_000),
              observedTimeUnixNano: String(r.observed_time * 1_000_000),
              severityNumber: r.severity_number ?? 9,
              severityText: r.severity_text ?? "INFO",
              body: { stringValue: r.body ?? r.name },
              attributes: Object.entries(r.attributes).map(([k, v]) => attr(k, v)),
            })),
          },
        ],
      },
    ],
  };
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/otlp.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/otlp.ts src/audit/otlp.test.ts
git commit -m "feat(audit): OTLP/JSON envelope builder"
```

---

## Task 11: Logger core (buffer, flush, pub-sub, error policy)

**Files:**
- Create: `src/audit/logger.ts`
- Test: `src/audit/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/logger.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { initLogger, log, subscribe, flushNow, _resetForTests } from "./logger";
import { setActivePatientHash, resetSessionForTests } from "./session";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { openAuditDb, AUDIT_DB_NAME } from "./db";

async function clearAuditDb() {
  await new Promise<void>((res) => {
    const req = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    req.onsuccess = () => res();
    req.onerror = () => res();
    req.onblocked = () => res();
  });
}

describe("logger", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearAuditDb();
    const db = await openAuditDb();
    initLogger(db);
  });

  it("notifies subscribers synchronously before flush", () => {
    const seen: string[] = [];
    subscribe((r) => seen.push(r.name));
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.ACTOR]: "patient" } });
    expect(seen).toEqual([EVENT.SPEAK_TAP]);
  });

  it("snapshots patient_id_hash by value at log() time", async () => {
    setActivePatientHash("hash-AAA");
    log({ name: EVENT.SPEAK_TAP });
    setActivePatientHash("hash-BBB");
    log({ name: EVENT.SPEAK_TAP });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const tx = db.transaction("events", "readonly");
      const req = tx.objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    const hashes = records.map((r) => r.patient_id_hash).sort();
    expect(hashes).toEqual(["hash-AAA", "hash-BBB"]);
  });

  it("defaults severity to INFO when omitted", async () => {
    log({ name: EVENT.SPEAK_TAP });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const req = db.transaction("events", "readonly").objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    expect(records[0].severity_number).toBe(9);
    expect(records[0].severity_text).toBe("INFO");
  });

  it("hoists patient_id_hash + workflow_id from attributes onto record root", async () => {
    setActivePatientHash("hash-CCC");
    log({
      name: EVENT.SPEAK_TAP,
      attributes: { [ATTR.WORKFLOW_ID]: "wf-1" },
    });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const req = db.transaction("events", "readonly").objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    expect(records[0].patient_id_hash).toBe("hash-CCC");
    expect(records[0].workflow_id).toBe("wf-1");
  });

  it("never throws past the caller on IDB errors", () => {
    const badDb = {
      transaction: () => { throw new Error("boom"); },
    } as unknown as IDBDatabase;
    initLogger(badDb);
    expect(() => log({ name: EVENT.SPEAK_TAP })).not.toThrow();
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/logger.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/logger.ts
import type { AuditRecord, AttrValue, SeverityText } from "./types";
import type { EventName } from "./events";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { ulid } from "./ulid";
import { getSession } from "./session";

export interface AuditEvent {
  name: EventName;
  severity?: SeverityText;
  body?: string;
  attributes?: Record<string, AttrValue>;
}

const SEVERITY_NUMBERS: Record<SeverityText, number> = {
  DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17, FATAL: 21,
};

const BUFFER_CAP = 500;
const FAILURE_LIMIT = 10;

let db: IDBDatabase | null = null;
let buffer: AuditRecord[] = [];
let scheduled = false;
let consecutiveFailures = 0;
let degraded = false;
let lastWarnAt = 0;
const subscribers = new Set<(r: AuditRecord) => void>();

export function initLogger(database: IDBDatabase): void {
  db = database;
  buffer = [];
  scheduled = false;
  consecutiveFailures = 0;
  degraded = false;
}

export function subscribe(listener: (record: AuditRecord) => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function log(event: AuditEvent): void {
  if (degraded || !db) return;
  try {
    const sev = event.severity ?? "INFO";
    const session = getSession();
    const now = Date.now();
    const attrs = { ...(event.attributes ?? {}) };
    if (session.patientIdHash !== undefined && attrs[ATTR.PATIENT_ID_HASH] === undefined) {
      attrs[ATTR.PATIENT_ID_HASH] = session.patientIdHash;
    }
    if (attrs[ATTR.SESSION_ID] === undefined) {
      attrs[ATTR.SESSION_ID] = session.sessionId;
    }

    const record: AuditRecord = {
      id: ulid(),
      kind: "log",
      time: now,
      observed_time: now,
      name: event.name,
      body: event.body,
      severity_number: SEVERITY_NUMBERS[sev],
      severity_text: sev,
      patient_id_hash: session.patientIdHash,
      workflow_id: typeof attrs[ATTR.WORKFLOW_ID] === "string"
        ? (attrs[ATTR.WORKFLOW_ID] as string)
        : undefined,
      attributes: attrs,
    };

    if (buffer.length >= BUFFER_CAP) {
      const dropped = buffer.shift()!;
      void dropped;
      // Self-emit overflow event (re-entrant; bounded because we just freed a slot)
      buffer.push({
        ...record,
        name: EVENT.AUDIT_BUFFER_OVERFLOW,
        severity_text: "WARN",
        severity_number: SEVERITY_NUMBERS.WARN,
        attributes: { ...attrs, [ATTR.AUDIT_DROPPED_COUNT]: 1 },
      });
    } else {
      buffer.push(record);
    }

    // Notify subscribers synchronously (optimistic)
    for (const sub of subscribers) {
      try { sub(record); } catch { /* don't let subscriber errors break the logger */ }
    }

    schedule();
  } catch (err) {
    console.warn("[audit] log() failed:", err);
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const ric = (globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(() => { void flushNow(); });
  else setTimeout(() => { void flushNow(); }, 0);
}

export async function flushNow(): Promise<void> {
  scheduled = false;
  if (!db || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction("events", "readwrite");
      const store = tx.objectStore("events");
      for (const r of batch) store.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("tx aborted"));
    });
    consecutiveFailures = 0;
  } catch (err) {
    consecutiveFailures += 1;
    buffer = [...batch, ...buffer]; // requeue at the front
    const now = Date.now();
    if (now - lastWarnAt > 60_000) {
      console.warn("[audit] flush failed:", err);
      lastWarnAt = now;
    }
    if (consecutiveFailures >= FAILURE_LIMIT) {
      degraded = true;
      console.error("[audit] entered degraded mode after", consecutiveFailures, "failures");
    }
  }
}

export function isDegraded(): boolean {
  return degraded;
}

export function _resetForTests(): void {
  db = null;
  buffer = [];
  scheduled = false;
  consecutiveFailures = 0;
  degraded = false;
  lastWarnAt = 0;
  subscribers.clear();
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/logger.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/logger.ts src/audit/logger.test.ts
git commit -m "feat(audit): synchronous logger with ring buffer + idle flush"
```

---

## Task 12: Settings store named setters + audit emission

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Test: `src/stores/settingsStore.test.ts` (extend)

- [ ] **Step 1: Read the existing settingsStore**

Run: `head -80 src/stores/settingsStore.ts`
Identify where to add named setters. They should sit alongside whatever `set` calls exist, exposed on the Zustand store interface, and emit audit events as their last action.

- [ ] **Step 2: Add named setters that emit audit events**

Extend the `useSettingsStore` interface and implementation. Add at minimum:

```ts
// Inside the interface, alongside existing fields:
setActivePatient: (id: string | null) => Promise<void>;
addPatient: (patient: Patient) => void;
removePatient: (id: string) => void;
setCaregiverLang: (lang: string) => void;
addProvider: (provider: Provider) => void;
```

Implementation snippets — add to the store factory:

```ts
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import { patientIdHash } from "../audit/hash";
import { setActivePatientHash } from "../audit/session";

// Inside the (set, get) factory:
setActivePatient: async (id) => {
  set((s) => ({ cfg: { ...s.cfg, activePatientId: id } }));
  if (id) {
    const hash = await patientIdHash(id);
    setActivePatientHash(hash);
    log({
      name: EVENT.SETTINGS_PATIENT_ACTIVATE,
      attributes: { [ATTR.PATIENT_ID_HASH]: hash },
    });
  } else {
    setActivePatientHash(null);
  }
},

addPatient: (patient) => {
  set((s) => ({ cfg: { ...s.cfg, patients: [...s.cfg.patients, patient] } }));
  log({
    name: EVENT.SETTINGS_PATIENT_ADD,
    attributes: { [ATTR.PATIENT_LANG]: patient.patientLang },
  });
},

removePatient: (id) => {
  set((s) => ({
    cfg: { ...s.cfg, patients: s.cfg.patients.filter((p) => p.id !== id) },
  }));
  log({ name: EVENT.SETTINGS_PATIENT_REMOVE });
},

setCaregiverLang: (lang) => {
  set((s) => ({ cfg: { ...s.cfg, caregiverLang: lang } }));
  log({
    name: EVENT.SETTINGS_LANG_CHANGE,
    attributes: { [ATTR.CAREGIVER_LANG]: lang },
  });
},

addProvider: (provider) => {
  set((s) => ({
    cfg: { ...s.cfg, providers: [...s.cfg.providers, provider] },
  }));
  log({
    name: EVENT.SETTINGS_PROVIDER_ADD,
    attributes: { [ATTR.PROVIDER_NAME]: provider.name },
  });
},
```

- [ ] **Step 3: Add tests for the new setters**

Append to `src/stores/settingsStore.test.ts`:

```ts
import { vi } from "vitest";
import * as logger from "../audit/logger";

describe("settingsStore named setters", () => {
  beforeEach(() => {
    vi.spyOn(logger, "log").mockImplementation(() => {});
  });

  it("addPatient emits settings.patient.add", () => {
    useSettingsStore.getState().addPatient({
      id: "p1", name: "Maria", bed: "1A", patientLang: "es",
      hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0,
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ name: "settings.patient.add" }),
    );
  });

  it("setCaregiverLang emits settings.lang.change", () => {
    useSettingsStore.getState().setCaregiverLang("es");
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ name: "settings.lang.change" }),
    );
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/stores/settingsStore.test.ts`
Expected: existing tests still pass + new ones pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat(audit): explicit named setters on settingsStore with audit emission"
```

---

## Task 13: Retrofit settings call sites to use named setters

**Files:**
- Modify: `src/components/settings/*.tsx` (call sites that today use inline `set((s) => ...)`)

- [ ] **Step 1: Find current inline mutations**

Run: `grep -rn "useSettingsStore.setState\|set((s)" src/components/settings src/components/patients 2>/dev/null`

- [ ] **Step 2: Replace each inline mutation with the named setter**

For each match, swap:

```ts
// Before
useSettingsStore.setState((s) => ({ cfg: { ...s.cfg, caregiverLang: "es" } }));

// After
useSettingsStore.getState().setCaregiverLang("es");
```

Apply to: language picker, patient add/remove flows, provider add flow, active-patient switching.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: existing tests pass; if any fail because they relied on `setState` shape, update them to use the named setters.

- [ ] **Step 4: Manual smoke test in dev server**

Run: `npm run dev`
Verify: adding a patient, switching active patient, changing caregiver language all still work. Open DevTools and confirm `audit.log` entries appear in IndexedDB → `ov-audit` → `events`.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "refactor(settings): route mutations through named setters"
```

---

## Task 14: Retrofit speak.ts

**Files:**
- Modify: `src/speak.ts`

- [ ] **Step 1: Replace each `console.log` with `audit.log`**

At the top of `src/speak.ts`:

```ts
import { log } from "./audit/logger";
import { EVENT } from "./audit/events";
import { ATTR } from "./audit/attrs";
```

Replace patterns like:

```ts
// Before
console.log("[OwnVoice:TTS] speak() called", { ... });

// After
log({
  name: EVENT.SPEAK_TAP,
  attributes: {
    [ATTR.SPEECH_TEXT]: text,
    [ATTR.ACTOR]: speaker.type,
    [ATTR.SPEECH_LANG]: speaker.lang ?? "",
  },
});
```

For cache hit / miss / fallback / tone:

```ts
log({ name: EVENT.SPEAK_CACHE_HIT, attributes: { [ATTR.SPEECH_ENGINE]: "cache" } });
log({ name: EVENT.SPEAK_CACHE_MISS });
log({ name: EVENT.SPEAK_FALLBACK_WEB, attributes: { [ATTR.SPEECH_ENGINE]: "webspeech" } });
log({ name: EVENT.SPEAK_FALLBACK_TONE, attributes: { [ATTR.SPEECH_ENGINE]: "tone" } });
```

For caught errors inside `speak`:

```ts
log({
  name: EVENT.SPEAK_ERROR,
  severity: "ERROR",
  attributes: {
    [ATTR.ERROR_TYPE]: err instanceof Error ? err.name : "unknown",
    [ATTR.ERROR_MESSAGE]: err instanceof Error ? err.message : String(err),
  },
});
```

Keep `console.log` calls *only* if they carry information that doesn't fit into a closed ATTR (rare); otherwise remove them.

- [ ] **Step 2: Run speak tests**

Run: `npx vitest run src/speak`
Expected: existing tests still pass. If a test asserts on console output, update it to subscribe to the audit logger.

- [ ] **Step 3: Smoke test**

Run: `npm run dev` → tap a patient phrase → verify entries land in `ov-audit.events`.

- [ ] **Step 4: Commit**

```bash
git add src/speak.ts
git commit -m "feat(audit): instrument speak path with audit events"
```

---

## Task 15: Retrofit modelManager.ts and integrityCheck.ts

**Files:**
- Modify: `src/models/modelManager.ts`
- Modify: `src/models/integrityCheck.ts`

- [ ] **Step 1: Add audit calls to model lifecycle**

In `modelManager.ts`, around the existing console logs and lifecycle points:

```ts
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";

// On boot start:
log({ name: EVENT.MODEL_BOOT_START });

// Per file download start:
log({
  name: EVENT.MODEL_DOWNLOAD_START,
  attributes: {
    [ATTR.MODEL_NAME]: file.name,
    [ATTR.MODEL_SIZE_BYTES]: file.size,
  },
});

// On download complete:
log({
  name: EVENT.MODEL_DOWNLOAD_COMPLETE,
  attributes: { [ATTR.MODEL_NAME]: file.name },
});

// On resumed download:
log({
  name: EVENT.MODEL_DOWNLOAD_RESUME,
  attributes: { [ATTR.MODEL_NAME]: file.name },
});

// On boot complete:
log({ name: EVENT.MODEL_BOOT_COMPLETE });
```

In `integrityCheck.ts`:

```ts
log({
  name: EVENT.MODEL_VERIFY_SUCCESS,
  attributes: { [ATTR.MODEL_NAME]: file.name },
});

// On failure:
log({
  name: EVENT.MODEL_VERIFY_FAILURE,
  severity: "ERROR",
  attributes: {
    [ATTR.MODEL_NAME]: file.name,
    [ATTR.ERROR_MESSAGE]: reason,
  },
});
```

- [ ] **Step 2: Run model tests**

Run: `npx vitest run src/models`
Expected: existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/models/modelManager.ts src/models/integrityCheck.ts
git commit -m "feat(audit): instrument model lifecycle and integrity check"
```

---

## Task 16: Global error handlers

**Files:**
- Modify: `src/main-app.tsx`

- [ ] **Step 1: Wire window error and unhandledrejection**

Near the top-level mount of the app, before `render()`:

```ts
import { log } from "./audit/logger";
import { EVENT } from "./audit/events";
import { ATTR } from "./audit/attrs";

window.addEventListener("error", (ev) => {
  log({
    name: EVENT.ERROR_UNHANDLED,
    severity: "ERROR",
    attributes: {
      [ATTR.ERROR_TYPE]: ev.error?.name ?? "Error",
      [ATTR.ERROR_MESSAGE]: ev.message,
      [ATTR.ERROR_STACK]: (ev.error?.stack ?? "").split("\n").slice(0, 5).join("\n"),
    },
  });
});

window.addEventListener("unhandledrejection", (ev) => {
  const reason = ev.reason;
  log({
    name: EVENT.ERROR_REJECTION,
    severity: "ERROR",
    attributes: {
      [ATTR.ERROR_TYPE]: reason?.name ?? "UnhandledRejection",
      [ATTR.ERROR_MESSAGE]: reason?.message ?? String(reason),
      [ATTR.ERROR_STACK]: (reason?.stack ?? "").split("\n").slice(0, 5).join("\n"),
    },
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/main-app.tsx
git commit -m "feat(audit): capture unhandled errors + rejections"
```

---

## Task 17: Boot orchestrator (init.ts)

**Files:**
- Create: `src/audit/init.ts`
- Test: `src/audit/init.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/init.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initAudit } from "./init";
import { isDegraded, _resetForTests } from "./logger";
import { resetSessionForTests, getSession } from "./session";
import { AUDIT_DB_NAME } from "./db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("initAudit", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
  });

  it("opens the DB and exits degraded=false on success", async () => {
    await initAudit({ activePatientId: null });
    expect(isDegraded()).toBe(false);
  });

  it("precomputes patient hash when active patient is set", async () => {
    await initAudit({ activePatientId: "p-uuid-1" });
    expect(getSession().patientIdHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("never throws past the caller", async () => {
    // No-op: initAudit must always resolve, never reject.
    await expect(initAudit({ activePatientId: null })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/init.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/init.ts
import { openAuditDb } from "./db";
import { initLogger, log } from "./logger";
import { setActivePatientHash } from "./session";
import { patientIdHash } from "./hash";
import { EVENT } from "./events";
import { ATTR } from "./attrs";

export interface InitOpts {
  activePatientId: string | null;
}

/** Idempotent boot orchestrator. Never throws — failures route to
 *  degraded mode in the logger. Call once after settings hydrate. */
export async function initAudit(opts: InitOpts): Promise<void> {
  try {
    const db = await openAuditDb();
    initLogger(db);

    if (opts.activePatientId) {
      try {
        const hash = await patientIdHash(opts.activePatientId);
        setActivePatientHash(hash);
      } catch (err) {
        console.warn("[audit] hash precompute failed:", err);
      }
    }

    log({
      name: EVENT.MODEL_BOOT_START,
      severity: "INFO",
      attributes: { [ATTR.SESSION_ID]: "" }, // session id is added by logger
    });
  } catch (err) {
    console.error("[audit] init failed; logger remains uninitialised:", err);
  }
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/init.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/init.ts src/audit/init.test.ts
git commit -m "feat(audit): boot orchestrator with degraded-mode tolerance"
```

---

## Task 18: Wire initAudit into main-app boot

**Files:**
- Modify: `src/main-app.tsx`

- [ ] **Step 1: Call initAudit after settings hydrate**

```ts
import { initAudit } from "./audit/init";
import { useSettingsStore } from "./stores/settingsStore";

// After the existing settingsStore hydration / persist setup, before render():
useSettingsStore.persist.onFinishHydration?.(async (state) => {
  await initAudit({ activePatientId: state.cfg?.activePatientId ?? null });
});
```

If `onFinishHydration` is not used in this codebase, await `useSettingsStore.persist.rehydrate()` and then call `initAudit` with the current active patient.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: pass.

- [ ] **Step 3: Smoke test**

Run: `npm run dev` → open DevTools → `Application → IndexedDB → ov-audit → events` → tap a phrase → confirm an event row appears.

- [ ] **Step 4: Commit**

```bash
git add src/main-app.tsx
git commit -m "feat(audit): boot init in main-app after settings hydrate"
```

---

## Task 19: Retention sweep

**Files:**
- Create: `src/audit/retention.ts`
- Test: `src/audit/retention.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/retention.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { sweepRetention, RETENTION_MS } from "./retention";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulidForTime } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("sweepRetention", () => {
  beforeEach(clearDb);

  it("evicts records older than RETENTION_MS", async () => {
    const db = await openAuditDb();
    const now = Date.now();
    const old = now - RETENTION_MS - 1000;

    await new Promise<void>((res) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put({
        id: ulidForTime(old), kind: "log", time: old, observed_time: old,
        name: "x", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulidForTime(now), kind: "log", time: now, observed_time: now,
        name: "y", attributes: {},
      });
      tx.oncomplete = () => res();
    });

    await sweepRetention(db, now);

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(remaining.map((r) => r.name)).toEqual(["y"]);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/retention.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/retention.ts
import { ulidForTime } from "./ulid";

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Delete events whose ULID prefix encodes a time before (now - RETENTION_MS).
 *  Uses primary-key range scan; no index hop. */
export async function sweepRetention(db: IDBDatabase, now = Date.now()): Promise<number> {
  const cutoffId = ulidForTime(now - RETENTION_MS);
  return new Promise((resolve, reject) => {
    let deleted = 0;
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const range = IDBKeyRange.upperBound(cutoffId, true);
    const req = store.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        deleted += 1;
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

/** Schedule the sweep to run hourly via requestIdleCallback. */
export function scheduleHourlyRetention(db: IDBDatabase): () => void {
  const ric = (globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  const id = setInterval(() => {
    if (ric) ric(() => { void sweepRetention(db); });
    else void sweepRetention(db);
  }, 60 * 60 * 1000);
  return () => clearInterval(id);
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/retention.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Wire into init.ts**

In `src/audit/init.ts` after `initLogger(db)`:

```ts
import { sweepRetention, scheduleHourlyRetention } from "./retention";

// inside initAudit, after initLogger(db):
void sweepRetention(db);
scheduleHourlyRetention(db);
```

- [ ] **Step 6: Commit**

```bash
git add src/audit/retention.ts src/audit/retention.test.ts src/audit/init.ts
git commit -m "feat(audit): 30-day retention sweep at boot + hourly tick"
```

---

## Task 20: Per-patient cascade + resetAll

**Files:**
- Create: `src/audit/cascade.ts`
- Test: `src/audit/cascade.test.ts`
- Modify: `src/stores/resetAll.ts`
- Modify: `src/stores/resetScoped.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audit/cascade.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { clearAuditForPatient } from "./cascade";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulid } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("clearAuditForPatient", () => {
  beforeEach(clearDb);

  it("deletes only events with the matching patient_id_hash", async () => {
    const db = await openAuditDb();
    await new Promise<void>((res) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "speak.tap",
        patient_id_hash: "AAA", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "speak.tap",
        patient_id_hash: "BBB", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "model.boot.start",
        attributes: {},
      });
      tx.oncomplete = () => res();
    });

    await clearAuditForPatient(db, "AAA");

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(remaining.map((r) => r.patient_id_hash).sort()).toEqual([undefined, "BBB"]);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/cascade.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/cascade.ts
export async function clearAuditForPatient(db: IDBDatabase, patientIdHash: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let deleted = 0;
    const tx = db.transaction(["events", "workflows"], "readwrite");
    const events = tx.objectStore("events");
    const workflows = tx.objectStore("workflows");

    const eIdx = events.index("by_patient_time");
    const wIdx = workflows.index("by_patient_id_hash");

    const eReq = eIdx.openCursor(IDBKeyRange.bound(
      [patientIdHash, -Infinity], [patientIdHash, Infinity],
    ));
    eReq.onsuccess = () => {
      const c = eReq.result;
      if (c) { c.delete(); deleted += 1; c.continue(); }
    };
    eReq.onerror = () => reject(eReq.error);

    const wReq = wIdx.openCursor(IDBKeyRange.only(patientIdHash));
    wReq.onsuccess = () => {
      const c = wReq.result;
      if (c) { c.delete(); deleted += 1; c.continue(); }
    };
    wReq.onerror = () => reject(wReq.error);

    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/cascade.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Wire into resetScoped.ts**

In `src/stores/resetScoped.ts`, find the per-patient cleanup. Add:

```ts
import { openAuditDb } from "../audit/db";
import { clearAuditForPatient } from "../audit/cascade";
import { patientIdHash } from "../audit/hash";

// Inside the cascade function, after the existing per-store wipes:
const hash = await patientIdHash(patientId);
const db = await openAuditDb();
await clearAuditForPatient(db, hash);
db.close();
```

- [ ] **Step 6: Wire into resetAll.ts**

In `src/stores/resetAll.ts`, add to the wipe list:

```ts
await new Promise<void>((res) => {
  const r = indexedDB.deleteDatabase("ov-audit");
  r.onsuccess = r.onerror = r.onblocked = () => res();
});
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/stores src/audit/cascade.test.ts`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/audit/cascade.ts src/audit/cascade.test.ts src/stores/resetScoped.ts src/stores/resetAll.ts
git commit -m "feat(audit): per-patient cascade + resetAll wipe"
```

---

## Task 21: useThreadView hook

**Files:**
- Create: `src/audit/useThreadView.ts`
- Test: `src/audit/useThreadView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/audit/useThreadView.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/preact";
import { useThreadView } from "./useThreadView";
import { initAudit } from "./init";
import { log, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { AUDIT_DB_NAME } from "./db";
import { patientIdHash } from "./hash";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("useThreadView", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("returns thread-visible events for the given patient", async () => {
    const hash = await patientIdHash("p1");
    setActivePatientHash(hash);

    log({
      name: EVENT.SPEAK_TAP,
      attributes: { [ATTR.SPEECH_TEXT]: "hello", [ATTR.ACTOR]: "patient" },
    });
    log({ name: EVENT.MODEL_BOOT_START });

    const { result } = renderHook(() => useThreadView("p1"));

    await waitFor(() => {
      expect(result.current.length).toBe(1);
      expect(result.current[0].text).toBe("hello");
      expect(result.current[0].from).toBe("patient");
    });
  });

  it("excludes non-thread events", async () => {
    const hash = await patientIdHash("p2");
    setActivePatientHash(hash);
    log({ name: EVENT.MODEL_BOOT_COMPLETE });
    log({ name: EVENT.SPEAK_CACHE_HIT });
    const { result } = renderHook(() => useThreadView("p2"));
    await waitFor(() => expect(result.current.length).toBe(0));
  });

  it("returns empty array for null patient", () => {
    const { result } = renderHook(() => useThreadView(null));
    expect(result.current).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/audit/useThreadView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/audit/useThreadView.ts
import { useEffect, useState, useMemo } from "preact/hooks";
import { subscribe } from "./logger";
import { openAuditDb } from "./db";
import { patientIdHash } from "./hash";
import { ATTR } from "./attrs";
import { EVENT } from "./events";
import type { AuditRecord } from "./types";
import { useSettingsStore } from "../stores/settingsStore";

export interface ThreadEntry {
  id: string;
  from: "patient" | "provider";
  text: string;
  gloss?: string;
  icon?: string;
  time: number;
  label: string;
}

const THREAD_VISIBLE: ReadonlySet<string> = new Set([
  EVENT.SPEAK_TAP, EVENT.THREAD_COMPOSE, EVENT.THREAD_TRANSCRIBED,
]);

function recordToEntry(r: AuditRecord, patientName: string): ThreadEntry {
  const actor = r.attributes[ATTR.ACTOR] as "patient" | "provider" | undefined;
  const from: "patient" | "provider" = actor === "provider" ? "provider" : "patient";
  return {
    id: r.id,
    from,
    text: (r.attributes[ATTR.SPEECH_TEXT] as string | undefined) ?? "",
    gloss: r.attributes[ATTR.SPEECH_GLOSS] as string | undefined,
    icon: r.attributes[ATTR.SPEECH_ICON] as string | undefined,
    time: r.time,
    label:
      from === "provider"
        ? ((r.attributes[ATTR.PROVIDER_NAME] as string | undefined) ?? "Care Team")
        : patientName,
  };
}

export function useThreadView(patientId: string | null): readonly ThreadEntry[] {
  const [entries, setEntries] = useState<readonly ThreadEntry[]>([]);
  const patient = useSettingsStore((s) =>
    patientId ? s.cfg?.patients.find((p) => p.id === patientId) : undefined,
  );
  const patientName = patient?.name ?? "";

  useEffect(() => {
    if (!patientId) { setEntries([]); return; }

    let cancelled = false;
    let hash: string | null = null;
    const initial: ThreadEntry[] = [];

    void (async () => {
      hash = await patientIdHash(patientId);
      const db = await openAuditDb();
      await new Promise<void>((res) => {
        const tx = db.transaction("events", "readonly");
        const idx = tx.objectStore("events").index("by_patient_time");
        const cursor = idx.openCursor(IDBKeyRange.bound(
          [hash!, -Infinity], [hash!, Infinity],
        ));
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c) {
            const rec = c.value as AuditRecord;
            if (THREAD_VISIBLE.has(rec.name)) {
              initial.push(recordToEntry(rec, patientName));
            }
            c.continue();
          }
        };
        tx.oncomplete = () => res();
      });
      db.close();
      if (!cancelled) setEntries(initial);
    })();

    const unsub = subscribe((rec) => {
      if (!hash || rec.patient_id_hash !== hash) return;
      if (!THREAD_VISIBLE.has(rec.name)) return;
      setEntries((prev) => [...prev, recordToEntry(rec, patientName)]);
    });

    return () => { cancelled = true; unsub(); };
  }, [patientId, patientName]);

  return useMemo(() => entries, [entries]);
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run src/audit/useThreadView.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/useThreadView.ts src/audit/useThreadView.test.tsx
git commit -m "feat(audit): useThreadView derives thread from audit events"
```

---

## Task 22: Migrate useSpeakActions to audit + thread.compose / thread.transcribed split

**Files:**
- Modify: `src/hooks/useSpeakActions.ts`
- Modify: `src/hooks/useSpeakActions.test.ts`

- [ ] **Step 1: Replace addMessage/addToThread with audit.log**

Top of `useSpeakActions.ts`:

```ts
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
```

Replace `speakAsPatient`:

```ts
const speakAsPatient = useCallback(
  (text: string, opts?: SpeakGlossOpts) => {
    if (!cfg || !active) return;
    const caregiverLang = cfg.caregiverLang ?? "en";
    const speaker: Speaker = {
      name: active.name, type: "patient",
      embedding: active.speakerData ?? undefined, lang: caregiverLang,
    };
    const gloss = opts?.gloss
      ?? (opts?.key ? resolvePhrase(opts.key, caregiverLang) : undefined);

    log({
      name: EVENT.SPEAK_TAP,
      attributes: {
        [ATTR.SPEECH_TEXT]: text,
        [ATTR.SPEECH_GLOSS]: gloss ?? "",
        [ATTR.SPEECH_ICON]: opts?.icon ?? "",
        [ATTR.SPEECH_PHRASE_KEY]: opts?.key ?? "",
        [ATTR.ACTOR]: "patient",
        [ATTR.SPEECH_LANG]: caregiverLang,
      },
    });

    setSpeaking({ text, from: "patient", gloss });
    speak(gloss ?? text, speaker);
  },
  [cfg, active, setSpeaking],
);
```

Replace `speakAsProvider` analogously, adding `[ATTR.PROVIDER_NAME]: provName` and `[ATTR.ACTOR]: "provider"`.

Replace `addToThread` with two callable forms (or keep one but require an explicit event-name option):

```ts
const composeThread = useCallback(
  (text: string, gloss?: string) => {
    if (!cfg || !active) return;
    log({
      name: EVENT.THREAD_COMPOSE,
      attributes: {
        [ATTR.SPEECH_TEXT]: text,
        [ATTR.SPEECH_GLOSS]: gloss ?? "",
        [ATTR.ACTOR]: "patient",
      },
    });
  },
  [cfg, active],
);

const transcribeThread = useCallback(
  (text: string, providerLabel: string) => {
    if (!cfg || !active) return;
    log({
      name: EVENT.THREAD_TRANSCRIBED,
      attributes: {
        [ATTR.SPEECH_TEXT]: text,
        [ATTR.ACTOR]: "provider",
        [ATTR.PROVIDER_NAME]: providerLabel,
      },
    });
  },
  [cfg, active],
);

return { speakAsPatient, speakAsProvider, composeThread, transcribeThread, repeatSpeak, activeProv };
```

- [ ] **Step 2: Update existing test file accordingly**

Replace assertions on conversationStore message shape with assertions on `audit.log` calls (mock the logger).

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/hooks/useSpeakActions`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSpeakActions.ts src/hooks/useSpeakActions.test.ts
git commit -m "feat(audit): useSpeakActions emits audit events instead of conversationStore writes"
```

---

## Task 23: App.tsx — swap thread renderer

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update imports**

Remove:
```ts
import { useConversationStore } from "./stores/conversationStore";
```

Add:
```ts
import { useThreadView } from "./audit/useThreadView";
```

- [ ] **Step 2: Replace thread read**

Find:
```ts
const messages = useConversationStore((s) =>
  activePatientId ? (s.messagesByPatientId[activePatientId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
);
```

Replace with:
```ts
const messages = useThreadView(activePatientId);
```

- [ ] **Step 3: Update thread renderer to read epoch ms instead of pre-formatted string**

The thread component(s) that consume `messages[i].time` need to format `entry.time` (number) to a display string. Wherever `Message.time` (string) was read, format like:

```ts
const displayTime = new Date(entry.time).toLocaleTimeString([], {
  hour: "numeric", minute: "2-digit",
});
```

Search for `\.time` reads in thread components and update.

- [ ] **Step 4: Update consumers of `addToThread`**

In the `MyWishes` overlay and `ListenPanel` props in App.tsx:

```ts
// Before:
onAddToThread={addToThread}

// After:
onAddToThread={composeThread}

// And for ListenPanel:
onAddMessage={(text, providerLabel) => {
  transcribeThread(text, providerLabel);
  closeOverlay("listen");
}}
```

- [ ] **Step 5: Run tests + smoke test**

Run: `npm test && npm run dev`
Verify: thread renders with audit-derived entries; tapping phrases adds entries; wishes-compose adds without TTS; listen-transcribe adds without re-speaking.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(audit): App.tsx renders thread via useThreadView"
```

---

## Task 24: Drop ov-conversation

**Files:**
- Delete: `src/stores/conversationStore.ts`
- Delete: `src/stores/conversationStore.test.ts`
- Modify: `src/stores/resetAll.ts` (remove conversationStore reset)
- Modify: `src/main-app.tsx` (delete the legacy IDB on first boot)

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "useConversationStore\|conversationStore" src/`
Expected: no matches.

- [ ] **Step 2: Delete files**

```bash
git rm src/stores/conversationStore.ts src/stores/conversationStore.test.ts
```

- [ ] **Step 3: Remove from resetAll.ts**

Strip the import and the `useConversationStore.setState` line.

- [ ] **Step 4: Delete the legacy IDB on boot**

In `main-app.tsx` near `initAudit` invocation:

```ts
// Best-effort cleanup of the deprecated store. Idempotent.
indexedDB.deleteDatabase("ov-conversation");
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: pass; no broken references.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "feat(audit): remove ov-conversation; thread is now derived"
```

---

## Task 25: Diagnostics viewer scaffold (hidden 5-tap unlock)

**Files:**
- Create: `src/components/diag/DiagnosticsView.tsx`
- Create: `src/components/diag/DiagnosticsView.test.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx` (or wherever the version string lives)

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/diag/DiagnosticsView.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/preact";
import { DiagnosticsView } from "./DiagnosticsView";
import { initAudit } from "../../audit/init";
import { log, _resetForTests } from "../../audit/logger";
import { resetSessionForTests } from "../../audit/session";
import { EVENT } from "../../audit/events";
import { AUDIT_DB_NAME } from "../../audit/db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("DiagnosticsView", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("renders recent events in the table", async () => {
    log({ name: EVENT.MODEL_BOOT_COMPLETE });
    render(<DiagnosticsView onClose={() => {}} />);
    expect(await screen.findByText(/model.boot.complete/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `npx vitest run src/components/diag/DiagnosticsView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DiagnosticsView**

```tsx
// src/components/diag/DiagnosticsView.tsx
import { useEffect, useState } from "preact/hooks";
import { openAuditDb } from "../../audit/db";
import { subscribe } from "../../audit/logger";
import type { AuditRecord } from "../../audit/types";
import { theme } from "../../theme/tokens";

export interface DiagnosticsViewProps {
  onClose: () => void;
}

export function DiagnosticsView({ onClose }: DiagnosticsViewProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [severityFloor, setSeverityFloor] = useState(5); // DEBUG
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const db = await openAuditDb();
      const out: AuditRecord[] = [];
      await new Promise<void>((res) => {
        const tx = db.transaction("events", "readonly");
        const idx = tx.objectStore("events").index("by_time");
        const cursor = idx.openCursor(null, "prev");
        let n = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && n < 5000) {
            out.push(c.value as AuditRecord);
            n += 1;
            c.continue();
          }
        };
        tx.oncomplete = () => res();
      });
      db.close();
      if (!cancelled) setRecords(out);
    })();

    const unsub = subscribe((r) => setRecords((prev) => [r, ...prev].slice(0, 5000)));
    return () => { cancelled = true; unsub(); };
  }, []);

  const visible = records.filter((r) => {
    if ((r.severity_number ?? 9) < severityFloor) return false;
    if (search && !r.name.includes(search)) return false;
    return true;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: theme.background, zIndex: 1000, padding: 16, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={onClose} style={{ padding: 8 }}>Close</button>
        <input
          placeholder="filter by name"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          style={{ flex: 1, padding: 8 }}
        />
        <select
          value={severityFloor}
          onChange={(e) => setSeverityFloor(Number((e.target as HTMLSelectElement).value))}
        >
          <option value={5}>DEBUG+</option>
          <option value={9}>INFO+</option>
          <option value={13}>WARN+</option>
          <option value={17}>ERROR+</option>
        </select>
      </div>
      <table style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}>
        <thead>
          <tr>
            <th>Time</th><th>Sev</th><th>Name</th><th>Attrs</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.time).toLocaleTimeString()}</td>
              <td>{r.severity_text ?? "INFO"}</td>
              <td>{r.name}</td>
              <td style={{ fontSize: 10 }}>{JSON.stringify(r.attributes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Wire 5-tap unlock from SettingsPanel**

Find the version string in `SettingsPanel.tsx`. Wrap it:

```tsx
const [taps, setTaps] = useState(0);
const [diagOpen, setDiagOpen] = useState(false);

<span
  onClick={() => {
    setTaps((n) => {
      if (n + 1 >= 5) { setDiagOpen(true); return 0; }
      return n + 1;
    });
  }}
>
  v{APP_VERSION}
</span>

{diagOpen && <DiagnosticsView onClose={() => setDiagOpen(false)} />}
```

- [ ] **Step 5: Verify tests pass**

Run: `npx vitest run src/components/diag/DiagnosticsView.test.tsx`
Expected: 1 passed.

- [ ] **Step 6: Smoke test**

Run: `npm run dev` → Settings → tap version 5 times → viewer opens → recent events visible.

- [ ] **Step 7: Commit**

```bash
git add src/components/diag src/components/settings/SettingsPanel.tsx
git commit -m "feat(audit): hidden Diagnostics viewer behind 5-tap unlock"
```

---

## Task 26: Virtualised table

**Files:**
- Modify: `src/components/diag/DiagnosticsView.tsx`

For Phase 1 we keep this simple: virtualisation via fixed-height rows
through `@tanstack/virtual-core`. If 5000 rows feels OK on iPad in
practice, we can defer the virtualiser to Phase 3 polish; landing the
naive table first is acceptable. **If `npm run dev` shows >100 ms render
time on a representative dataset, add the virtualiser now.**

- [ ] **Step 1: Add virtualiser only if dev profiling shows the naive table is too slow**

Skip this step otherwise. If needed:

```tsx
import { Virtualizer } from "@tanstack/virtual-core";
// ... wrap the tbody with a virtualised viewport. See @tanstack/virtual-core docs.
```

- [ ] **Step 2: If added, commit**

```bash
git add src/components/diag/DiagnosticsView.tsx
git commit -m "perf(audit): virtualise diagnostics table"
```

---

## Task 27: Tap-path latency benchmark

**Files:**
- Create: `src/audit/logger.bench.test.ts`

- [ ] **Step 1: Write the benchmark**

```ts
// src/audit/logger.bench.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initLogger, log, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { EVENT } from "./events";
import { ATTR } from "./attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("logger tap-path latency", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    const db = await openAuditDb();
    initLogger(db);
    setActivePatientHash("hashAAA");
  });

  it("p99 of synchronous log() < 5 ms over 1000 iterations", () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const t0 = performance.now();
      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: "I'm in pain",
          [ATTR.ACTOR]: "patient",
          [ATTR.SPEECH_LANG]: "en",
        },
      });
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p99 = samples[Math.floor(samples.length * 0.99)];
    console.log(`logger p50=${p50.toFixed(3)}ms p99=${p99.toFixed(3)}ms`);
    expect(p50).toBeLessThan(1);
    expect(p99).toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/audit/logger.bench.test.ts`
Expected: p50 < 1ms, p99 < 5ms. If it fails, profile with `console.profile` and trim record construction.

- [ ] **Step 3: Commit**

```bash
git add src/audit/logger.bench.test.ts
git commit -m "test(audit): tap-path latency benchmark gates merge"
```

---

## Task 28: Reset cascade integration test

**Files:**
- Create: `src/audit/cascade.integration.test.ts`

- [ ] **Step 1: Write**

```ts
// src/audit/cascade.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initAudit } from "./init";
import { log, flushNow, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { clearAuditForPatient } from "./cascade";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { patientIdHash } from "./hash";
import { EVENT } from "./events";
import { ATTR } from "./attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("cascade end-to-end", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("clearAuditForPatient(p1) leaves p2's records intact", async () => {
    const h1 = await patientIdHash("p1");
    const h2 = await patientIdHash("p2");

    setActivePatientHash(h1);
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "p1 says hi" } });
    setActivePatientHash(h2);
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "p2 says hello" } });
    await flushNow();

    const db = await openAuditDb();
    await clearAuditForPatient(db, h1);

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();

    const remainingHashes = remaining.map((r) => r.patient_id_hash);
    expect(remainingHashes).toContain(h2);
    expect(remainingHashes).not.toContain(h1);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/audit/cascade.integration.test.ts`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add src/audit/cascade.integration.test.ts
git commit -m "test(audit): per-patient cascade end-to-end"
```

---

## Task 29: Service worker CACHE_NAME bump

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Bump the constant**

Open `public/sw.js`, find the `CACHE_NAME` constant, increment its version suffix (e.g. `ov-cache-v18` → `ov-cache-v19`).

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "chore(sw): bump CACHE_NAME for audit-log Phase 1"
```

---

## Task 30: Bundle-size verification

**Files:**
- (No files; verification step only)

- [ ] **Step 1: Build and inspect**

Run: `npm run build`
Inspect `dist/assets/*.js` size output. The audit-related delta (OTel deps + our `src/audit/*`) should be ≤25 KB gzipped.

If it exceeds the budget:
- Verify only `@opentelemetry/api`, `@opentelemetry/api-logs`, `@opentelemetry/otlp-transformer` are imported (no full SDK)
- Check tree-shaking is working (Vite/Rollup default in production builds is on)

- [ ] **Step 2: Document the delta in PR description**

Note "Phase 1 audit code: <X> KB gzipped (budget: 25 KB)" so reviewers can check the trend in future PRs.

- [ ] **Step 3: No commit needed**

---

## Self-Review

After completing all tasks, run the full suite:

```bash
npm test && npm run build
```

Then walk the spec section by section and confirm coverage:

- ✅ ov-audit IDB with both stores at v1 — Task 5
- ✅ Logger with buffer + idle flush + error policy + degraded mode — Task 11
- ✅ Closed ATTR + EVENT namespaces — Task 4
- ✅ ULID generator — Task 2
- ✅ OTLP envelope builder — Task 10
- ✅ Storage meter — Task 6
- ✅ Settings named setters with audit emission — Task 12
- ✅ speak.ts retrofit — Task 14
- ✅ Model lifecycle retrofit — Task 15
- ✅ Global error handlers — Task 16
- ✅ Boot orchestrator + main-app wiring — Tasks 17, 18
- ✅ Retention sweep — Task 19
- ✅ Per-patient cascade + resetAll — Task 20
- ✅ useThreadView hook — Task 21
- ✅ useSpeakActions migration — Task 22
- ✅ App.tsx swap — Task 23
- ✅ ov-conversation removed — Task 24
- ✅ Diagnostics viewer with 5-tap unlock — Task 25
- ✅ Virtualisation (deferred unless profiling shows need) — Task 26
- ✅ Tap-path latency benchmark — Task 27
- ✅ Cascade end-to-end integration test — Task 28
- ✅ SW CACHE_NAME bump — Task 29
- ✅ Bundle delta check — Task 30
- ✅ PHI redaction completeness check — Task 9
- ✅ Patient ID hash util + sync snapshot in logger — Tasks 3, 11

Phase 1 is complete when:
- `npm test` is green.
- `npm run build` is green and audit code stays within 25 KB gzipped.
- Smoke test on `npm run dev`: tap a phrase → see it in the thread → see the corresponding `speak.tap` row in `Application → IndexedDB → ov-audit → events` → reload the tab → thread still shows the message.

If any of these regress, do not merge. Phase 2 (durable workflow runtime) is blocked until Phase 1 lands clean.
