import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";

interface DraftActionsProps {
  providerName: string;
  addDisabled: boolean;
  onAdd: () => void;
  onDiscard: () => void;
  t: ThemeTokens;
}

export function DraftActions({
  providerName,
  addDisabled,
  onAdd,
  onDiscard,
  t,
}: DraftActionsProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        aria-label={`Add as ${providerName}`}
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: "none",
          background: addDisabled ? t.muted : colors.provider.light,
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 600,
          cursor: addDisabled ? "not-allowed" : "pointer",
          opacity: addDisabled ? 0.5 : 1,
        }}
      >
        ✓ Add as {providerName}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        aria-label="Discard draft"
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: `1px solid ${colors.urgent}`,
          background: "transparent",
          color: colors.urgent,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ✕ Discard
      </button>
    </div>
  );
}
