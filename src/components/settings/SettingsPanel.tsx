import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { PatientsSection } from "./sections/PatientsSection";
import { AccessibilitySection } from "./sections/AccessibilitySection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { DiagnosticsSection } from "./sections/DiagnosticsSection";
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
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const bump = useStaffActivityBump();

  function updateCfg(partial: Partial<AppSettings>): void {
    onUpdate({ ...cfg, ...partial });
  }

  function handleEndSession() {
    onClose();
    useUIStore.getState().endStaffSession();
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
      <BottomSheet onClose={onClose} t={t} zIndex={z.sheetStacked}>
        <BottomSheet.Header>
          <BottomSheet.Title>{resolvePhrase("ui.provider.settings.title", caregiverLang)}</BottomSheet.Title>
          {/* End-Session lock — shown only when authed. Replaces the
              top-level "End Staff Session" tile from the old StaffSheet
              middle layer. The lock motif keeps the PIN-gate cue visible
              from inside the panel. */}
          {staffAuthed && (
            <button
              type="button"
              onClick={handleEndSession}
              aria-label={resolvePhrase("ui.provider.nav.end_staff_session", caregiverLang)}
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                padding: 8,
                minWidth: 64,
                minHeight: 64,
                cursor: "pointer",
                color: t.muted,
                fontFamily: "inherit",
                lineHeight: 1,
              }}
            >
              {"\u{1F512}"}
            </button>
          )}
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
          {/* Flat staff workspace: Patients pushes into PatientsScreen;
              the rest are inline sections. Order is intentional — Patients
              first because shift-handoff usually starts there, Reset last
              because it nukes everything. */}
          <div style={{ padding: "0 4px" }}>
            <PatientsSection t={t} />
            <CareTeamSection
              cfg={cfg}
              t={t}
              theme={theme}
            />
            <AccessibilitySection cfg={cfg} updateCfg={updateCfg} t={t} />
            <DiagnosticsSection t={t} />
            <AboutSection t={t} />
            <ResetSection onReset={onReset} t={t} theme={theme} />
          </div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}
