import type { AppSettings } from "../types";
import { pauseAll, resumeAll } from "./audioCacheRunner";

/**
 * Pause the audio-cache pre-gen run whenever the tab goes hidden, and
 * resume on the way back. iPad Safari runs background tabs at lower
 * priority and treats their allocations as eviction candidates, so a
 * 700-phrase pre-gen continuing in the background competes with
 * whatever foreground app the clinician switched to — and contributes
 * to renderer-side memory pressure that can surface as our own tab
 * getting OOM-killed when it returns to the foreground.
 *
 * Returns an unsubscribe function.
 *
 * `getCfg` is invoked on each visible transition so the resume picks
 * up the *current* settings — relevant if the patient was switched
 * while the tab was hidden.
 */
export function backoffPregenOnHidden(
  getCfg: () => AppSettings | null,
): () => void {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      pauseAll();
      return;
    }
    const cfg = getCfg();
    if (cfg) {
      void resumeAll(cfg);
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
