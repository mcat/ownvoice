import type { JSX } from "preact";
import { BottomSheet } from "../shared/BottomSheet";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { ThemeTokens } from "../../theme/tokens";

interface Props {
  onClose: () => void;
  t: ThemeTokens;
}

/**
 * Staff entry point. Replaces the previous trio of always-visible
 * Patients / Settings / End Session nav buttons with a single PIN-gated
 * "Staff" button that opens this sheet.
 *
 * The patient never sees Patients or Settings on the header; staff get all
 * three actions (plus End Session, when authed) in one focused surface.
 *
 * Each action closes this sheet first to avoid stacked sheets — the next
 * overlay opens against the already-collapsed staff sheet.
 */
export function StaffSheet({ onClose, t }: Props) {
  const bump = useStaffActivityBump();
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const staffAuthed = useUIStore((s) => s.staffAuthed);

  function handlePatients() {
    onClose();
    useUIStore.getState().openOverlay("switch");
  }

  function handleSettings() {
    onClose();
    useUIStore.getState().openOverlay("settings");
  }

  function handleEndSession() {
    // Close FIRST so the active overlay state is clean before we wipe auth.
    onClose();
    useUIStore.getState().endStaffSession();
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
      <BottomSheet onClose={onClose} t={t} heightVh="auto">
        <BottomSheet.Header>
          <BottomSheet.Title>
            {resolvePhrase("ui.provider.staff_sheet.title", caregiverLang)}
          </BottomSheet.Title>
          <BottomSheet.CloseButton
            aria-label={resolvePhrase("ui.provider.staff_sheet.close_aria", caregiverLang)}
          />
        </BottomSheet.Header>
        <BottomSheet.Body>
          <ul style={listStyle}>
            <li>
              <ActionCard
                icon={"👥"}
                label={resolvePhrase("ui.provider.patients.title", caregiverLang)}
                description={resolvePhrase("ui.provider.staff_sheet.patients_description", caregiverLang)}
                onClick={handlePatients}
                t={t}
              />
            </li>
            <li>
              <ActionCard
                icon={"⚙️"}
                label={resolvePhrase("ui.provider.settings.title", caregiverLang)}
                description={resolvePhrase("ui.provider.staff_sheet.settings_description", caregiverLang)}
                onClick={handleSettings}
                t={t}
              />
            </li>
            {staffAuthed && (
              <li>
                <ActionCard
                  icon={"🔒"}
                  label={resolvePhrase("ui.provider.nav.end_staff_session", caregiverLang)}
                  description={resolvePhrase("ui.provider.staff_sheet.end_session_description", caregiverLang)}
                  onClick={handleEndSession}
                  tone="destructive"
                  t={t}
                />
              </li>
            )}
          </ul>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}

interface ActionCardProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  tone?: "neutral" | "destructive";
  t: ThemeTokens;
}

function ActionCard({ icon, label, description, onClick, tone = "neutral", t }: ActionCardProps) {
  const isDestructive = tone === "destructive";
  const buttonStyle: JSX.CSSProperties = {
    width: "100%",
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.card,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
    color: isDestructive ? "#DC2626" : t.text,
  };

  return (
    <button type="button" onClick={onClick} style={buttonStyle}>
      <span aria-hidden="true" style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>{description}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 18, color: t.muted, lineHeight: 1 }}>
        {"›"}
      </span>
    </button>
  );
}

const listStyle: JSX.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
