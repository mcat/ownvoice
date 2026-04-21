import { useEffect } from "preact/hooks";
import { useSettingsStore } from "../stores/settingsStore";

/**
 * Syncs the `data-assistive` attribute on <html> from the patient's
 * Assistive Input Mode setting. CSS rules in app.css key off this
 * attribute to amplify focus rings and other visual affordances for
 * patients using trackballs, joysticks, AssistiveTouch, or switches.
 *
 * JS-driven values (debounce duration, hover intensity) read the
 * setting directly from the store instead of going through the
 * attribute — this hook is only the CSS bridge.
 */
export function useAssistiveInput(): void {
  const enabled = useSettingsStore((s) => s.cfg?.assistiveInput === true);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute("data-assistive", "on");
    } else {
      root.removeAttribute("data-assistive");
    }
  }, [enabled]);
}
