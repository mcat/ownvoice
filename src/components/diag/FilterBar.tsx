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
  /** Search input placeholder. Varies by diag role — Healthcare's view
   *  pins a namespace filter, so the placeholder reflects that. */
  searchPlaceholder?: string;
}

const labelStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--color-ov-sub)",
};

const controlStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--color-ov-text)",
  background: "var(--color-ov-card)",
  border: "1px solid var(--color-ov-border)",
  borderRadius: 6,
  padding: "6px 10px",
};

export function FilterBar({ value, patients, onChange, searchPlaceholder = "speak. or substring" }: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "10px 0",
        flexWrap: "wrap",
      }}
    >
      <label htmlFor="filter-patient" style={labelStyle}>Patient</label>
      <select
        id="filter-patient"
        value={value.patientId ?? ""}
        onChange={(e) => onChange({ ...value, patientId: (e.target as HTMLSelectElement).value || null })}
        style={controlStyle}
      >
        <option value="">All</option>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <label htmlFor="filter-date" style={labelStyle}>Date</label>
      <select
        id="filter-date"
        value={value.datePreset}
        onChange={(e) => onChange({ ...value, datePreset: (e.target as HTMLSelectElement).value as DatePreset })}
        style={controlStyle}
      >
        <option value="today">Today</option>
        <option value="last24h">Last 24h</option>
        <option value="last7d">Last 7 days</option>
        <option value="last30d">Last 30 days</option>
        <option value="all">All (retention)</option>
      </select>

      <label htmlFor="filter-severity" style={labelStyle}>Severity</label>
      <select
        id="filter-severity"
        value={String(value.minSeverity)}
        onChange={(e) => onChange({ ...value, minSeverity: Number((e.target as HTMLSelectElement).value) })}
        style={controlStyle}
      >
        <option value="5">DEBUG+</option>
        <option value="9">INFO+</option>
        <option value="13">WARN+</option>
        <option value="17">ERROR+</option>
      </select>

      <label htmlFor="filter-search" style={labelStyle}>Search</label>
      <input
        id="filter-search"
        type="search"
        value={value.search}
        placeholder={searchPlaceholder}
        onInput={(e) => onChange({ ...value, search: (e.target as HTMLInputElement).value })}
        style={{ ...controlStyle, flex: 1, minWidth: 200 }}
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
