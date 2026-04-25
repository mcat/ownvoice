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
  },
  {
    id: "care_team",
    labelKey: "ui.provider.settings.reset.care_team.label",
    descriptionKey: "ui.provider.settings.reset.care_team.description",
    confirmTitleKey: "ui.provider.settings.reset.care_team.confirm_title",
    confirmBodyKey: "ui.provider.settings.reset.care_team.confirm_body",
    confirmActionKey: "ui.provider.settings.reset.confirm_action",
    run: () => resetCareTeam(),
  },
  {
    id: "everything",
    labelKey: "ui.provider.settings.reset.everything.label",
    descriptionKey: "ui.provider.settings.reset.everything.description",
    confirmTitleKey: "ui.provider.settings.reset.confirm_title",
    confirmBodyKey: "ui.provider.settings.reset.confirm_body",
    confirmActionKey: "ui.provider.settings.reset.confirm_destructive",
    run: ({ onResetEverything }) => onResetEverything(),
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
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => { void trigger(action); }}
            style={destructiveRowStyle(t)}
            data-testid={`reset-${action.id}`}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>
                {resolvePhrase(action.labelKey, caregiverLang)}
              </span>
              <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>
                {resolvePhrase(action.descriptionKey, caregiverLang)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </SettingsSubPanel>
  );
}

function destructiveRowStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    width: "100%",
    minHeight: 64,
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid #DC2626",
    background: t.card,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
    display: "flex",
    alignItems: "center",
    gap: 12,
  };
}
