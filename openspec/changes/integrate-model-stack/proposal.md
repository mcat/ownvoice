# Proposal: Integrate Model Stack

## What

Replace the three stubbed AI integration points in the core app with real on-device model inference via ONNX Runtime Web + WebGPU:

1. **TTS:** Replace Web Speech API in `speak.ts` with Chatterbox Turbo for English voice cloning
2. **Suggestions:** Add Gemma 3 270M as Layer 2 in the Sentence Builder (behind curated trees)
3. **STT:** Wire Whisper small into the Listen panel's mic button for on-device transcription

All three models run via ONNX Runtime Web with the WebGPU execution provider (Metal on iPad). All loaded simultaneously — no on-demand loading.

## Why

The core app is fully functional with Web Speech API and curated suggestion trees, but these are the stubs. The product's differentiator is the patient's own voice — hearing "I'm scared" in Margaret's voice instead of a generic system voice. The suggestion LLM handles the long-tail sentences curated trees can't predict. And on-device STT makes the Listen panel actually useful without typing.

Without this change, OwnVoice is a competent AAC tool. With it, OwnVoice is the product described in the PRD.

## Scope

### In scope

- Install `onnxruntime-web` package
- ONNX Runtime Web initialization and WebGPU execution provider setup
- Model loading infrastructure: download from CDN, cache in OPFS, load into WebGPU
- Model loading progress UI (visible to caregiver during setup)
- **TTS (Chatterbox Turbo):**
  - Speaker embedding extraction from 3-10 second voice sample
  - Real-time synthesis for custom messages (Tier 3: 300-800ms)
  - Pre-generated audio cache for fixed phrases (Tier 1: <50ms via Web Audio API)
  - Opus encoding for cached clips, storage in OPFS
  - Cross-lingual synthesis: patient's voice in all 23 supported languages from a single voice sample
- **Suggestions (Gemma 3 270M):**
  - Web Worker for inference (non-blocking UI thread)
  - Integration with `getContextualSuggestions()` as Layer 2 fallback
  - System prompt for medical communication vocabulary bias
  - <200ms latency target per suggestion refresh
- **STT (Whisper small):**
  - Microphone capture via MediaStream API
  - Batch transcription (process after speaker pauses)
  - <2 second latency from end-of-speech to transcript
  - Wire into Listen panel's mic button (replace stub)
- Graceful degradation: if any model fails to load, fall back to current stubs
- Memory budget monitoring: warn if approaching limits on A16

### Out of scope

- Provider voice cloning (same Chatterbox Turbo, but provider embedding — deferred to a follow-up)
- Streaming STT via Voxtral Mini (Phase 2 per PRD)
- Model fine-tuning or training
- Voice sample recording UI changes (Setup wizard already has the UI)

## Success criteria

- Patient taps a phrase → hears their own cloned voice (any of 23 languages, with voice sample configured)
- Spanish-speaking patient with English voice sample → hears their own voice speaking Spanish (cross-lingual)
- Patient taps a phrase without voice sample → hears Web Speech API (current behavior)
- Sentence builder shows LLM-generated suggestions when curated tree has no match
- Listen panel mic button captures provider speech and transcribes it on-device
- All three models load and stay loaded simultaneously on iPad A16 (8 GB)
- No model failure renders the app non-functional (graceful degradation)
- Pre-generated phrase cache completes within 5 minutes of voice setup
