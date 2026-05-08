export type DatePreset = "today" | "last24h" | "last7d" | "last30d" | "all";

export interface FilterBarValue {
  patientId: string | null;
  datePreset: DatePreset;
  minSeverity: number;
  search: string;
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
