import { useState, useEffect, useRef } from "preact/hooks";
import { getModelManager } from "../models/modelManager";
import type { LoadProgress, ModelId } from "../models/types";

interface RateSample {
  t: number;
  loaded: number;
}

const ALMOST_READY_THRESHOLD = 0.85;
const RATE_SAMPLE_LIMIT = 4;

/** Hook exposing model loading state and progress to UI components */
export function useModels() {
  const [progress, setProgress] = useState<LoadProgress[]>([]);
  const [initialized, setInitialized] = useState(false);
  const samplesRef = useRef<Map<ModelId, RateSample[]>>(new Map());

  useEffect(() => {
    const mgr = getModelManager();
    mgr.init().then(() => setInitialized(true));

    const unsub = mgr.onProgress((p) => {
      const now = Date.now();
      for (const m of p) {
        const arr = samplesRef.current.get(m.model) ?? [];
        const last = arr[arr.length - 1];
        if (!last || last.loaded !== m.loaded) {
          arr.push({ t: now, loaded: m.loaded });
          while (arr.length > RATE_SAMPLE_LIMIT) arr.shift();
          samplesRef.current.set(m.model, arr);
        }
      }
      setProgress(p);
    });
    return unsub;
  }, []);

  const isReady = (id: ModelId): boolean => {
    const status = progress.find((p) => p.model === id)?.status;
    return status === "ready" || status === "warm";
  };

  const isWarm = (id: ModelId): boolean =>
    progress.find((p) => p.model === id)?.status === "warm";

  const isLoading = (id: ModelId): boolean => {
    const status = progress.find((p) => p.model === id)?.status;
    return status === "downloading" || status === "loading";
  };

  const getError = (id: ModelId): string | undefined =>
    progress.find((p) => p.model === id)?.error;

  /** Estimated seconds remaining for `id`. Undefined when unknown. */
  const secondsLeft = (id: ModelId): number | undefined => {
    const p = progress.find((m) => m.model === id);
    if (!p || p.total === 0 || p.loaded >= p.total) return undefined;
    const samples = samplesRef.current.get(id) ?? [];
    if (samples.length < 2) return undefined;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return undefined;
    const rate = (last.loaded - first.loaded) / dt;
    if (rate <= 0) return undefined;
    return (p.total - p.loaded) / rate;
  };

  /** True when this model is past the 85% threshold or its rate-based
   *  estimate is under 5 seconds. Consumers render an "Almost ready…"
   *  phrase instead of a numeric countdown. */
  const isAlmostReady = (id: ModelId): boolean => {
    const p = progress.find((m) => m.model === id);
    if (!p) return false;
    if (p.total > 0 && p.loaded / p.total >= ALMOST_READY_THRESHOLD) return true;
    const s = secondsLeft(id);
    return s !== undefined && s <= 5;
  };

  /** A short duration string ("12s" / "1 min") when an estimate is
   *  available, or `null` when not. Consumers use the null case to
   *  switch to a different phrase ("Getting ready…") rather than
   *  splicing a complete sentence into a "{countdown}" template. */
  const humanCountdown = (id: ModelId): string | null => {
    const s = secondsLeft(id);
    if (s === undefined) return null;
    if (s <= 5) return null; // covered by isAlmostReady
    if (s <= 90) return `${Math.round(s)}s`;
    if (s <= 600) return `${Math.round(s / 60)} min`;
    return null;
  };

  const totalProgress = (): { loaded: number; total: number } =>
    progress.reduce(
      (acc, p) => ({
        loaded: acc.loaded + p.loaded,
        total: acc.total + p.total,
      }),
      { loaded: 0, total: 0 },
    );

  return {
    initialized,
    progress,
    isReady,
    isWarm,
    isLoading,
    getError,
    secondsLeft,
    humanCountdown,
    isAlmostReady,
    totalProgress,
  };
}
