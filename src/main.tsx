import { render } from "preact";
import { App } from "./App";
import "./app.css";
import { useUIStore } from "./stores/uiStore";
import { themes, type ThemeName } from "./theme/tokens";

// Subscribe to theme changes outside of Preact to guarantee DOM updates.
// Uses requestAnimationFrame to run AFTER Preact's re-render commits.
useUIStore.subscribe((state, prev) => {
  const resolve = (s: typeof state): ThemeName =>
    s.themeOverride ?? (s.systemDark ? "dark" : "light");
  const theme = resolve(state);
  const prevTheme = resolve(prev);
  if (theme !== prevTheme) {
    const t = themes[theme];
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.style.background = t.bg;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#1C1C1E" : "#FFFFFF");
    // Run after Preact finishes re-rendering
    requestAnimationFrame(() => {
      const appRoot = document.querySelector("#root > div") as HTMLElement | null;
      if (appRoot) {
        appRoot.style.background = t.bg;
        appRoot.style.color = t.text;
      }
    });
  }
});

render(<App />, document.getElementById("root")!);
