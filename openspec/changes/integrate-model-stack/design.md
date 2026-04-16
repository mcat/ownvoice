# Design: Integrate Model Stack

## Architecture Overview

Three ONNX models share a single runtime (ONNX Runtime Web) and execution provider (WebGPU → Metal). Each runs in a dedicated Web Worker to avoid blocking the UI thread. Model binaries are downloaded once from a CDN and cached in OPFS for offline use.

```
┌──────────────────────────────────────────────────────┐
│                     Main Thread                       │
│                                                       │
│  speak.ts ─────────► TTS Worker (Chatterbox Turbo)         │
│                      ├── Speaker embedding            │
│                      ├── Real-time synthesis          │
│                      └── Pre-generation queue         │
│                                                       │
│  suggestion-trees.ts                                  │
│    Layer 1: curated ─► instant (no worker)            │
│    Layer 2: miss ────► LLM Worker (Gemma 3 270M)     │
│                                                       │
│  ListenPanel.tsx ───► STT Worker (Whisper small)      │
│                      ├── MediaStream → audio chunks   │
│                      └── Transcript ← text            │
│                                                       │
│  modelManager.ts ───► Orchestrates loading, OPFS      │
│                       cache, progress reporting       │
└──────────────────────────────────────────────────────┘
```

## New file structure

```
src/
├── models/
│   ├── modelManager.ts       # Download, cache (OPFS), load, lifecycle
│   ├── ttsWorker.ts          # Web Worker: Chatterbox Turbo inference
│   ├── llmWorker.ts          # Web Worker: Gemma 3 270M inference
│   ├── sttWorker.ts          # Web Worker: Whisper small inference
│   ├── audioCache.ts         # Opus encode/decode, OPFS phrase cache
│   └── types.ts              # Model-specific types (separate from app types)
├── hooks/
│   ├── useModels.ts          # Hook: model loading state, progress
│   └── useMicrophone.ts     # Hook: MediaStream capture for STT
```

## Key Design Decisions

### 1. Model Manager — single orchestrator for all models

`modelManager.ts` manages the lifecycle of all three models:

```typescript
interface ModelManager {
  // Initialize ONNX Runtime and load all models
  init(): Promise<void>;
  
  // Status
  isReady(model: "tts" | "llm" | "stt"): boolean;
  getProgress(): { model: string; loaded: number; total: number }[];
  
  // TTS
  createEmbedding(audioData: Float32Array, sampleRate: number): Promise<Float32Array>;
  synthesize(text: string, embedding: Float32Array): Promise<Float32Array>;
  
  // LLM
  complete(prompt: string, maxTokens: number): Promise<string[]>;
  
  // STT
  transcribe(audioData: Float32Array, sampleRate: number): Promise<string>;
}
```

**Download and caching flow:**
1. On first load: download model binaries from CDN (show progress in UI)
2. Store in OPFS via `navigator.storage.getDirectory()`
3. Call `navigator.storage.persist()` to prevent eviction
4. On subsequent loads: read from OPFS (fast, no network)
5. Verify integrity with stored checksums

### 2. TTS integration — speak.ts routing

The current `speak.ts` is the integration seam. Chatterbox Turbo supports all 23 languages natively, so routing is simple — no language check needed:

```typescript
export async function speak(text: string, speaker: Speaker): Promise<void> {
  const mgr = getModelManager();
  
  // Route: voice model loaded → Chatterbox Turbo (all 23 languages)
  if (mgr.isReady("tts") && speaker.embedding) {
    const audio = await mgr.synthesize(text, speaker.embedding);
    playAudioBuffer(audio);
    return;
  }
  
  // Fallback: Web Speech API (no voice sample, or model not loaded)
  return speakWebSpeech(text);
}
```

Unlike the previous NeuTTS Air plan (English-only, requiring per-language routing), Chatterbox Turbo handles cross-lingual synthesis natively. An English voice sample produces natural speech in Spanish, Chinese, Arabic, etc.

**Pre-generated audio cache (Tier 1):**
After a voice sample is uploaded and the speaker embedding is created, the app queues all ~150 fixed phrases for background generation:

```typescript
// audioCache.ts
interface AudioCache {
  has(phraseKey: string): Promise<boolean>;
  get(phraseKey: string): Promise<AudioBuffer | null>;
  put(phraseKey: string, audio: Float32Array): Promise<void>;
  generateAll(phrases: string[], embedding: Float32Array): AsyncGenerator<{
    phrase: string;
    progress: number;
  }>;
  clear(): Promise<void>;
}
```

- Cache key: `${phrase}:${embeddingHash}:${lang}`
- Storage: OPFS directory `audio-cache/`
- Format: Opus-encoded via `AudioEncoder` API
- On tap: check cache first → decode via `AudioDecoder` → play via Web Audio API (<50ms)
- Cache miss: real-time synthesis via TTS Worker (300-800ms)

**Progress UI:** During background generation, the header shows: "Preparing Margaret's voice... 47/150" as a subtle progress indicator.

### 3. LLM integration — Layer 2 suggestions

The `getContextualSuggestions()` function in `suggestion-trees.ts` currently returns `[]` on cache miss. The integration adds a Layer 2 call:

```typescript
export async function getContextualSuggestions(
  partialKey: string,
  recentMessages: Message[],
  hour: number,
): Promise<string[]> {
  // Layer 1: curated trees (instant)
  const curated = lookupCuratedTree(partialKey, recentMessages, hour);
  if (curated.length > 0) return curated;
  
  // Layer 2: Gemma 3 270M (100-150ms)
  const mgr = getModelManager();
  if (!mgr.isReady("llm")) return []; // Fallback: no suggestions
  
  const prompt = buildCompletionPrompt(partialKey, recentMessages, hour);
  const completions = await mgr.complete(prompt, 8);
  return completions;
}
```

**System prompt for Gemma 3 270M:**
```
You are helping a hospitalized patient who cannot speak complete a sentence.
Given the partial sentence and recent conversation context, suggest 6-8 natural
completions. Focus on medical communication vocabulary: symptoms, needs, emotions,
questions about care. Keep suggestions short (1-5 words each). Return only the
completion text, one per line.
```

**The function signature changes from sync to async.** The SentenceBuilder component must be updated to handle the async nature — show the curated suggestions instantly, then update with LLM suggestions if they arrive within 200ms.

### 4. STT integration — Whisper in the Listen panel

The Listen panel's mic button currently does nothing. The integration wires it to:

1. **`useMicrophone()` hook:** Captures audio via `navigator.mediaDevices.getUserMedia()`, buffers into chunks, sends to the STT Worker when silence is detected.
2. **STT Worker:** Runs Whisper small inference on the audio chunks, returns transcript text.
3. **Listen panel:** Populates the transcript textarea with recognized text in real-time.

**Silence detection:** Simple energy-based VAD (Voice Activity Detection). When the audio energy drops below a threshold for 1.5 seconds, the accumulated audio is sent to Whisper for transcription. This gives batch-mode behavior: the provider speaks, pauses, and the transcript appears.

**Microphone permissions:** The browser will prompt for microphone access. The Listen panel should show a clear message: "Tap to allow microphone access" on first use. Permission is requested via `getUserMedia()` — no app-level permission management needed.

### 5. Web Worker architecture

Each model runs in a separate Web Worker:

```
Main Thread          Worker Thread
    │                     │
    │── postMessage({   ──│── Load ONNX model
    │   type: "init",     │── Create InferenceSession
    │   modelUrl: "..."   │── Report ready
    │})                   │
    │                     │
    │── postMessage({   ──│── Run inference
    │   type: "infer",    │── Return result
    │   input: {...}      │
    │})                   │
    │                     │
    │◄─ postMessage({   ──│
    │   type: "result",   │
    │   output: {...}     │
    │})                   │
```

Workers are created lazily: the TTS worker is created when a voice sample is uploaded, the LLM worker when the sentence builder opens and curated trees miss, and the STT worker when the Listen panel's mic button is tapped.

However, once created, workers (and their loaded models) persist for the session. This is the "always loaded" architecture — no on-demand loading/unloading.

### 6. ONNX Runtime Web setup

```typescript
import * as ort from "onnxruntime-web";

// Prefer WebGPU, fall back to WASM
const EP = navigator.gpu ? "webgpu" : "wasm";

async function createSession(modelPath: string): Promise<ort.InferenceSession> {
  return ort.InferenceSession.create(modelPath, {
    executionProviders: [EP],
  });
}
```

The ONNX Runtime Web WASM files (~15-20 MB) need to be served from the app's origin or a CDN. These are configured via `ort.env.wasm.wasmPaths`.

### 7. Graceful degradation chain

```
TTS:  Chatterbox Turbo (WebGPU) → Chatterbox Turbo (WASM) → Web Speech API
LLM:  Gemma 3 270M (WebGPU) → Gemma 3 270M (WASM) → curated trees only
STT:  Whisper (WebGPU) → Whisper (WASM) → manual text entry
```

Each level is transparent to the user. The app always works. Performance degrades, but communication never stops.

### 8. Model source and hosting

Models need to be hosted on a CDN accessible to the app:

| Model | Source | Format | Size (q4) |
|-------|--------|--------|-----------|
| Chatterbox Turbo | `ResembleAI/chatterbox-turbo-ONNX` on HuggingFace | ONNX q4 | ~200 MB |
| Gemma 3 270M | `onnx-community/gemma-3-270m-it-ONNX` on HuggingFace | ONNX q4 | ~150 MB |
| Whisper small | `onnx-community/whisper-small` on HuggingFace | ONNX q4 | ~250 MB |

Note: Chatterbox Turbo ONNX export is official from Resemble AI — no conversion needed.

For development: models can be served from `public/models/` via Vite dev server.
For production: models served from a CDN with proper CORS headers and cache control.

### 9. Speaker embedding extraction (Chatterbox Turbo)

The voice sample flow:
1. Caregiver uploads audio file (MP3/M4A/WAV) or records via MediaStream
2. Audio is decoded to Float32Array via `AudioContext.decodeAudioData()`
3. Resampled to model's expected sample rate (typically 16kHz or 22kHz)
4. Passed to TTS Worker → Chatterbox Turbo's encoder produces a speaker embedding (~1-5 MB)
5. Embedding stored in IndexedDB alongside settings
6. Background phrase generation begins immediately

The embedding is the only artifact of the voice sample — the original audio is not stored.

### 10. Changes to existing files

| File | Change |
|------|--------|
| `src/speak.ts` | Add routing: embedding loaded → Chatterbox Turbo (all langs); check audio cache first |
| `src/data/suggestion-trees.ts` | Make `getContextualSuggestions` async; add Layer 2 LLM call on miss |
| `src/components/builder/SentenceBuilder.tsx` | Handle async suggestions; show loading state for LLM |
| `src/components/provider/ListenPanel.tsx` | Wire mic button to `useMicrophone` + STT Worker |
| `src/components/settings/Setup.tsx` | Wire voice upload to embedding extraction; show generation progress |
| `src/components/layout/Header.tsx` | Show voice generation progress indicator |
| `src/store.ts` | Add embedding storage/retrieval |
| `src/types.ts` | Add `embedding?: Float32Array` to Speaker; add model state types |
| `package.json` | Add `onnxruntime-web` dependency |
