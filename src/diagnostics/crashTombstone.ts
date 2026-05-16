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
 *
 * The v2 payload also carries a heap-watermark snapshot — proxy signals
 * (OPFS usage, hot-cache size, worker readiness) captured by an
 * inverted-control sampler registered at boot. A crash-time delta
 * against a prior stage's snapshot is enough to discriminate between
 * "the decoder load is the peak" and "cumulative drift during pre-gen"
 * without needing the JS heap APIs Safari withholds.
 */

const TOMBSTONE_KEY = "ov:memdiag:last-stage";
const FLAG_KEY = "__OV_MEMDIAG__" as const;

export interface HeapWatermark {
  /** OPFS quota usage in bytes. Updated by the async sampler every few
   *  seconds; null until the first estimate resolves. */
  opfsUsage: number | null;
  /** Total OPFS quota in bytes. Pairs with usage to give "%full" — a
   *  near-quota disk can cause SyncAccessHandle writes to fail and is
   *  worth distinguishing from a memory-only OOM. */
  opfsQuota: number | null;
  /** ms since the OPFS estimate was captured. */
  opfsAgeMs: number | null;
  /** Count of in-memory hot-cache entries (speak.ts cloned-audio cache).
   *  Each entry holds a Float32Array of decoded PCM — small per entry
   *  but capped at 64. Useful for confirming the cache isn't leaking. */
  hotCacheEntries: number;
  /** Per-model worker status as reported by ModelManager. Empty when
   *  no sampler is registered. */
  workers: Record<string, string>;
  /** Whether the GPU TTS DedicatedWorker is in the ready state. */
  gpuTtsReady: boolean;
  /** In-flight GPU TTS synth requests at sample time. Non-zero means a
   *  synth was running when the stage was recorded — useful when a
   *  later crash points back at a long-running synth. */
  gpuTtsPendingSynths: number;
}

interface StoredTombstone {
  stage: string;
  ts: number;
  hw: HeapWatermark | null;
  v: 2;
}

export interface PreviousTombstone {
  stage: string;
  ts: number;
  /** Time since the tombstone was written, in ms. Useful for distinguishing
   *  "previous session died seconds ago" from "tombstone leftover from
   *  a week-old crash on a tab the user never reopened." */
  ageMs: number;
  /** Heap-watermark snapshot at the moment the stage was recorded.
   *  Null on a v1 tombstone from an older deploy, or when no sampler
   *  was registered at the time recordStage ran. */
  hw: HeapWatermark | null;
}

/**
 * Boot code registers a closure that returns the current proxy
 * signals so recordStage can pull them without crashTombstone needing
 * to import the model layer. Pure inversion of control — the
 * diagnostics module stays leaf-level.
 */
let sampler: (() => HeapWatermark) | null = null;
export function registerHeapSampler(fn: () => HeapWatermark): void {
  sampler = fn;
}

/** Test-only: drop the registered sampler so each test starts clean. */
export function _resetSamplerForTests(): void {
  sampler = null;
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
    const hw = safeSample();
    const payload: StoredTombstone = { stage, ts: Date.now(), hw, v: 2 };
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable in private mode or full. The
    // tombstone is best-effort — silent failure is correct.
  }
}

function safeSample(): HeapWatermark | null {
  if (!sampler) return null;
  try {
    return sampler();
  } catch {
    // A misbehaving sampler must never crash the stage-recording path,
    // which is on the boot hot path and runs through pre-gen.
    return null;
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
    // hw is optional — a v1 tombstone from an older deploy has no `hw`
    // key. Treat any unknown shape as null rather than throwing.
    const hw =
      parsed.hw && typeof parsed.hw === "object"
        ? (parsed.hw as HeapWatermark)
        : null;
    return {
      stage: parsed.stage,
      ts: parsed.ts,
      ageMs: Math.max(0, Date.now() - parsed.ts),
      hw,
    };
  } catch {
    return null;
  }
}
