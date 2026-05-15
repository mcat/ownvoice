/**
 * Memory-crash tombstone.
 *
 * Safari does not expose `performance.memory` and a renderer-OOM kill on
 * iPad terminates the process before any `window.error` or
 * `unhandledrejection` handler can run — so the audit log will never
 * record the crash directly. This module instead writes the current
 * "lifecycle stage" to `localStorage` as the app crosses each boundary,
 * and the `pagehide` handler in `installModelLifecycleCleanup` clears
 * it on a graceful exit. On the next boot, if the tombstone is still
 * present, the previous session died ungracefully and the recorded
 * stage is our best guess at which boundary tripped Safari's memory
 * ceiling.
 *
 * Gated behind a `?memdiag=true` URL param so production users don't
 * pay the per-stage localStorage write. Enable explicitly when
 * debugging crashes. See `project_safari_memory_apis.md` in auto-memory
 * for the broader context on iPad memory diagnostics.
 */

const TOMBSTONE_KEY = "ov:memdiag:last-stage";
const FLAG_KEY = "__OV_MEMDIAG__" as const;

interface StoredTombstone {
  stage: string;
  ts: number;
  v: 1;
}

export interface PreviousTombstone {
  stage: string;
  ts: number;
  /** Time since the tombstone was written, in ms. Useful for distinguishing
   *  "previous session died seconds ago" from "tombstone leftover from
   *  a week-old crash on a tab the user never reopened." */
  ageMs: number;
}

export function enableMemDiag(): void {
  (globalThis as Record<string, unknown>)[FLAG_KEY] = true;
}

export function isMemDiagEnabled(): boolean {
  return (globalThis as Record<string, unknown>)[FLAG_KEY] === true;
}

export function recordStage(stage: string): void {
  if (!isMemDiagEnabled()) return;
  try {
    const payload: StoredTombstone = { stage, ts: Date.now(), v: 1 };
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable in private mode or full. The
    // tombstone is best-effort — silent failure is correct.
  }
}

export function clearTombstone(): void {
  try {
    localStorage.removeItem(TOMBSTONE_KEY);
  } catch {
    // Same rationale as recordStage — silent.
  }
}

export function readPreviousTombstone(): PreviousTombstone | null {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTombstone>;
    if (typeof parsed?.stage !== "string") return null;
    if (typeof parsed?.ts !== "number") return null;
    return {
      stage: parsed.stage,
      ts: parsed.ts,
      ageMs: Math.max(0, Date.now() - parsed.ts),
    };
  } catch {
    return null;
  }
}
