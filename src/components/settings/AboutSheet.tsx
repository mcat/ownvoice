import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsSubPanel } from "./SettingsSubPanel";
import { AboutSection } from "./sections/AboutSection";

interface Props {
  t: ThemeTokens;
}

export function AboutSheet({ t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  return (
    <SettingsSubPanel
      title={resolvePhrase("ui.provider.settings.about.heading", caregiverLang)}
      overlay="about"
      t={t}
    >
      <AboutSection t={t} />
    </SettingsSubPanel>
  );
}
