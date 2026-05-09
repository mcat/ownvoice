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
    <div
      role="group"
      aria-label="View as"
      style={{
        display: "inline-flex",
        gap: 0,
        border: "1px solid var(--color-ov-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-ov-card)",
      }}
    >
      {ROLES.map((r, i) => (
        <button
          key={r.id}
          aria-pressed={r.id === role}
          onClick={() => onChange(r.id)}
          style={{
            padding: "8px 14px",
            border: "none",
            borderLeft: i === 0 ? "none" : "1px solid var(--color-ov-border)",
            background: r.id === role ? "var(--color-ov-patient)" : "transparent",
            color: r.id === role ? "#fff" : "var(--color-ov-text)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: r.id === role ? 700 : 400,
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
