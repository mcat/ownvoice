import { useEffect, useState } from "preact/hooks";
import { Btn } from "../shared/Btn";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { STAFF_SESSION_TIMEOUT_MS } from "../shared/StaffSessionTimer";
import type { ThemeTokens } from "../../theme/tokens";

interface Props {
  t: ThemeTokens;
}

/**
 * Header-mounted "Lock now" affordance with a live MM:SS countdown to
 * the auto-lock. Visible only while the staff session is authed; hidden
 * otherwise. Tap = end the staff session immediately.
 *
 * The countdown is advisory — the actual auto-lock is driven by
 * `StaffSessionTimer` (warning toast at T-60s, end-session at T+0).
 * Activity bumps update `staffAuthedAt` via `useStaffActivityBump`,
 * which propagates here through Zustand and resets the visible
 * countdown without remounting.
 */
export function HeaderLockButton({ t }: Props) {
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const staffAuthedAt = useUIStore((s) => s.staffAuthedAt);
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  // Force a re-render every second so the displayed remaining time
  // stays in sync. We don't store the time itself — Date.now() is read
  // at render against the live staffAuthedAt, so bumps and restarts
  // propagate naturally.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!staffAuthed) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [staffAuthed]);

  if (!staffAuthed || !staffAuthedAt) return null;

  const remainingMs = Math.max(
    0,
    staffAuthedAt + STAFF_SESSION_TIMEOUT_MS - Date.now(),
  );
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Tint the countdown red in the final 60s so it reads as urgent —
  // matches the WarningToast window where the user can also extend or
  // end the session.
  const isUrgent = remainingMs <= 60 * 1000;
  const labelColor = isUrgent ? "#DC2626" : t.sub;

  return (
    <Btn
      onClick={() => useUIStore.getState().endStaffSession()}
      aria-label={resolvePhrase("ui.provider.nav.lock_now_aria", caregiverLang)}
      style={{
        background: t.activeBg,
        color: t.sub,
        border: "none",
        borderRadius: 14,
        width: 64,
        height: 64,
        padding: 0,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        lineHeight: 1,
        fontSize: 22,
      }}
    >
      <span aria-hidden="true">{"\u{1F512}"}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: labelColor,
          letterSpacing: 0.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
    </Btn>
  );
}
