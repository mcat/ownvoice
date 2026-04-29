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

  /** "12s" / "Almost ready…" / "1 min" / "One moment…" */
  const humanCountdown = (id: ModelId): string => {
    const p = progress.find((m) => m.model === id);
    if (!p) return "One moment…";
    if (p.total > 0 && p.loaded / p.total >= ALMOST_READY_THRESHOLD) {
      return "Almost ready…";
    }
    const s = secondsLeft(id);
    if (s === undefined) return "One moment…";
    if (s <= 5) return "Almost ready…";
    if (s <= 90) return `${Math.round(s)}s`;
    if (s <= 600) return `${Math.round(s / 60)} min`;
    return "One moment…";
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
    totalProgress,
  };
}
