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
      /**
       * Monotonic identifier for this session's draft. Incremented every
       * time `stop()` dispatches chunks. The worker is a singleton, so if
       * the user discards mid-decode and immediately starts a new session,
       * stale `transcript` / `error` messages from the previous run can
       * still arrive at the listener. The listener captures `sessionId` at
       * subscribe time and drops messages whose draft no longer matches.
       */
      sessionId: number;
      sentences: Sentence[];
      transcribing: { done: number; total: number } | null;
      /** One-line message rendered above the action row when a chunk
       *  failed. Null while transcription is healthy. */
      error: string | null;
    };

export interface UseListenSession {
  state: ListenState;
  start(): Promise<void>;
  stop(): Promise<void>;
  editSentence(id: string, text: string): void;
  discardSentence(id: string): void;
  /** Re-dispatch the last session's PCM to the STT worker. Used by the
   *  "Try again" affordance after a worker error. No-op when there's no
   *  cached PCM (e.g. before the first stop()). */
  tryAgain(): void;
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
  /** Monotonic counter, incremented on each `stop()`. Becomes the
   *  draft's `sessionId` and guards the worker-message handler against
   *  stale messages from prior, discarded sessions. */
  const sessionCounterRef = useRef(0);
  /** PCM from the most recent `stop()`. Held so `tryAgain()` can
   *  re-dispatch after a worker error without forcing the user to
   *  re-record. Cleared on `reset()`. */
  const lastPcmRef = useRef<Float32Array | null>(null);

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
    await micRef.current.start();
    setState({ phase: "recording", elapsedMs: 0, level: 0 });
    // micRef.current is updated every render (line above the start defn);
    // closing over the ref keeps this callback identity stable across the
    // 15fps re-renders that useMicrophone induces while recording, which is
    // what allows the 250ms poll effect to install once and survive.
  }, []);

  /**
   * Dispatch a PCM buffer to the STT worker as 30s chunks. Bumps the
   * session counter so any stale messages from a prior dispatch are
   * dropped by the message handler's sessionId gate. Used by both
   * `stop()` (fresh recording) and `tryAgain()` (re-post after error).
   */
  const dispatchPcm = useCallback(
    (pcm: Float32Array) => {
      const sessionId = ++sessionCounterRef.current;
      const mgr = getModelManager();
      const worker = mgr.getWorker("stt");
      if (!worker) {
        // Engine missing — surface as empty draft. The DraftBubble UI is
        // responsible for showing the "STT not available" affordance.
        setState({
          phase: "draft",
          sessionId,
          sentences: [],
          transcribing: null,
          error: null,
        });
        return;
      }
      workerRef.current = worker;
      transcriptIndexRef.current = 0;

      const totalChunks = Math.max(1, Math.ceil(pcm.length / CHUNK_SAMPLES));
      setState({
        phase: "draft",
        sessionId,
        sentences: [],
        transcribing: { done: 0, total: totalChunks },
        error: null,
      });

      // Slice into 30s chunks, pad final chunk with zeros so each request
      // is exactly CHUNK_SAMPLES long. The mel-spectrogram pipeline in the
      // worker expects a deterministic frame count.
      for (let i = 0; i < totalChunks; i++) {
        const startIdx = i * CHUNK_SAMPLES;
        const endIdx = Math.min(startIdx + CHUNK_SAMPLES, pcm.length);
        const chunk = new Float32Array(CHUNK_SAMPLES);
        chunk.set(pcm.subarray(startIdx, endIdx));
        worker.postMessage({
          type: "transcribe",
          chunkId: i,
          audio: chunk,
          sampleRate: SAMPLE_RATE,
          language: opts.language,
        });
      }
    },
    [opts.language],
  );

  const stop = useCallback(async () => {
    const pcm = await micRef.current.stop();
    lastPcmRef.current = pcm;
    dispatchPcm(pcm);
    // See note on `start` — closing over micRef keeps `stop` stable so the
    // poll effect (which depends on `stop`) is not re-installed every render.
  }, [dispatchPcm]);

  const tryAgain = useCallback(() => {
    const pcm = lastPcmRef.current;
    if (pcm == null) return;
    dispatchPcm(pcm);
  }, [dispatchPcm]);

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
  //
  // The STT worker is a singleton (`mgr.getWorker("stt")`), so if the user
  // discards mid-decode and immediately starts another session, stale
  // messages from the prior run can still arrive here. We capture the
  // active `sessionId` at subscribe time and drop any message whose draft
  // no longer matches via the `setState` callback's `prev.sessionId` check.
  const draftSessionId = state.phase === "draft" ? state.sessionId : null;
  useEffect(() => {
    const worker = workerRef.current;
    if (worker == null || draftSessionId == null) return;
    const mySessionId = draftSessionId;

    const onMessage = (e: MessageEvent) => {
      if (cancelledRef.current) return;
      const msg = e.data;
      if (!msg) return;

      if (msg.type === "transcript") {
        const chunkIndex = transcriptIndexRef.current++;
        setState((prev) => {
          if (prev.phase !== "draft" || prev.sessionId !== mySessionId) return prev;
          if (prev.transcribing == null) return prev;
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
        return;
      }

      if (msg.type === "error") {
        setState((prev) => {
          if (prev.phase !== "draft" || prev.sessionId !== mySessionId) return prev;
          // Abort in-flight chunks: clear `transcribing` so ✓ Add is no
          // longer gated by completion. If any chunks already succeeded,
          // those sentences remain editable — don't strand the user.
          return {
            ...prev,
            transcribing: null,
            error: typeof msg.message === "string" ? msg.message : "error",
          };
        });
        return;
      }
    };

    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [draftSessionId]);

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
    lastPcmRef.current = null;
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

  return { state, start, stop, editSentence, discardSentence, tryAgain, reset };
}
