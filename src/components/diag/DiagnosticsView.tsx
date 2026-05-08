import { useEffect, useState } from "preact/hooks";
import { openAuditDb } from "../../audit/db";
import { subscribe } from "../../audit/logger";
import type { AuditRecord } from "../../audit/types";

export interface DiagnosticsViewProps {
  onClose: () => void;
}

export function DiagnosticsView({ onClose }: DiagnosticsViewProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [severityFloor, setSeverityFloor] = useState(5);
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
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const visible = records.filter((r) => {
    if ((r.severity_number ?? 9) < severityFloor) return false;
    if (search && !r.name.includes(search)) return false;
    return true;
  });

  function exportJson() {
    const blob = new Blob([JSON.stringify(visible, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ownvoice-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      role="dialog"
      aria-label="Diagnostics"
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        color: "#000",
        zIndex: 1000,
        padding: 16,
        overflow: "auto",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={onClose} style={{ padding: 8 }}>
          Close
        </button>
        <input
          placeholder="filter by name"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          style={{ flex: 1, padding: 8 }}
        />
        <select
          value={severityFloor}
          onChange={(e) =>
            setSeverityFloor(Number((e.target as HTMLSelectElement).value))
          }
        >
          <option value={5}>DEBUG+</option>
          <option value={9}>INFO+</option>
          <option value={13}>WARN+</option>
          <option value={17}>ERROR+</option>
        </select>
        <button onClick={exportJson} style={{ padding: 8 }}>
          Export JSON
        </button>
      </div>
      <table style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Time</th>
            <th style={{ textAlign: "left" }}>Sev</th>
            <th style={{ textAlign: "left" }}>Name</th>
            <th style={{ textAlign: "left" }}>Attrs</th>
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
