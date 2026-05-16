/**
 * Heap-watermark sampler for the memory-crash tombstone.
 *
 * Safari has no `performance.memory` and no `measureUserAgentSpecificMemory`,
 * so we cannot read JS heap directly. This module samples proxy signals
 * that move in step with the renderer's working set — OPFS bytes resident,
 * hot-cache size, worker status, GPU TTS state — and registers a sync
 * closure with `crashTombstone` so each `recordStage` call captures a
 * snapshot alongside the stage label. On the next boot, the previous
 * crash's snapshot is logged alongside the stage so we can tell e.g.
 * "decoder load is the peak" (#287 falsifier) from "cumulative drift"
 * (#285 falsifier) without speculating.
 *
 * Dependency direction: this module imports from the model layer; the
 * leaf-level `crashTombstone` only knows about the `HeapWatermark` shape
 * and accepts the sampler via `registerHeapSampler`. That keeps the
 * tombstone usable from boot-time code that runs before the model layer
 * is reachable (e.g. inside ttsWorker.ts module init).
 */

import {
  isMemDiagEnabled,
  registerHeapSampler,
  type HeapWatermark,
} from "./crashTombstone";
import { getModelManager } from "../models/modelManager";
import { isGPUReady, getGpuPendingSynths } from "../models/ttsEngine";
import { getHotCacheSize } from "../speak";

const OPFS_SAMPLE_INTERVAL_MS = 5_000;

let opfsUsage: number | null = null;
let opfsQuota: number | null = null;
let opfsCapturedAt: number | null = null;
let opfsTimer: ReturnType<typeof setInterval> | null = null;
let inFlightEstimate = false;

async function refreshOpfsEstimate(): Promise<void> {
  if (inFlightEstimate) return;
  if (!navigator.storage || typeof navigator.storage.estimate !== "function") {
    return;
  }
  inFlightEstimate = true;
  try {
    const est = await navigator.storage.estimate();
    opfsUsage = typeof est.usage === "number" ? est.usage : null;
    opfsQuota = typeof est.quota === "number" ? est.quota : null;
    opfsCapturedAt = Date.now();
  } catch {
    // Surface as "null" on next sample — the tombstone is best-effort.
  } finally {
    inFlightEstimate = false;
  }
}

function sampleHeap(): HeapWatermark {
  const mgr = getModelManager();
  const workers: Record<string, string> = {};
  for (const p of mgr.getProgress()) {
    workers[p.model] = p.status;
  }
  return {
    opfsUsage,
    opfsQuota,
    opfsAgeMs: opfsCapturedAt !== null ? Date.now() - opfsCapturedAt : null,
    hotCacheEntries: getHotCacheSize(),
    workers,
    gpuTtsReady: isGPUReady(),
    gpuTtsPendingSynths: getGpuPendingSynths(),
  };
}

/**
 * Wire the sampler into `crashTombstone.recordStage` and start the
 * periodic OPFS estimate refresh. Safe to call multiple times — the
 * second call short-circuits if the timer is already running. No-op
 * unless `?memdiag=true` enabled memdiag at boot.
 */
export function startHeapSampler(): void {
  if (!isMemDiagEnabled()) return;
  registerHeapSampler(sampleHeap);
  if (opfsTimer !== null) return;
  // Kick off an immediate estimate so the first stage label gets a
  // non-null usage value (best-effort: the await may race with the
  // boot's first recordStage and lose, in which case the first
  // snapshot has opfsUsage=null and the second has a real value).
  void refreshOpfsEstimate();
  opfsTimer = setInterval(() => {
    void refreshOpfsEstimate();
  }, OPFS_SAMPLE_INTERVAL_MS);
}

/** Test-only: stop the timer and reset cached estimates. */
export function _resetHeapSamplerForTests(): void {
  if (opfsTimer !== null) {
    clearInterval(opfsTimer);
    opfsTimer = null;
  }
  opfsUsage = null;
  opfsQuota = null;
  opfsCapturedAt = null;
  inFlightEstimate = false;
}
