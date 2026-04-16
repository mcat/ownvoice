# Proposal: Wire Real Models

## What

The `integrate-model-stack` change built the complete worker infrastructure, speak.ts routing, audio cache, and suggestion pipeline — but all three workers have placeholder tensor names (TODO comments) because the actual ONNX model files haven't been downloaded and inspected yet.

This change:
1. Downloads the actual ONNX model files from HuggingFace
2. Inspects each model to extract exact tensor names, shapes, and data types
3. Replaces all TODO placeholders in the three workers with real tensor names
4. Adds tokenizer files needed for text encoding (Chatterbox, Gemma) and output decoding (Whisper)
5. Verifies end-to-end inference works for each model
6. Sets up model serving for development (`public/models/`) and documents the CDN path for production

## Why

The infrastructure is complete but non-functional — posting a "synthesize" message to the TTS worker will hit a TODO placeholder and fail. This change bridges from "scaffolded" to "working."

This is a focused, mechanical change: download files, inspect them, update code, test. No architectural decisions — those were all made in `integrate-model-stack`.

## Scope

### In scope

- Download ONNX model files for all three models (q4 quantized variants)
- Inspect models with `netron` or ONNX Runtime Python to get tensor names/shapes
- Replace all TODO placeholders in `ttsWorker.ts`, `llmWorker.ts`, `sttWorker.ts`
- Add tokenizer.json / vocab files for each model
- Implement actual text tokenization for Chatterbox Turbo and Gemma 3 270M
- Implement actual token decoding for Whisper small
- Add a model download script or instructions for development setup
- Test each worker end-to-end: input → inference → output
- Document model file locations and CDN configuration for production

### Out of scope

- Architecture changes (the workers, routing, cache, fallback chains are done)
- UI changes (progress indicators and voice sample UI already exist)
- Performance optimization (Tier 1 cache, speculative generation — future work)
- Model fine-tuning or retraining

## Models

| Model | HuggingFace Repo | Format | Estimated Size |
|-------|-----------------|--------|---------------|
| Chatterbox Turbo | `ResembleAI/chatterbox-turbo-ONNX` | ONNX (multi-file) | ~200-400 MB |
| Gemma 3 270M | `onnx-community/gemma-3-270m-it-ONNX` | ONNX q4 | ~150 MB |
| Whisper small | `onnx-community/whisper-small` | ONNX (encoder + decoder) | ~250 MB |

## Success criteria

- All TODO comments in worker files are replaced with verified tensor names
- TTS worker: given text + speaker embedding → produces audible audio
- LLM worker: given a prompt → produces text completions
- STT worker: given audio → produces transcript text
- Models load from `public/models/` in dev and from CDN URLs in production
- No regressions in the graceful degradation chain (Web Speech API fallback still works)
