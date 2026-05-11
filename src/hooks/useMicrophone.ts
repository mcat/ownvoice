import { useState, useRef, useCallback, useEffect } from "preact/hooks";

// Audio worklet processor (public/audio-capture-worklet.js) emits a
// 128-frame chunk per render quantum — the AudioWorklet spec mandates
// that block size; the worklet copies and posts each one to the main
// thread for accumulation.

/** Audio level update rate (~15 fps) */
const LEVEL_INTERVAL_MS = 66;
/** Elapsed-time update rate (~15 fps) */
const ELAPSED_INTERVAL_MS = 66;

export interface MicrophoneHandle {
  start(): Promise<void>;
  /** Returns the accumulated mono PCM at the AudioContext sample rate. */
  stop(): Promise<Float32Array>;
  /** 0..1 RMS, updated ~15 fps. */
  level: number;
  /** Time since start in ms. */
  elapsedMs: number;
  recording: boolean;
}

/**
 * Hook for capturing microphone audio into a mono Float32 buffer.
 *
 * Captures audio while recording. `stop()` returns the accumulated PCM and
 * releases the mic. The orchestrator (e.g. `useListenSession`) owns what
 * happens to the buffer afterward — this hook deliberately has no knowledge
 * of workers, transcription, or any downstream consumer.
 *
 * Force-release on unmount: closing the consuming component mid-capture
 * orphans the MediaStream and the browser mic indicator stays on
 * indefinitely. The unmount effect tears everything down.
 */
export function useMicrophone(): MicrophoneHandle {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startedAtRef = useRef<number>(0);

  // Raw RMS value updated by audio processor, synced to state at throttled rate
  const rawLevelRef = useRef(0);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Release all audio resources. Idempotent — safe to call multiple times
   * and safe to call when nothing is active.
   */
  const release = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.port.postMessage({ type: "stop" });
      } catch {
        /* port may already be closed */
      }
      processorRef.current.port.onmessage = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    rawLevelRef.current = 0;
  }, []);

  // Force-release on unmount. Without this, closing the panel mid-capture
  // orphans the MediaStream and the browser mic indicator stays on.
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  // Decay level to 0 when not recording
  useEffect(() => {
    if (!recording) setLevel(0);
  }, [recording]);

  const start = useCallback(async (): Promise<void> => {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    // Register the AudioWorklet processor served from /audio-capture-worklet.js.
    try {
      await audioCtx.audioWorklet.addModule("/audio-capture-worklet.js");
    } catch (err) {
      audioCtx.close().catch(() => {});
      audioCtxRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      throw err;
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(audioCtx, "audio-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    });
    processorRef.current = processor;

    chunksRef.current = [];

    processor.port.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type !== "samples" || !(msg.samples instanceof Float32Array)) return;
      const samples = msg.samples;

      chunksRef.current.push(samples);

      // Compute RMS energy for level indicator
      let sumSq = 0;
      for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sumSq / samples.length);
      rawLevelRef.current = Math.min(1, rms / 0.15);
    };

    // AudioWorkletNode runs as long as it has connected inputs — no need
    // to connect to destination (unlike ScriptProcessorNode).
    source.connect(processor);

    startedAtRef.current = Date.now();
    setElapsedMs(0);

    levelIntervalRef.current = setInterval(() => {
      setLevel(rawLevelRef.current);
    }, LEVEL_INTERVAL_MS);
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, ELAPSED_INTERVAL_MS);

    setRecording(true);
  }, []);

  const stop = useCallback(async (): Promise<Float32Array> => {
    const chunks = chunksRef.current;
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    chunksRef.current = [];

    release();
    setRecording(false);

    return combined;
  }, [release]);

  return { start, stop, level, elapsedMs, recording };
}
