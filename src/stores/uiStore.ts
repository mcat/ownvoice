import { create } from "zustand";
import type { SpeakingState } from "../types";
import type { ThemeName } from "../theme/tokens";

export type OverlayName =
  | "wishes"
  | "provider"
  | "listen"
  | "settings"
  | "pinEntry"
  | "switch"
  | "addPatient"
  | "staffSheet";

interface UIState {
  tab: string;
  sub: number;
  builderOpen: boolean;
  wishesOpen: boolean;
  providerOpen: boolean;
  listenOpen: boolean;
  settingsOpen: boolean;
  pinEntryOpen: boolean;
  switchSheetOpen: boolean;
  addPatientOpen: boolean;
  staffSheetOpen: boolean;
  /** Id of the patient being edited via PatientEditSheet, or null when closed.
   *  PatientEditSheet is overlay-shaped but carries a payload, so it doesn't
   *  use openOverlay/closeOverlay — call openPatientEdit(id)/closePatientEdit(). */
  patientEditId: string | null;
  activeProvIdx: number;
  speaking: SpeakingState | null;

  /** null = auto (follow system), "light" | "dark" = manual override */
  themeOverride: ThemeName | null;
  systemDark: boolean;

  /** Staff authentication — transient, clears on page reload. */
  staffAuthed: boolean;
  /** Unix ms timestamp of the last staff-auth bump. */
  staffAuthedAt: number | null;

  setTab: (tab: string) => void;
  setSub: (sub: number) => void;
  toggleBuilder: () => void;
  openBuilder: () => void;
  openOverlay: (name: OverlayName) => void;
  closeOverlay: (name: OverlayName) => void;
  closeAllOverlays: () => void;
  openPatientEdit: (id: string) => void;
  closePatientEdit: () => void;
  setActiveProvIdx: (idx: number) => void;
  setSpeaking: (state: SpeakingState | null) => void;
  setSystemDark: (dark: boolean) => void;
  toggleTheme: () => void;
  setStaffAuthed: (v: boolean) => void;
  bumpStaffAuthed: () => void;
  endStaffSession: () => void;
  resetUI: () => void;
}

const OVERLAY_KEYS: Record<OverlayName, keyof UIState> = {
  wishes: "wishesOpen",
  provider: "providerOpen",
  listen: "listenOpen",
  settings: "settingsOpen",
  pinEntry: "pinEntryOpen",
  switch: "switchSheetOpen",
  addPatient: "addPatientOpen",
  staffSheet: "staffSheetOpen",
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
  | "switchSheetOpen"
  | "addPatientOpen"
  | "staffSheetOpen"
  | "patientEditId"
  | "activeProvIdx"
  | "speaking"
  | "themeOverride"
  | "systemDark"
  | "staffAuthed"
  | "staffAuthedAt"
> = {
  tab: "quick",
  sub: 0,
  builderOpen: false,
  wishesOpen: false,
  providerOpen: false,
  listenOpen: false,
  settingsOpen: false,
  pinEntryOpen: false,
  switchSheetOpen: false,
  addPatientOpen: false,
  staffSheetOpen: false,
  patientEditId: null,
  activeProvIdx: 0,
  speaking: null,
  themeOverride: getInitialThemeOverride(),
  systemDark: typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false,
  staffAuthed: false,
  staffAuthedAt: null,
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
      switchSheetOpen: false,
      addPatientOpen: false,
      staffSheetOpen: false,
      patientEditId: null,
    }),
  openPatientEdit: (id) => set({ patientEditId: id }),
  closePatientEdit: () => set({ patientEditId: null }),

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
  setStaffAuthed: (v) => set({ staffAuthed: v }),
  bumpStaffAuthed: () =>
    set((s) => (s.staffAuthed ? { staffAuthedAt: Date.now() } : {})),
  endStaffSession: () => set({ staffAuthed: false, staffAuthedAt: null }),
  resetUI: () => set(INITIAL),
}));
