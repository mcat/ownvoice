import { useUIStore } from "../stores/uiStore";

/** Returns a function that bumps the staff-session timestamp. No-op when
 *  the user isn't authenticated. Wire this to onClick/onKeyDown of staff-
 *  surface containers (Settings sheet, Switch sheet, etc.) so the 5-min
 *  auto-lock is reset by real user engagement, not by patient-surface taps. */
export function useStaffActivityBump(): () => void {
  return () => {
    if (useUIStore.getState().staffAuthed) {
      useUIStore.getState().bumpStaffAuthed();
    }
  };
}
