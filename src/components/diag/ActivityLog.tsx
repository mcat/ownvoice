import { useEffect, useMemo, useState } from "preact/hooks";
import { useSettingsStore } from "../../stores/settingsStore";
import { queryEvents } from "../../audit/queryEvents";
import { patientIdHash } from "../../audit/hash";
import { buildExport } from "../../audit/exportFormats";
import { shareExport } from "../../audit/exportShare";
import { subscribe } from "../../audit/logger";
import { getServiceMetadata } from "../../audit/serviceMetadata";
import type { AuditRecord } from "../../audit/types";
import { ATTR } from "../../audit/attrs";
import { z } from "../../theme/z";
import { RoleToggle, type DiagRole } from "./RoleToggle";
import { FilterBar, presetToRange, type FilterBarValue } from "./FilterBar";
import { EventTable, type EventTableColumn } from "./EventTable";
import { ExportMenu, type ExportRequest } from "./ExportMenu";
import { PinPromptDialog } from "../../audit/pinPrompt";

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
        { id: "stack", header: "Detail", render: (r) =>
          String(r.attributes[ATTR.ERROR_STACK] ?? r.attributes[ATTR.ERROR_MESSAGE] ?? JSON.stringify(r.attributes)) },
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

  // Live append on new audit events.
  useEffect(() => {
    return subscribe((rec) => {
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
      position: "fixed", inset: 0, background: "#fff", zIndex: z.sheetStacked,
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
