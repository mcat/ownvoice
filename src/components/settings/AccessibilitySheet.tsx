import type { AppSettings } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsSubPanel } from "./SettingsSubPanel";
import { AccessibilitySection } from "./sections/AccessibilitySection";

interface Props {
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  t: ThemeTokens;
}

export function AccessibilitySheet({ cfg, onUpdate, t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  function updateCfg(partial: Partial<AppSettings>): void {
    onUpdate({ ...cfg, ...partial });
  }

  return (
    <SettingsSubPanel
      title={resolvePhrase("ui.provider.settings.accessibility.heading", caregiverLang)}
      overlay="accessibility"
      t={t}
    >
      <AccessibilitySection cfg={cfg} updateCfg={updateCfg} t={t} />
    </SettingsSubPanel>
  );
}
