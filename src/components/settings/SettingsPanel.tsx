import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { AccessibilitySection } from "./sections/AccessibilitySection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { OfflineReadinessSection } from "./sections/OfflineReadinessSection";
import { ResetSection } from "./sections/ResetSection";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";

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
  const bump = useStaffActivityBump();

  function updateCfg(partial: Partial<AppSettings>): void {
    onUpdate({ ...cfg, ...partial });
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
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
          {/* Settings now scopes to device + care team. Per-patient editing
              lives in PatientEditSheet (opened from the header pill or the
              Patients screen). */}
          <div style={{ padding: "0 4px" }}>
            <CareTeamSection
              cfg={cfg}
              t={t}
              theme={theme}
            />
            <AccessibilitySection cfg={cfg} updateCfg={updateCfg} t={t} />
            <OfflineReadinessSection t={t} />
            <AboutSection t={t} />
            <ResetSection onReset={onReset} t={t} theme={theme} />
          </div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}
