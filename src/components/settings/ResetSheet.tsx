import type { JSX } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { confirm } from "../shared/ConfirmDialog";
import { resetPatients, resetCareTeam } from "../../stores/resetScoped";
import { SettingsSubPanel } from "./SettingsSubPanel";

interface Props {
  /** Full-device reset. Stays a prop because resetAll lives in the App
   *  layer (it touches service-worker registration), and we want the
   *  same handler the rest of the app already wires up. */
  onResetEverything: () => void | Promise<void>;
  t: ThemeTokens;
}

interface ScopedAction {
  /** Stable id for keys + tests. */
  id: "patients" | "care_team" | "everything";
  labelKey: PhraseKey;
  descriptionKey: PhraseKey;
  confirmTitleKey: PhraseKey;
  confirmBodyKey: PhraseKey;
  confirmActionKey: PhraseKey;
  run: (deps: { onResetEverything: () => void | Promise<void> }) => void | Promise<void>;
  /**
   * How many records this action would erase. `null` means "not
   * applicable / always available" — the row never disables and the
   * label never shows a count badge. Used by the "Erase Everything"
   * row, which targets non-countable state (cached models, SW
   * registration, theme prefs) and can run even when the device has
   * zero patients/providers.
   */
  count: (cfg: { patients: unknown[]; providers: unknown[] }) => number | null;
}

const ACTIONS: readonly ScopedAction[] = [
  {
    id: "patients",
    labelKey: "ui.provider.settings.reset.patients.label",
    descriptionKey: "ui.provider.settings.reset.patients.description",
    confirmTitleKey: "ui.provider.settings.reset.patients.confirm_title",
    confirmBodyKey: "ui.provider.settings.reset.patients.confirm_body",
    confirmActionKey: "ui.provider.settings.reset.confirm_action",
    run: () => resetPatients(),
    count: (cfg) => cfg.patients.length,
  },
  {
    id: "care_team",
    labelKey: "ui.provider.settings.reset.care_team.label",
    descriptionKey: "ui.provider.settings.reset.care_team.description",
    confirmTitleKey: "ui.provider.settings.reset.care_team.confirm_title",
    confirmBodyKey: "ui.provider.settings.reset.care_team.confirm_body",
    confirmActionKey: "ui.provider.settings.reset.confirm_action",
    run: () => resetCareTeam(),
    count: (cfg) => cfg.providers.length,
  },
  {
    id: "everything",
    labelKey: "ui.provider.settings.reset.everything.label",
    descriptionKey: "ui.provider.settings.reset.everything.description",
    confirmTitleKey: "ui.provider.settings.reset.confirm_title",
    confirmBodyKey: "ui.provider.settings.reset.confirm_body",
    confirmActionKey: "ui.provider.settings.reset.confirm_destructive",
    run: ({ onResetEverything }) => onResetEverything(),
    count: () => null,
  },
] as const;

/**
 * Reset sub-panel. Three scoped destructive actions, each gated by the
 * shared ConfirmDialog. Patient and care-team scopes leave the user in
 * the panel (chainable). Full reset hands off to onResetEverything which
 * tears down enough state that App.tsx re-renders into Setup.
 */
export function ResetSheet({ onResetEverything, t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const patientCount = useSettingsStore((s) => s.cfg?.patients.length ?? 0);
  const providerCount = useSettingsStore((s) => s.cfg?.providers.length ?? 0);

  async function trigger(action: ScopedAction) {
    const ok = await confirm({
      title: resolvePhrase(action.confirmTitleKey, caregiverLang),
      body: resolvePhrase(action.confirmBodyKey, caregiverLang),
      confirmLabel: resolvePhrase(action.confirmActionKey, caregiverLang),
      cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang),
      tone: "destructive",
    });
    if (!ok) return;
    if (action.id === "everything") {
      // Full reset closes the sheet and the entire app re-renders into
      // Setup. Closing the overlay first avoids a stale sheet flashing
      // before the Setup gate kicks in.
      useUIStore.getState().closeOverlay("reset");
    }
    await action.run({ onResetEverything });
  }

  return (
    <SettingsSubPanel
      title={resolvePhrase("ui.provider.settings.reset.heading", caregiverLang)}
      overlay="reset"
      t={t}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {ACTIONS.map((action) => {
          const count = action.count({
            patients: Array(patientCount),
            providers: Array(providerCount),
          });
          // `count === null` means "always enabled" (Erase Everything).
          // count === 0 means there is nothing in scope to erase, so
          // disable the row to keep destructive actions honest.
          const disabled = count === 0;
          const baseLabel = resolvePhrase(action.labelKey, caregiverLang);
          const label = count != null && count > 0 ? `${baseLabel} (${count})` : baseLabel;
          const description = disabled
            ? resolvePhrase("ui.provider.settings.reset.empty_hint", caregiverLang)
            : resolvePhrase(action.descriptionKey, caregiverLang);
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => { if (!disabled) void trigger(action); }}
              disabled={disabled}
              style={destructiveRowStyle(t, disabled)}
              data-testid={`reset-${action.id}`}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: disabled ? t.muted : "#DC2626" }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSubPanel>
  );
}

function destructiveRowStyle(t: ThemeTokens, disabled: boolean): JSX.CSSProperties {
  return {
    width: "100%",
    minHeight: 64,
    padding: "16px 18px",
    borderRadius: 12,
    border: `1px solid ${disabled ? t.border : "#DC2626"}`,
    background: t.card,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "inherit",
    textAlign: "start",
    display: "flex",
    alignItems: "center",
    gap: 12,
  };
}
