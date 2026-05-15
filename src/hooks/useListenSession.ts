import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { useMicrophone } from "./useMicrophone";
import { getModelManager } from "../models/modelManager";
import { segmentSentences } from "../utils/sentenceSegment";
import * as audioCacheRunner from "../models/audioCacheRunner";
import { useSettingsStore } from "../stores/settingsStore";

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
      // Monotonic id so the worker-message handler can drop stale
      // messages from a discarded prior session (the worker is a singleton).
      sessionId: number;
      sentences: Sentence[];
      transcribing: { done: number; total: number } | null;
      /** Null while healthy; message string when a chunk failed. */
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
  const transcriptIndexRef = useRef(0);
  const sessionCounterRef = useRef(0);
  // PCM from the last stop(), retained for tryAgain() after a worker error.
  const lastPcmRef = useRef<Float32Array | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastSpeechRef = useRef<number>(0);

  // micRef so start/stop don't have to depend on `mic` — useMicrophone
  // re-renders ~5fps while recording, which would otherwise re-create
  // the callbacks and thrash the 250ms poll effect.
  const micRef = useRef(mic);
  micRef.current = mic;

  // TTS pre-gen synthesizes through the same WebGPU adapter the STT decoder
  // uses; running both concurrently starves STT. The ref tracks ownership so
  // resume only fires for pauses *this* hook caused — external pauses
  // (patient-switch, settings reset) stay paused on our resume.
  const pausedPregenRef = useRef(false);

  const pausePregen = useCallback(() => {
    if (pausedPregenRef.current) return;
    audioCacheRunner.pauseAll();
    pausedPregenRef.current = true;
  }, []);

  const resumePregen = useCallback(() => {
    if (!pausedPregenRef.current) return;
    pausedPregenRef.current = false;
    const cfg = useSettingsStore.getState().cfg;
    if (cfg == null) return;
    void audioCacheRunner.resumeAll(cfg);
  }, []);

  const start = useCallback(async () => {
    transcriptIndexRef.current = 0;
    startTimeRef.current = Date.now();
    lastSpeechRef.current = Date.now();
    pausePregen();
    await micRef.current.start();
    setState({ phase: "recording", elapsedMs: 0, level: 0 });
  }, [pausePregen]);

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

      // Short-circuit no-op renders. The pill only re-renders for
      // human-visible changes: a new whole-second elapsed value, a
      // perceptible level change (>2%), or a countdown step.
      setState((prev) => {
        if (prev.phase !== "recording") return prev;
        const sameSecond =
          Math.floor(prev.elapsedMs / 1000) === Math.floor(elapsed / 1000);
        const sameLevel = Math.abs(prev.level - currentLevel) < 0.02;
        const sameCountdown = prev.silenceCountdownMs === silenceCountdownMs;
        if (sameSecond && sameLevel && sameCountdown) return prev;
        return {
          phase: "recording",
          elapsedMs: elapsed,
          level: currentLevel,
          silenceCountdownMs,
        };
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
          const allDone = done >= total;
          // Release the held PCM once all chunks succeed — tryAgain only
          // fires on error, and at that point a fresh dispatch already
          // recaptures lastPcmRef. Keeping it pinned for the full draft
          // lifetime held up to ~57 MB unnecessarily.
          if (allDone && prev.error == null) lastPcmRef.current = null;
          return {
            ...prev,
            sentences: [...prev.sentences, ...newSentences],
            transcribing: allDone ? null : { done, total },
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
    lastPcmRef.current = null;
    setState({ phase: "idle" });
    resumePregen();
  }, [resumePregen]);

  // Force-stop the mic on unmount — without it the browser indicator
  // stays on indefinitely with no handle to release the MediaStream.
  useEffect(() => {
    return () => {
      if (micRef.current.recording) {
        void micRef.current.stop().catch(() => undefined);
      }
      resumePregen();
    };
  }, [resumePregen]);

  // If the tab stays hidden > VISIBILITY_GRACE_MS while recording, end
  // the capture. Same indicator-leak reason as unmount cleanup.
  useEffect(() => {
    let timeout: number | null = null;
    const onVisibility = () => {
      if (document.hidden) {
        timeout = window.setTimeout(() => {
          // Re-check inside setState so a phase change during the grace
          // window (e.g. transcription finished and we're now in draft)
          // doesn't get clobbered.
          setState((prev) => {
            if (prev.phase !== "recording") return prev;
            void micRef.current.stop().catch(() => undefined);
            resumePregen();
            return { phase: "idle" };
          });
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
  }, [resumePregen]);

  return { state, start, stop, editSentence, discardSentence, tryAgain, reset };
}
