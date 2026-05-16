import { useSettingsStore } from "../stores/settingsStore";
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
 * `pauseAll` only fires the JS-side `AbortController`; an in-flight
 * synth that's already in the worker continues to completion and its
 * output is discarded by the caller's signal check. That's the cost
 * of preempting an un-cancellable worker — backoff is "no new synths
 * after the current one," not "stop right now."
 *
 * Returns an unsubscribe function.
 */
export function backoffPregenOnHidden(): () => void {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      pauseAll();
      return;
    }
    const cfg = useSettingsStore.getState().cfg;
    if (!cfg) return;
    resumeAll(cfg).catch((err) => {
      console.warn("[OwnVoice] pregen resume failed:", err);
    });
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
