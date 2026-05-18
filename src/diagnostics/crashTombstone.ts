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

import type { ModelId, ModelStatus } from "../models/types";

const TOMBSTONE_KEY = "ov:memdiag:last-stage";
const TRAIL_KEY = "ov:memdiag:trail";
const FLAG_KEY = "__OV_MEMDIAG__" as const;

/** Cap on the serialized trail size in localStorage. localStorage origin
 *  quota is ~5 MB on most browsers; 256 KB is a safe headroom-bounded
 *  budget. When the trail grows past this, the oldest entries are
 *  evicted FIFO until it fits. */
const MAX_TRAIL_BYTES = 256 * 1024;
/** Hard cap on entries — prevents the JSON array from growing unbounded
 *  during a long pre-gen even if individual entries are small. Per-entry
 *  size is dominated by HeapWatermark + stage string, typically ~300 B,
 *  so 2 000 entries × 300 B ≈ 600 KB worst-case before the byte cap
 *  starts trimming. The byte cap is the real bound; the count cap is
 *  belt-and-suspenders against degenerate per-entry growth. */
const MAX_TRAIL_ENTRIES = 2000;

/**
 * Minimum interval between two localStorage writes. Without throttling,
 * a 700-phrase pre-gen pass would fire one stage label per completed
 * phrase plus the sampler-driven allocations on top, which compounds
 * the very main-thread pressure this diagnostic is meant to characterize.
 * Leading-edge: the first call writes immediately so sparse stages
 * (boot:*, synth:gpu:N) stay precise; subsequent calls inside the
 * cooldown stash the latest payload and a trailing write fires once.
 * Worst-case forensic loss on crash: WRITE_THROTTLE_MS of label
 * staleness, which is still well below the granularity of any actionable
 * fix (phrase 347 vs 348 in pre-gen tells us the same thing).
 */
const WRITE_THROTTLE_MS = 250;

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
   *  no sampler is registered. `Partial` because some ModelId entries
   *  (e.g. denoiser) may be absent on a given session. */
  workers: Partial<Record<ModelId, ModelStatus>>;
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

/** Test-only: drop the registered sampler and any pending throttled
 *  write so each test starts clean. */
export function _resetSamplerForTests(): void {
  sampler = null;
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  pendingPayload = null;
  lastWriteAt = 0;
}

export function enableMemDiag(): void {
  (globalThis as Record<string, unknown>)[FLAG_KEY] = true;
}

export function isMemDiagEnabled(): boolean {
  if ((globalThis as Record<string, unknown>)[FLAG_KEY] === true) return true;
  // Fallback: check the URL param directly. The global flag is set by
  // enableMemDiag() in main-app.tsx on every boot, but in Chrome dev
  // sessions the global has been observed to come back undefined between
  // main-app boot and the first call to isMemDiagEnabled (PR #327
  // investigation — root cause not yet identified). Reading the URL
  // directly makes the gate resilient: `?memdiag=true` survives anything
  // that touches global state. Only valid in browser contexts (workers
  // have self.location set to the worker script URL, not the parent
  // page, so the URL check there gives the wrong answer — workers must
  // continue to use the init-message flag).
  try {
    if (typeof window !== "undefined" && window.location?.search) {
      return new URLSearchParams(window.location.search).get("memdiag") === "true";
    }
  } catch {
    // window may not exist (worker, jsdom, etc.) — silent fallback.
  }
  return false;
}

let lastWriteAt = 0;
let pendingPayload: StoredTombstone | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function writePayload(payload: StoredTombstone): void {
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(payload));
    lastWriteAt = Date.now();
  } catch {
    // localStorage may be unavailable in private mode or full. The
    // tombstone is best-effort — silent failure is correct.
  }
}

export function recordStage(stage: string): void {
  if (!isMemDiagEnabled()) return;
  const payload: StoredTombstone = {
    stage,
    ts: Date.now(),
    hw: safeSample(),
    v: 2,
  };
  // Trail append is independent of the tombstone throttle: the tombstone
  // overwrites a single slot, so throttling avoids redundant writes; the
  // trail appends, so every recordStage carries forensic value. The 250ms
  // throttle would lose intermediate stages during a long pre-gen run.
  appendToTrail(payload);
  const elapsed = payload.ts - lastWriteAt;
  if (elapsed >= WRITE_THROTTLE_MS) {
    writePayload(payload);
    return;
  }
  pendingPayload = payload;
  if (pendingTimer === null) {
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (pendingPayload) {
        writePayload(pendingPayload);
        pendingPayload = null;
      }
    }, WRITE_THROTTLE_MS - elapsed);
  }
}

function appendToTrail(entry: StoredTombstone): void {
  try {
    const raw = localStorage.getItem(TRAIL_KEY);
    const trail: StoredTombstone[] = raw ? JSON.parse(raw) : [];
    trail.push(entry);
    while (trail.length > MAX_TRAIL_ENTRIES) trail.shift();
    let serialized = JSON.stringify(trail);
    while (serialized.length > MAX_TRAIL_BYTES && trail.length > 1) {
      trail.shift();
      serialized = JSON.stringify(trail);
    }
    localStorage.setItem(TRAIL_KEY, serialized);
  } catch {
    // localStorage write failures are best-effort. The most likely cause
    // is quota exhaustion from other origin data; not a crash signal.
  }
}

/** Returns the in-memdiag trail of stage transitions since last clear.
 *  Each entry is the same shape the tombstone writes (stage + ts + hw +
 *  v). Used by the Diagnostics panel to expose forensic data without
 *  shipping it elsewhere. Returns [] on parse error or absent key. */
export function readTrail(): StoredTombstone[] {
  try {
    const raw = localStorage.getItem(TRAIL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearTrail(): void {
  try {
    localStorage.removeItem(TRAIL_KEY);
  } catch {
    // Same rationale as recordStage — silent.
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
  // Cancel any pending throttled write — otherwise a trailing-edge
  // setTimeout would land *after* clearTombstone runs on pagehide,
  // resurrecting the tombstone and turning a graceful exit into a
  // false-positive crash report on the next boot.
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  pendingPayload = null;
  try {
    localStorage.removeItem(TOMBSTONE_KEY);
  } catch {
    // Same rationale as recordStage — silent.
  }
  // The trail is session-scoped forensic data too. Wiping it on a
  // graceful exit keeps next session's trail uncontaminated by stages
  // from a prior healthy run.
  clearTrail();
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
