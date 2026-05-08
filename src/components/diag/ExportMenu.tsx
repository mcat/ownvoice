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
        { label: "Unredacted export (PIN required)", request: { format: "otlp-json", redaction: "raw", needsPin: true } },
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
