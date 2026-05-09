// Thin wrapper around the Badging API (`navigator.setAppBadge` /
// `clearAppBadge`). iPadOS 16.4+ and Chromium-flavored browsers honor
// these on installed PWAs to render a numeric badge on the home-screen
// icon.
//
// No callers yet — exposed for the future "unread provider message"
// surface. Wiring this stub in PR C means the Badging API path is
// review-tested before any feature actually drives it.

// `Navigator.setAppBadge` is in the DOM lib but is not implemented in
// every runtime; treat it as optional via runtime feature detection.
type MaybeBadging = {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function nav(): MaybeBadging | null {
  return typeof navigator === "undefined" ? null : (navigator as unknown as MaybeBadging);
}

/**
 * Show a numeric badge on the home-screen icon. Pass 0 to show a "dot"
 * style badge (some implementations render an unnumbered dot for
 * `setAppBadge(0)`); pass undefined to clear.
 *
 * Returns `true` if the API was reachable, `false` if unsupported.
 * Errors from the underlying call are swallowed and surfaced as `false`
 * so callers don't have to handle promise rejection — a missing badge is
 * a non-event for clinical use.
 */
export async function setBadge(count?: number): Promise<boolean> {
  const n = nav();
  if (!n?.setAppBadge) return false;
  try {
    await n.setAppBadge(count);
    return true;
  } catch {
    return false;
  }
}

/** Clear the home-screen badge. Returns `true` on success, `false` if
 *  unsupported. */
export async function clearBadge(): Promise<boolean> {
  const n = nav();
  if (!n?.clearAppBadge) return false;
  try {
    await n.clearAppBadge();
    return true;
  } catch {
    return false;
  }
}

/** Feature detection. Useful for gating UI that would call setBadge. */
export function isBadgingSupported(): boolean {
  return nav()?.setAppBadge != null;
}
