import { useEffect, useState } from "preact/hooks";
import { useUIStore } from "../../stores/uiStore";
import { useTheme } from "../../hooks/useTheme";
import { WarningToast } from "./WarningToast";

/**
 * StaffSessionTimer — mounts once in App.tsx alongside ConfirmDialogHost.
 *
 * Watches `staffAuthed` + `staffAuthedAt` and schedules a warning toast
 * 4 minutes after authentication (60 seconds before the 5-minute auto-lock).
 * The toast itself handles its own countdown; this component only controls
 * when to show it.
 */
export function StaffSessionTimer() {
  const { theme, t } = useTheme();
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const staffAuthedAt = useUIStore((s) => s.staffAuthedAt);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!staffAuthed || !staffAuthedAt) {
      setShowWarning(false);
      return;
    }

    // Warning fires 4:00 after staffAuthedAt (60s before auto-lock at 5:00)
    const WARNING_AT = staffAuthedAt + 4 * 60 * 1000;
    const now = Date.now();
    const delay = Math.max(0, WARNING_AT - now);

    const timeout = setTimeout(() => {
      setShowWarning(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [staffAuthed, staffAuthedAt]);

  if (!showWarning) return null;

  return (
    <WarningToast
      secondsTotal={60}
      onExtend={() => {
        useUIStore.getState().bumpStaffAuthed();
        setShowWarning(false);
      }}
      onEndNow={() => {
        useUIStore.getState().endStaffSession();
        setShowWarning(false);
      }}
      onAutoDismiss={() => {
        useUIStore.getState().endStaffSession();
        setShowWarning(false);
      }}
      t={t}
      theme={theme}
    />
  );
}
