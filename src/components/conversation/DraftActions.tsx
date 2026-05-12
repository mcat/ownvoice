import type { ThemeTokens } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";

interface DraftActionsProps {
  providerName: string;
  addDisabled: boolean;
  onAdd: () => void;
  onDiscard: () => void;
  locale: string;
  t: ThemeTokens;
}

export function DraftActions({
  providerName,
  addDisabled,
  onAdd,
  onDiscard,
  locale,
  t,
}: DraftActionsProps) {
  const addLabel = resolvePhrase("ui.thread.listen.add_as", locale).replace(
    "{provider}",
    providerName,
  );
  const discardLabel = resolvePhrase("ui.thread.listen.discard", locale);

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        aria-label={addLabel}
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
        ✓ {addLabel}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        aria-label={discardLabel}
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
        ✕ {discardLabel}
      </button>
    </div>
  );
}
