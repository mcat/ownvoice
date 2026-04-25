import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore, type OverlayName } from "../../stores/uiStore";
import { SettingsNavRow } from "./SettingsNavRow";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";

interface SettingsPanelProps {
  /**
   * Currently unused — sub-panels (Care Team, Accessibility) read settings
   * directly from the store. Kept on the props for symmetry with how Setup
   * still hands cfg in elsewhere; safe to remove later if no consumer needs it.
   */
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/**
 * Root Settings panel. iPadOS-style flat list of nav rows that push into
 * dedicated sub-panels (Patients, Care Team, Accessibility, Diagnostics,
 * About) plus a destructive Reset action inline at the bottom.
 *
 * Tapping a row closes this panel and opens the corresponding sub-panel
 * overlay; the sub-panel's "‹ Settings" back button reverses the swap.
 * "Done" on either dismisses the whole flow.
 */
export function SettingsPanel({
  onClose,
  t,
}: SettingsPanelProps) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const patientCount = useSettingsStore((s) => s.cfg?.patients.length ?? 0);
  const providerCount = useSettingsStore((s) => s.cfg?.providers.length ?? 0);
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const bump = useStaffActivityBump();

  function pushTo(overlay: Extract<OverlayName, "switch" | "careTeam" | "accessibility" | "diagnostics" | "about" | "reset">) {
    useUIStore.getState().closeOverlay("settings");
    useUIStore.getState().openOverlay(overlay);
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
          <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 10 }}>
            <SettingsNavRow
              icon={"👥"}
              label={resolvePhrase("ui.provider.patients.title", caregiverLang)}
              description={resolvePhrase("ui.provider.staff_sheet.patients_description", caregiverLang)}
              badge={patientCount > 0 ? `(${patientCount})` : undefined}
              onClick={() => pushTo("switch")}
              t={t}
            />
            <SettingsNavRow
              icon={"🩺"}
              label={resolvePhrase("ui.provider.settings.care_team.heading", caregiverLang)}
              badge={providerCount > 0 ? `(${providerCount})` : undefined}
              onClick={() => pushTo("careTeam")}
              t={t}
            />
            <SettingsNavRow
              icon={"♿"}
              label={resolvePhrase("ui.provider.settings.accessibility.heading", caregiverLang)}
              onClick={() => pushTo("accessibility")}
              t={t}
            />
            <SettingsNavRow
              icon={"🩻"}
              label={resolvePhrase("ui.provider.settings.offline.heading", caregiverLang)}
              onClick={() => pushTo("diagnostics")}
              t={t}
            />
            <SettingsNavRow
              icon={"ℹ️"}
              label={resolvePhrase("ui.provider.settings.about.heading", caregiverLang)}
              onClick={() => pushTo("about")}
              t={t}
            />
            {/* Reset is a sub-panel of its own — three scoped destructive
                actions (patients only / care team only / everything). The
                row keeps the destructive red treatment so it reads as
                dangerous even before the user pushes in. */}
            <SettingsNavRow
              icon={"🧹"}
              label={resolvePhrase("ui.provider.settings.reset.row_label", caregiverLang)}
              description={resolvePhrase("ui.provider.settings.reset.row_description", caregiverLang)}
              onClick={() => pushTo("reset")}
              t={t}
            />
          </div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}
