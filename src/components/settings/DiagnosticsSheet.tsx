import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsSubPanel } from "./SettingsSubPanel";
import { DiagnosticsSection } from "./sections/DiagnosticsSection";

interface Props {
  t: ThemeTokens;
}

export function DiagnosticsSheet({ t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  return (
    <SettingsSubPanel
      title={resolvePhrase("ui.provider.settings.offline.heading", caregiverLang)}
      overlay="diagnostics"
      t={t}
    >
      <DiagnosticsSection t={t} />
    </SettingsSubPanel>
  );
}
