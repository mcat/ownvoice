import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsSubPanel } from "./SettingsSubPanel";
import { CareTeamSection } from "./sections/CareTeamSection";

interface Props {
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
}

export function CareTeamSheet({ cfg, t, theme }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  return (
    <SettingsSubPanel
      title={resolvePhrase("ui.provider.settings.care_team.heading", caregiverLang)}
      overlay="careTeam"
      t={t}
    >
      <CareTeamSection cfg={cfg} t={t} theme={theme} />
    </SettingsSubPanel>
  );
}
