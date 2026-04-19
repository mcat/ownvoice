import { maybeResume } from "./offlineResume";

const SYNC_TAG = "resume-model-dl";

/**
 * Register a BackgroundSync tag so the browser can wake the service worker
 * when connectivity returns — even if the app tab is closed.
 *
 * Feature-detects `SyncManager` and `serviceWorker`. On platforms that lack
 * either (Safari as of iPadOS 18), this is a silent no-op. The existing
 * visibilitychange-based resume in offlineResume.ts handles those platforms.
 */
export async function registerResumeSync(): Promise<void> {
  if (!("SyncManager" in globalThis) || !navigator.serviceWorker) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(SYNC_TAG);
  } catch {
    // Registration can fail if the user revoked permissions or the SW is in a
    // broken state. Swallow — the visibility fallback still works.
  }
}

/**
 * Listen for `resume-partials` messages from the service worker's sync handler.
 * When received, kicks the same `maybeResume()` used by the visibility path.
 *
 * Returns an unsubscribe function. No-op if `serviceWorker` is unavailable.
 */
export function listenForSyncMessages(): () => void {
  if (!navigator.serviceWorker) return () => {};

  const handler = (ev: MessageEvent) => {
    if (ev.data?.type === "resume-partials") {
      void maybeResume();
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
