# Tasks: Integrate Model Stack

## Task 1: ONNX Runtime Web setup and model manager

**Status:** done
**Depends on:** none

### What

- Install `onnxruntime-web` as a dependency
- Create `src/models/types.ts` with model-specific types (ModelId, ModelStatus, LoadProgress)
- Create `src/models/modelManager.ts`:
  - Singleton pattern: `getModelManager()` returns the single instance
  - `init()`: Initialize ONNX Runtime, configure WebGPU EP with WASM fallback
  - `loadModel(id, url)`: Download model from URL, cache in OPFS, create InferenceSession
  - `isReady(id)`: Check if a model is loaded and ready
  - `getProgress()`: Return loading progress for all models
  - OPFS caching: check if model exists before downloading, store checksums
  - `navigator.storage.persist()` on first model download
- Create `src/hooks/useModels.ts`: Hook exposing model loading state and progress to UI
- Configure Vite to serve ONNX Runtime WASM files correctly (public path or CDN config)
- Verify ONNX Runtime Web initializes on iPad Safari 26 with WebGPU EP

### Files to create

- `src/models/types.ts`
- `src/models/modelManager.ts`
- `src/hooks/useModels.ts`

### Files to modify

- `package.json` — add `onnxruntime-web`
- `vite.config.ts` — configure WASM file serving if needed

### Acceptance

- `onnxruntime-web` imports without errors
- `getModelManager().init()` succeeds and detects WebGPU on supported devices
- Falls back to WASM EP when WebGPU unavailable
- Model download progress is trackable

---

## Task 2: TTS Worker and Chatterbox Turbo integration

**Status:** done
**Depends on:** Task 1

### What

- Create `src/models/ttsWorker.ts`: Web Worker that loads Chatterbox Turbo ONNX model
  - Message types: `init` (load model), `embed` (extract speaker embedding), `synthesize` (generate audio)
  - InferenceSession created with WebGPU EP
  - `embed`: Takes audio Float32Array → returns speaker embedding Float32Array
  - `synthesize`: Takes text + embedding → returns audio Float32Array
- Update `src/speak.ts`:
  - Import model manager
  - Add routing logic: check language → check embedding → check audio cache → synthesize or fall back
  - `speakWebSpeech()` extracted as named fallback function
- Update `src/types.ts`: Add `embedding?: Float32Array` to relevant types, add `lang` field to Speaker
- Handle TTS Worker lifecycle: create on first voice sample upload, persist for session

### Files to create

- `src/models/ttsWorker.ts`

### Files to modify

- `src/speak.ts` — add Chatterbox Turbo routing
- `src/types.ts` — extend Speaker type

### Acceptance

- Given an audio sample, extracts a speaker embedding
- Given text + embedding, produces synthesized audio that plays audibly
- Falls back to Web Speech API when Chatterbox Turbo unavailable
- Worker stays loaded after creation (no on-demand loading)

---

## Task 3: Audio cache (pre-generated phrases)

**Status:** done
**Depends on:** Task 2

### What

- Create `src/models/audioCache.ts`:
  - `has(key)`: Check if a phrase is cached in OPFS
  - `get(key)`: Retrieve and decode cached Opus audio → AudioBuffer
  - `put(key, audio)`: Encode Float32Array as Opus via AudioEncoder API, store in OPFS
  - `generateAll(phrases, embedding)`: AsyncGenerator that yields progress as each phrase is generated
  - `clear()`: Remove all cached audio (for patient reset)
  - Cache key format: `${phraseHash}:${embeddingHash}`
  - OPFS directory: `audio-cache/`
- Integrate cache into `speak.ts`:
  - Before synthesis: check cache → if hit, decode and play via Web Audio API (<50ms)
  - After synthesis: cache the result for future plays
- Background generation trigger: after voice sample → embedding creation, queue all phrases from `CATS` data
- Progress reporting: emit events consumed by `useModels` hook → displayed in Header

### Files to create

- `src/models/audioCache.ts`

### Files to modify

- `src/speak.ts` — add cache check before synthesis
- `src/components/layout/Header.tsx` — add phrase generation progress indicator
- `src/components/settings/Setup.tsx` — trigger background generation after voice upload

### Acceptance

- After voice setup, phrases generate in background with visible progress
- Cached phrases play in <50ms (Web Audio API decode + play)
- Cache survives page reloads (OPFS persistence)
- `clear()` removes all cached audio on patient reset
- App is usable during background generation (uncached phrases use real-time synthesis or Web Speech API)

---

## Task 4: LLM Worker and Gemma 3 270M integration

**Status:** done
**Depends on:** Task 1

### What

- Create `src/models/llmWorker.ts`: Web Worker that loads Gemma 3 270M ONNX model
  - Message types: `init` (load model), `complete` (generate completions)
  - `complete`: Takes prompt string + maxTokens → returns array of completion strings
  - System prompt embedded: medical communication vocabulary bias
  - Temperature/sampling: low temperature (0.3-0.5) for predictable completions
  - Output parsing: split model output into individual completion suggestions
- Update `src/data/suggestion-trees.ts`:
  - Make `getContextualSuggestions` async
  - On curated tree miss: call LLM Worker for completions
  - Build prompt from: partial sentence, last 5 messages, time of day
  - Timeout: if LLM doesn't respond in 200ms, return empty (show "Type instead")
- Update `src/components/builder/SentenceBuilder.tsx`:
  - Handle async `getContextualSuggestions` (was sync)
  - Show brief loading indicator while LLM generates
  - Display curated suggestions immediately, then update with LLM suggestions if they arrive

### Files to create

- `src/models/llmWorker.ts`

### Files to modify

- `src/data/suggestion-trees.ts` — async with LLM Layer 2
- `src/components/builder/SentenceBuilder.tsx` — async suggestion handling

### Acceptance

- When curated tree has no match, LLM generates contextual completions
- Suggestions appear within 200ms of curated miss
- Curated suggestions always shown instantly (no delay for LLM)
- If LLM fails/times out, builder shows "Type instead" (no regression)
- System prompt produces medically appropriate completions

---

## Task 5: STT Worker and Whisper integration

**Status:** done
**Depends on:** Task 1

### What

- Create `src/models/sttWorker.ts`: Web Worker that loads Whisper small ONNX model
  - Message types: `init` (load model), `transcribe` (process audio)
  - `transcribe`: Takes audio Float32Array + sampleRate → returns transcript string
  - Whisper input preprocessing: resample to 16kHz, normalize, pad/trim to 30-second chunks
  - Log-Mel spectrogram computation (or rely on ONNX model's built-in preprocessing)
- Create `src/hooks/useMicrophone.ts`:
  - `startCapture()`: Request mic permission, create MediaStream, connect to AudioWorklet/ScriptProcessor
  - Buffer audio chunks
  - Simple energy-based VAD: detect silence (1.5s below threshold) → send accumulated audio to STT Worker
  - `stopCapture()`: Stop MediaStream, flush remaining audio
  - Return: `{ isListening, transcript, startCapture, stopCapture, clearTranscript }`
- Update `src/components/provider/ListenPanel.tsx`:
  - Wire mic button to `useMicrophone()` hook
  - Show live transcript as it's recognized
  - Populate editable textarea with transcript
  - Handle mic permission state (prompt, denied, granted)

### Files to create

- `src/models/sttWorker.ts`
- `src/hooks/useMicrophone.ts`

### Files to modify

- `src/components/provider/ListenPanel.tsx` — wire to real STT

### Acceptance

- Mic button requests permission and captures audio
- After provider speaks and pauses, transcript appears in textarea (<2 seconds)
- Transcript is editable before posting to conversation
- Works with all 13 supported languages (Whisper multilingual)
- Mic permission denial shows clear message (not a crash)
- Manual text entry still works as parallel input method

---

## Task 6: Voice sample flow (Setup wizard → embedding → cache)

**Status:** done
**Depends on:** Task 2, Task 3

### What

- Update `src/components/settings/Setup.tsx`:
  - Voice upload button: accept audio files (MP3, M4A, WAV, MP4) via `<input type="file">`
  - Record button: capture via MediaStream (3-10 seconds) with countdown and timer
  - After capture/upload: decode audio via `AudioContext.decodeAudioData()`
  - Resample to model's expected sample rate
  - Send to TTS Worker for embedding extraction
  - Store embedding in IndexedDB via `store.ts`
  - Trigger background phrase generation via `audioCache.generateAll()`
  - Show progress: "Creating voice model..." → "Preparing phrases... 47/150"
- Update `src/store.ts`:
  - Add `saveEmbedding(embedding: Float32Array)` and `loadEmbedding(): Promise<Float32Array | null>`
  - Clear embedding on patient reset
- Update `src/App.tsx`:
  - Load embedding from IndexedDB on app start
  - Pass embedding to speak functions
  - Trigger audio cache generation if embedding exists but cache is empty

### Files to modify

- `src/components/settings/Setup.tsx` — real voice capture + embedding
- `src/store.ts` — embedding persistence
- `src/App.tsx` — embedding loading and passing

### Acceptance

- Upload an audio file → embedding created → stored in IndexedDB
- Record a voice sample → same flow
- Background phrase generation starts automatically
- Progress visible in UI
- Embedding survives page reload
- Patient reset clears embedding and audio cache

---

## Task 7: Graceful degradation and error handling

**Status:** done
**Depends on:** Tasks 2-5

### What

- Ensure every model integration point has a working fallback chain:
  - TTS: Chatterbox Turbo (WebGPU) → Chatterbox Turbo (WASM) → Web Speech API
  - LLM: Gemma 3 270M (WebGPU) → Gemma 3 270M (WASM) → curated trees only
  - STT: Whisper (WebGPU) → Whisper (WASM) → manual text entry
- Add error boundaries around model operations (try/catch, not React error boundaries)
- Handle: model download failure, ONNX session creation failure, inference timeout, WebGPU context loss
- Log errors to console with `[OwnVoice]` prefix for debugging
- Test on iPad A16 (8 GB) to verify all three models fit simultaneously
- Test with WebGPU disabled to verify WASM fallback
- Verify patient reset clears all model state (embeddings, cached audio, worker state)

### Files to modify

- `src/models/modelManager.ts` — error handling, EP fallback
- `src/speak.ts` — try/catch around synthesis
- `src/data/suggestion-trees.ts` — try/catch around LLM call
- `src/hooks/useMicrophone.ts` — error handling for mic/STT
- `src/store.ts` — clear model artifacts on reset

### Acceptance

- App loads and functions on a device without WebGPU (WASM fallback)
- App functions if model download fails (stub fallbacks active)
- No single model failure crashes the app or blocks communication
- Patient reset returns to clean state (no orphaned model artifacts)

---

## Dependency Graph

```
Task 1 (ONNX Runtime + model manager)
├── Task 2 (TTS Worker) ─────────────┐
│   └── Task 3 (Audio cache)         │
│       └── Task 6 (Voice sample)    │── Task 7 (Degradation + errors)
├── Task 4 (LLM Worker) ─────────────┤
└── Task 5 (STT Worker) ─────────────┘
```

## Parallel Execution Opportunities

After Task 1, three independent tracks can run in parallel:
- **Track A:** Task 2 → Task 3 → Task 6 (TTS pipeline)
- **Track B:** Task 4 (LLM integration)
- **Track C:** Task 5 (STT integration)

Task 7 integrates and hardens after all tracks complete.
