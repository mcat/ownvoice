import type { Speaker } from "./types";
import { getCachedAudio, embeddingFingerprint } from "./models/audioCache";
import { log } from "./audit/logger";
import { EVENT } from "./audit/events";
import { ATTR } from "./audit/attrs";
import { recordOutcome, type EngineKind } from "./models/engineOutcomes";

/**
 * In-memory hot cache of recently-played cloned-voice audio. The first
 * tap of a phrase reads from OPFS (which is intrinsically slow on some
 * Chromes — 50KB takes ~1s); subsequent taps of the same phrase pull
 * from this map in microseconds. Sized at 64 entries × ~100KB ≈ 6 MB,
 * well under the renderer's typical heap budget.
 *
 * Key: `${embeddingFingerprint(embedding)}::${phrase}`. Bound: 64 LRU.
 */
const HOT_CACHE_MAX = 64;
const hotCache = new Map<string, { audio: Float32Array; sampleRate: number }>();

function hotCacheKey(phrase: string, embedding: unknown): string | null {
  const fp = embeddingFingerprint(embedding);
  if (fp === "none") return null;
  return `${fp}::${phrase}`;
}

function hotCacheGet(phrase: string, embedding: unknown) {
  const key = hotCacheKey(phrase, embedding);
  if (!key) return undefined;
  const hit = hotCache.get(key);
  if (hit) {
    // Touch for LRU: re-insert at end of insertion order.
    hotCache.delete(key);
    hotCache.set(key, hit);
  }
  return hit;
}

function hotCacheSet(phrase: string, embedding: unknown, value: { audio: Float32Array; sampleRate: number }): void {
  const key = hotCacheKey(phrase, embedding);
  if (!key) return;
  hotCache.set(key, value);
  if (hotCache.size > HOT_CACHE_MAX) {
    // Evict oldest (first-inserted) — Map iterates in insertion order.
    const oldest = hotCache.keys().next().value;
    if (oldest) hotCache.delete(oldest);
  }
}

/** Test-only — drop the in-memory hot cache. */
export function _resetHotCacheForTests(): void {
  hotCache.clear();
}

/** Read-only snapshot of the hot-cache entry count for the heap-watermark
 *  sampler. The cache is bounded at HOT_CACHE_MAX (64), so leaks would
 *  show up as a steady-state ceiling instead of unbounded growth — but
 *  the count is still useful for confirming the cache populated as
 *  expected on a returning device. */
export function getHotCacheSize(): number {
  return hotCache.size;
}

/**
 * Walk a list of phrases and pull each one's pre-generated audio from
 * OPFS into the in-memory hot cache. Yields between phrases via
 * requestIdleCallback so booting + first paint aren't blocked.
 *
 * Idempotent: phrases already in the hot cache are skipped without
 * touching OPFS. Safe to call repeatedly (e.g. on every patient
 * activation) — extra calls are no-ops once the set is warm.
 *
 * Failures on individual phrases are swallowed: a missing OPFS file
 * just stays cold; a real OPFS error skips this phrase.
 *
 * **Self-throttling**: aborts the warm-up if cumulative time exceeds
 * PREWARM_TIME_BUDGET_MS. On systems where OPFS is fast (uncontested,
 * no AV interception) we comfortably warm 64 phrases in <500ms. On
 * systems where OPFS is slow (e.g. Microsoft Defender on macOS scans
 * every read at the kernel level, taking 1-3s per file), we bail
 * after the budget so the renderer doesn't freeze. Tap path stays
 * functional in either case — late phrases just stay cold and warm
 * lazily on first user tap.
 */
const PREWARM_TIME_BUDGET_MS = 5000;
const PREWARM_MAX_PHRASES = 32;

export async function prewarmHotCache(
  speaker: Speaker,
  phrases: readonly string[],
): Promise<void> {
  if (!speaker.embedding) return;
  const limit = Math.min(phrases.length, PREWARM_MAX_PHRASES);
  const startedAt = performance.now();

  for (let i = 0; i < limit; i++) {
    if (performance.now() - startedAt > PREWARM_TIME_BUDGET_MS) {
      // Out of budget — bail. Remaining phrases warm lazily on first tap.
      return;
    }
    const phrase = phrases[i];
    if (hotCacheGet(phrase, speaker.embedding)) continue;
    try {
      const hit = await getCachedAudio(phrase, speaker.embedding);
      if (hit) hotCacheSet(phrase, speaker.embedding, hit);
    } catch {
      // OPFS read failed for this phrase; skip and try the next.
    }
    // Yield between phrases so we never block a tap that arrives during
    // pre-warm. requestIdleCallback when available, microtask otherwise.
    await new Promise<void>((resolve) => {
      const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
      if (ric) ric(() => resolve());
      else setTimeout(resolve, 0);
    });
  }
}

/** Shared AudioContext for playing synthesized audio */
let audioCtx: AudioContext | null = null;

/**
 * Cached voice list for the Web Speech API.
 * Chrome loads voices asynchronously — getVoices() returns [] until the
 * voiceschanged event fires. Priming the cache at boot removes voice-
 * resolution latency from the patient's critical tap-to-speech path.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * User-selected fallback voice URI. When set, tryWebSpeech uses this
 * specific voice instead of auto-detecting one. This is critical for
 * Chrome reliability — explicit voice assignment bypasses Chrome's
 * default voice resolution, which can silently fail.
 */
let fallbackVoiceURI: string | null = null;

/**
 * Set the fallback Web Speech API voice. Call when settings change.
 */
export function setFallbackVoice(voiceURI: string | null): void {
  fallbackVoiceURI = voiceURI;
}

/**
 * Pre-prime the Web Speech API so fallback speech is ready immediately.
 * Call once at app startup. Safe to call in any browser — silently no-ops
 * when speechSynthesis is unavailable.
 */
export function primeSpeechSynthesis(): void {
  if (!("speechSynthesis" in window)) return;

  cachedVoices = speechSynthesis.getVoices();

  // Chrome fires voiceschanged once its async voice list is ready.
  // Safari already has voices at this point, but the listener is harmless.
  speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoices = speechSynthesis.getVoices();
  });
}

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

/**
 * The currently-sounding BufferSourceNode, if any. Tracked so a new
 * speak() can stop it first — without this, two rapid taps both play
 * through the shared AudioContext and the patient's voice talks over
 * itself (the Speaking overlay's duration is an estimate, so it can
 * clear while audio is still sounding).
 */
let activePlayback: { source: AudioBufferSourceNode; settle: () => void } | null = null;

/**
 * Stop whatever cached clip is currently sounding (latest tap wins).
 * Also settles the superseded playback's promise so its speak() call
 * completes instead of waiting on an onended that may fire late.
 */
function stopActivePlayback(): void {
  if (!activePlayback) return;
  const { source, settle } = activePlayback;
  activePlayback = null;
  try {
    source.stop();
  } catch {
    // Already stopped / never started — nothing is sounding.
  }
  settle();
}

/**
 * Play PCM audio data through Web Audio API.
 *
 * The audio passed in is assumed to be already post-processed — cached
 * clips get their FFT denoise / EQ / gate / limiter applied once at
 * cache-write time in audioCache.ts, not on every tap. Keeping the
 * post-processing off the tap path saves ~10-50ms of main-thread FFT
 * work per playback, which is the difference between "feels instant"
 * and "perceptibly slow" for an AAC tap.
 */
async function playAudioBuffer(
  audio: Float32Array,
  sampleRate: number,
): Promise<void> {
  const ctx = await getAudioContext();
  stopActivePlayback();

  const buffer = ctx.createBuffer(1, audio.length, sampleRate);
  buffer.getChannelData(0).set(audio);

  return new Promise<void>((resolve) => {
    const source = ctx.createBufferSource();
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (activePlayback?.source === source) activePlayback = null;
      resolve();
    };
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = settle;
    // A throw from start() (broken/suspended context) rejects this
    // promise via the executor — callers treat that as a tier failure
    // and fall through. activePlayback is only set on success.
    source.start();
    activePlayback = { source, settle };
  });
}

/**
 * Play a confirmation tone via Web Audio API.
 * Used as the fallback when neither Chatterbox Turbo nor Web Speech API
 * are available. A gentle two-tone chime confirms the tap registered.
 */
async function playConfirmationTone(): Promise<void> {
  const ctx = await getAudioContext();
  return new Promise<void>((resolve) => {
    const now = ctx.currentTime;

    // Two-note chime: C5 then E5
    const notes = [523.25, 659.25]; // Hz
    const duration = 0.12; // seconds per note

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * duration + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * duration);
      osc.stop(now + i * duration + duration);
    });

    setTimeout(resolve, notes.length * duration * 1000 + 50);
  });
}

/**
 * Fall back to Web Speech API.
 * Returns true if speech was successfully initiated, false if it failed/canceled.
 *
 * @param lang — BCP 47 locale code to set on the utterance. When provided,
 *   the browser selects a voice matching that locale. For patient utterances
 *   this is `caregiverLang` (the language the patient voice speaks); for
 *   provider utterances it is `patientLang`.
 */
async function tryWebSpeech(text: string, lang?: string): Promise<boolean> {
  if (!("speechSynthesis" in window)) return false;

  // Clear any stuck queue — Chrome can get wedged in speaking:true forever.
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.volume = 1.0;
  if (lang) utterance.lang = lang;

  const voices = cachedVoices.length > 0 ? cachedVoices : speechSynthesis.getVoices();
  // Prefer the user's explicit selection; fall back to a voice matching the
  // requested locale, then any English voice as last resort.
  const voice = (fallbackVoiceURI && voices.find((v) => v.voiceURI === fallbackVoiceURI))
    || (lang && voices.find((v) => v.lang.startsWith(lang)))
    || voices.find((v) => v.lang.startsWith("en"));
  if (voice) utterance.voice = voice;

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    // Chrome bug: speechSynthesis silently freezes mid-utterance — audio
    // stops but neither onend nor onerror fires. A pause/resume heartbeat
    // every 100ms keeps the engine alive.
    let keepalive: ReturnType<typeof setInterval> | null = null;
    let wedgeTimer: ReturnType<typeof setTimeout> | null = null;

    function cleanup() {
      if (keepalive) { clearInterval(keepalive); keepalive = null; }
      if (wedgeTimer) { clearTimeout(wedgeTimer); wedgeTimer = null; }
    }

    utterance.onstart = () => {
      console.log("[OwnVoice:TTS] Web Speech started");
    };
    utterance.onend = () => {
      cleanup();
      if (!resolved) { resolved = true; resolve(true); }
    };
    utterance.onerror = () => {
      cleanup();
      if (!resolved) { resolved = true; resolve(false); }
    };

    speechSynthesis.speak(utterance);

    // Chrome bug: long utterances silently freeze (no onend/onerror).
    // A periodic pause/resume nudge prevents this. Safari doesn't need it
    // and the nudge causes audible choppiness there. Even on Chrome, 100ms
    // was far too aggressive — 10s is sufficient to catch the freeze before
    // the user notices a stall.
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent);
    if (isChrome) {
      keepalive = setInterval(() => {
        if (speechSynthesis.speaking) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        } else {
          cleanup();
        }
      }, 10_000);
    }

    // Safety timeout: if speech hasn't started within 500ms, give up.
    setTimeout(() => {
      if (!resolved && !speechSynthesis.speaking) {
        cleanup();
        resolved = true;
        resolve(false);
      }
    }, 500);

    // Hard deadline for the Safari wedge: the utterance starts (so the
    // 500ms check above passes) but the engine then freezes mid-utterance
    // with `speaking` stuck true and neither onend nor onerror ever
    // firing — without this, the promise stays pending forever and the
    // patient gets neither speech nor the tone tier. The budget scales
    // with text length (~200ms/char is far slower than any real speech
    // rate at rate=0.9) so long phrases are never cut off mid-sentence.
    wedgeTimer = setTimeout(() => {
      if (!resolved) {
        console.warn(
          "[OwnVoice:TTS] Web Speech never completed — escalating to next tier",
        );
        cleanup();
        resolved = true;
        resolve(false);
      }
    }, 10_000 + text.length * 200);
  });
}

/**
 * The single audio pathway for all speech output.
 *
 * Priority:
 *   0. Cached cloned-voice audio (from the background pre-gen runner)
 *   1. Web Speech API (neutral system voice while the clone is pending)
 *   2. Confirmation tone (Web Audio API chime — always works)
 *
 * Live TTS synthesis is intentionally NOT on the tap path. WASM
 * synthesis can take 10–30 seconds per phrase — unusable for a patient
 * who needs instant feedback — and running it concurrently with pre-gen
 * on the same worker caused cross-request audio mixups (any "audio"
 * response resolves all pending listeners with the same buffer). Pre-gen
 * owns the TTS worker; taps either hit the cache or fall through to
 * Web Speech.
 *
 * The patient always gets feedback. No silent failures.
 */
export async function speak(
  text: string,
  speaker: Speaker,
  opts?: { exaggeration?: number },
): Promise<void> {
  void opts; // Reserved for future live-synth path; unused while tap path is cache-only.
  // Note: SPEAK_TAP is emitted by useSpeakActions (the tap origin owns the
  // tap event); this function only emits engine-outcome events.

  // Latest tap wins: silence any clip still sounding from a previous
  // tap before this one produces audio through ANY tier (a Web Speech
  // utterance would otherwise talk over lingering cached audio).
  stopActivePlayback();

  // Priority 0a: in-memory hot cache. Sub-ms, no awaits. Populated by
  // priority 0b after the first OPFS read of each phrase.
  if (speaker.embedding) {
    const hot = hotCacheGet(text, speaker.embedding);
    if (hot) {
      log({
        name: EVENT.SPEAK_CACHE_HIT,
        attributes: {
          [ATTR.ACTOR]: speaker.type,
          [ATTR.SPEECH_TEXT]: text,
          [ATTR.SPEECH_ENGINE]: "memory",
          [ATTR.SPEECH_LANG]: speaker.lang ?? null,
        },
      });
      emitOutcome("memory", text, speaker);
      try {
        await playAudioBuffer(hot.audio, hot.sampleRate);
        return;
      } catch (err) {
        // Playback failure (e.g. Safari refusing to resume the context
        // outside a fresh user gesture) must not end the tap silently —
        // log it and fall through to the OPFS / Web Speech / tone tiers.
        log({
          name: EVENT.SPEAK_ERROR,
          severity: "ERROR",
          attributes: {
            [ATTR.ACTOR]: speaker.type,
            [ATTR.ERROR_TYPE]: (err as Error)?.name ?? "Error",
            [ATTR.ERROR_MESSAGE]: (err as Error)?.message ?? String(err),
            [ATTR.SPEECH_TEXT]: text,
          },
        });
      }
    }

    // Priority 0b: pre-generated cached audio in OPFS. Slow first hit;
    // promotes into the hot cache so subsequent taps stay fast.
    try {
      const hit = await getCachedAudio(text, speaker.embedding);
      if (hit) {
        hotCacheSet(text, speaker.embedding, hit);
        log({
          name: EVENT.SPEAK_CACHE_HIT,
          attributes: {
            [ATTR.ACTOR]: speaker.type,
            [ATTR.SPEECH_TEXT]: text,
            [ATTR.SPEECH_ENGINE]: "cache",
            [ATTR.SPEECH_LANG]: speaker.lang ?? null,
          },
        });
        emitOutcome("cache", text, speaker);
        await playAudioBuffer(hit.audio, hit.sampleRate);
        return;
      }
      log({
        name: EVENT.SPEAK_CACHE_MISS,
        attributes: {
          [ATTR.ACTOR]: speaker.type,
          [ATTR.SPEECH_TEXT]: text,
          [ATTR.SPEECH_LANG]: speaker.lang ?? null,
        },
      });
    } catch (err) {
      log({
        name: EVENT.SPEAK_ERROR,
        severity: "ERROR",
        attributes: {
          [ATTR.ACTOR]: speaker.type,
          [ATTR.ERROR_TYPE]: (err as Error)?.name ?? "Error",
          [ATTR.ERROR_MESSAGE]: (err as Error)?.message ?? String(err),
          [ATTR.SPEECH_TEXT]: text,
        },
      });
    }
  }

  // Priority 1: Web Speech API — fast neutral voice while pre-gen fills the cache.
  // Thread the speaker's locale so the utterance uses the correct language
  // voice: patient utterances speak in caregiverLang, provider in patientLang.
  const speechWorked = await tryWebSpeech(text, speaker.lang);
  if (speechWorked) {
    log({
      name: EVENT.SPEAK_FALLBACK_WEB,
      attributes: {
        [ATTR.ACTOR]: speaker.type,
        [ATTR.SPEECH_TEXT]: text,
        [ATTR.SPEECH_ENGINE]: "webspeech",
        [ATTR.SPEECH_LANG]: speaker.lang ?? null,
      },
    });
    emitOutcome("webspeech", text, speaker);
    return;
  }

  // Priority 2: Confirmation tone (always works via Web Audio API)
  log({
    name: EVENT.SPEAK_FALLBACK_TONE,
    attributes: {
      [ATTR.ACTOR]: speaker.type,
      [ATTR.SPEECH_TEXT]: text,
      [ATTR.SPEECH_ENGINE]: "tone",
      [ATTR.SPEECH_LANG]: speaker.lang ?? null,
    },
  });
  emitOutcome("tone", text, speaker);
  try {
    await playConfirmationTone();
  } catch (err) {
    // Last tier — nothing further to escalate to, but a rejection here
    // must not escape speak() as an unhandled rejection.
    console.error("[OwnVoice:Speak] confirmation tone failed", err);
  }
}

/**
 * Mirror engine outcomes into the live ring buffer so the Diagnostics
 * panel can subscribe. Kept separate from the audit logger so the panel
 * doesn't have to round-trip through the audit query path.
 */
function emitOutcome(engine: EngineKind, text: string, speaker: Speaker): void {
  recordOutcome({
    ts: Date.now(),
    engine,
    text,
    lang: speaker.lang ?? null,
    actor: speaker.type,
  });
}
