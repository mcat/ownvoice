# Audit Log Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Promote the hidden Phase 1 Diagnostics viewer into a fully-featured, role-toggled Activity log accessible from Settings, with comprehensive filtering, virtualised rendering, and PHI-aware export in three formats.

**Architecture:** Single Activity log screen with a "View as" segmented control (Healthcare worker / Researcher / Developer). Each role bundles a default filter set, a column set, and an export profile. Filtering is comprehensive — every filter narrows the underlying IDB query rather than a pre-loaded array. Virtualisation via `@tanstack/virtual-core` (already in deps from Phase 1) keeps a 15K-record corpus rendering at 60fps. Export builds an OTLP/JSON envelope (canonical) using `@opentelemetry/otlp-transformer` (already in deps), with NDJSON and Print/PDF as role-specific alternatives. PHI redaction defaults to ON for researcher exports; unredacted exports require a Settings-PIN re-prompt with explicit warning copy.

**Tech Stack:** TS + Preact + Vitest. No new runtime dependencies beyond what Phases 1-2 already added.

**Spec:** `docs/superpowers/specs/2026-05-07-audit-log-design.md` — sections "Viewer", "Export", "Privacy and retention", and the Phase 3 row in "Phased delivery".

**What Phase 1 already shipped that we extend:**
- `src/components/diag/DiagnosticsView.tsx` — minimal flat-table viewer behind 5-tap on version string
- `src/audit/redaction.ts` — `redactPHI()` and `PHI_ATTR_KEYS` set
- `src/audit/otlp.ts` — `buildOtlpEnvelope()` for OTLP/JSON output
- `src/audit/db.ts` — IDB indexes (`by_patient_time`, `by_severity_time`, `by_name_time`, `by_workflow_id`, `by_time`)

**What we add:**
| File | Responsibility |
|---|---|
| `src/audit/queryEvents.ts` | Filter pipeline that composes IDB cursor scans with post-filtering |
| `src/audit/exportFormats.ts` | OTLP/JSON, NDJSON, Print/PDF builders sharing one redaction pass |
| `src/audit/exportShare.ts` | `navigator.share({ files })` + anchor-download fallback |
| `src/audit/pinPrompt.ts` | PIN re-prompt helper hooking into existing Settings PIN |
| `src/components/diag/ActivityLog.tsx` | New top-level Activity log screen |
| `src/components/diag/RoleToggle.tsx` | Three-segment control |
| `src/components/diag/FilterBar.tsx` | Patient + date + severity + search controls |
| `src/components/diag/EventTable.tsx` | Virtualised list using @tanstack/virtual-core |
| `src/components/diag/ExportMenu.tsx` | Role-aware export dropdown |
| `src/components/diag/PrintHandoffSheet.tsx` | Healthcare print/PDF render |

**What we modify:**
| File | What |
|---|---|
| `src/components/settings/SettingsPanel.tsx` | New Settings entry "Activity log" |
| `src/components/diag/DiagnosticsView.tsx` | Becomes thin compatibility shim around ActivityLog (or deleted; 5-tap path remains as a developer escape hatch) |
| `src/components/settings/sections/AboutSection.tsx` | 5-tap unlock kept but routes to Activity log in dev role |
| `src/audit/cascade.ts` | `clearAuditForPatientId(patientId)` wrapper combining hash + cascade for the discharge-purge UX |
| `src/components/settings/sections/PatientsScreen.tsx` | "Discharge patient" affordance |
| `public/sw.js` | Bump `CACHE_NAME` |

**Acceptance criteria** (from spec):
- Virtualised viewer renders 15K records at 60fps scroll (manual on iPad)
- PHI redaction round-trip test: every key in `PHI_ATTR_KEYS` is `[REDACTED]` in default researcher export, present in unredacted export after PIN
- OTLP/JSON validity passes a basic schema check
- No regression on Phase 1/2 acceptance criteria
- Bundle delta budget: ≤25 KB gzipped over Phase 2 baseline

---

## Task 1: Query pipeline — `src/audit/queryEvents.ts`

**Files:**
- Create: `src/audit/queryEvents.ts`
- Create: `src/audit/queryEvents.test.ts`

The viewer's filter bar drives an IDB query. This module composes filters into the cheapest cursor scan.

### Step 1: Test (write first)

```ts
// src/audit/queryEvents.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { queryEvents } from "./queryEvents";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulidForTime } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seed(records: Array<Partial<{ id: string; time: number; name: string; severity_number: number; patient_id_hash: string; attributes: Record<string, unknown> }>>) {
  const db = await openAuditDb();
  await new Promise<void>((res) => {
    const tx = db.transaction("events", "readwrite");
    for (const r of records) {
      tx.objectStore("events").put({
        id: r.id ?? ulidForTime(r.time ?? 0),
        kind: "log",
        time: r.time ?? 0,
        observed_time: r.time ?? 0,
        name: r.name ?? "speak.tap",
        severity_number: r.severity_number ?? 9,
        patient_id_hash: r.patient_id_hash,
        attributes: r.attributes ?? {},
      });
    }
    tx.oncomplete = () => res();
  });
  db.close();
}

describe("queryEvents", () => {
  beforeEach(clearDb);

  it("returns all events when filters are empty", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }]);
    const out = await queryEvents({ limit: 100 });
    expect(out).toHaveLength(3);
  });

  it("filters by patient_id_hash via by_patient_time", async () => {
    await seed([
      { time: 100, patient_id_hash: "A" },
      { time: 200, patient_id_hash: "B" },
      { time: 300, patient_id_hash: "A" },
    ]);
    const out = await queryEvents({ patientIdHash: "A", limit: 100 });
    expect(out.map((r) => r.time).sort()).toEqual([100, 300]);
  });

  it("filters by date range", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }, { time: 400 }]);
    const out = await queryEvents({ rangeStart: 150, rangeEnd: 350, limit: 100 });
    expect(out.map((r) => r.time).sort()).toEqual([200, 300]);
  });

  it("filters by minimum severity", async () => {
    await seed([
      { time: 100, severity_number: 5 },
      { time: 200, severity_number: 13 },
      { time: 300, severity_number: 17 },
    ]);
    const out = await queryEvents({ minSeverity: 13, limit: 100 });
    expect(out.map((r) => r.severity_number).sort()).toEqual([13, 17]);
  });

  it("filters by event name prefix", async () => {
    await seed([
      { time: 100, name: "speak.tap" },
      { time: 200, name: "speak.cache.hit" },
      { time: 300, name: "model.boot.start" },
    ]);
    const out = await queryEvents({ namePrefix: "speak.", limit: 100 });
    expect(out.map((r) => r.name).sort()).toEqual(["speak.cache.hit", "speak.tap"]);
  });

  it("post-filters by attribute substring", async () => {
    await seed([
      { time: 100, attributes: { "ownvoice.speech.text": "I'm in pain" } },
      { time: 200, attributes: { "ownvoice.speech.text": "Thank you" } },
    ]);
    const out = await queryEvents({ attributeSubstring: "pain", limit: 100 });
    expect(out).toHaveLength(1);
  });

  it("respects limit", async () => {
    await seed(Array.from({ length: 100 }, (_, i) => ({ time: i })));
    const out = await queryEvents({ limit: 10 });
    expect(out).toHaveLength(10);
  });

  it("returns most-recent first when no patient filter", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }]);
    const out = await queryEvents({ limit: 100 });
    expect(out.map((r) => r.time)).toEqual([300, 200, 100]);
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/queryEvents.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/queryEvents.ts
import { openAuditDb } from "./db";
import { ulidForTime } from "./ulid";
import type { AuditRecord } from "./types";

export interface QueryFilters {
  patientIdHash?: string;
  rangeStart?: number;        // ms epoch, inclusive
  rangeEnd?: number;          // ms epoch, exclusive
  minSeverity?: number;
  namePrefix?: string;        // e.g. "speak." matches all speak.* events
  attributeSubstring?: string; // post-filter; case-sensitive substring scan
  limit: number;
}

/** Run a filter pipeline against ov-audit.events and return matching
 *  records. The strategy picks the cheapest IDB cursor based on which
 *  filters are present, then post-filters in JS for the rest. Results
 *  are returned in most-recent-first order, capped by `limit`. */
export async function queryEvents(filters: QueryFilters): Promise<AuditRecord[]> {
  const db = await openAuditDb();
  try {
    const out: AuditRecord[] = [];
    const seen = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("events", "readonly");
      const store = tx.objectStore("events");

      // Pick the index that gives the tightest range scan.
      let cursor: IDBRequest<IDBCursorWithValue | null>;
      let direction: IDBCursorDirection = "prev"; // newest first by default

      if (filters.patientIdHash) {
        const idx = store.index("by_patient_time");
        const lo = filters.rangeStart ?? -Infinity;
        const hi = filters.rangeEnd ?? Infinity;
        cursor = idx.openCursor(IDBKeyRange.bound([filters.patientIdHash, lo], [filters.patientIdHash, hi]), direction);
      } else if (filters.rangeStart !== undefined || filters.rangeEnd !== undefined) {
        // Use ULID-prefix bounds via primary key; faster than by_time scan.
        const range = IDBKeyRange.bound(
          ulidForTime(filters.rangeStart ?? 0).slice(0, 10) + "0000000000000000",
          ulidForTime(filters.rangeEnd ?? Date.now() + 1).slice(0, 10) + "ZZZZZZZZZZZZZZZZ",
        );
        cursor = store.openCursor(range, direction);
      } else {
        cursor = store.index("by_time").openCursor(null, direction);
      }

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || out.length >= filters.limit) { resolve(); return; }
        const r = c.value as AuditRecord;
        if (seen.has(r.id)) { c.continue(); return; }

        if (passesPostFilters(r, filters)) {
          seen.add(r.id);
          out.push(r);
        }
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });

    return out;
  } finally {
    db.close();
  }
}

function passesPostFilters(r: AuditRecord, f: QueryFilters): boolean {
  if (f.minSeverity !== undefined && (r.severity_number ?? 0) < f.minSeverity) return false;
  if (f.rangeStart !== undefined && r.time < f.rangeStart) return false;
  if (f.rangeEnd !== undefined && r.time >= f.rangeEnd) return false;
  if (f.namePrefix && !r.name.startsWith(f.namePrefix)) return false;
  if (f.attributeSubstring) {
    const haystack = JSON.stringify(r.attributes);
    if (!haystack.includes(f.attributeSubstring)) return false;
  }
  return true;
}
```

### Step 4: Verify pass

`npx vitest run src/audit/queryEvents.test.ts` → 8 passed.

### Step 5: Commit

```bash
git add src/audit/queryEvents.ts src/audit/queryEvents.test.ts
git commit -m "feat(audit): query pipeline composing IDB cursor scans + post-filters"
```

---

## Task 2: Export builders — `src/audit/exportFormats.ts`

**Files:**
- Create: `src/audit/exportFormats.ts`
- Create: `src/audit/exportFormats.test.ts`

OTLP/JSON, NDJSON, and Print/HTML formats sharing one redaction pass.

### Step 1: Test (write first)

```ts
// src/audit/exportFormats.test.ts
import { describe, it, expect } from "vitest";
import { buildExport, type ExportRequest } from "./exportFormats";
import { ATTR } from "./attrs";

const SAMPLE = [
  {
    id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    kind: "log" as const,
    time: 1700000000000,
    observed_time: 1700000000000,
    name: "speak.tap",
    severity_number: 9,
    severity_text: "INFO" as const,
    attributes: {
      [ATTR.SPEECH_TEXT]: "I'm in pain",
      [ATTR.ACTOR]: "patient",
    },
  },
];

const REQ: Omit<ExportRequest, "format" | "redaction"> = {
  records: SAMPLE,
  rangeStart: 0,
  rangeEnd: 2000000000000,
  serviceVersion: "0.1.0",
  deviceInstanceId: "dev-test",
};

describe("buildExport", () => {
  it("OTLP/JSON envelope contains records when redaction=raw", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "raw" });
    const parsed = JSON.parse(out.content);
    expect(parsed.resourceLogs).toHaveLength(1);
    const attrs = parsed.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const text = attrs.find((a: any) => a.key === ATTR.SPEECH_TEXT);
    expect(text.value.stringValue).toBe("I'm in pain");
    expect(out.filename).toMatch(/\.json$/);
  });

  it("OTLP/JSON envelope redacts SPEECH_TEXT when redaction=redacted", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "redacted" });
    const parsed = JSON.parse(out.content);
    const attrs = parsed.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const text = attrs.find((a: any) => a.key === ATTR.SPEECH_TEXT);
    expect(text.value.stringValue).toBe("[REDACTED]");
  });

  it("NDJSON one record per line, redaction respected", () => {
    const out = buildExport({ ...REQ, format: "ndjson", redaction: "redacted" });
    const lines = out.content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const obj = JSON.parse(lines[0]);
    expect(obj.attributes[ATTR.SPEECH_TEXT]).toBe("[REDACTED]");
    expect(out.filename).toMatch(/\.ndjson$/);
  });

  it("Print HTML contains spoken text rendered for clinician review", () => {
    const out = buildExport({ ...REQ, format: "print-html", redaction: "raw" });
    expect(out.content).toContain("I&#x27;m in pain"); // HTML-escaped
    expect(out.filename).toMatch(/\.html$/);
    expect(out.mimeType).toBe("text/html");
  });

  it("MIME types are correct per format", () => {
    expect(buildExport({ ...REQ, format: "otlp-json", redaction: "raw" }).mimeType).toBe("application/json");
    expect(buildExport({ ...REQ, format: "ndjson", redaction: "raw" }).mimeType).toBe("application/x-ndjson");
    expect(buildExport({ ...REQ, format: "print-html", redaction: "raw" }).mimeType).toBe("text/html");
  });

  it("filename includes range bounds and device id", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "raw" });
    expect(out.filename).toContain("dev-test");
    expect(out.filename).toContain("0");
    expect(out.filename).toContain("2000000000000");
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/exportFormats.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/exportFormats.ts
import type { AuditRecord } from "./types";
import { redactPHI } from "./redaction";
import { buildOtlpEnvelope } from "./otlp";
import { ATTR } from "./attrs";

export type ExportFormat = "otlp-json" | "ndjson" | "print-html";
export type RedactionMode = "raw" | "redacted";

export interface ExportRequest {
  records: AuditRecord[];
  format: ExportFormat;
  redaction: RedactionMode;
  rangeStart: number;
  rangeEnd: number;
  serviceVersion: string;
  deviceInstanceId: string;
}

export interface ExportArtifact {
  content: string;
  filename: string;
  mimeType: string;
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

export function buildExport(req: ExportRequest): ExportArtifact {
  const records = req.redaction === "redacted" ? redactPHI(req.records) : req.records;
  const baseFilename = `ownvoice-audit-${req.deviceInstanceId}-${req.rangeStart}-${req.rangeEnd}`;

  switch (req.format) {
    case "otlp-json": {
      const envelope = buildOtlpEnvelope(records, {
        serviceVersion: req.serviceVersion,
        deviceInstanceId: req.deviceInstanceId,
        rangeStart: req.rangeStart,
        rangeEnd: req.rangeEnd,
        redaction: req.redaction,
      });
      return {
        content: JSON.stringify(envelope, null, 2),
        filename: `${baseFilename}.json`,
        mimeType: "application/json",
      };
    }
    case "ndjson": {
      const lines = records.map((r) => JSON.stringify(r)).join("\n");
      return {
        content: lines + "\n",
        filename: `${baseFilename}.ndjson`,
        mimeType: "application/x-ndjson",
      };
    }
    case "print-html": {
      const rows = records.map((r) => {
        const t = new Date(r.time).toLocaleTimeString();
        const actor = String(r.attributes[ATTR.ACTOR] ?? "");
        const text = String(r.attributes[ATTR.SPEECH_TEXT] ?? r.name);
        return `<tr><td>${escapeHtml(t)}</td><td>${escapeHtml(actor)}</td><td>${escapeHtml(text)}</td></tr>`;
      }).join("");
      return {
        content: `<!doctype html><html><head><meta charset="utf-8"><title>OwnVoice Activity Log</title>
<style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}@media print{body{padding:0}}</style>
</head><body><h1>OwnVoice Activity Log</h1>
<p>Range ${new Date(req.rangeStart).toLocaleString()} → ${new Date(req.rangeEnd).toLocaleString()}</p>
<table><thead><tr><th>Time</th><th>Actor</th><th>Spoken text</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.print();</script></body></html>`,
        filename: `${baseFilename}.html`,
        mimeType: "text/html",
      };
    }
  }
}
```

### Step 4: Verify pass

`npx vitest run src/audit/exportFormats.test.ts` → 6 passed.

### Step 5: Commit

```bash
git add src/audit/exportFormats.ts src/audit/exportFormats.test.ts
git commit -m "feat(audit): export builders for OTLP/JSON, NDJSON, Print/HTML"
```

---

## Task 3: Share + download mechanics — `src/audit/exportShare.ts`

**Files:**
- Create: `src/audit/exportShare.ts`
- Create: `src/audit/exportShare.test.ts`

iPad share-sheet primary; anchor-download fallback. Plus `audit.export` audit-of-audit emission.

### Step 1: Test (write first)

```ts
// src/audit/exportShare.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { shareExport } from "./exportShare";
import { _resetForTests, log, subscribe } from "./logger";
import { resetSessionForTests } from "./session";
import { initAudit } from "./init";
import { AUDIT_DB_NAME } from "./db";
import type { ExportArtifact } from "./exportFormats";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("shareExport", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("emits an audit.export event with redaction + format + row_count", async () => {
    const seen: any[] = [];
    subscribe((r) => seen.push(r));
    const artifact: ExportArtifact = {
      content: "{}",
      filename: "test.json",
      mimeType: "application/json",
    };
    await shareExport(artifact, { redaction: "redacted", format: "otlp-json", rowCount: 42, rangeStart: 0, rangeEnd: 100 });
    const exportEv = seen.find((r) => r.name === "audit.export");
    expect(exportEv).toBeTruthy();
    expect(exportEv.attributes["ownvoice.export.row_count"]).toBe(42);
    expect(exportEv.attributes["ownvoice.export.redaction"]).toBe("redacted");
    expect(exportEv.attributes["ownvoice.export.format"]).toBe("otlp-json");
  });

  it("uses anchor-download fallback when navigator.share is unavailable", async () => {
    // jsdom doesn't implement navigator.share so this is the default path.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const artifact: ExportArtifact = {
      content: "abc",
      filename: "out.json",
      mimeType: "application/json",
    };
    await shareExport(artifact, { redaction: "raw", format: "otlp-json", rowCount: 1, rangeStart: 0, rangeEnd: 1 });
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/exportShare.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/exportShare.ts
import { log } from "./logger";
import { EVENT } from "./events";
import type { ExportArtifact, ExportFormat, RedactionMode } from "./exportFormats";

export interface ShareMeta {
  redaction: RedactionMode;
  format: ExportFormat;
  rowCount: number;
  rangeStart: number;
  rangeEnd: number;
}

/** Hands the export artifact to the user via the iPad share sheet
 *  (`navigator.share({ files })`) or, if unavailable, an anchor
 *  download. Either way, emits an `audit.export` audit-of-audit event
 *  with the row count, redaction mode, format, and range — preserved
 *  on-device even if the user later deletes the exported file. */
export async function shareExport(artifact: ExportArtifact, meta: ShareMeta): Promise<void> {
  log({
    name: EVENT.AUDIT_EXPORT,
    attributes: {
      "ownvoice.export.row_count": meta.rowCount,
      "ownvoice.export.redaction": meta.redaction,
      "ownvoice.export.format": meta.format,
      "ownvoice.export.range_start": meta.rangeStart,
      "ownvoice.export.range_end": meta.rangeEnd,
    },
  });

  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const file = new File([blob], artifact.filename, { type: artifact.mimeType });

  // Prefer share sheet on iPad; fall back to anchor download.
  const canShare = typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({ files: [file], title: "OwnVoice audit log" });
      return;
    } catch {
      // user dismissed or share failed; fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.filename;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
```

### Step 4: Verify pass

`npx vitest run src/audit/exportShare.test.ts` → 2 passed.

### Step 5: Commit

```bash
git add src/audit/exportShare.ts src/audit/exportShare.test.ts
git commit -m "feat(audit): share/download mechanics + audit.export self-event"
```

---

## Task 4: PIN re-prompt helper — `src/audit/pinPrompt.ts`

**Files:**
- Create: `src/audit/pinPrompt.ts`
- Create: `src/audit/pinPrompt.test.tsx`

For unredacted exports. Uses the existing `cfg.pin` field from settings.

### Step 1: Test (write first)

```tsx
// src/audit/pinPrompt.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { useSettingsStore } from "../stores/settingsStore";
import { PinPromptDialog } from "./pinPrompt";

function setPin(p: string) {
  useSettingsStore.setState((s) => ({
    cfg: s.cfg ? { ...s.cfg, pin: p } : { pin: p, caregiverLang: "en", providers: [], patients: [], activePatientId: null },
  }));
}

describe("PinPromptDialog", () => {
  beforeEach(() => useSettingsStore.setState({ cfg: null }));

  it("calls onConfirm when correct PIN entered", () => {
    setPin("1234");
    let confirmed = false;
    render(<PinPromptDialog warning="raw export" onConfirm={() => { confirmed = true; }} onCancel={() => {}} />);
    fireEvent.input(screen.getByLabelText(/PIN/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmed).toBe(true);
  });

  it("rejects wrong PIN", () => {
    setPin("1234");
    let confirmed = false;
    render(<PinPromptDialog warning="raw export" onConfirm={() => { confirmed = true; }} onCancel={() => {}} />);
    fireEvent.input(screen.getByLabelText(/PIN/i), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmed).toBe(false);
    expect(screen.getByText(/incorrect/i)).toBeTruthy();
  });

  it("shows warning copy", () => {
    setPin("1234");
    render(<PinPromptDialog warning="This export contains raw spoken phrases." onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/raw spoken phrases/)).toBeTruthy();
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/pinPrompt.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/audit/pinPrompt.tsx — note .tsx extension since it returns JSX
import { useState } from "preact/hooks";
import { useSettingsStore } from "../stores/settingsStore";

export interface PinPromptProps {
  warning: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PinPromptDialog({ warning, onConfirm, onCancel }: PinPromptProps) {
  const expectedPin = useSettingsStore((s) => s.cfg?.pin ?? "");
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (entered === expectedPin) {
      onConfirm();
    } else {
      setError("Incorrect PIN.");
    }
  }

  return (
    <div role="dialog" aria-label="Confirm with PIN" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 480, width: "90%" }}>
        <h2 style={{ marginTop: 0 }}>Confirm with PIN</h2>
        <p>{warning}</p>
        <label htmlFor="pin-prompt-input">PIN</label>
        <input
          id="pin-prompt-input"
          type="password"
          value={entered}
          onInput={(e) => { setEntered((e.target as HTMLInputElement).value); setError(null); }}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4, marginBottom: 8 }}
        />
        {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
```

Rename file to `.tsx`. Update test import accordingly.

### Step 4: Verify pass

`npx vitest run src/audit/pinPrompt.test.tsx` → 3 passed.

### Step 5: Commit

```bash
git add src/audit/pinPrompt.tsx src/audit/pinPrompt.test.tsx
git commit -m "feat(audit): PIN re-prompt dialog for unredacted exports"
```

---

## Task 5: Role toggle component — `src/components/diag/RoleToggle.tsx`

**Files:**
- Create: `src/components/diag/RoleToggle.tsx`
- Create: `src/components/diag/RoleToggle.test.tsx`

### Step 1: Test (write first)

```tsx
// src/components/diag/RoleToggle.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { RoleToggle, type DiagRole } from "./RoleToggle";

describe("RoleToggle", () => {
  it("renders three options labelled Healthcare worker / Researcher / Developer", () => {
    render(<RoleToggle role="healthcare" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /healthcare/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /researcher/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /developer/i })).toBeTruthy();
  });

  it("calls onChange with new role when clicked", () => {
    let next: DiagRole | null = null;
    render(<RoleToggle role="healthcare" onChange={(r) => { next = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /researcher/i }));
    expect(next).toBe("researcher");
  });

  it("highlights the selected role via aria-pressed", () => {
    render(<RoleToggle role="developer" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /developer/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /researcher/i })).toHaveAttribute("aria-pressed", "false");
  });
});
```

### Step 2: Verify failure

`npx vitest run src/components/diag/RoleToggle.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/components/diag/RoleToggle.tsx
export type DiagRole = "healthcare" | "researcher" | "developer";

const ROLES: { id: DiagRole; label: string }[] = [
  { id: "healthcare", label: "Healthcare worker" },
  { id: "researcher", label: "Researcher" },
  { id: "developer", label: "Developer" },
];

export interface RoleToggleProps {
  role: DiagRole;
  onChange: (role: DiagRole) => void;
}

export function RoleToggle({ role, onChange }: RoleToggleProps) {
  return (
    <div role="group" aria-label="View as" style={{ display: "inline-flex", gap: 0, border: "1px solid #ccc", borderRadius: 4 }}>
      {ROLES.map((r) => (
        <button
          key={r.id}
          aria-pressed={r.id === role}
          onClick={() => onChange(r.id)}
          style={{
            padding: "8px 12px",
            border: "none",
            background: r.id === role ? "#1976d2" : "transparent",
            color: r.id === role ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

### Step 4: Verify pass

`npx vitest run src/components/diag/RoleToggle.test.tsx` → 3 passed.

### Step 5: Commit

```bash
git add src/components/diag/RoleToggle.tsx src/components/diag/RoleToggle.test.tsx
git commit -m "feat(audit): RoleToggle component (healthcare/researcher/developer)"
```

---

## Task 6: Filter bar — `src/components/diag/FilterBar.tsx`

**Files:**
- Create: `src/components/diag/FilterBar.tsx`
- Create: `src/components/diag/FilterBar.test.tsx`

Patient picker + date-range presets + severity floor + free-text search. Returns a `QueryFilters` object via callback.

### Step 1: Test (write first)

```tsx
// src/components/diag/FilterBar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { FilterBar, type FilterBarValue } from "./FilterBar";

const PATIENTS = [
  { id: "p1", name: "Maria" },
  { id: "p2", name: "Lee" },
];

describe("FilterBar", () => {
  it("emits onChange when patient changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/patient/i), { target: { value: "p1" } });
    expect(last?.patientId).toBe("p1");
  });

  it("emits onChange when date preset changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "last7d" } });
    expect(last?.datePreset).toBe("last7d");
  });

  it("emits onChange when severity changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: "13" } });
    expect(last?.minSeverity).toBe(13);
  });

  it("emits onChange when search changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.input(screen.getByLabelText(/search/i), { target: { value: "speak" } });
    expect(last?.search).toBe("speak");
  });
});
```

### Step 2: Verify failure

`npx vitest run src/components/diag/FilterBar.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/components/diag/FilterBar.tsx
export type DatePreset = "today" | "last24h" | "last7d" | "last30d" | "all";

export interface FilterBarValue {
  patientId: string | null;     // null = "All"
  datePreset: DatePreset;
  minSeverity: number;
  search: string;               // applied as namePrefix if "speak.", "model.", etc; else attribute substring
}

export interface FilterBarProps {
  value: FilterBarValue;
  patients: Array<{ id: string; name: string }>;
  onChange: (value: FilterBarValue) => void;
}

export function FilterBar({ value, patients, onChange }: FilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", flexWrap: "wrap" }}>
      <label htmlFor="filter-patient">Patient</label>
      <select
        id="filter-patient"
        value={value.patientId ?? ""}
        onChange={(e) => onChange({ ...value, patientId: (e.target as HTMLSelectElement).value || null })}
      >
        <option value="">All</option>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <label htmlFor="filter-date">Date</label>
      <select
        id="filter-date"
        value={value.datePreset}
        onChange={(e) => onChange({ ...value, datePreset: (e.target as HTMLSelectElement).value as DatePreset })}
      >
        <option value="today">Today</option>
        <option value="last24h">Last 24h</option>
        <option value="last7d">Last 7 days</option>
        <option value="last30d">Last 30 days</option>
        <option value="all">All (retention)</option>
      </select>

      <label htmlFor="filter-severity">Severity</label>
      <select
        id="filter-severity"
        value={String(value.minSeverity)}
        onChange={(e) => onChange({ ...value, minSeverity: Number((e.target as HTMLSelectElement).value) })}
      >
        <option value="5">DEBUG+</option>
        <option value="9">INFO+</option>
        <option value="13">WARN+</option>
        <option value="17">ERROR+</option>
      </select>

      <label htmlFor="filter-search">Search</label>
      <input
        id="filter-search"
        type="search"
        value={value.search}
        placeholder="speak. or substring"
        onInput={(e) => onChange({ ...value, search: (e.target as HTMLInputElement).value })}
        style={{ flex: 1, minWidth: 160 }}
      />
    </div>
  );
}

export function presetToRange(preset: DatePreset, now = Date.now()): { rangeStart?: number; rangeEnd?: number } {
  if (preset === "all") return {};
  if (preset === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { rangeStart: d.getTime(), rangeEnd: now };
  }
  if (preset === "last24h") return { rangeStart: now - 24 * 3600 * 1000, rangeEnd: now };
  if (preset === "last7d") return { rangeStart: now - 7 * 24 * 3600 * 1000, rangeEnd: now };
  if (preset === "last30d") return { rangeStart: now - 30 * 24 * 3600 * 1000, rangeEnd: now };
  return {};
}
```

### Step 4: Verify pass

`npx vitest run src/components/diag/FilterBar.test.tsx` → 4 passed.

### Step 5: Commit

```bash
git add src/components/diag/FilterBar.tsx src/components/diag/FilterBar.test.tsx
git commit -m "feat(audit): FilterBar with patient + date preset + severity + search"
```

---

## Task 7: Virtualised event table — `src/components/diag/EventTable.tsx`

**Files:**
- Create: `src/components/diag/EventTable.tsx`
- Create: `src/components/diag/EventTable.test.tsx`

Uses `@tanstack/virtual-core` directly (already in deps). Fixed row height. Renders only visible rows + small overscan.

### Step 1: Test (write first)

```tsx
// src/components/diag/EventTable.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { EventTable, type EventTableColumn } from "./EventTable";
import type { AuditRecord } from "../../audit/types";

function fakeRecord(i: number): AuditRecord {
  return {
    id: `id-${i.toString().padStart(4, "0")}`,
    kind: "log",
    time: 1700000000000 + i * 1000,
    observed_time: 1700000000000 + i * 1000,
    name: i % 2 === 0 ? "speak.tap" : "model.boot.start",
    severity_number: 9,
    severity_text: "INFO",
    attributes: { "ownvoice.actor": "patient", "ownvoice.speech.text": `phrase ${i}` },
  };
}

const COLUMNS: EventTableColumn[] = [
  { id: "time", header: "Time", render: (r) => new Date(r.time).toISOString() },
  { id: "name", header: "Event", render: (r) => r.name },
];

describe("EventTable", () => {
  it("renders rows for each record", () => {
    const records = Array.from({ length: 10 }, (_, i) => fakeRecord(i));
    render(<EventTable records={records} columns={COLUMNS} />);
    // First few should be in DOM (others may be virtualised out)
    expect(screen.getByText("speak.tap")).toBeTruthy();
  });

  it("renders empty state when no records", () => {
    render(<EventTable records={[]} columns={COLUMNS} />);
    expect(screen.getByText(/no events/i)).toBeTruthy();
  });

  it("renders all column headers", () => {
    render(<EventTable records={[fakeRecord(0)]} columns={COLUMNS} />);
    expect(screen.getByText("Time")).toBeTruthy();
    expect(screen.getByText("Event")).toBeTruthy();
  });
});
```

### Step 2: Verify failure

`npx vitest run src/components/diag/EventTable.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/components/diag/EventTable.tsx
import { useEffect, useRef, useState } from "preact/hooks";
import { Virtualizer, observeElementOffset, observeElementRect, elementScroll } from "@tanstack/virtual-core";
import type { AuditRecord } from "../../audit/types";

export interface EventTableColumn {
  id: string;
  header: string;
  render: (r: AuditRecord) => string;
  width?: string;
}

export interface EventTableProps {
  records: readonly AuditRecord[];
  columns: EventTableColumn[];
  rowHeight?: number;
}

const DEFAULT_ROW_HEIGHT = 28;

export function EventTable({ records, columns, rowHeight = DEFAULT_ROW_HEIGHT }: EventTableProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  const virtRef = useRef<Virtualizer<HTMLDivElement, HTMLDivElement> | null>(null);

  useEffect(() => {
    if (!scrollerRef.current) return;
    const v = new Virtualizer({
      count: records.length,
      getScrollElement: () => scrollerRef.current,
      estimateSize: () => rowHeight,
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      onChange: () => setTick((t) => t + 1),
    });
    virtRef.current = v;
    const cleanup = v._didMount();
    v._willUpdate();
    return () => { cleanup(); virtRef.current = null; };
  }, [records.length, rowHeight]);

  const v = virtRef.current;
  const items = v?.getVirtualItems() ?? [];
  const totalSize = v?.getTotalSize() ?? 0;

  if (records.length === 0) {
    return <div style={{ padding: 24, color: "#666" }}>No events match current filters.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #888", fontWeight: "bold", padding: "4px 8px" }}>
        {columns.map((c) => (
          <div key={c.id} style={{ flex: c.width ?? "1 1 0" }}>{c.header}</div>
        ))}
      </div>
      <div ref={scrollerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ height: totalSize, position: "relative" }}>
          {items.map((item) => {
            const rec = records[item.index];
            return (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: rowHeight,
                  transform: `translateY(${item.start}px)`,
                  display: "flex",
                  padding: "4px 8px",
                  borderBottom: "1px solid #eee",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {columns.map((c) => (
                  <div key={c.id} style={{ flex: c.width ?? "1 1 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.render(rec)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Verify pass

`npx vitest run src/components/diag/EventTable.test.tsx` → 3 passed.

### Step 5: Commit

```bash
git add src/components/diag/EventTable.tsx src/components/diag/EventTable.test.tsx
git commit -m "feat(audit): virtualised event table via @tanstack/virtual-core"
```

---

## Task 8: Export menu — `src/components/diag/ExportMenu.tsx`

**Files:**
- Create: `src/components/diag/ExportMenu.tsx`
- Create: `src/components/diag/ExportMenu.test.tsx`

Role-aware: each role gets a different set of available formats and defaults. Researcher's "Unredacted JSON" requires PIN re-prompt.

### Step 1: Test (write first)

```tsx
// src/components/diag/ExportMenu.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { ExportMenu } from "./ExportMenu";

describe("ExportMenu", () => {
  it("healthcare role shows Print/PDF only", () => {
    render(<ExportMenu role="healthcare" onExport={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /print/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /ndjson/i })).toBeNull();
  });

  it("researcher role shows redacted JSON, NDJSON, and unredacted JSON", () => {
    render(<ExportMenu role="researcher" onExport={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /redacted.*json/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /ndjson/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /unredacted/i })).toBeTruthy();
  });

  it("developer role shows unredacted JSON without PIN prompt flag", () => {
    let req: any = null;
    render(<ExportMenu role="developer" onExport={(r) => { req = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /unredacted.*json/i }));
    expect(req).toEqual({ format: "otlp-json", redaction: "raw", needsPin: false });
  });

  it("researcher unredacted export carries needsPin=true", () => {
    let req: any = null;
    render(<ExportMenu role="researcher" onExport={(r) => { req = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /unredacted/i }));
    expect(req?.needsPin).toBe(true);
  });
});
```

### Step 2: Verify failure

`npx vitest run src/components/diag/ExportMenu.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/components/diag/ExportMenu.tsx
import { useState } from "preact/hooks";
import type { DiagRole } from "./RoleToggle";
import type { ExportFormat, RedactionMode } from "../../audit/exportFormats";

export interface ExportRequest {
  format: ExportFormat;
  redaction: RedactionMode;
  needsPin: boolean;
}

export interface ExportMenuProps {
  role: DiagRole;
  onExport: (req: ExportRequest) => void;
}

interface MenuItem {
  label: string;
  request: ExportRequest;
}

function itemsForRole(role: DiagRole): MenuItem[] {
  switch (role) {
    case "healthcare":
      return [{ label: "Print / PDF", request: { format: "print-html", redaction: "raw", needsPin: false } }];
    case "researcher":
      return [
        { label: "Redacted JSON", request: { format: "otlp-json", redaction: "redacted", needsPin: false } },
        { label: "NDJSON (redacted)", request: { format: "ndjson", redaction: "redacted", needsPin: false } },
        { label: "Unredacted JSON (PIN required)", request: { format: "otlp-json", redaction: "raw", needsPin: true } },
      ];
    case "developer":
      return [
        { label: "Unredacted JSON", request: { format: "otlp-json", redaction: "raw", needsPin: false } },
        { label: "NDJSON", request: { format: "ndjson", redaction: "raw", needsPin: false } },
      ];
  }
}

export function ExportMenu({ role, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const items = itemsForRole(role);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)}>Export ▼</button>
      {open && (
        <ul role="menu" style={{
          position: "absolute", right: 0, top: "100%",
          background: "#fff", border: "1px solid #ccc", listStyle: "none",
          margin: 0, padding: 4, minWidth: 220, zIndex: 100,
        }}>
          {items.map((it) => (
            <li role="menuitem" key={it.label}
                style={{ padding: "8px 12px", cursor: "pointer" }}
                onClick={() => { onExport(it.request); setOpen(false); }}>
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Step 4: Verify pass

`npx vitest run src/components/diag/ExportMenu.test.tsx` → 4 passed.

### Step 5: Commit

```bash
git add src/components/diag/ExportMenu.tsx src/components/diag/ExportMenu.test.tsx
git commit -m "feat(audit): role-aware ExportMenu (healthcare/researcher/developer)"
```

---

## Task 8.5: Service metadata helper — `src/audit/serviceMetadata.ts`

The export envelope needs `service.version` and `service.instance.id`. The version we hardcode in AboutSection today (`OwnVoice v0.1`); we'll move it into a shared constant. The instance id is generated once and persisted in settings so every export from the same device reuses it.

**Files:**
- Create: `src/audit/serviceMetadata.ts`
- Create: `src/audit/serviceMetadata.test.ts`
- Modify: `src/types.ts` (add optional `deviceInstanceId` field to `AppSettings`)

### Step 1: Add `deviceInstanceId` to `AppSettings`

In `src/types.ts`, append to `AppSettings`:

```ts
export interface AppSettings {
  // ... existing fields ...
  /** Generated once on first export; reused across exports so a researcher
   *  can correlate audit log files from the same device. Not PII. */
  deviceInstanceId?: string;
}
```

Bump `STORE_VERSION` in `src/stores/settingsStore.ts` if your team's convention requires it for new optional fields. (Convention check: the field is optional, so existing-data hydration should tolerate its absence; bump only if a migrate function is defined.)

### Step 2: Test (write first)

```ts
// src/audit/serviceMetadata.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../stores/settingsStore";
import { getServiceMetadata, APP_VERSION } from "./serviceMetadata";

describe("serviceMetadata", () => {
  beforeEach(() => {
    useSettingsStore.setState({ cfg: null });
  });

  it("returns the static APP_VERSION constant", async () => {
    const m = await getServiceMetadata();
    expect(m.serviceVersion).toBe(APP_VERSION);
  });

  it("generates a deviceInstanceId on first call and persists it", async () => {
    useSettingsStore.setState((s) => ({
      cfg: { pin: "0000", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    }));
    const m1 = await getServiceMetadata();
    expect(m1.deviceInstanceId).toMatch(/^[0-9a-f]{16}$/);
    const m2 = await getServiceMetadata();
    expect(m2.deviceInstanceId).toBe(m1.deviceInstanceId);
    expect(useSettingsStore.getState().cfg?.deviceInstanceId).toBe(m1.deviceInstanceId);
  });

  it("falls back to a session-only id when settings are unavailable", async () => {
    // cfg is null
    const m = await getServiceMetadata();
    expect(m.deviceInstanceId).toMatch(/^[0-9a-f]{16}$/);
  });
});
```

### Step 3: Verify failure

`npx vitest run src/audit/serviceMetadata.test.ts` → FAIL.

### Step 4: Implement

```ts
// src/audit/serviceMetadata.ts
import { useSettingsStore } from "../stores/settingsStore";

/** Single source of truth for the app version string used in export
 *  envelopes and the About screen. Hardcoded for now; a future change
 *  can wire this to package.json + git SHA via Vite's `define` config. */
export const APP_VERSION = "0.1.0";

export interface ServiceMetadata {
  serviceVersion: string;
  deviceInstanceId: string;
}

function randomDeviceId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < 8; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

let sessionFallbackId: string | null = null;

/** Reads device instance id from settings, generating + persisting one
 *  if absent. Falls back to a session-only id if cfg is null (e.g.
 *  before settings hydrate). */
export async function getServiceMetadata(): Promise<ServiceMetadata> {
  const cfg = useSettingsStore.getState().cfg;
  if (!cfg) {
    if (!sessionFallbackId) sessionFallbackId = randomDeviceId();
    return { serviceVersion: APP_VERSION, deviceInstanceId: sessionFallbackId };
  }
  if (!cfg.deviceInstanceId) {
    const id = randomDeviceId();
    useSettingsStore.setState((s) => ({
      cfg: s.cfg ? { ...s.cfg, deviceInstanceId: id } : s.cfg,
    }));
    return { serviceVersion: APP_VERSION, deviceInstanceId: id };
  }
  return { serviceVersion: APP_VERSION, deviceInstanceId: cfg.deviceInstanceId };
}
```

### Step 5: Verify pass

`npx vitest run src/audit/serviceMetadata.test.ts` → 3 passed.

### Step 6: Commit

```bash
git add src/audit/serviceMetadata.ts src/audit/serviceMetadata.test.ts src/types.ts
git commit -m "feat(audit): service metadata helper (APP_VERSION + persisted deviceInstanceId)"
```

---

## Task 9: ActivityLog top-level screen

**Files:**
- Create: `src/components/diag/ActivityLog.tsx`
- Create: `src/components/diag/ActivityLog.test.tsx`

Composes RoleToggle + FilterBar + EventTable + ExportMenu. Owns the query state, runs the query whenever filters change, drives PIN prompt for unredacted exports, calls `shareExport` on export confirm.

### Step 1: Test (write first)

```tsx
// src/components/diag/ActivityLog.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen, waitFor, fireEvent } from "@testing-library/preact";
import { ActivityLog } from "./ActivityLog";
import { initAudit } from "../../audit/init";
import { _resetForTests, log } from "../../audit/logger";
import { resetSessionForTests } from "../../audit/session";
import { AUDIT_DB_NAME } from "../../audit/db";
import { EVENT } from "../../audit/events";
import { ATTR } from "../../audit/attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("ActivityLog", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("renders the role toggle + filter bar + table", async () => {
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "test" } });
    render(<ActivityLog onClose={() => {}} />);
    expect(screen.getByRole("group", { name: /view as/i })).toBeTruthy();
    expect(screen.getByLabelText(/patient/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /export/i })).toBeTruthy();
  });

  it("changing role updates default filters", async () => {
    render(<ActivityLog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /developer/i }));
    // Developer default is severity ≥ WARN (13)
    await waitFor(() => {
      const sevSelect = screen.getByLabelText(/severity/i) as HTMLSelectElement;
      expect(sevSelect.value).toBe("13");
    });
  });
});
```

### Step 2: Verify failure

`npx vitest run src/components/diag/ActivityLog.test.tsx` → FAIL.

### Step 3: Implement

```tsx
// src/components/diag/ActivityLog.tsx
import { useEffect, useMemo, useState } from "preact/hooks";
import { useSettingsStore } from "../../stores/settingsStore";
import { queryEvents } from "../../audit/queryEvents";
import { patientIdHash } from "../../audit/hash";
import { buildExport } from "../../audit/exportFormats";
import { shareExport } from "../../audit/exportShare";
import { subscribe } from "../../audit/logger";
import type { AuditRecord } from "../../audit/types";
import { ATTR } from "../../audit/attrs";
import { RoleToggle, type DiagRole } from "./RoleToggle";
import { FilterBar, presetToRange, type FilterBarValue, type DatePreset } from "./FilterBar";
import { EventTable, type EventTableColumn } from "./EventTable";
import { ExportMenu, type ExportRequest } from "./ExportMenu";
import { PinPromptDialog } from "../../audit/pinPrompt";
import { getServiceMetadata } from "../../audit/serviceMetadata";

export interface ActivityLogProps {
  onClose: () => void;
}

const DEFAULT_LIMIT = 5000;

function defaultFiltersForRole(role: DiagRole, activePatientId: string | null): FilterBarValue {
  switch (role) {
    case "healthcare":
      return { patientId: activePatientId, datePreset: "today", minSeverity: 9, search: "speak." };
    case "researcher":
      return { patientId: null, datePreset: "last7d", minSeverity: 9, search: "" };
    case "developer":
      return { patientId: null, datePreset: "last30d", minSeverity: 13, search: "" };
  }
}

function columnsForRole(role: DiagRole): EventTableColumn[] {
  switch (role) {
    case "healthcare":
      return [
        { id: "time", header: "Time", render: (r) => new Date(r.time).toLocaleTimeString(), width: "0 0 120px" },
        { id: "actor", header: "Actor", render: (r) => String(r.attributes[ATTR.ACTOR] ?? ""), width: "0 0 100px" },
        { id: "text", header: "Spoken text", render: (r) => String(r.attributes[ATTR.SPEECH_TEXT] ?? "") },
      ];
    case "researcher":
      return [
        { id: "time", header: "Time", render: (r) => new Date(r.time).toLocaleString(), width: "0 0 180px" },
        { id: "actor", header: "Actor", render: (r) => String(r.attributes[ATTR.ACTOR] ?? "system"), width: "0 0 100px" },
        { id: "name", header: "Event", render: (r) => r.name, width: "0 0 200px" },
        { id: "attrs", header: "Attributes", render: (r) => JSON.stringify(r.attributes) },
      ];
    case "developer":
      return [
        { id: "time", header: "Time", render: (r) => new Date(r.time).toISOString(), width: "0 0 200px" },
        { id: "sev", header: "Severity", render: (r) => r.severity_text ?? "INFO", width: "0 0 80px" },
        { id: "name", header: "Event", render: (r) => r.name, width: "0 0 200px" },
        { id: "stack", header: "Detail", render: (r) => String(r.attributes[ATTR.ERROR_STACK] ?? r.attributes[ATTR.ERROR_MESSAGE] ?? JSON.stringify(r.attributes)) },
      ];
  }
}

export function ActivityLog({ onClose }: ActivityLogProps) {
  const cfg = useSettingsStore((s) => s.cfg);
  const patients = cfg?.patients ?? [];
  const activePatientId = cfg?.activePatientId ?? null;
  const [role, setRole] = useState<DiagRole>("healthcare");
  const [filters, setFilters] = useState<FilterBarValue>(() => defaultFiltersForRole("healthcare", activePatientId));
  const [records, setRecords] = useState<readonly AuditRecord[]>([]);
  const [pendingExport, setPendingExport] = useState<ExportRequest | null>(null);

  // Re-derive default filters when role changes.
  useEffect(() => {
    setFilters(defaultFiltersForRole(role, activePatientId));
  }, [role, activePatientId]);

  // Run the query whenever filters change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const range = presetToRange(filters.datePreset);
      const patientHash = filters.patientId ? await patientIdHash(filters.patientId) : undefined;
      const looksLikePrefix = filters.search.endsWith(".");
      const out = await queryEvents({
        patientIdHash: patientHash,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        minSeverity: filters.minSeverity,
        namePrefix: looksLikePrefix ? filters.search : undefined,
        attributeSubstring: !looksLikePrefix && filters.search ? filters.search : undefined,
        limit: DEFAULT_LIMIT,
      });
      if (!cancelled) setRecords(out);
    })();
    return () => { cancelled = true; };
  }, [filters]);

  // Live append on new audit events that match current filters (best-effort).
  useEffect(() => {
    return subscribe((rec) => {
      // Cheap re-trigger by toggling a re-query; avoid duplicating query logic.
      setRecords((prev) => prev.length < DEFAULT_LIMIT ? [rec, ...prev].slice(0, DEFAULT_LIMIT) : prev);
    });
  }, []);

  const cols = useMemo(() => columnsForRole(role), [role]);
  const range = presetToRange(filters.datePreset);

  async function performExport(req: ExportRequest) {
    const meta = await getServiceMetadata();
    const artifact = buildExport({
      records: records as AuditRecord[],
      format: req.format,
      redaction: req.redaction,
      rangeStart: range.rangeStart ?? 0,
      rangeEnd: range.rangeEnd ?? Date.now(),
      serviceVersion: meta.serviceVersion,
      deviceInstanceId: meta.deviceInstanceId,
    });
    await shareExport(artifact, {
      redaction: req.redaction,
      format: req.format,
      rowCount: records.length,
      rangeStart: range.rangeStart ?? 0,
      rangeEnd: range.rangeEnd ?? Date.now(),
    });
  }

  return (
    <div role="dialog" aria-label="Activity log" style={{
      position: "fixed", inset: 0, background: "#fff", zIndex: 1000,
      display: "flex", flexDirection: "column", padding: 16,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <button onClick={onClose}>Close</button>
        <RoleToggle role={role} onChange={setRole} />
        <div style={{ flex: 1 }} />
        <ExportMenu role={role} onExport={(req) => {
          if (req.needsPin) setPendingExport(req);
          else void performExport(req);
        }} />
      </div>
      <FilterBar value={filters} patients={patients} onChange={setFilters} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <EventTable records={records} columns={cols} />
      </div>
      {pendingExport && (
        <PinPromptDialog
          warning="This export contains raw spoken phrases. Confirm with PIN to continue."
          onConfirm={() => { void performExport(pendingExport); setPendingExport(null); }}
          onCancel={() => setPendingExport(null)}
        />
      )}
    </div>
  );
}
```

### Step 4: Verify pass

`npx vitest run src/components/diag/ActivityLog.test.tsx` → 2 passed.

### Step 5: Commit

```bash
git add src/components/diag/ActivityLog.tsx src/components/diag/ActivityLog.test.tsx
git commit -m "feat(audit): ActivityLog screen wires role toggle + filters + virtual table + export"
```

---

## Task 10: Settings entry — promote viewer to a visible link

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx` (add Activity log entry)
- Modify: `src/components/diag/DiagnosticsView.tsx` (alias to ActivityLog or delete)
- Modify: `src/components/settings/sections/AboutSection.tsx` (5-tap unlock now opens ActivityLog directly)

### Step 1: Read SettingsPanel and pick an insertion point

```bash
cat src/components/settings/SettingsPanel.tsx | head -80
```

Find where existing entries are listed (Patients, Care Team, Accessibility, App Diagnostics, About, Reset). Add an entry:

```tsx
<SettingsRow
  icon="📜"  // or appropriate icon
  label="Activity log"
  description="Phrases spoken, system events, errors — review and export"
  onClick={() => setActivityLogOpen(true)}
/>
```

State + render:

```tsx
import { ActivityLog } from "../diag/ActivityLog";

// inside component:
const [activityLogOpen, setActivityLogOpen] = useState(false);

// add to JSX:
{activityLogOpen && <ActivityLog onClose={() => setActivityLogOpen(false)} />}
```

### Step 2: Update AboutSection's 5-tap unlock

Replace `<DiagnosticsView ... />` with `<ActivityLog ... />`. The 5-tap unlock now opens the same Activity log. Keep the unlock as a developer convenience but the primary path is the Settings link.

### Step 3: DiagnosticsView shim or delete

Either delete `src/components/diag/DiagnosticsView.tsx` and its test, or convert it to a thin `function DiagnosticsView(props) { return <ActivityLog {...props} />; }` for backwards-compat. **Delete** is cleaner — there's no third caller.

```bash
git rm src/components/diag/DiagnosticsView.tsx src/components/diag/DiagnosticsView.test.tsx
```

### Step 4: Run tests

```bash
npm test
```

Expected: 0 failures. The previously-existing DiagnosticsView tests are gone; the new ActivityLog and component tests cover the equivalent surface.

### Step 5: Commit

```bash
git add -u src/components/settings src/components/diag
git commit -m "feat(audit): promote Activity log to visible Settings entry"
```

---

## Task 11: Discharge-purge wrapper

**Files:**
- Modify: `src/components/settings/sections/PatientsScreen.tsx`

Add a "Discharge patient" action that wraps `clearForPatient(patientId)` from `src/stores/resetScoped.ts` plus a confirmation dialog. UX-friendlier than the existing Reset → Patients destructive action.

### Step 1: Read PatientsScreen

```bash
cat src/components/settings/sections/PatientsScreen.tsx | head -80
```

### Step 2: Add the discharge action

Per existing patterns, add a "Discharge" button per patient row that opens a confirm dialog:

```
"Discharge {patient.name}? This deletes all of their conversations,
audio cache, and audit log entries. Cannot be undone."
```

On confirm: call the existing single-patient cleanup helper (the one already wired in Phase 1's per-patient cascade). If only `resetPatients` (all-patients) exists today, extract the single-patient body into a new exported helper `dischargePatient(patientId)` and reuse.

### Step 3: Run tests

```bash
npm test
```

### Step 4: Commit

```bash
git add src/components/settings/sections/PatientsScreen.tsx src/stores/resetScoped.ts 2>/dev/null
git commit -m "feat(audit): discharge-patient wrapper around per-patient cascade"
```

---

## Task 12: SW CACHE_NAME bump + final verification

**Files:**
- Modify: `public/sw.js`

### Step 1: Bump cache name

`ownvoice-v11` → `ownvoice-v12`.

### Step 2: Build verification

```bash
npm run build
```

Inspect bundle sizes; audit-related code total should remain well under the 25 KB gzipped budget Phase 1 set (Phase 2/3 add ~10 KB combined since they reuse `@tanstack/virtual-core` and `@opentelemetry/otlp-transformer` which were already in deps).

### Step 3: Manual smoke test on iPad surrogate

- Settings → Activity log opens the new screen
- Each role's default filters apply correctly
- Filtering interactively works (patient picker, date preset, severity, search)
- Virtualised list scrolls smoothly with thousands of records
- Healthcare role exports Print/PDF (browser native print dialog)
- Researcher role exports redacted JSON without prompt; unredacted JSON triggers PIN dialog
- Developer role exports unredacted JSON without prompt
- Each export emits an `audit.export` event visible in the same viewer (audit-of-audit)
- PHI redaction confirmed: search exported file for `[REDACTED]` in researcher default mode

### Step 4: Commit

```bash
git add public/sw.js
git commit -m "chore(sw): bump CACHE_NAME for audit-log Phase 3"
```

---

## Self-Review

After all tasks:

- ✅ Query pipeline (Task 1)
- ✅ Export builders × 3 formats (Task 2)
- ✅ Share + audit-of-audit emission (Task 3)
- ✅ PIN re-prompt (Task 4)
- ✅ RoleToggle (Task 5)
- ✅ FilterBar (Task 6)
- ✅ Virtualised EventTable (Task 7)
- ✅ ExportMenu (Task 8)
- ✅ ActivityLog screen (Task 9)
- ✅ Settings entry + DiagnosticsView removal (Task 10)
- ✅ Discharge-patient wrapper (Task 11)
- ✅ SW bump (Task 12)

Acceptance criteria check:
- All unit tests green
- Bundle delta within budget
- 15K-record render at 60fps verified manually
- PHI redaction round-trip confirmed in test (SPEECH_TEXT/SPEECH_GLOSS → `[REDACTED]` in researcher default; raw in unredacted)
- OTLP/JSON output schema-valid (run output through `otel-cli validate logs` if available)
- No regression on Phase 1/2 acceptance criteria

PR description checklist:
1. The role-toggle behavior with each role's default filters
2. The PHI redaction policy and PIN re-prompt for unredacted researcher exports
3. The discharge-patient cascade (which audit + audio + conversation stores it touches)
4. Manual smoke test results on iPad surrogate
