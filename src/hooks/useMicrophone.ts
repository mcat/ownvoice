import { useState, useRef, useCallback, useEffect } from "preact/hooks";
import { getModelManager } from "../models/modelManager";

/** Periodic flush interval: send audio snapshot to worker every N ms */
const STREAM_INTERVAL_MS = 5_000;

/** ScriptProcessor buffer size (samples per callback) */
const BUFFER_SIZE = 4096;

/** Safety timeout: remove listener if no transcript arrives after final flush (ms) */
const FLUSH_TIMEOUT_MS = 15_000;

/** Audio level update rate (~15 fps) */
const LEVEL_INTERVAL_MS = 66;

export interface MicrophoneState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  audioLevel: number;
  transcribing: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  clearTranscript: () => void;
}

/**
 * Hook for capturing microphone audio and sending it to the STT worker.
 *
 * Sends a growing audio snapshot to Whisper every 5 seconds so transcription
 * streams while the user is still speaking. Each snapshot contains ALL audio
 * captured so far (growing window), so each result replaces the previous one.
 * A final flush on stop gives the definitive transcript.
 */
export function useMicrophone(): MicrophoneState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const workerListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Track pending flushes so we don't remove the listener before transcripts arrive
  const pendingFlushRef = useRef(0);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  // Periodic streaming timer
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Raw RMS value updated by audio processor, synced to state at throttled rate
  const rawLevelRef = useRef(0);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Decay audio level to 0 when not listening
  useEffect(() => {
    if (!isListening) setAudioLevel(0);
  }, [isListening]);

  // Release everything when the consuming component unmounts. Without this,
  // closing the panel mid-capture orphans the MediaStream and the browser mic
  // indicator stays on indefinitely — there is no handle left to stop it.
  // This is a force-release: unlike stopCapture, no final flush and no waiting
  // for pending transcripts. The session is being abandoned, not finalized.
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      const worker = getModelManager().getWorker("stt");
      if (worker && workerListenerRef.current) {
        worker.removeEventListener("message", workerListenerRef.current);
      }
    };
  }, []);

  /**
   * Remove the worker listener if capture is stopped and no flushes are pending.
   */
  const maybeCleanupListener = useCallback(() => {
    if (!stoppedRef.current) return;
    if (pendingFlushRef.current > 0) return;

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    const worker = getModelManager().getWorker("stt");
    if (worker && workerListenerRef.current) {
      worker.removeEventListener("message", workerListenerRef.current);
      workerListenerRef.current = null;
    }
  }, []);

  /**
   * Build a combined Float32Array from all accumulated chunks.
   * Does NOT clear the buffer — caller decides whether to clear.
   */
  const combineChunks = useCallback((): { audio: Float32Array; sampleRate: number } | null => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return null;

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLength === 0) return null;

    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return { audio: combined, sampleRate: audioCtxRef.current?.sampleRate ?? 44100 };
  }, []);

  /**
   * Send audio to the STT worker. If `snapshot` is true, keeps the buffer
   * for future flushes (growing window). If false, clears it (final flush).
   */
  const sendToWorker = useCallback((snapshot: boolean) => {
    const data = combineChunks();
    if (!data) return;

    if (!snapshot) chunksRef.current = [];

    const worker = getModelManager().getWorker("stt");
    if (!worker) {
      console.warn("[OwnVoice:Mic] STT worker not available");
      setError("Speech-to-text model not loaded");
      return;
    }

    // For snapshots, we need to copy the buffer since we're keeping the original
    const audio = snapshot ? new Float32Array(data.audio) : data.audio;

    pendingFlushRef.current++;
    setTranscribing(true);

    const durationSec = (audio.length / data.sampleRate).toFixed(1);
    console.log(`[OwnVoice:Mic] ${snapshot ? "Snapshot" : "Final flush"}: ${durationSec}s of audio`);

    worker.postMessage(
      { type: "transcribe", audio, sampleRate: data.sampleRate },
      [audio.buffer],
    );

    // Safety timeout for final flushes
    if (!snapshot) {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = setTimeout(() => {
        pendingFlushRef.current = 0;
        setTranscribing(false);
        maybeCleanupListener();
      }, FLUSH_TIMEOUT_MS);
    }
  }, [combineChunks, maybeCleanupListener]);

  /**
   * Start capturing audio from the microphone.
   */
  const startCapture = useCallback(async () => {
    setError(null);
    stoppedRef.current = false;
    pendingFlushRef.current = 0;

    const manager = getModelManager();
    if (!manager.isReady("stt")) {
      setError("Speech-to-text model is not loaded yet");
      return;
    }

    const worker = manager.getWorker("stt");
    if (!worker) {
      setError("Speech-to-text worker not available");
      return;
    }

    // Set up worker message listener for transcription results.
    // Each result replaces the transcript (growing window — each flush
    // contains all audio, so each result is a complete transcription).
    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "partial" && msg.text) {
        const trimmed = msg.text.trim();
        if (trimmed) setTranscript(trimmed);
      } else if (msg.type === "transcript") {
        const trimmed = (msg.text ?? "").trim();
        console.log(`[OwnVoice:Mic] Final transcript: "${trimmed}"`);
        if (trimmed) setTranscript(trimmed);
        setTranscribing(false);
        pendingFlushRef.current = Math.max(0, pendingFlushRef.current - 1);
        maybeCleanupListener();
      } else if (msg.type === "log") {
        console.log("[OwnVoice:STT:GPU]", msg.text);
      } else if (msg.type === "error") {
        console.error("[OwnVoice:Mic] STT error:", msg.message);
        setError(msg.message);
        setTranscribing(false);
        pendingFlushRef.current = Math.max(0, pendingFlushRef.current - 1);
        maybeCleanupListener();
      }
    };
    workerListenerRef.current = onMessage;
    worker.addEventListener("message", onMessage);

    // Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access in your browser settings."
          : err instanceof Error
            ? err.message
            : "Failed to access microphone";
      setError(message);
      worker.removeEventListener("message", onMessage);
      workerListenerRef.current = null;
      return;
    }

    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    chunksRef.current = [];

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const samples = new Float32Array(input.length);
      samples.set(input);

      chunksRef.current.push(samples);

      // Compute RMS energy for audio level indicator
      let sumSq = 0;
      for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sumSq / samples.length);
      rawLevelRef.current = Math.min(1, rms / 0.15);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    // Start throttled audio level updates
    levelIntervalRef.current = setInterval(() => {
      setAudioLevel(rawLevelRef.current);
    }, LEVEL_INTERVAL_MS);

    // Start periodic streaming: send a snapshot of all audio every 5s
    // so transcription starts while the user is still speaking.
    // The worker's concurrency guard drops requests if already busy,
    // naturally throttling to one transcription at a time.
    streamTimerRef.current = setInterval(() => {
      sendToWorker(true);
    }, STREAM_INTERVAL_MS);

    setIsListening(true);
  }, [sendToWorker, maybeCleanupListener]);

  /**
   * Stop capturing and do a final flush of all audio.
   * The worker listener stays alive until the final transcript arrives.
   */
  const stopCapture = useCallback(() => {
    // Stop periodic streaming
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    // Final flush — sends all audio and clears the buffer
    sendToWorker(false);

    stoppedRef.current = true;

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    // Close audio context
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    // Stop audio level updates
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    rawLevelRef.current = 0;

    setIsListening(false);
    maybeCleanupListener();
  }, [sendToWorker, maybeCleanupListener]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    error,
    audioLevel,
    transcribing,
    startCapture,
    stopCapture,
    clearTranscript,
  };
}
