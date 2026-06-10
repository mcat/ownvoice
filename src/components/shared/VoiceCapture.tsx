import { useState, useRef, useEffect } from "preact/hooks";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { Btn } from "./Btn";
import { getModelManager } from "../../models/modelManager";
import { bootTTSWasm } from "../../models/bootModels";
import { getRecordingScript } from "../../data/recordingScripts";
import { preprocessEnrollment } from "../../models/enrollmentAudio";
import { denoise } from "../../models/denoiserClient";
import { useModels } from "../../hooks/useModels";
import { friendlyVoiceError } from "../../data/friendlyError";
import { scoreVoiceSample } from "../../models/voiceQuality";
import { QualityBadge } from "./QualityBadge";
import type { VoiceQualityResult } from "../../models/types";

/**
 * Voice clone processing status — shown in the UI so the user
 * knows whether their voice sample actually produced a usable clone.
 */
export type VoiceCloneStatus =
  | "idle" // no sample yet
  | "model-loading" // TTS model still downloading/loading
  | "extracting" // embedding extraction in progress
  | "ready" // embedding extracted, voice clone active
  | "failed"; // extraction failed (retryable)

export interface VoiceCaptureProps {
  label: string;
  hasVoice: boolean;
  /** Called when voice is captured. Returns the audio blob and (if available) the embedding. */
  onCapture: (audioBlob: Blob, embedding?: unknown, quality?: VoiceQualityResult) => void;
  onRemove: () => void;
  /** Pre-existing audio blob for playback */
  audioBlob?: Blob | null;
  /** Whether a speaker embedding exists for this voice (enables "clone active" indicator) */
  hasEmbedding?: boolean;
  /** Persisted quality from saved speakerData. Renders the compact badge on
   *  the saved-state card. Undefined for legacy speakers (rendered as nothing). */
  savedQuality?: VoiceQualityResult;
  /**
   * BCP-47 locale for the recording script (e.g. "en-US"). Determines whether
   * the recording card shows a phonetically balanced reference passage or
   * falls back to free-speak coaching. Omit to always use free-speak.
   */
  locale?: string;
  compact?: boolean;
  color?: {
    text?: string;
    sub?: string;
    muted?: string;
    border?: string;
    cardBg?: string;
  };
  /**
   * Subscribed by the parent so it can render the steady-state status row
   * (`<VoiceCloneStatus>`) below the captured-voice card. Fires on every
   * extraction-lifecycle transition (idle/extracting/model-loading/ready/failed).
   */
  onCloneStatusChange?: (status: VoiceCloneStatus) => void;
  /**
   * Registers this VoiceCapture's `retryEmbedding` so the parent's
   * `<VoiceCloneStatus>` Retry button can invoke it. Called once on mount
   * and once with `null` on unmount.
   */
  registerRetry?: (fn: (() => void) | null) => void;
}

const RECORD_DURATION = 15;

/**
 * Play a calming tone — soft sine wave with long fade-in and fade-out so
 * it feels like a chime rather than a beep. Used to mark each beat of the
 * pre-recording coaching sequence. Volume stays low (below typical ICU
 * ambient of 50–75 dB) and envelopes are long enough (~300ms each way)
 * to avoid any startle effect.
 *
 * The tone rings for `sustainSec` seconds between fades. Total duration
 * is `sustainSec + attackSec + releaseSec`.
 */
function playTone(freq: number, sustainSec = 0.6, volume = 0.08) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const attack = 0.12;
    const release = 0.35;
    const total = attack + sustainSec + release;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + attack + sustainSec);
    gain.gain.linearRampToValueAtTime(0, now + total);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + total + 0.05);
    osc.onended = () => { try { ctx.close(); } catch { /* already closed */ } };
  } catch { /* audio unavailable — visual cues still work */ }
}

/**
 * Countdown timeline. Each step advances the pre-recording coaching state.
 * Tones use `Solfeggio`-adjacent frequencies chosen to feel calming (soft
 * sine waves, low volume, long fades) while progressing upward in pitch
 * to subtly signal forward motion.
 *
 * Durations in ms. Render fades inherit from the step's `duration` via CSS
 * animation — each message/number fades in, holds, fades out.
 */
type CountdownStep =
  | { kind: "message"; textKey: import("../../data/locales/en").PhraseKey; duration: number; tone?: number }
  | { kind: "beat"; duration: number }
  | { kind: "inhale"; duration: number }
  | { kind: "exhale"; duration: number }
  | { kind: "number"; value: number; duration: number; tone?: number }
  | { kind: "go"; tone: number };

const BREATH_CYCLE_MS = 4000;

const COUNTDOWN_TIMELINE: CountdownStep[] = [
  { kind: "message", textKey: "ui.provider.voice_capture.coaching_intro", duration: 3800, tone: 396 },
  { kind: "beat", duration: 1500 },
  { kind: "message", textKey: "ui.provider.voice_capture.coaching_breath", duration: 3800, tone: 432 },
  // Two 8-second breath cycles, each split into a 4-second inhale +
  // 4-second exhale substep. The circle's scale is controlled directly
  // from the step kind so it stays synced with the "Breathe in…" /
  // "Breathe out…" text. Splitting vs. a single 16s beat also lets us
  // play a soft tone at the top of each breath without silence guessing.
  { kind: "inhale", duration: BREATH_CYCLE_MS },
  { kind: "exhale", duration: BREATH_CYCLE_MS },
  { kind: "inhale", duration: BREATH_CYCLE_MS },
  { kind: "exhale", duration: BREATH_CYCLE_MS },
  { kind: "message", textKey: "ui.provider.voice_capture.coaching_ready", duration: 2300, tone: 528 },
  // No silent beat between "Ready." and "5" — a short beat showed a
  // spurious breath circle. Letting "Ready." fade out while "5" fades
  // in creates a natural transition.
  { kind: "number", value: 5, duration: 1200, tone: 440 },
  { kind: "number", value: 4, duration: 1200, tone: 440 },
  { kind: "number", value: 3, duration: 1200, tone: 440 },
  { kind: "number", value: 2, duration: 1200, tone: 440 },
  { kind: "number", value: 1, duration: 1200, tone: 494 },
  { kind: "go", tone: 659 },
];

// Re-export under the original name so existing tests / consumers
// that import from this file keep working. The implementation lives
// in src/data/friendlyError.ts because Listen (useMicrophone hook)
// needs the same mapping and shouldn't import from a UI component file.
export { friendlyVoiceError };

async function decodeAudio(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 24000 });
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  ctx.close();
  return channelData;
}

/**
 * Extract speaker embedding from audio via the TTS worker.
 * Returns the embedding data, or null if the model isn't ready.
 * Throws on extraction failure.
 *
 * The worker lazy-loads the ~591 MB speech encoder external-data file on
 * the first embed call. On slow networks this can take many minutes; the
 * worker emits an "embed-progress" message as bytes arrive so the caller
 * can surface a "loading model" indicator. After OPFS caches the bytes,
 * subsequent embeds run in seconds.
 *
 * We use an idle watchdog (60s without ANY progress) instead of a hard
 * outer bound so a slow-but-progressing download never spuriously aborts
 * (Bug 2). Each `embed` carries a `requestId` and we only resolve on a
 * matching response so a stale handler doesn't grab a sibling caller's
 * reply (Bug 6).
 */
const IDLE_TIMEOUT_MS = 60_000;
let nextRequestId = 1;

async function extractEmbedding(
  audio: Float32Array,
  onLoadingModel?: () => void,
): Promise<unknown | null> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");

  if (!worker || !mgr.isReady("tts")) {
    return null; // Model not loaded yet
  }

  const requestId = nextRequestId++;

  return new Promise<unknown>((resolve, reject) => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        worker!.removeEventListener("message", handler);
        reject(new Error("This is taking longer than expected. Try again."));
      }, IDLE_TIMEOUT_MS);
    }

    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "embed-progress" && msg.stage === "loading-model") {
        onLoadingModel?.();
        resetIdle();
        return;
      }
      if (msg.type === "embedding" && msg.requestId === requestId) {
        if (idleTimer) clearTimeout(idleTimer);
        worker!.removeEventListener("message", handler);
        resolve(msg.data);
      } else if (msg.type === "error" && msg.requestId === requestId) {
        if (idleTimer) clearTimeout(idleTimer);
        worker!.removeEventListener("message", handler);
        reject(new Error(msg.message || "Voice processing failed"));
      }
    };
    worker.addEventListener("message", handler);
    resetIdle();
    worker.postMessage({
      type: "embed",
      audio,
      sampleRate: 24000,
      requestId,
    });
  });
}

// Test hook — keep at module scope so vitest can call it directly.
export const __test__extractEmbedding = extractEmbedding;

export function VoiceCapture({
  hasVoice,
  onCapture,
  onRemove,
  compact = false,
  audioBlob: externalBlob,
  hasEmbedding = false,
  locale,
  color,
  savedQuality,
  onCloneStatusChange,
  registerRetry,
}: VoiceCaptureProps) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const analyserRef = useRef<{
    ctx: AudioContext;
    node: AnalyserNode;
    raf: number;
  } | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  /**
   * Pre-recording countdown index into `COUNTDOWN_TIMELINE`. `null` means
   * no countdown is running. The timeline walks through intro messages,
   * breathing beats, and a final 5→1 countdown before MediaRecorder
   * starts. See `COUNTDOWN_TIMELINE` above.
   */
  const [countdownIdx, setCountdownIdx] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewQuality, setPreviewQuality] = useState<VoiceQualityResult | null>(null);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(externalBlob ?? null);
  const [playing, setPlaying] = useState(false);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice clone status
  const [cloneStatus, setCloneStatus] = useState<VoiceCloneStatus>(
    hasEmbedding ? "ready" : hasVoice ? "model-loading" : "idle",
  );

  // Broadcast extraction-lifecycle changes to the parent so it can render
  // the steady-state status row outside this card.
  useEffect(() => {
    onCloneStatusChange?.(cloneStatus);
  }, [cloneStatus, onCloneStatusChange]);

  // Readiness signal for the pre-capture hint. The deferred-save countdown
  // copy that used these helpers moved to <VoiceCloneStatus>, which is the
  // single source of truth for the model-loading line now.
  const { isWarm } = useModels();
  const ttsWarm = isWarm("tts");

  // Lazy WASM TTS worker spawn: App.tsx defers bootTTSWasm when GPU TTS
  // is healthy and every patient is already enrolled. A real enrollment
  // (mounting this card with hasVoice=true) needs the encoder, so trigger
  // the boot here. bootTTSWasm is idempotent — repeated calls return the
  // same promise, so a re-mount won't double-spawn.
  useEffect(() => {
    if (!hasVoice) return;
    bootTTSWasm();
  }, [hasVoice]);

  // When the TTS model becomes warm, retry embedding extraction if we have
  // audio but no embedding.
  //
  // This effect waits for the worker to flip to `warm`, not `ready`, because
  // `ready` only means the tokenizer loaded — see Task 4 for the warmup
  // pipeline. The 591 MB speech encoder external-data file isn't fetched
  // until warmup completes, and an embed call before that point would block
  // for minutes on a cold network rather than producing an embedding.
  //
  // This used to be "check isReady → if not, subscribe" but that had a
  // check-then-subscribe race: the model could transition between the
  // isReady check and the subscription, and the notification would fire
  // with no listener registered. The UI would then wait forever on a state
  // event that had already passed. We now subscribe FIRST, then synchronously
  // check the current state — any transition that happens during the race
  // window is caught by one or the other. A `handled` flag dedupes.
  useEffect(() => {
    if (cloneStatus !== "model-loading" || !hasVoice) return;

    const mgr = getModelManager();
    let handled = false;

    function handleStatus(status: string | undefined, err: string | undefined) {
      if (handled) return;
      if (status === "warm") {
        handled = true;
        retryEmbedding();
      } else if (status === "error") {
        handled = true;
        setCloneStatus("failed");
        setError(err || "Voice model failed to load. The app will use a standard voice.");
      }
    }

    const unsub = mgr.onProgress((progress) => {
      const tts = progress.find((p) => p.model === "tts");
      handleStatus(tts?.status, tts?.error);
    });

    // Check the current state immediately. If already warm/error, the
    // subscription won't fire a notification for that past transition —
    // but this sync check catches it. If pending, the subscription is
    // armed for the future transition.
    const initial = mgr.getProgress().find((p) => p.model === "tts");
    handleStatus(initial?.status, initial?.error);

    return unsub;
  }, [cloneStatus, hasVoice]);

  // Clean up analyser when recording stops
  useEffect(() => {
    if (!recording && analyserRef.current) {
      cancelAnimationFrame(analyserRef.current.raf);
      analyserRef.current.ctx.close();
      analyserRef.current = null;
      setAudioLevel(0);
    }
  }, [recording]);

  // Release EVERYTHING the recording path may hold on unmount — countdown
  // timer, held stream, live recorder, seconds interval, metering context.
  // A mid-RECORDING unmount (patient reset, sheet close, navigation) used
  // to leave the MediaRecorder armed and the mic indicator lit until the
  // tab closed: the old cleanup only stopped tracks when the stream had
  // not yet been handed to a recorder.
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      clearInterval(timerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        // Detach handlers first: onstop would setState into an unmounted
        // component and double-stop the tracks we stop directly below.
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch { /* already stopped */ }
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (analyserRef.current) {
        cancelAnimationFrame(analyserRef.current.raf);
        analyserRef.current.ctx.close();
        analyserRef.current = null;
      }
      try { window.speechSynthesis?.cancel(); } catch { /* non-critical */ }
    };
  }, []);

  // Auto-stop recording at RECORD_DURATION
  useEffect(() => {
    if (recording && recordSecs >= RECORD_DURATION) {
      stopRecording();
    }
  }, [recording, recordSecs]);

  // Score the preview blob so the recording-preview screen can show a
  // full-size QualityBadge BEFORE the user accepts the take.
  useEffect(() => {
    if (!previewBlob) {
      setPreviewQuality(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const audio = await decodeAudio(previewBlob);
        const result = scoreVoiceSample(audio, 24000);
        if (!cancelled) setPreviewQuality(result);
      } catch {
        if (!cancelled) setPreviewQuality(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewBlob]);

  const c = {
    text: color?.text ?? "#1A1A1A",
    sub: color?.sub ?? "#6B7280",
    muted: color?.muted ?? "#9CA3AF",
    border: color?.border ?? "#E5E7EB",
    cardBg: color?.cardBg ?? "#FFFFFF",
  };

  // Design tokens. `compact` scales decorative properties only; touch-target
  // floors are invariant (WCAG 2.5.8, iOS HIG). Caregivers may be gloved and
  // rushed, so hit area and gap cannot shrink with density.
  const ui = {
    outerPad: compact ? "10px 14px" : "12px 16px",
    outerRadius: compact ? 10 : 12,
    iconSm: compact ? 14 : 16,
    iconMd: compact ? 16 : 18,
    iconLg: compact ? 18 : 20,
    textMd: compact ? 14 : 15,
    textSm: compact ? 13 : 14,
  };
  const btnFloor = {
    minHeight: 44,
    minWidth: 44,
    fontSize: 14,
    padding: "10px 14px",
    borderRadius: 10,
    gap: 12,
  } as const;

  // Register retry with the parent (so the steady-state row's Retry button
  // can invoke it).
  //
  // Both refs below stabilise the cleanup/re-register cycle. Without them,
  // every parent render — which typically passes a fresh `(fn) => { retryRef
  // .current = fn }` arrow as `registerRetry` — would re-fire this effect,
  // flashing the parent's retryRef through null between cleanup and the
  // re-register call. A user clicking Retry exactly during the gap would
  // get a no-op. See #223.
  //
  // - retryEmbeddingRef keeps the registered callback closure stable while
  //   still routing each invocation to the current render's `retryEmbedding`
  //   (which closes over fresh state every render).
  // - registerRetryRef lets the effect run once on mount: we always reach
  //   into the latest registerRetry through the ref, so it's safe to leave
  //   the prop out of the dep array.
  const retryEmbeddingRef = useRef<() => void>();
  retryEmbeddingRef.current = () => { void retryEmbedding(); };
  const registerRetryRef = useRef(registerRetry);
  registerRetryRef.current = registerRetry;
  useEffect(() => {
    registerRetryRef.current?.(() => retryEmbeddingRef.current?.());
    return () => registerRetryRef.current?.(null);
  }, []);

  // --- Retry embedding extraction (when model loads after initial capture) ---
  async function retryEmbedding() {
    const blob = savedBlob || externalBlob;
    if (!blob) return;

    setCloneStatus("extracting");
    setError(null);
    try {
      // DeepFilterNet3 pre-filter on the enrollment clip — runs unconditionally
      // on every mic recording and every uploaded file. Best-effort: denoise()
      // returns the input unchanged on worker init/run failures so enrollment
      // is never blocked by the denoise stage. QUALITY_VERSION is bumped to
      // v3 to tag scores produced from denoised input. See
      // [[project_voice_quality_recalibration]] for threshold-recalibration plan.
      const rawAudio = await denoise(await decodeAudio(blob), 24000);
      // SNR/length gate only — pass audio to the encoder. Upstream
      // chatterbox-multilingual passes librosa.load output straight in;
      // our HP at 80Hz / peak-normalize / VAD-trim chain was scrubbing
      // identity cues the encoder uses (notably male F0 fundamentals).
      const prep = preprocessEnrollment(rawAudio, 24000);
      if (!prep.acceptable) {
        setError(prep.rejectionReason ?? "Recording quality too low.");
        setCloneStatus("failed");
        return;
      }
      // No `onLoadingModel` callback here — we're inside the
      // model-loading-recovery path (the model is already warm; this is the
      // retry firing after worker warmup). If we passed the same
      // setCloneStatus("model-loading") callback that processAndCapture uses,
      // the worker's first `embed-progress` event would flip status from
      // "extracting" → "model-loading", which re-fires the
      // [cloneStatus, hasVoice] useEffect, which calls retryEmbedding again,
      // queueing a second embed message. The cycle repeats per progress
      // event, flooding the worker with hundreds of concurrent extractions.
      const quality = scoreVoiceSample(rawAudio, 24000);
      const embedding = await extractEmbedding(rawAudio);
      if (embedding) {
        setCloneStatus("ready");
        onCapture(blob, embedding, quality);
      } else {
        setCloneStatus("model-loading");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice processing failed";
      setError(msg);
      setCloneStatus("failed");
    }
  }

  // --- Process audio and extract embedding ---
  async function processAndCapture(blob: Blob) {
    setCloneStatus("extracting");
    setError(null);
    try {
      // DF3 pre-filter — see retryEmbedding above.
      const rawAudio = await denoise(await decodeAudio(blob), 24000);
      // See retryEmbedding above — SNR gate only, audio to the encoder.
      const prep = preprocessEnrollment(rawAudio, 24000);
      if (!prep.acceptable) {
        // Save the blob so the user can preview what they captured before retrying.
        setSavedBlob(blob);
        setError(prep.rejectionReason ?? "Recording quality too low.");
        setCloneStatus("failed");
        onCapture(blob);
        return;
      }
      // Don't pass an onLoadingModel callback. Earlier versions used
      // `() => setCloneStatus("model-loading")` here to swap the UI copy mid-
      // extraction, but the worker fires `embed-progress` repeatedly during
      // the encoder fetch — each one would flip cloneStatus
      // "extracting" → "model-loading", which re-fires the
      // [cloneStatus, hasVoice] useEffect that decides whether to retry.
      // The handler then re-issued `extractEmbedding` while the first one was
      // still in flight, queueing dozens of concurrent embeds in the worker.
      // The "model-loading" status is set explicitly below in the
      // extract-returned-null branch (worker not ready) and is the right
      // signal for the retry-after-warm useEffect to fire on.
      const quality = scoreVoiceSample(rawAudio, 24000);
      const embedding = await extractEmbedding(rawAudio);
      setSavedBlob(blob);

      if (embedding) {
        setCloneStatus("ready");
        onCapture(blob, embedding, quality);
      } else {
        // Model not ready yet — save audio, mark as captured, will retry when model loads
        setCloneStatus("model-loading");
        onCapture(blob, undefined, quality);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice processing failed";
      setError(msg);
      setCloneStatus("failed");
      // Still save the audio so the user can retry
      setSavedBlob(blob);
      onCapture(blob);
    }
  }

  // --- File upload ---
  async function handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const blob = new Blob([file], { type: file.type });
    await processAndCapture(blob);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // --- Recording flow ---
  //
  // Two-phase: first acquire mic permission and run a ~4s pre-recording
  // countdown with audio cues, THEN start the actual MediaRecorder so the
  // full 15s budget is available for reading. This keeps the permission
  // prompt out of the way before the coaching begins.

  async function startRecording() {
    setError(null);
    setPreviewBlob(null);
    try {
      // Acquire mic permission BEFORE the countdown so the permission
      // dialog doesn't interrupt the cue sequence. The stream is held
      // open (but not recorded) until the countdown completes.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      beginCountdownTimeline(stream);
    } catch {
      setError(resolvePhrase("ui.provider.voice_capture.err_mic_denied_raw", caregiverLang));
    }
  }

  /**
   * Walk the COUNTDOWN_TIMELINE one step at a time, firing tones and
   * advancing the state index. Each step schedules its own successor
   * via setTimeout so durations can be heterogeneous.
   */
  function beginCountdownTimeline(stream: MediaStream) {
    let idx = 0;
    setCountdownIdx(0);
    const step = COUNTDOWN_TIMELINE[0];
    if (step.kind === "message" || step.kind === "number") {
      if (step.tone) playTone(step.tone);
    }

    const advance = () => {
      idx += 1;
      if (idx >= COUNTDOWN_TIMELINE.length) return;
      if (!streamRef.current) return; // cancelled

      const next = COUNTDOWN_TIMELINE[idx];
      setCountdownIdx(idx);

      if (next.kind === "go") {
        // Start recording on the "go" beat. The completion tone rings
        // over the first ~1s of recording, which is fine — embedding
        // extraction averages over the whole clip.
        playTone(next.tone, 0.7, 0.1);
        setCountdownIdx(null);
        _startMediaRecorder(stream);
        return;
      }

      if (next.kind === "message" || next.kind === "number") {
        if (next.tone) playTone(next.tone);
      }

      // `next` is narrowed here to exclude the "go" variant (handled above)
      // so `duration` is guaranteed to exist.
      countdownTimerRef.current = setTimeout(advance, next.duration);
    };

    // The first step is never a "go" — safe to access duration directly.
    if (step.kind !== "go") {
      countdownTimerRef.current = setTimeout(advance, step.duration);
    }
  }

  /**
   * Cancel an in-flight countdown and release the held mic stream
   * without producing an audio clip.
   */
  function cancelCountdown() {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownIdx(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  /** Internal — starts the MediaRecorder against an already-acquired stream. */
  function _startMediaRecorder(stream: MediaStream) {
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      clearInterval(timerRef.current);
      setRecording(false);
      setPreviewBlob(new Blob(chunks, { type: "audio/webm" }));
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setRecordSecs(0);
    timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);

    // Audio level metering
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++)
          sum += dataArray[i] * dataArray[i];
        setAudioLevel(Math.sqrt(sum / dataArray.length) / 255);
        analyserRef.current!.raf = requestAnimationFrame(tick);
      }
      analyserRef.current = {
        ctx: audioCtx,
        node: analyser,
        raf: requestAnimationFrame(tick),
      };
    } catch { /* metering is non-critical */ }
  }

  function stopRecording() {
    // Clear the tick interval defensively — recorder.onstop also clears it,
    // but stopping the counter here avoids a race where another setRecordSecs
    // tick could fire between the stop() call and the onstop handler.
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    mediaRecorderRef.current?.stop();
  }

  // --- Accept recording from preview ---
  async function acceptRecording() {
    if (!previewBlob) return;
    setPreviewBlob(null);
    await processAndCapture(previewBlob);
  }

  // --- Playback ---
  async function playBlob(blob: Blob) {
    try {
      stopPlayback();
      const ctx = new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlaying(false);
        ctx.close();
        playbackCtxRef.current = null;
      };
      playbackCtxRef.current = ctx;
      source.start();
      setPlaying(true);
    } catch {
      setError(resolvePhrase("ui.provider.voice_capture.err_playback", caregiverLang));
    }
  }

  function stopPlayback() {
    try { playbackCtxRef.current?.close(); } catch { /* already closed */ }
    playbackCtxRef.current = null;
    setPlaying(false);
  }

  function discardPreview() {
    stopPlayback();
    setPreviewBlob(null);
  }

  function handleRemove() {
    stopPlayback();
    setError(null);
    setSavedBlob(null);
    setCloneStatus("idle");
    onRemove();
  }

  // --- Shared elements ---
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="audio/*,.mp3,.wav,.m4a,.aac,.mp4,.caf,.flac"
      style={{ display: "none" }}
      onChange={handleFile}
    />
  );


  // ===================== RENDER STATES =====================

  // --- Pre-recording countdown state ---
  // The mic is already acquired (permission granted) but MediaRecorder has
  // not been started. We walk the COUNTDOWN_TIMELINE so the patient has
  // time to orient, breathe, and settle before reading. Each step fades
  // in and out; beats between messages give the patient breathing room.
  if (countdownIdx !== null) {
    const step = COUNTDOWN_TIMELINE[countdownIdx];
    // A "go" step would have already cleared countdownIdx in the timeline
    // advance, so we never render it here. Default to 1000ms if ever hit.
    const stepDuration = step.kind === "go" ? 1000 : step.duration;
    // Keyed on idx so the same DOM node type re-mounts between steps and
    // re-triggers the CSS fade animation.
    const animStyle = {
      animation: `voiceCoachFade ${stepDuration}ms ease-in-out both`,
    } as const;
    const inBreath = step.kind === "inhale" || step.kind === "exhale";

    // Fixed content-area height so swapping between a short message, a
    // large numeral, and a breathing circle doesn't cause the card (or the
    // whole Settings sheet below it) to jump. 220px comfortably fits the
    // peak-scale breath circle (~160px) and the 112px countdown numeral.
    const contentHeight = compact ? 180 : 220;
    const countdownScript = getRecordingScript(locale);

    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: compact ? "24px 18px" : "32px 24px",
          background: "#FFFBEB",
          borderRadius: compact ? 10 : 12,
          border: "2px solid #FCD34D",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {fileInput}
        {/* Persistent tone hint above the breathing/countdown content so the
            user sees it during their preparation window — that's when they
            can actually adjust their delivery, not after recording starts. */}
        <p
          style={{
            margin: 0,
            // 18px is the project's patient-content minimum (CLAUDE.md). The
            // earlier 13/14px violated that floor for the population that
            // actually reads this hint while preparing to record.
            fontSize: compact ? 16 : 18,
            lineHeight: 1.4,
            color: "#78350F", // amber-950: 8.75:1 on #FFFBEB (AAA-normal)
            fontWeight: 500,
            maxWidth: compact ? 280 : 360,
          }}
        >
          {countdownScript.toneHint}
        </p>
        <div
          style={{
            height: contentHeight,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {step.kind === "message" && (
            <span
              key={`m-${countdownIdx}`}
              style={{
                fontSize: compact ? 18 : 22,
                color: "#78350F", // amber-950 — richer contrast than 900
                fontWeight: 500,
                lineHeight: 1.4,
                ...animStyle,
              }}
            >
              {resolvePhrase(step.textKey, caregiverLang)}
            </span>
          )}
          {step.kind === "number" && (
            <span
              key={`n-${countdownIdx}`}
              aria-label={`${step.value} seconds`}
              style={{
                fontSize: compact ? 88 : 112,
                lineHeight: 1,
                fontWeight: 700,
                color: "#B45309", // amber-700 — better contrast than 600
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
                ...animStyle,
              }}
            >
              {step.value}
            </span>
          )}
          {step.kind === "beat" && (
            // Non-breathing silent beat — just a faint static dot to show
            // the UI isn't frozen. No animation (short beats would show a
            // half-finished cycle, which looked errant).
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#FCD34D",
                opacity: 0.55,
              }}
            />
          )}
          {inBreath && (
            // Breath-paced circle with text label. The circle uses a
            // per-step CSS keyframe animation (voiceCoachInhale /
            // voiceCoachExhale) keyed on countdownIdx so each step
            // starts at its declared "from" state — small for inhale,
            // large for exhale — even on the very first beat. A CSS
            // transition would paint the end-state immediately on the
            // first inhale because there's no prior value to animate
            // from. The text is keyed identically so it fades in/out
            // per substep.
            <div
              key="breath"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <span
                key={`breath-circle-${countdownIdx}`}
                aria-hidden="true"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, #FCD34D 0%, #FDE68A 75%)",
                  animation: `${step.kind === "inhale" ? "voiceCoachInhale" : "voiceCoachExhale"} ${BREATH_CYCLE_MS}ms ease-in-out both`,
                  transformOrigin: "center",
                  boxShadow: "0 0 28px 6px rgba(252, 211, 77, 0.25)",
                }}
              />
              <span
                key={`breath-text-${countdownIdx}`}
                style={{
                  fontSize: compact ? 16 : 18,
                  color: "#78350F",
                  fontWeight: 500,
                  animation: `voiceCoachFade ${stepDuration}ms ease-in-out both`,
                }}
              >
                {step.kind === "inhale" ? resolvePhrase("ui.provider.voice_capture.breathe_in", caregiverLang) : resolvePhrase("ui.provider.voice_capture.breathe_out", caregiverLang)}
              </span>
            </div>
          )}
        </div>
        <Btn
          onClick={cancelCountdown}
          aria-label={resolvePhrase("ui.provider.voice_capture.cancel_countdown_aria", caregiverLang)}
          style={{
            background: "none",
            color: "#78350F", // amber-950
            border: "1px solid #B45309", // amber-700 for 3:1 non-text contrast
            minHeight: btnFloor.minHeight,
            minWidth: btnFloor.minWidth,
            borderRadius: btnFloor.borderRadius,
            padding: btnFloor.padding,
            fontSize: btnFloor.fontSize,
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          {resolvePhrase("ui.provider.voice_capture.cancel", caregiverLang)}
        </Btn>
      </div>
    );
  }

  // --- Recording state ---
  // Amber palette (not red). Red signaled "alarm" in a clinical setting and
  // duplicated the visual language of error states. Amber matches the
  // preview card so "recording" and "previewing" feel like siblings.
  if (recording) {
    const barCount = compact ? 5 : 7;
    const barH = compact ? 20 : 28;
    const progress = Math.min(recordSecs / RECORD_DURATION, 1);
    const remaining = Math.max(0, RECORD_DURATION - recordSecs);
    const script = getRecordingScript(locale);
    const hasPassage = !!script.passage;

    // Coaching is lightweight during recording because the 4-second
    // pre-recording countdown already handled "get ready" moments.
    //   t = 0..11  → quiet (script is the focal point); free-speak gets a countdown
    //   t ≥ 12     → closing hint
    //   t ≥ 15     → "Done!"
    const scriptVisible = hasPassage;
    let coaching = "";
    if (recordSecs >= RECORD_DURATION) {
      coaching = resolvePhrase("ui.provider.voice_capture.done", caregiverLang);
    } else if (recordSecs >= RECORD_DURATION - 3) {
      coaching = script.closingHint;
    } else if (!hasPassage) {
      coaching = script.freeSpeakTemplate.replace("{remaining}", String(remaining));
    }

    return (
      <div
        style={{
          padding: compact ? "12px 14px" : "16px 20px",
          background: "#FFFBEB", // amber-50
          borderRadius: compact ? 10 : 12,
          border: "2px solid #FCD34D", // amber-300
        }}
      >
        {fileInput}
        {/* Tone hint — visible at the top of the recording card so the user
            can adjust delivery while they speak. Shown to passage AND
            free-speak modes uniformly. The clone copies their delivery, so
            a calm/even reference produces a calm/even clone. */}
        <p
          style={{
            margin: 0,
            marginBottom: compact ? 10 : 12,
            fontSize: compact ? 13 : 14,
            lineHeight: 1.4,
            color: "#78350F", // amber-950 (was amber-900 #92400E at 6.84:1 on cream — failed AAA-normal)
            fontWeight: 500,
          }}
        >
          {script.toneHint}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12 }}>
          <span
            aria-hidden="true"
            style={{
              width: compact ? 10 : 12, height: compact ? 10 : 12,
              borderRadius: "50%", background: "#D97706", // amber-600
              display: "inline-block", flexShrink: 0,
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: compact ? 14 : 16, fontWeight: 700, color: "#78350F", // amber-950 (was amber-900 #92400E at 6.84:1 on cream — failed AAA-normal)
              fontVariantNumeric: "tabular-nums", minWidth: 48,
            }}
          >
            {recordSecs}s / {RECORD_DURATION}s
          </span>
          <div
            aria-label={resolvePhrase("ui.provider.voice_capture.audio_level_aria", caregiverLang)}
            style={{
              display: "flex", alignItems: "center", gap: compact ? 2 : 3,
              height: barH, flex: 1, justifyContent: "center",
            }}
          >
            {Array.from({ length: barCount }, (_, i) => {
              const threshold = (i + 1) / (barCount + 1);
              const active = audioLevel > threshold;
              const center = (barCount - 1) / 2;
              const dist = Math.abs(i - center) / center;
              const maxH = barH;
              const minH = maxH * 0.35;
              const baseH = maxH - dist * (maxH - minH);
              const h = active ? baseH : minH;
              return (
                <div
                  key={i}
                  style={{
                    width: compact ? 3 : 4, height: h, borderRadius: 2,
                    background: active ? "#D97706" : "#FDE68A", // amber-600 / amber-200
                    transition: "height 0.08s ease-out",
                  }}
                />
              );
            })}
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={resolvePhrase("ui.provider.voice_capture.recording_progress_aria", caregiverLang)}
          aria-valuemin={0}
          aria-valuemax={RECORD_DURATION}
          aria-valuenow={recordSecs}
          style={{
            marginTop: compact ? 8 : 12,
            height: 6,
            borderRadius: 3,
            background: "#FDE68A", // amber-200
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`, height: "100%", borderRadius: 3,
              // amber-700 gives 4.03:1 against the amber-200 track — passes
              // WCAG 2.2 SC 1.4.11 (non-text contrast 3:1). amber-600 at
              // 2.56:1 failed.
              background: "#B45309",
              transition: "width 1s linear",
            }}
          />
        </div>

        {/* Coaching area — above the script so the patient's eye lands on
            it first. The big 3-2-1 countdown happens BEFORE recording (in
            the dedicated countdown branch above), so during recording this
            slot stays compact: empty during the reading window, a closing
            cue in the final seconds. */}
        <div
          aria-live="polite"
          style={{
            marginTop: compact ? 14 : 18,
            minHeight: compact ? 24 : 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {coaching && (
            <span
              style={{
                fontSize: compact ? 14 : 15,
                color: "#78350F",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {coaching}
            </span>
          )}
        </div>

        {/* Scripted-read panel: phonetically balanced passage so the Chatterbox
            CAMPPlus embedding captures a wider pitch + formant range. Hidden
            during the countdown so the patient isn't split-focused. See
            docs/BIBLIOGRAPHY.md §9 for citations.
            Border at amber-600 gives 3.4:1 against the amber-50 outer card
            (passes WCAG 2.2 SC 1.4.11); this boundary is essential because
            white-on-amber-50 itself is near-invisible (~1.03:1). */}
        {scriptVisible && (
          <div
            style={{
              marginTop: compact ? 14 : 18,
              padding: compact ? "14px 16px" : "18px 20px",
              background: "#FFFFFF",
              borderRadius: compact ? 10 : 12,
              border: "1px solid #D97706",
              animation: "fadeIn 250ms ease-out",
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#78350F",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
            }}>
              {script.prompt}
            </div>
            <p style={{
              margin: 0,
              fontSize: compact ? 18 : 20,
              lineHeight: 1.5,
              color: "#1A1A1A",
              fontWeight: 500,
            }}>
              {script.passage}
            </p>
            {script.subtitle && (
              <p style={{
                margin: "10px 0 0",
                fontSize: 13,
                color: "#78716C",
                fontStyle: "normal",
              }}>
                {script.subtitle}
              </p>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            marginTop: compact ? 10 : 14,
          }}
        >
          {recordSecs < RECORD_DURATION && (
            <Btn
              onClick={stopRecording}
              aria-label={resolvePhrase("ui.provider.voice_capture.stop_early_aria", caregiverLang)}
              style={{
                flexShrink: 0, background: "none", color: "#78350F",
                // amber-700 = 4.84:1 against the amber-50 card (passes AA);
                // amber-300 was 1.39:1 and failed non-text contrast.
                border: "1px solid #B45309",
                minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                borderRadius: btnFloor.borderRadius,
                padding: btnFloor.padding,
                fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              {resolvePhrase("ui.provider.voice_capture.stop_early", caregiverLang)}
            </Btn>
          )}
        </div>
      </div>
    );
  }

  // --- Preview state ---
  if (previewBlob) {
    return (
      <div style={{ padding: ui.outerPad, background: "#FFFBEB", borderRadius: ui.outerRadius, border: "1px solid #FCD34D" }}>
        {fileInput}
        <div style={{ display: "flex", alignItems: "center", gap: btnFloor.gap, marginBottom: compact ? 10 : 12 }}>
          <span aria-hidden="true" style={{ fontSize: ui.iconLg }}>{"\uD83C\uDFA4"}</span>
          <span style={{ fontSize: ui.textMd, fontWeight: 600, color: "#78350F", flex: 1 }}>
            {resolvePhrase("ui.provider.voice_capture.seconds_recorded", caregiverLang).replace("{n}", String(recordSecs))}
          </span>
          <Btn
            onClick={playing ? stopPlayback : () => playBlob(previewBlob)}
            aria-label={playing ? resolvePhrase("ui.provider.voice_capture.stop_preview_aria", caregiverLang) : resolvePhrase("ui.provider.voice_capture.play_preview_aria", caregiverLang)}
            style={{
              // amber-950 gives 8.75:1 with white text (AAA-normal). Earlier
              // amber-700 (#B45309) was 5.02:1 — passed AA but failed AAA,
              // unsuitable for the patient population.
              background: "#78350F", color: "#FFF", border: "none",
              minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            <span aria-hidden="true">{playing ? "\u23F9" : "\u25B6"}</span>
            {" "}
            {playing ? resolvePhrase("ui.provider.voice_capture.stop", caregiverLang) : resolvePhrase("ui.provider.voice_capture.play", caregiverLang)}
          </Btn>
        </div>
        {previewQuality && (
          <div style={{ marginBottom: compact ? 10 : 12 }}>
            <QualityBadge quality={previewQuality} locale={caregiverLang} />
          </div>
        )}
        <div style={{ display: "flex", gap: btnFloor.gap }}>
          <Btn
            onClick={discardPreview}
            aria-label={resolvePhrase("ui.provider.voice_capture.discard_aria", caregiverLang)}
            style={{
              // Text-button label was "Re-record" which misdescribed the
              // action — it returns to the Upload/Record choice, doesn't
              // auto-restart recording. "Discard recording" is accurate.
              flex: 1, background: "none", border: `1px solid ${c.border}`,
              minHeight: btnFloor.minHeight,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 500, color: c.sub, fontFamily: "inherit",
            }}
          >
            {resolvePhrase("ui.provider.voice_capture.discard", caregiverLang)}
          </Btn>
          <Btn
            onClick={acceptRecording}
            style={{
              // emerald-900 gives 7.68:1 with white (AAA-normal). Earlier
              // emerald-700 (#047857) was 5.48:1 — passed AA but failed AAA,
              // unsuitable for the patient population.
              flex: 1, background: "#065F46", color: "#FFF", border: "none",
              minHeight: btnFloor.minHeight,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            {resolvePhrase("ui.provider.voice_capture.use_recording", caregiverLang)}
          </Btn>
        </div>
        {error && <ErrorRow compact={compact} message={error} />}
      </div>
    );
  }

  // --- Extracting state (processing the voice sample) ---
  if (cloneStatus === "extracting") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: ui.outerPad,
          background: "#EFF6FF", borderRadius: ui.outerRadius, border: "1px solid #BFDBFE",
        }}
      >
        {fileInput}
        <span aria-hidden="true" style={{ fontSize: ui.iconMd, animation: "spin 1s linear infinite" }}>{"\u23F3"}</span>
        <span style={{ fontSize: ui.textMd, fontWeight: 500, color: "#1E40AF" }}>
          {resolvePhrase("ui.provider.voice_capture.creating_from_sample", caregiverLang)}
        </span>
      </div>
    );
  }

  // --- Voice captured state ---
  if (hasVoice) {
    const canPlay = !!(savedBlob || externalBlob);
    return (
      <div>
        {fileInput}
        <div style={{
          display: "flex", alignItems: "center", gap: btnFloor.gap,
          padding: ui.outerPad,
          background: "#F0FDF4", borderRadius: ui.outerRadius, border: "1px solid #BBF7D0",
          flexWrap: "wrap",
        }}>
          <span aria-hidden="true" style={{ fontSize: ui.iconSm }}>{"\u2705"}</span>
          <span style={{ fontSize: ui.textSm, color: "#166534", fontWeight: 500, flex: 1, minWidth: 120 }}>
            {resolvePhrase("ui.provider.voice_capture.captured", caregiverLang)}
          </span>
          {canPlay && (
            <Btn
              onClick={playing ? stopPlayback : () => playBlob((savedBlob || externalBlob)!)}
              aria-label={playing ? resolvePhrase("ui.provider.voice_capture.stop_playback_aria", caregiverLang) : resolvePhrase("ui.provider.voice_capture.play_sample_aria", caregiverLang)}
              style={{
                // emerald-900 for 7.68:1 contrast with white (AAA-normal).
                // emerald-700 (#047857) at 5.48:1 passed AA but failed AAA.
                background: "#065F46", color: "#FFF", border: "none",
                minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                borderRadius: btnFloor.borderRadius,
                padding: btnFloor.padding,
                fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <span aria-hidden="true">{playing ? "\u23F9" : "\u25B6"}</span>
              {" "}
              {playing ? resolvePhrase("ui.provider.voice_capture.stop", caregiverLang) : resolvePhrase("ui.provider.voice_capture.play", caregiverLang)}
            </Btn>
          )}
          <Btn
            onClick={handleRemove}
            aria-label={resolvePhrase("ui.provider.voice_capture.remove_aria", caregiverLang)}
            style={{
              background: "none",
              // gray-500 gives 4.62:1 on the green-50 captured row; the
              // incoming `c.border` prop (#E5E7EB on emerald-50 = 1.18:1)
              // failed non-text contrast.
              border: "1px solid #6B7280",
              color: "#374151",
              minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 500, fontFamily: "inherit",
            }}
          >
            {resolvePhrase("ui.provider.voice_capture.remove", caregiverLang)}
          </Btn>
        </div>
        {/* Saved-state quality badge stays here (it's a property of the
            captured sample). Clone-status / retry / fallback messaging
            lives in the parent's <VoiceCloneStatus> row, so the caregiver
            has a single source of truth for "what will be used right now". */}
        {savedQuality && (
          <div style={{ marginTop: 10 }}>
            <QualityBadge quality={savedQuality} locale={caregiverLang} compact />
          </div>
        )}
        {/* Inline failure UI — shown when the parent has NOT taken over
            clone-status rendering (Setup wizard, provider rows in step 3).
            Once the parent registers a retry callback (PatientInfoSection),
            it owns the badge + Retry, so this stays hidden to avoid two
            competing affordances. */}
        {cloneStatus === "failed" && !registerRetry && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: btnFloor.gap, flexWrap: "wrap" }}>
              <span
                role="status"
                aria-live="polite"
                style={{
                  fontSize: 14, fontWeight: 600, color: "#7F1D1D",
                  background: "#FEE2E2", borderRadius: 10, padding: "8px 14px",
                  minHeight: 36, display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <span aria-hidden="true">{"⚠️"}</span>{" "}
                {resolvePhrase("ui.readiness.voice_capture.failed_message", caregiverLang)}
              </span>
              <Btn
                onClick={retryEmbedding}
                aria-label={resolvePhrase("ui.readiness.voice_capture.failed_action", caregiverLang)}
                style={{
                  background: "none",
                  border: "1px solid #DC2626",
                  minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                  borderRadius: btnFloor.borderRadius,
                  padding: btnFloor.padding,
                  fontSize: btnFloor.fontSize, fontWeight: 600, color: "#991B1B", fontFamily: "inherit",
                }}
              >
                {resolvePhrase("ui.readiness.voice_capture.failed_action", caregiverLang)}
              </Btn>
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: c.sub }}>
                {friendlyVoiceError(error, caregiverLang)}
              </p>
            )}
          </div>
        )}
        {cloneStatus === "failed" && registerRetry && error && (
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.4, color: c.sub }}>
            {friendlyVoiceError(error, caregiverLang)}
          </p>
        )}
      </div>
    );
  }

  // --- Default: upload / record buttons ---
  return (
    <div>
      {fileInput}
      <div style={{ display: "flex", gap: btnFloor.gap }}>
        <Btn
          onClick={() => fileInputRef.current?.click()}
          aria-label={resolvePhrase("ui.provider.voice_capture.upload_aria", caregiverLang)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8,
            minHeight: btnFloor.minHeight,
            padding: btnFloor.padding,
            borderRadius: btnFloor.borderRadius,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            fontSize: btnFloor.fontSize,
            fontWeight: 500, color: c.text, fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: ui.iconSm }}>{"\uD83D\uDCC1"}</span>
          {resolvePhrase("ui.provider.voice_capture.upload_file", caregiverLang)}
        </Btn>
        <Btn
          onClick={startRecording}
          aria-label={resolvePhrase("ui.provider.voice_capture.record_aria", caregiverLang)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8,
            minHeight: btnFloor.minHeight,
            padding: btnFloor.padding,
            borderRadius: btnFloor.borderRadius,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            fontSize: btnFloor.fontSize,
            fontWeight: 500, color: c.text, fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: ui.iconSm }}>{"\uD83C\uDF99\uFE0F"}</span>
          {resolvePhrase("ui.provider.voice_capture.record", caregiverLang)}
        </Btn>
      </div>
      {!ttsWarm && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: 8,
            fontSize: 13,
            color: c.sub,
          }}
        >
          {resolvePhrase("ui.readiness.voice_capture.precapture_hint", caregiverLang)}
        </p>
      )}
      {error && <ErrorRow compact={compact} message={error} />}
    </div>
  );
}

function ErrorRow({ compact, message }: { compact: boolean; message: string }) {
  return (
    <div
      role="alert"
      style={{
        marginTop: compact ? 6 : 8, padding: compact ? "6px 10px" : "8px 12px",
        background: "#FEF2F2", borderRadius: compact ? 6 : 8,
        fontSize: compact ? 12 : 13, color: "#991B1B", border: "1px solid #FCA5A5",
      }}>
      {message}
    </div>
  );
}
