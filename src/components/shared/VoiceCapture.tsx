import { useState, useRef, useEffect } from "preact/hooks";
import { Btn } from "./Btn";
import { getModelManager } from "../../models/modelManager";

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
  onCapture: (audioBlob: Blob, embedding?: unknown) => void;
  onRemove: () => void;
  /** Pre-existing audio blob for playback */
  audioBlob?: Blob | null;
  /** Whether a speaker embedding exists for this voice (enables "clone active" indicator) */
  hasEmbedding?: boolean;
  /** Called when the user taps "Preview voice" after clone is ready */
  onPreview?: () => void;
  compact?: boolean;
  color?: {
    text?: string;
    sub?: string;
    muted?: string;
    border?: string;
    cardBg?: string;
  };
}

const RECORD_DURATION = 15;

/**
 * Translate a raw error message into something a non-technical user can act on.
 * The raw message is still useful for logs and for developers reading the
 * console, but it should never be the user-facing copy — `Failed to fetch` and
 * similar native strings mean nothing at the bedside.
 */
export function friendlyVoiceError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network")) {
    return "Couldn't reach the voice model. Check your connection, then tap Retry.";
  }
  if (m.includes("timed out") || m.includes("timeout")) {
    return "Voice processing took too long. Tap Retry to try again.";
  }
  if (m.includes("denied") || m.includes("permission")) {
    return "Microphone access is blocked. Enable it in your browser settings or upload a file instead.";
  }
  return "We couldn't finish preparing your voice. Tap Retry to try again.";
}

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
 */
async function extractEmbedding(
  audio: Float32Array,
): Promise<unknown | null> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");

  if (!worker || !mgr.isReady("tts")) {
    return null; // Model not loaded yet
  }

  return new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Voice processing timed out. Please try again.")),
      30000,
    );
    const handler = (e: MessageEvent) => {
      if (e.data.type === "embedding") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        resolve(e.data.data); // Return the actual embedding data
      } else if (e.data.type === "error") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        reject(new Error(e.data.message || "Voice processing failed"));
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ type: "embed", audio, sampleRate: 24000 });
  });
}

export function VoiceCapture({
  label,
  hasVoice,
  onCapture,
  onRemove,
  compact = false,
  audioBlob: externalBlob,
  hasEmbedding = false,
  onPreview,
  color,
}: VoiceCaptureProps) {
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
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(externalBlob ?? null);
  const [playing, setPlaying] = useState(false);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice clone status
  const [cloneStatus, setCloneStatus] = useState<VoiceCloneStatus>(
    hasEmbedding ? "ready" : hasVoice ? "model-loading" : "idle",
  );

  // When the TTS model becomes ready, retry embedding extraction if we have audio but no embedding
  useEffect(() => {
    if (cloneStatus !== "model-loading" || !hasVoice) return;

    const mgr = getModelManager();
    if (mgr.isReady("tts")) {
      // Model is already ready — try extracting now
      retryEmbedding();
      return;
    }

    // Listen for model progress to detect when TTS becomes ready or fails
    const unsub = mgr.onProgress((progress) => {
      const tts = progress.find((p) => p.model === "tts");
      if (tts?.status === "ready") {
        unsub();
        retryEmbedding();
      } else if (tts?.status === "error") {
        unsub();
        setCloneStatus("failed");
        setError(tts.error || "Voice model failed to load. The app will use a standard voice.");
      }
    });
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

  // Auto-stop recording at RECORD_DURATION
  useEffect(() => {
    if (recording && recordSecs >= RECORD_DURATION) {
      stopRecording();
    }
  }, [recording, recordSecs]);

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

  // --- Retry embedding extraction (when model loads after initial capture) ---
  async function retryEmbedding() {
    const blob = savedBlob || externalBlob;
    if (!blob) return;

    setCloneStatus("extracting");
    setError(null);
    try {
      const audio = await decodeAudio(blob);
      const embedding = await extractEmbedding(audio);
      if (embedding) {
        setCloneStatus("ready");
        onCapture(blob, embedding);
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
      const audio = await decodeAudio(blob);
      const embedding = await extractEmbedding(audio);
      setSavedBlob(blob);

      if (embedding) {
        setCloneStatus("ready");
        onCapture(blob, embedding);
      } else {
        // Model not ready yet — save audio, mark as captured, will retry when model loads
        setCloneStatus("model-loading");
        onCapture(blob);
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
  async function startRecording() {
    setError(null);
    setPreviewBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
    } catch {
      setError("Microphone access denied. Try uploading a file instead.");
    }
  }

  function stopRecording() {
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
      setError("Could not play audio.");
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
      accept="audio/*"
      style={{ display: "none" }}
      onChange={handleFile}
    />
  );

  // --- Clone status badge ---
  // Informational tier: smaller than interactive 44px buttons but still
  // substantial. Reads as "one notch below a button", not "three notches".
  function CloneStatusBadge() {
    const base = {
      fontSize: 14,
      fontWeight: 600,
      borderRadius: 10,
      padding: "8px 14px",
      minHeight: 36,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    } as const;

    if (cloneStatus === "extracting") {
      return (
        <span style={{ ...base, color: "#1E40AF", background: "#DBEAFE" }}>
          <span aria-hidden="true">{"\u23F3"}</span> Creating voice clone...
        </span>
      );
    }
    if (cloneStatus === "model-loading") {
      return (
        <span style={{ ...base, color: "#92400E", background: "#FEF3C7" }}>
          <span aria-hidden="true">{"\u23F3"}</span> Voice model loading...
        </span>
      );
    }
    if (cloneStatus === "ready") {
      return (
        <span style={{ ...base, color: "#065F46", background: "#D1FAE5" }}>
          <span aria-hidden="true">{"\u2705"}</span> Voice clone active
        </span>
      );
    }
    if (cloneStatus === "failed") {
      return (
        <span style={{ ...base, color: "#991B1B", background: "#FEE2E2" }}>
          <span aria-hidden="true">{"\u26A0\uFE0F"}</span> Clone failed
        </span>
      );
    }
    return null;
  }

  // ===================== RENDER STATES =====================

  // --- Recording state ---
  if (recording) {
    const barCount = compact ? 5 : 7;
    const barH = compact ? 20 : 28;
    const progress = Math.min(recordSecs / RECORD_DURATION, 1);

    return (
      <div
        style={{
          padding: compact ? "8px 12px" : "12px 16px",
          background: "#FEF2F2",
          borderRadius: compact ? 10 : 12,
          border: "2px solid #FCA5A5",
        }}
      >
        {fileInput}
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12 }}>
          <span
            style={{
              width: compact ? 10 : 12, height: compact ? 10 : 12,
              borderRadius: "50%", background: "#DC2626",
              display: "inline-block", flexShrink: 0,
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: compact ? 14 : 16, fontWeight: 700, color: "#DC2626",
              fontVariantNumeric: "tabular-nums", minWidth: 42,
            }}
          >
            {recordSecs}s / {RECORD_DURATION}s
          </span>
          <div
            aria-label="Audio level"
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
                    background: active ? "#DC2626" : "#FECACA",
                    transition: "height 0.08s ease-out",
                  }}
                />
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: compact ? 6 : 10, height: 4, borderRadius: 2, background: "#FECACA", overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 2, background: "#DC2626", transition: "width 1s linear" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: compact ? 4 : 8 }}>
          <span style={{ fontSize: compact ? 11 : 13, color: "#991B1B", fontWeight: 500 }}>
            {recordSecs < RECORD_DURATION
              ? `Speak naturally for ${RECORD_DURATION - recordSecs} more seconds...`
              : "Done!"}
          </span>
          {recordSecs < RECORD_DURATION && (
            <Btn
              onClick={stopRecording}
              style={{
                flexShrink: 0, background: "none", color: "#991B1B",
                border: "1px solid #FCA5A5",
                minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                borderRadius: btnFloor.borderRadius,
                padding: btnFloor.padding,
                fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              Stop early
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
          <span style={{ fontSize: ui.textMd, fontWeight: 600, color: "#92400E", flex: 1 }}>
            {recordSecs}s recorded
          </span>
          <Btn
            onClick={playing ? stopPlayback : () => playBlob(previewBlob)}
            aria-label={playing ? "Stop preview playback" : "Play recording preview"}
            style={{
              background: "#D97706", color: "#FFF", border: "none",
              minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            <span aria-hidden="true">{playing ? "\u23F9" : "\u25B6"}</span>
            {" "}
            {playing ? "Stop" : "Play"}
          </Btn>
        </div>
        <div style={{ display: "flex", gap: btnFloor.gap }}>
          <Btn
            onClick={discardPreview}
            style={{
              flex: 1, background: "none", border: `1px solid ${c.border}`,
              minHeight: btnFloor.minHeight,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 500, color: c.sub, fontFamily: "inherit",
            }}
          >
            Re-record
          </Btn>
          <Btn
            onClick={acceptRecording}
            style={{
              flex: 1, background: "#059669", color: "#FFF", border: "none",
              minHeight: btnFloor.minHeight,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            Use this recording
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
          Creating voice clone from sample...
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
            Voice captured
          </span>
          {canPlay && (
            <Btn
              onClick={playing ? stopPlayback : () => playBlob((savedBlob || externalBlob)!)}
              aria-label={playing ? "Stop playback of recorded sample" : "Play recorded voice sample"}
              style={{
                background: "#059669", color: "#FFF", border: "none",
                minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                borderRadius: btnFloor.borderRadius,
                padding: btnFloor.padding,
                fontSize: btnFloor.fontSize, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <span aria-hidden="true">{playing ? "\u23F9" : "\u25B6"}</span>
              {" "}
              {playing ? "Stop" : "Play"}
            </Btn>
          )}
          <Btn
            onClick={handleRemove}
            aria-label="Remove voice sample"
            style={{
              background: "none",
              border: `1px solid ${c.border}`,
              color: "#374151",
              minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
              borderRadius: btnFloor.borderRadius,
              padding: btnFloor.padding,
              fontSize: btnFloor.fontSize, fontWeight: 500, fontFamily: "inherit",
            }}
          >
            Remove
          </Btn>
        </div>
        {/* Clone status indicator — live region so transitions are announced.
            When failed, the badge + Retry + friendly subtitle below are the
            complete UX; we deliberately do NOT also render <ErrorRow> to
            avoid duplicate red-on-red styling for the same failure. */}
        <div
          aria-live="polite"
          style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: btnFloor.gap, flexWrap: "wrap" }}>
            <CloneStatusBadge />
            {cloneStatus === "ready" && onPreview && (
              <Btn
                onClick={onPreview}
                aria-label="Preview synthesized voice clone"
                style={{
                  background: "none", border: "1px solid #BBF7D0",
                  minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                  borderRadius: btnFloor.borderRadius,
                  padding: btnFloor.padding,
                  fontSize: btnFloor.fontSize, fontWeight: 600, color: "#065F46", fontFamily: "inherit",
                }}
              >
                <span aria-hidden="true">{"\u25B6"}</span> Preview voice
              </Btn>
            )}
            {cloneStatus === "failed" && (
              <Btn
                onClick={retryEmbedding}
                aria-label="Retry voice clone extraction"
                style={{
                  background: "none", border: "1px solid #FCA5A5",
                  minHeight: btnFloor.minHeight, minWidth: btnFloor.minWidth,
                  borderRadius: btnFloor.borderRadius,
                  padding: btnFloor.padding,
                  fontSize: btnFloor.fontSize, fontWeight: 600, color: "#991B1B", fontFamily: "inherit",
                }}
              >
                Retry
              </Btn>
            )}
          </div>
          {cloneStatus === "failed" && error && (
            <p style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.4,
              color: c.sub,
            }}>
              {friendlyVoiceError(error)}
            </p>
          )}
        </div>
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
          aria-label="Upload voice sample from file"
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
          Upload file
        </Btn>
        <Btn
          onClick={startRecording}
          aria-label="Record voice sample from microphone"
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
          Record
        </Btn>
      </div>
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
