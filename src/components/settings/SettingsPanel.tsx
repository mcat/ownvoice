import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { PatientInfoSection } from "./sections/PatientInfoSection";
import { PatientsSection } from "./sections/PatientsSection";
import { AccessibilitySection } from "./sections/AccessibilitySection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { OfflineReadinessSection } from "./sections/OfflineReadinessSection";
import { ResetSection } from "./sections/ResetSection";

interface SettingsPanelProps {
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  onReset: () => void | Promise<void>;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/**
 * Settings are auto-persisted on every change — no Save button.
 * Matches Apple HIG ("Make saving automatic when possible"). Child
 * sections receive `updateCfg(partial)` and fire it from each field's
 * change handler; the merge + persist round-trip is synchronous via
 * Zustand, so controlled inputs stay in sync with what the user types
 * without input lag.
 *
 * Provider changes (add/remove/voice capture) already commit directly
 * to the settings store from inside CareTeamSection.
 */
export function SettingsPanel({
  cfg,
  onUpdate,
  onReset,
  onClose,
  t,
  theme,
}: SettingsPanelProps) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  function updateCfg(partial: Partial<AppSettings>): void {
    onUpdate({ ...cfg, ...partial });
  }

  return (
    <BottomSheet onClose={onClose} t={t} zIndex={z.sheetStacked}>
      <BottomSheet.Header>
        <BottomSheet.Title>{resolvePhrase("ui.provider.settings.title", caregiverLang)}</BottomSheet.Title>
        {/* "Done" text link instead of X — matches iPadOS convention for settings sheets. */}
        <BottomSheet.CloseButton
          aria-label={resolvePhrase("ui.provider.settings.close_aria", caregiverLang)}
          style={{
            fontSize: 16,
            color: t.muted,
            padding: "8px 12px",
            minWidth: 64,
            minHeight: 64,
            fontFamily:
              "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
          }}
        >
          {resolvePhrase("ui.provider.settings.done", caregiverLang)}
        </BottomSheet.CloseButton>
      </BottomSheet.Header>

      <BottomSheet.Body>
        <div style={{ padding: "0 4px" }}>
          <PatientInfoSection
            cfg={cfg}
            updateCfg={updateCfg}
            t={t}
            theme={theme}
          />
          <AccessibilitySection cfg={cfg} updateCfg={updateCfg} t={t} />
          <CareTeamSection
            cfg={cfg}
            t={t}
            theme={theme}
          />
          <PatientsSection t={t} theme={theme} />
          <AboutSection t={t} />
          <OfflineReadinessSection t={t} />
          <ResetSection onReset={onReset} t={t} theme={theme} />
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
