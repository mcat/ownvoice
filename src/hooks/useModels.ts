import { useState, useEffect } from "preact/hooks";
import { getModelManager } from "../models/modelManager";
import type { LoadProgress, ModelId } from "../models/types";

/** Hook exposing model loading state and progress to UI components */
export function useModels() {
  const [progress, setProgress] = useState<LoadProgress[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const mgr = getModelManager();
    mgr.init().then(() => setInitialized(true));

    const unsub = mgr.onProgress(setProgress);
    return unsub;
  }, []);

  const isReady = (id: ModelId): boolean => {
    return progress.find((p) => p.model === id)?.status === "ready";
  };

  const isLoading = (id: ModelId): boolean => {
    const status = progress.find((p) => p.model === id)?.status;
    return status === "downloading" || status === "loading";
  };

  const getError = (id: ModelId): string | undefined => {
    return progress.find((p) => p.model === id)?.error;
  };

  const totalProgress = (): { loaded: number; total: number } => {
    return progress.reduce(
      (acc, p) => ({
        loaded: acc.loaded + p.loaded,
        total: acc.total + p.total,
      }),
      { loaded: 0, total: 0 },
    );
  };

  return {
    initialized,
    progress,
    isReady,
    isLoading,
    getError,
    totalProgress,
  };
}
