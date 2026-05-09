// Keeps the iPad screen awake while OwnVoice is foregrounded. Without this
// the device dims and locks during multi-minute composing sessions, which
// is the dominant complaint about iPad-based AAC tools in clinical
// observation. Honors the `keepScreenAwake` setting so power-conscious
// stations can opt out.
//
// iPadOS auto-releases the lock on backgrounding (visibility hidden), so
// we re-acquire on visibilitychange. Failures are logged but never thrown:
// low-power mode and some embedded contexts disallow the API entirely,
// and a missing wake lock should not break the app.

import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import { useSettingsStore } from "../stores/settingsStore";

let sentinel: WakeLockSentinel | null = null;
let started = false;
let desired = true;

async function acquire(): Promise<void> {
  if (sentinel != null) return;
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    log({ name: EVENT.WAKE_LOCK_ACQUIRED });
    sentinel.addEventListener("release", () => {
      sentinel = null;
      log({ name: EVENT.WAKE_LOCK_RELEASED });
    });
  } catch (err) {
    sentinel = null;
    log({
      name: EVENT.WAKE_LOCK_FAILED,
      severity: "WARN",
      attributes: {
        [ATTR.ERROR_TYPE]: (err as Error)?.name ?? "WakeLockError",
        [ATTR.ERROR_MESSAGE]: (err as Error)?.message ?? String(err),
      },
    });
  }
}

async function release(): Promise<void> {
  if (sentinel == null) return;
  try {
    await sentinel.release();
  } catch {
    // sentinel was already released by the system; no-op
  }
  sentinel = null;
}

function onVisibility(): void {
  if (document.visibilityState === "visible" && desired) {
    void acquire();
  }
}

/**
 * Boot the wake-lock controller. Idempotent — safe to call once at
 * app start (e.g., from main-app.tsx after settings hydrate).
 *
 * The controller subscribes to settingsStore so toggling
 * `keepScreenAwake` in Settings immediately acquires or releases the
 * underlying lock without a reload.
 */
export function startWakeLock(): void {
  if (started) return;
  started = true;

  const sync = (keep: boolean): void => {
    desired = keep;
    if (keep) {
      void acquire();
    } else {
      void release();
    }
  };

  // `keepScreenAwake` defaults to `true` when undefined — we want the
  // lock on by default for the bedside-iPad use case; opt-out is in
  // Settings. nullish-coalesce handles cfg-not-yet-hydrated too.
  sync(useSettingsStore.getState().cfg?.keepScreenAwake ?? true);

  useSettingsStore.subscribe((s, prev) => {
    const next = s.cfg?.keepScreenAwake ?? true;
    const before = prev.cfg?.keepScreenAwake ?? true;
    if (next !== before) sync(next);
  });

  document.addEventListener("visibilitychange", onVisibility);
}
