import { useEffect, useState } from "preact/hooks";
import { useUIStore } from "../../stores/uiStore";
import { useTheme } from "../../hooks/useTheme";
import { WarningToast } from "./WarningToast";

/** Total staff-session lifetime, including the final 60s warning toast. */
export const STAFF_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
/** Warning toast appears this many ms before auto-lock. */
export const STAFF_SESSION_WARNING_MS = 60 * 1000;

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

    // Warning fires (timeout − warning) after staffAuthedAt; the toast
    // then runs its own 60s countdown before calling endStaffSession.
    const WARNING_AT =
      staffAuthedAt + (STAFF_SESSION_TIMEOUT_MS - STAFF_SESSION_WARNING_MS);
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
