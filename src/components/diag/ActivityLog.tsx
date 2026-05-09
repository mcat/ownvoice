import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useSettingsStore } from "../../stores/settingsStore";
import { queryEvents, eventPassesFilters } from "../../audit/queryEvents";
import { queryWorkflows } from "../../audit/queryWorkflows";
import { patientIdHash } from "../../audit/hash";
import { buildExport } from "../../audit/exportFormats";
import { shareExport } from "../../audit/exportShare";
import { subscribe } from "../../audit/logger";
import { getServiceMetadata } from "../../audit/serviceMetadata";
import type { AuditRecord, WorkflowState } from "../../audit/types";
import { ATTR } from "../../audit/attrs";
import { z } from "../../theme/z";
import { RoleToggle, type DiagRole } from "./RoleToggle";
import { FilterBar, presetToRange, type FilterBarValue } from "./FilterBar";
import { EventTable, type EventTableColumn } from "./EventTable";
import { ExportMenu, type ExportRequest } from "./ExportMenu";
import { WorkflowTable } from "./WorkflowTable";
import { PinPromptDialog } from "../../audit/pinPrompt";

export interface ActivityLogProps {
  onClose: () => void;
  /** Maximum rows held in the rendered records buffer. Surfaced as a
   *  prop so tests can drive the truncation-banner path with a small
   *  seed; production callers use the default. */
  limit?: number;
}

const DEFAULT_LIMIT = 5000;

export type ViewMode = "events" | "workflows";

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
        { id: "stack", header: "Detail", render: (r) =>
          String(r.attributes[ATTR.ERROR_STACK] ?? r.attributes[ATTR.ERROR_MESSAGE] ?? JSON.stringify(r.attributes)) },
      ];
  }
}

export function ActivityLog({ onClose, limit = DEFAULT_LIMIT }: ActivityLogProps) {
  const cfg = useSettingsStore((s) => s.cfg);
  const patients = cfg?.patients ?? [];
  const activePatientId = cfg?.activePatientId ?? null;
  const [role, setRole] = useState<DiagRole>("healthcare");
  const [viewMode, setViewMode] = useState<ViewMode>("events");
  const [filters, setFilters] = useState<FilterBarValue>(() => defaultFiltersForRole("healthcare", activePatientId));
  const [records, setRecords] = useState<readonly AuditRecord[]>([]);
  const [workflows, setWorkflows] = useState<readonly WorkflowState[]>([]);
  const [pendingExport, setPendingExport] = useState<ExportRequest | null>(null);

  // Re-derive default filters when role changes.
  useEffect(() => {
    setFilters(defaultFiltersForRole(role, activePatientId));
  }, [role, activePatientId]);

  // Free the inactive view's data when the user switches modes — the
  // workflows array can be tens of MB even after summarization, and
  // holding a stale records buffer churns rAF batches in the live-tail.
  useEffect(() => {
    if (viewMode === "events") setWorkflows([]);
    else setRecords([]);
  }, [viewMode]);

  // Resolve patientId → hash whenever it changes; cached in a ref so the
  // live-tail subscriber can apply patient filtering without an extra
  // async round-trip per incoming event.
  const patientHashRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!filters.patientId) {
      patientHashRef.current = undefined;
      return;
    }
    void patientIdHash(filters.patientId).then((h) => {
      if (!cancelled) patientHashRef.current = h;
    });
    return () => { cancelled = true; };
  }, [filters.patientId]);

  // Mirror the active filters into a ref so the subscribe callback (which
  // is set up once on mount) can read fresh values without re-subscribing.
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  // Same pattern for viewMode — used by the live-tail to skip queueing
  // events while the user is on the Workflows tab.
  const viewModeRef = useRef(viewMode);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  // Run the events query whenever filters change.
  useEffect(() => {
    if (viewMode !== "events") return;
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
        limit,
      });
      if (!cancelled) setRecords(out);
    })();
    return () => { cancelled = true; };
  }, [filters, viewMode]);

  // Run the workflows query whenever filters change.
  useEffect(() => {
    if (viewMode !== "workflows") return;
    let cancelled = false;
    void (async () => {
      const range = presetToRange(filters.datePreset);
      const patientHash = filters.patientId ? await patientIdHash(filters.patientId) : undefined;
      const out = await queryWorkflows({
        patientIdHash: patientHash,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        nameSubstring: filters.search || undefined,
        limit,
      });
      if (!cancelled) setWorkflows(out);
    })();
    return () => { cancelled = true; };
  }, [filters, viewMode]);

  // Live append on new audit events. Coalesce into a per-frame buffer
  // so a burst of emits triggers one setRecords (and thus one render +
  // one Virtualizer setOptions call) instead of N. Filter is applied
  // before queuing so off-filter events never pollute the rendered view.
  const pendingRef = useRef<AuditRecord[]>([]);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    return subscribe((rec) => {
      // Only events view receives live appends — workflows store updates
      // are reflected via the workflow.* events that trigger UI refresh
      // out-of-band; we re-query on filter change rather than streaming.
      if (viewModeRef.current !== "events") return;
      if (filtersRef.current === undefined) return;
      const f = filtersRef.current;
      const range = presetToRange(f.datePreset);
      const looksLikePrefix = f.search.endsWith(".");
      const ok = eventPassesFilters(rec, {
        patientIdHash: patientHashRef.current,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        minSeverity: f.minSeverity,
        namePrefix: looksLikePrefix ? f.search : undefined,
        attributeSubstring: !looksLikePrefix && f.search ? f.search : undefined,
      });
      if (!ok) return;
      pendingRef.current.push(rec);
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const batch = pendingRef.current;
        if (batch.length === 0) return;
        pendingRef.current = [];
        setRecords((prev) => {
          if (prev.length >= limit) return prev;
          // Newest first, matching the existing layout convention.
          const merged = [...batch.slice().reverse(), ...prev];
          return merged.length > limit ? merged.slice(0, limit) : merged;
        });
      });
    });
  }, []);

  // Cancel any pending rAF on unmount.
  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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

  const truncated = viewMode === "events"
    ? records.length >= limit
    : workflows.length >= limit;

  return (
    <div
      role="dialog"
      aria-label="Activity log"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--color-ov-bg)",
        zIndex: z.sheetStacked,
        display: "flex",
        flexDirection: "column",
        padding: 20,
        fontFamily: "var(--font-sans)",
        color: "var(--color-ov-text)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "8px 14px",
            background: "var(--color-ov-card)",
            color: "var(--color-ov-text)",
            border: "1px solid var(--color-ov-border)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ‹ Close
        </button>
        <h1
          style={{
            margin: 0,
            marginRight: 8,
            fontFamily: "var(--font-sans)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ov-text)",
          }}
        >
          Activity log
        </h1>
        <RoleToggle role={role} onChange={setRole} />
        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        <div style={{ flex: 1 }} />
        <ExportMenu role={role} onExport={(req) => {
          if (req.needsPin) setPendingExport(req);
          else void performExport(req);
        }} />
      </div>
      <FilterBar value={filters} patients={patients} onChange={setFilters} />
      {truncated && (
        <div
          data-testid="truncation-banner"
          role="status"
          style={{
            background: "var(--color-ov-card)",
            color: "var(--color-ov-text)",
            border: "1px solid var(--color-ov-border)",
            borderLeft: "4px solid var(--color-ov-amber)",
            borderRadius: 8,
            padding: "10px 14px",
            margin: "4px 0 8px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          Showing the most recent {limit.toLocaleString()} {viewMode === "events" ? "events" : "workflows"} for this filter. Older entries are not displayed — narrow the date range or add filters to see them.
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--color-ov-card)",
          border: "1px solid var(--color-ov-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {viewMode === "events"
          ? <EventTable records={records} columns={cols} />
          : <WorkflowTable workflows={workflows} />}
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

function ViewModeToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { id: ViewMode; label: string }[] = [
    { id: "events", label: "Events" },
    { id: "workflows", label: "Workflows" },
  ];
  return (
    <div
      role="group"
      aria-label="Data source"
      style={{
        display: "inline-flex",
        border: "1px solid var(--color-ov-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-ov-card)",
      }}
    >
      {opts.map((o, i) => (
        <button
          key={o.id}
          aria-pressed={o.id === viewMode}
          onClick={() => onChange(o.id)}
          style={{
            padding: "8px 14px",
            border: "none",
            borderLeft: i === 0 ? "none" : "1px solid var(--color-ov-border)",
            background: o.id === viewMode ? "var(--color-ov-patient)" : "transparent",
            color: o.id === viewMode ? "#fff" : "var(--color-ov-text)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: o.id === viewMode ? 700 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
