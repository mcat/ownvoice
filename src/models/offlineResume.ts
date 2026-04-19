import { loadManifest } from "./modelsManifest";
import { primeOffline } from "./offlinePrimer";
import { useOfflineStore } from "../stores/offlineStore";

const PROGRESS_SUFFIX = "._progress.json";

/**
 * Scans `/models/**` in OPFS for any file matching `*._progress.json`.
 * Returns true if at least one partial download exists.
 */
export async function hasPendingDownloads(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle("models", { create: false });
    for await (const entry of modelsDir.values()) {
      if (entry.kind !== "directory") continue;
      for await (const child of entry.values()) {
        if (child.kind === "file" && child.name.endsWith(PROGRESS_SUFFIX)) {
          return true;
        }
      }
    }
  } catch {
    // /models/ doesn't exist yet, scan failed, or OPFS unavailable — treat
    // as "no pending downloads" so the app does not block on a missing store.
  }
  return false;
}

async function runPrimer(): Promise<void> {
  const s = useOfflineStore.getState();
  if (s.primerRunning) return;

  const manifest = await loadManifest();
  s.setPrimerRunning(true);
  try {
    for await (const ev of primeOffline(manifest)) {
      if (ev.type === "download-progress") {
        s.reportProgress(ev.model, ev.file, ev.loaded, ev.total);
      } else if (ev.type === "model-verified") {
        s.setModelVerified(ev.model, ev.ok);
      } else if (ev.type === "complete") {
        s.markPrimerComplete();
      }
    }
  } finally {
    useOfflineStore.getState().setPrimerRunning(false);
  }
}

async function maybeResume(): Promise<void> {
  if (useOfflineStore.getState().primerRunning) return;
  if (!(await hasPendingDownloads())) return;
  try {
    await runPrimer();
  } catch (err) {
    console.warn("[OwnVoice] opportunistic resume failed:", err);
  }
}

/**
 * Register a visibilitychange listener that opportunistically resumes
 * interrupted model downloads. A clinician walking past a Wi-Fi access
 * point with the app open (but tab backgrounded) will trigger a resume
 * when the tab becomes visible.
 *
 * Also runs once synchronously if the tab is already visible, so partials
 * left on disk from a prior session get picked up on app boot.
 *
 * Returns an unsubscribe function.
 */
export function resumePendingOnVisible(): () => void {
  const handler = () => {
    if (document.visibilityState !== "visible") return;
    void maybeResume();
  };
  document.addEventListener("visibilitychange", handler);

  if (document.visibilityState === "visible") {
    void maybeResume();
  }

  return () => document.removeEventListener("visibilitychange", handler);
}
