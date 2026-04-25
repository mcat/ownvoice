import type { JSX } from "preact";
import type { ThemeTokens } from "../../theme/tokens";

interface SettingsNavRowProps {
  /** Leading icon — emoji or short glyph. Marked aria-hidden; the label carries semantics. */
  icon: string;
  /** Primary label, e.g. "Care Team" or "Accessibility". */
  label: string;
  /** Optional one-liner under the label. */
  description?: string;
  /** Optional trailing badge (e.g. "(3)" for patient count). Sits inline with the label. */
  badge?: string;
  onClick: () => void;
  t: ThemeTokens;
}

/**
 * Generic nav row for the flat Settings panel — used by Patients, Care
 * Team, Accessibility, Diagnostics, and About to push into their
 * respective sub-panels. Icon + label + optional description + chevron,
 * matching iPadOS Settings row anatomy.
 */
export function SettingsNavRow({ icon, label, description, badge, onClick, t }: SettingsNavRowProps) {
  return (
    <button type="button" onClick={onClick} style={rowStyle(t)}>
      <span aria-hidden="true" style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: t.text }}>
          {label}
          {badge && (
            <span style={{ fontWeight: 500, color: t.muted, marginInlineStart: 6 }}>{badge}</span>
          )}
        </span>
        {description && (
          <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>{description}</span>
        )}
      </span>
      <span aria-hidden="true" style={{ fontSize: 18, color: t.muted, lineHeight: 1 }}>
        {"›"}
      </span>
    </button>
  );
}

function rowStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    width: "100%",
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.card,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
    color: t.text,
  };
}
