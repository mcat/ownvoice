import type { ComponentChildren } from "preact";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { useUIStore, type OverlayName } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { ThemeTokens } from "../../theme/tokens";

interface SettingsSubPanelProps {
  /** Title shown in the sheet header. */
  title: string;
  /** The overlay key this sub-panel is bound to (e.g. "careTeam"). */
  overlay: Extract<OverlayName, "careTeam" | "accessibility" | "diagnostics" | "about">;
  t: ThemeTokens;
  children: ComponentChildren;
}

/**
 * Shell for sub-panels reached from the main Settings list. Mirrors the
 * iPadOS push-nav contract:
 *  - Leading "‹ Settings" back button → closes self, re-opens settings.
 *  - Trailing "Done" → closes self only (the parent settings panel was
 *    already closed when the row was tapped, so Done here dismisses the
 *    whole flow).
 *
 * The activity-bump wrapper keeps the staff session alive while users
 * are inside a sub-panel — same hook the main SettingsPanel uses.
 */
export function SettingsSubPanel({ title, overlay, t, children }: SettingsSubPanelProps) {
  const bump = useStaffActivityBump();
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  function handleBack() {
    useUIStore.getState().closeOverlay(overlay);
    useUIStore.getState().openOverlay("settings");
  }

  function handleClose() {
    useUIStore.getState().closeOverlay(overlay);
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
      <BottomSheet onClose={handleClose} t={t} zIndex={z.sheetStacked}>
        <BottomSheet.Header>
          <BottomSheet.BackButton
            parentLabel={resolvePhrase("ui.provider.settings.title", caregiverLang)}
            onClick={handleBack}
          />
          <BottomSheet.Title>{title}</BottomSheet.Title>
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
          <div style={{ padding: "0 4px" }}>{children}</div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}
