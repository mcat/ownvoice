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
