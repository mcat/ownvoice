import { create } from "zustand";

/**
 * Progress tracking for pre-generated cloned-voice audio.
 *
 * One run state per speaker (patient + each provider with an embedding).
 * State is in-memory only — on page reload we reconcile against OPFS by
 * counting cached entries before deciding whether to resume. Persisting
 * this would risk drift from disk state.
 */

export type SpeakerKey = "patient" | `provider:${number}`;

export type RunStatus = "idle" | "running" | "done" | "failed";

export interface RunState {
  status: RunStatus;
  current: number;
  total: number;
  currentPhrase: string | null;
  failedPhrases: string[];
  locale: string | null;
  fingerprint: string | null;
}

const IDLE: RunState = {
  status: "idle",
  current: 0,
  total: 0,
  currentPhrase: null,
  failedPhrases: [],
  locale: null,
  fingerprint: null,
};

interface AudioCacheState {
  runs: Partial<Record<SpeakerKey, RunState>>;
  activeKey: SpeakerKey | null;

  /** Begin a run for a speaker — replaces any prior state for that key. */
  start: (
    key: SpeakerKey,
    total: number,
    locale: string,
    fingerprint: string,
  ) => void;
  /** Record progress on a phrase (success). */
  progress: (key: SpeakerKey, phrase: string, current: number) => void;
  /** Record a failure for a phrase. */
  fail: (key: SpeakerKey, phrase: string, current: number) => void;
  /** Mark a run complete — status becomes 'done' or 'failed' based on failures. */
  finish: (key: SpeakerKey) => void;
  /** Clear the failed-phrases list for a key (called before retry). */
  resetFailed: (key: SpeakerKey) => void;
  /** Drop all runs and clear the active key. */
  abortAll: () => void;
}

export const useAudioCacheStore = create<AudioCacheState>()((set) => ({
  runs: {},
  activeKey: null,

  start: (key, total, locale, fingerprint) =>
    set((s) => ({
      runs: {
        ...s.runs,
        [key]: {
          ...IDLE,
          status: "running",
          total,
          locale,
          fingerprint,
        },
      },
      activeKey: key,
    })),

  progress: (key, phrase, current) =>
    set((s) => {
      const prev = s.runs[key] ?? IDLE;
      return {
        runs: {
          ...s.runs,
          [key]: { ...prev, currentPhrase: phrase, current },
        },
      };
    }),

  fail: (key, phrase, current) =>
    set((s) => {
      const prev = s.runs[key] ?? IDLE;
      return {
        runs: {
          ...s.runs,
          [key]: {
            ...prev,
            currentPhrase: phrase,
            current,
            failedPhrases: [...prev.failedPhrases, phrase],
          },
        },
      };
    }),

  finish: (key) =>
    set((s) => {
      const prev = s.runs[key] ?? IDLE;
      const status: RunStatus =
        prev.failedPhrases.length > 0 ? "failed" : "done";
      return {
        runs: { ...s.runs, [key]: { ...prev, status, currentPhrase: null } },
        activeKey: s.activeKey === key ? null : s.activeKey,
      };
    }),

  resetFailed: (key) =>
    set((s) => {
      const prev = s.runs[key] ?? IDLE;
      return {
        runs: { ...s.runs, [key]: { ...prev, failedPhrases: [] } },
      };
    }),

  abortAll: () => set({ runs: {}, activeKey: null }),
}));
