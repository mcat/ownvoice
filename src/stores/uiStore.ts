import { create } from "zustand";
import type { SpeakingState } from "../types";
import type { ThemeName } from "../theme/tokens";

type OverlayName =
  | "wishes"
  | "provider"
  | "listen"
  | "settings"
  | "pinEntry";

interface UIState {
  tab: string;
  sub: number;
  builderOpen: boolean;
  wishesOpen: boolean;
  providerOpen: boolean;
  listenOpen: boolean;
  settingsOpen: boolean;
  pinEntryOpen: boolean;
  activeProvIdx: number;
  speaking: SpeakingState | null;

  /** null = auto (follow system), "light" | "dark" = manual override */
  themeOverride: ThemeName | null;
  systemDark: boolean;

  setTab: (tab: string) => void;
  setSub: (sub: number) => void;
  toggleBuilder: () => void;
  openBuilder: () => void;
  openOverlay: (name: OverlayName) => void;
  closeOverlay: (name: OverlayName) => void;
  closeAllOverlays: () => void;
  setActiveProvIdx: (idx: number) => void;
  setSpeaking: (state: SpeakingState | null) => void;
  setSystemDark: (dark: boolean) => void;
  toggleTheme: () => void;
  resetUI: () => void;
}

const OVERLAY_KEYS: Record<OverlayName, keyof UIState> = {
  wishes: "wishesOpen",
  provider: "providerOpen",
  listen: "listenOpen",
  settings: "settingsOpen",
  pinEntry: "pinEntryOpen",
};

function getInitialThemeOverride(): ThemeName | null {
  const saved = localStorage.getItem("ov-theme");
  if (saved === "light" || saved === "dark") return saved as ThemeName;
  return null;
}

const INITIAL: Pick<
  UIState,
  | "tab"
  | "sub"
  | "builderOpen"
  | "wishesOpen"
  | "providerOpen"
  | "listenOpen"
  | "settingsOpen"
  | "pinEntryOpen"
  | "activeProvIdx"
  | "speaking"
  | "themeOverride"
  | "systemDark"
> = {
  tab: "quick",
  sub: 0,
  builderOpen: false,
  wishesOpen: false,
  providerOpen: false,
  listenOpen: false,
  settingsOpen: false,
  pinEntryOpen: false,
  activeProvIdx: 0,
  speaking: null,
  themeOverride: getInitialThemeOverride(),
  systemDark: typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false,
};

export const useUIStore = create<UIState>((set) => ({
  ...INITIAL,

  setTab: (tab) => set({ tab, sub: 0, builderOpen: false }),
  setSub: (sub) => set({ sub }),
  toggleBuilder: () => set((s) => ({ builderOpen: !s.builderOpen })),
  openBuilder: () => set({ builderOpen: true }),

  openOverlay: (name) => set({ [OVERLAY_KEYS[name]]: true }),
  closeOverlay: (name) => set({ [OVERLAY_KEYS[name]]: false }),
  closeAllOverlays: () =>
    set({
      wishesOpen: false,
      providerOpen: false,
      listenOpen: false,
      settingsOpen: false,
      pinEntryOpen: false,
    }),

  setActiveProvIdx: (idx) => set({ activeProvIdx: idx }),
  setSpeaking: (speaking) => set({ speaking }),
  setSystemDark: (dark) => set({ systemDark: dark }),
  toggleTheme: () =>
    set((s) => {
      const resolved = s.themeOverride ?? (s.systemDark ? "dark" : "light");
      if (s.themeOverride === null) {
        // From auto → override to opposite
        const next: ThemeName = resolved === "light" ? "dark" : "light";
        localStorage.setItem("ov-theme", next);
        return { themeOverride: next };
      }
      // From override → back to auto
      localStorage.removeItem("ov-theme");
      return { themeOverride: null };
    }),
  resetUI: () => set(INITIAL),
}));
