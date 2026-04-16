import { useEffect } from "preact/hooks";
import { useUIStore } from "../stores/uiStore";
import { themes, type ThemeName, type ThemeTokens } from "../theme/tokens";

// System media query listener — attached once
let listenerAttached = false;
function attachSystemListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    useUIStore.getState().setSystemDark(e.matches);
  });
}

/** Apply theme to the document — updates CSS vars, dark class, body, meta tag */
function applyTheme(theme: ThemeName) {
  const t = themes[theme];
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("--ov-app-bg", t.bg);
  root.style.setProperty("--ov-app-text", t.text);
  document.body.style.background = t.bg;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#1C1C1E" : "#FFFFFF");

  // Also update the app root div directly (Preact may not re-render it)
  const appRoot = document.querySelector("#root > div") as HTMLElement | null;
  if (appRoot) {
    appRoot.style.background = t.bg;
    appRoot.style.color = t.text;
  }
}

export function useTheme() {
  const themeOverride = useUIStore((s) => s.themeOverride);
  const systemDark = useUIStore((s) => s.systemDark);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const theme: ThemeName = themeOverride ?? (systemDark ? "dark" : "light");

  useEffect(() => {
    attachSystemListener();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    toggle: toggleTheme,
    isAuto: themeOverride === null,
    t: themes[theme] as ThemeTokens,
  };
}
