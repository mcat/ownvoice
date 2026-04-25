import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { STAFF_SESSION_TIMEOUT_MS } from "../shared/StaffSessionTimer";
import type { ThemeTokens } from "../../theme/tokens";

interface Props {
  onOpenSettings: () => void;
  t: ThemeTokens;
}

const PILL_HEIGHT = 64;
const HALF_WIDTH = 64;
const SETTINGS_ICON = "\u{1F510}"; // 🔐 — locked-with-key (Settings gate)
const LOCK_ICON = "\u{1F512}"; // 🔒 — closed padlock (lock-now action)

/**
 * Compound header affordance: a single pill containing the Settings
 * entry button and (when authed) a Lock+countdown button. Two real
 * <button> siblings — no nested-interactive — sharing a unified pill
 * chrome so the two actions read as related but tap independently.
 *
 * Unauthed: renders as a 64×64 standalone Settings button — visually
 * identical to the previous standalone Settings Btn so the entry
 * surface stays familiar.
 *
 * Authed: grows to 128×64 with a hairline divider. Left half opens
 * Settings, right half ends the staff session immediately. The
 * countdown is advisory — actual auto-lock fires through
 * StaffSessionTimer's WarningToast.
 */
export function SettingsLockPill({ onOpenSettings, t }: Props) {
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const staffAuthedAt = useUIStore((s) => s.staffAuthedAt);
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  // Once-a-second tick to keep the countdown fresh. We don't store the
  // remaining time — Date.now() is read at render against the live
  // staffAuthedAt, so activity bumps reset the display for free.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!staffAuthed) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [staffAuthed]);

  const showLock = staffAuthed && staffAuthedAt != null;
  const remainingMs = showLock
    ? Math.max(0, staffAuthedAt + STAFF_SESSION_TIMEOUT_MS - Date.now())
    : 0;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isUrgent = remainingMs <= 60 * 1000;

  return (
    <div style={pillStyle(t)}>
      <Btn
        onClick={onOpenSettings}
        aria-label={resolvePhrase("ui.provider.nav.staff_menu", caregiverLang)}
        style={halfStyle({ side: showLock ? "left" : "solo" })}
      >
        <span aria-hidden="true">{SETTINGS_ICON}</span>
        <span style={labelStyle(t)}>
          {resolvePhrase("ui.provider.nav.staff_menu", caregiverLang)}
        </span>
      </Btn>
      {showLock && (
        <>
          <span aria-hidden="true" style={dividerStyle(t)} />
          <Btn
            onClick={() => useUIStore.getState().endStaffSession()}
            aria-label={resolvePhrase("ui.provider.nav.lock_now_aria", caregiverLang)}
            style={halfStyle({ side: "right" })}
          >
            <span aria-hidden="true">{LOCK_ICON}</span>
            <span style={countdownStyle(t, isUrgent)}>{display}</span>
          </Btn>
        </>
      )}
    </div>
  );
}

function pillStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    background: t.activeBg,
    borderRadius: 14,
    height: PILL_HEIGHT,
    display: "flex",
    alignItems: "stretch",
  };
}

/**
 * Per-half button chrome. The left and right halves only round their
 * outer corners so the pill reads as one shape; "solo" rounds all four
 * (used when the right half isn't rendered).
 */
function halfStyle({ side }: { side: "left" | "right" | "solo" }): JSX.CSSProperties {
  const radius = (() => {
    if (side === "solo") return 14;
    if (side === "left") return "14px 0 0 14px";
    return "0 14px 14px 0";
  })();
  return {
    background: "transparent",
    color: "inherit",
    border: "none",
    width: HALF_WIDTH,
    height: PILL_HEIGHT,
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    lineHeight: 1,
    fontSize: 22,
    borderRadius: radius,
  };
}

function dividerStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    width: 1,
    alignSelf: "stretch",
    // 12px top/bottom margins = 40px-tall line centered in the 64px
    // pill, matching iPadOS toolbar dividers.
    margin: "12px 0",
    background: t.border,
  };
}

function labelStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    color: t.sub,
    letterSpacing: 0.1,
  };
}

function countdownStyle(t: ThemeTokens, isUrgent: boolean): JSX.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    color: isUrgent ? "#DC2626" : t.sub,
    letterSpacing: 0.1,
    fontVariantNumeric: "tabular-nums",
  };
}
