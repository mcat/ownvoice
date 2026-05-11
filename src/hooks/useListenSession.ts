import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { useMicrophone } from "./useMicrophone";
import { getModelManager } from "../models/modelManager";
import { segmentSentences } from "../utils/sentenceSegment";

const SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 30 * SAMPLE_RATE; // 30 seconds
const SILENCE_THRESHOLD_RMS = 0.01;
const SILENCE_WARNING_MS = 25_000;
const SILENCE_TIMEOUT_MS = 30_000;
const MAX_CAPTURE_MS = 15 * 60_000;
const VISIBILITY_GRACE_MS = 10_000;

export interface Sentence {
  id: string;
  text: string;
  chunkIndex: number;
}

export type ListenState =
  | { phase: "idle" }
  | {
      phase: "recording";
      elapsedMs: number;
      level: number;
      silenceCountdownMs?: number;
    }
  | {
      phase: "draft";
      sentences: Sentence[];
      transcribing: { done: number; total: number } | null;
    };

export interface UseListenSession {
  state: ListenState;
  start(): Promise<void>;
  stop(): Promise<void>;
  editSentence(id: string, text: string): void;
  discardSentence(id: string): void;
  reset(): void;
}

/**
 * Listen-session orchestrator.
 *
 * State machine: idle → (start) → recording → (stop / silence / max) → draft
 *                draft → (reset) → idle
 *
 * Splits captured PCM into 30s chunks and dispatches each to the STT worker.
 * The worker processes messages sequentially and emits one `transcript`
 * message per `transcribe` request (plus zero or more `partial`s, which we
 * ignore). We track chunk completion by counting `transcript` responses in
 * dispatch order — the worker's serial processing guarantees this matches
 * dispatch order.
 */
export function useListenSession(opts: { language: string }): UseListenSession {
  const mic = useMicrophone();
  const [state, setState] = useState<ListenState>({ phase: "idle" });
  const idCounter = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);
  const transcriptIndexRef = useRef(0);

  const startTimeRef = useRef<number>(0);
  const lastSpeechRef = useRef<number>(0);

  // Latest mic-handle exposed in a ref so effects that close over mic don't
  // need to be re-bound on every level update (the recording-poll effect in
  // particular reads mic.level via React's render closure, which is fine).
  const micRef = useRef(mic);
  micRef.current = mic;

  const start = useCallback(async () => {
    cancelledRef.current = false;
    transcriptIndexRef.current = 0;
    startTimeRef.current = Date.now();
    lastSpeechRef.current = Date.now();
    await mic.start();
    setState({ phase: "recording", elapsedMs: 0, level: 0 });
  }, [mic]);

  const stop = useCallback(async () => {
    const pcm = await mic.stop();
    const mgr = getModelManager();
    const worker = mgr.getWorker("stt");
    if (!worker) {
      // Engine missing — surface as empty draft. The DraftBubble UI is
      // responsible for showing the "STT not available" affordance.
      setState({
        phase: "draft",
        sentences: [],
        transcribing: null,
      });
      return;
    }
    workerRef.current = worker;
    transcriptIndexRef.current = 0;

    // Slice into 30s chunks, pad final chunk with zeros so each request
    // is exactly CHUNK_SAMPLES long. The mel-spectrogram pipeline in the
    // worker expects a deterministic frame count.
    const totalChunks = Math.max(1, Math.ceil(pcm.length / CHUNK_SAMPLES));
    setState({
      phase: "draft",
      sentences: [],
      transcribing: { done: 0, total: totalChunks },
    });

    for (let i = 0; i < totalChunks; i++) {
      const startIdx = i * CHUNK_SAMPLES;
      const endIdx = Math.min(startIdx + CHUNK_SAMPLES, pcm.length);
      const chunk = new Float32Array(CHUNK_SAMPLES);
      chunk.set(pcm.subarray(startIdx, endIdx));
      // chunkId is informational — the worker ignores it (workers were
      // restored verbatim and emit only {type:"transcript", text}). We
      // track completion via in-order response counting in the message
      // listener below.
      worker.postMessage({
        type: "transcribe",
        chunkId: i,
        audio: chunk,
        sampleRate: SAMPLE_RATE,
        language: opts.language,
      });
    }
  }, [mic, opts.language]);

  // While recording, drive elapsedMs / level / silenceCountdownMs from
  // mic state on a 250ms interval. Auto-stop when continuous silence
  // exceeds SILENCE_TIMEOUT_MS, or when capture exceeds MAX_CAPTURE_MS.
  useEffect(() => {
    if (state.phase !== "recording") return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const currentLevel = micRef.current.level;
      if (currentLevel >= SILENCE_THRESHOLD_RMS) lastSpeechRef.current = now;
      const silentFor = now - lastSpeechRef.current;

      if (elapsed >= MAX_CAPTURE_MS || silentFor >= SILENCE_TIMEOUT_MS) {
        void stop();
        return;
      }

      const silenceCountdownMs =
        silentFor > SILENCE_WARNING_MS
          ? SILENCE_TIMEOUT_MS - silentFor
          : undefined;

      setState({
        phase: "recording",
        elapsedMs: elapsed,
        level: currentLevel,
        silenceCountdownMs,
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [state.phase, stop]);

  // Subscribe to worker messages while a draft is in flight. The worker
  // emits zero or more {type:"partial"} messages (we ignore them) and
  // exactly one {type:"transcript"} per transcribe request. Transcripts
  // arrive in dispatch order because the worker's onmessage handler is
  // serial.
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    if (state.phase !== "draft" || state.transcribing == null) return;

    const onMessage = (e: MessageEvent) => {
      if (cancelledRef.current) return;
      const msg = e.data;
      if (!msg || msg.type !== "transcript") return;
      const chunkIndex = transcriptIndexRef.current++;
      setState((prev) => {
        if (prev.phase !== "draft" || prev.transcribing == null) return prev;
        const newSentences = segmentSentences(msg.text ?? "").map((text) => ({
          id: `s-${++idCounter.current}`,
          text,
          chunkIndex,
        }));
        const done = prev.transcribing.done + 1;
        const total = prev.transcribing.total;
        return {
          ...prev,
          sentences: [...prev.sentences, ...newSentences],
          transcribing: done >= total ? null : { done, total },
        };
      });
    };

    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
    // Re-subscribe only when entering/leaving draft. We intentionally do
    // not depend on transcribing.done — the same listener handles every
    // chunk's response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const editSentence = useCallback((id: string, text: string) => {
    setState((prev) => {
      if (prev.phase !== "draft") return prev;
      return {
        ...prev,
        sentences: prev.sentences.map((s) =>
          s.id === id ? { ...s, text } : s,
        ),
      };
    });
  }, []);

  const discardSentence = useCallback((id: string) => {
    setState((prev) => {
      if (prev.phase !== "draft") return prev;
      return {
        ...prev,
        sentences: prev.sentences.filter((s) => s.id !== id),
      };
    });
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setState({ phase: "idle" });
  }, []);

  // Force-cleanup on unmount: end mic stream + mark in-flight transcripts
  // as cancelled. Without this, an unmount mid-capture leaves the browser's
  // mic indicator on indefinitely (no handle to stop the MediaStream).
  // v1 inherited this same constraint from the same cause.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (micRef.current.recording) {
        void micRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  // visibilitychange: if the tab is backgrounded > 10s while recording,
  // force-stop. iPad clinicians switching apps would otherwise leave the
  // mic indicator running.
  useEffect(() => {
    let timeout: number | null = null;
    const onVisibility = () => {
      if (document.hidden && state.phase === "recording") {
        timeout = window.setTimeout(() => {
          if (state.phase === "recording") {
            cancelledRef.current = true;
            void micRef.current.stop().catch(() => undefined);
            setState({ phase: "idle" });
          }
        }, VISIBILITY_GRACE_MS);
      } else if (timeout != null) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeout != null) clearTimeout(timeout);
    };
  }, [state.phase]);

  return { state, start, stop, editSentence, discardSentence, reset };
}
