import { create } from "zustand";
import type { SpeakingState } from "../types";
import type { ThemeName } from "../theme/tokens";
import type { AbandonedWorkflow } from "../audit/recovery";

export type OverlayName =
  | "wishes"
  | "provider"
  | "listen"
  | "settings"
  | "careTeam"
  | "accessibility"
  | "diagnostics"
  | "about"
  | "reset"
  | "pinEntry"
  | "switch"
  | "addPatient";

interface UIState {
  tab: string;
  sub: number;
  builderOpen: boolean;
  wishesOpen: boolean;
  providerOpen: boolean;
  listenOpen: boolean;
  settingsOpen: boolean;
  careTeamOpen: boolean;
  accessibilityOpen: boolean;
  diagnosticsOpen: boolean;
  aboutOpen: boolean;
  resetOpen: boolean;
  pinEntryOpen: boolean;
  switchSheetOpen: boolean;
  addPatientOpen: boolean;
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

  /** Abandoned workflows surfaced after a sweep; banner UI consumes
   *  the prompt-mode subset. */
  abandonedWorkflows: AbandonedWorkflow[];
  queueAbandonedWorkflow: (w: AbandonedWorkflow) => void;
  dismissAbandonedWorkflow: (workflowId: string) => void;

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
  careTeam: "careTeamOpen",
  accessibility: "accessibilityOpen",
  diagnostics: "diagnosticsOpen",
  about: "aboutOpen",
  reset: "resetOpen",
  pinEntry: "pinEntryOpen",
  switch: "switchSheetOpen",
  addPatient: "addPatientOpen",
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
  | "careTeamOpen"
  | "accessibilityOpen"
  | "diagnosticsOpen"
  | "aboutOpen"
  | "resetOpen"
  | "pinEntryOpen"
  | "switchSheetOpen"
  | "addPatientOpen"
  | "patientEditId"
  | "activeProvIdx"
  | "speaking"
  | "themeOverride"
  | "systemDark"
  | "staffAuthed"
  | "staffAuthedAt"
  | "abandonedWorkflows"
> = {
  tab: "quick",
  sub: 0,
  builderOpen: false,
  wishesOpen: false,
  providerOpen: false,
  listenOpen: false,
  settingsOpen: false,
  careTeamOpen: false,
  accessibilityOpen: false,
  diagnosticsOpen: false,
  aboutOpen: false,
  resetOpen: false,
  pinEntryOpen: false,
  switchSheetOpen: false,
  addPatientOpen: false,
  patientEditId: null,
  activeProvIdx: 0,
  speaking: null,
  themeOverride: getInitialThemeOverride(),
  systemDark: typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false,
  staffAuthed: false,
  staffAuthedAt: null,
  abandonedWorkflows: [],
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
      careTeamOpen: false,
      accessibilityOpen: false,
      diagnosticsOpen: false,
      aboutOpen: false,
      resetOpen: false,
      pinEntryOpen: false,
      switchSheetOpen: false,
      addPatientOpen: false,
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
  queueAbandonedWorkflow: (w) =>
    set((s) => ({ abandonedWorkflows: [...s.abandonedWorkflows, w] })),
  dismissAbandonedWorkflow: (id) =>
    set((s) => ({
      abandonedWorkflows: s.abandonedWorkflows.filter(
        (w) => w.workflow_id !== id,
      ),
    })),
  resetUI: () => set(INITIAL),
}));
