# Tasks: Wire Real Models

## Task 1: Download and inspect Chatterbox Turbo ONNX

**Status:** done
**Depends on:** none

### What

- Download all ONNX files from `ResembleAI/chatterbox-turbo-ONNX` on HuggingFace
- Place in `public/models/chatterbox-turbo/`
- Inspect each ONNX file to catalog:
  - File names and sizes
  - Input tensor names, shapes, and dtypes
  - Output tensor names, shapes, and dtypes
  - How the multi-model pipeline connects (encoder → decoder → vocoder)
- Download tokenizer.json or equivalent vocabulary file
- Document findings in a comment block at the top of `ttsWorker.ts`

### Tools

- `huggingface-cli download` or `wget` for model files
- `netron.app` (web) or `onnxruntime` Python for model inspection
- Alternatively: `python -c "import onnxruntime; sess = onnxruntime.InferenceSession('model.onnx'); print(sess.get_inputs()); print(sess.get_outputs())"`

### Acceptance

- All Chatterbox ONNX files are in `public/models/chatterbox-turbo/`
- A reference comment documents all tensor names and shapes
- Tokenizer file is present

---

## Task 2: Download and inspect Gemma 3 270M ONNX

**Status:** done
**Depends on:** none

### What

- Download `model_q4.onnx` and `model_q4.onnx_data` from `onnx-community/gemma-3-270m-it-ONNX`
- Place in `public/models/gemma-3-270m/`
- Inspect to get input/output tensor names and shapes
- Download `tokenizer.json` from the same repo
- Test the q4 quantized variant — if it hits the known WebGPU overflow bug, try q8 instead
- Document findings

### Acceptance

- Gemma ONNX files in `public/models/gemma-3-270m/`
- Tensor names and shapes documented
- Tokenizer.json present
- Known if q4 works on WebGPU or if q8 is needed

---

## Task 3: Download and inspect Whisper small ONNX

**Status:** done
**Depends on:** none

### What

- Download encoder and decoder ONNX files from `onnx-community/whisper-small`
- Place in `public/models/whisper-small/`
- Inspect encoder: input tensor (mel spectrogram format), output tensor
- Inspect decoder: input tensors (encoder output + token IDs), output tensor
- Download `tokenizer.json` with vocabulary and special token mappings
- Verify the mel spectrogram format matches what `sttWorker.ts` already computes (80 bins, 3000 timesteps for 30s)
- Document findings

### Acceptance

- Whisper ONNX files in `public/models/whisper-small/`
- Encoder + decoder tensor names documented
- Tokenizer.json present with special token IDs mapped

---

## Task 4: Wire Chatterbox Turbo worker with real tensors

**Status:** done
**Depends on:** Task 1

### What

- Update `src/models/ttsWorker.ts`:
  - Replace all TODO tensor name placeholders with actual names from Task 1
  - Update tensor shapes and dtypes to match the model
  - If the model is multi-file (encoder + decoder + vocoder), load each as a separate InferenceSession and chain them
  - Implement text tokenization using the downloaded tokenizer.json
  - Implement speaker embedding extraction with the correct input preprocessing
  - Implement synthesis pipeline: tokenize text → encode → condition on embedding → decode → vocoder → audio
- Update `src/models/types.ts` MODEL_URLS if the file structure requires multiple downloads

### Acceptance

- No TODO comments remain in ttsWorker.ts
- Worker loads model files and reports "ready"
- `embed` message with real audio → returns a Float32Array embedding
- `synthesize` message with text + embedding → returns audible audio

---

## Task 5: Wire Gemma 3 270M worker with real tensors

**Status:** done
**Depends on:** Task 2

### What

- Update `src/models/llmWorker.ts`:
  - Replace TODO tensor names with actual input/output names from Task 2
  - Implement tokenizer: load tokenizer.json, encode text → token IDs, decode IDs → text
  - Implement autoregressive generation loop:
    1. Encode prompt → input_ids
    2. Forward pass → logits
    3. Sample next token (temperature 0.3, top-k filtering)
    4. Append to input_ids, repeat until EOS or maxTokens
    5. Decode accumulated tokens → text completions
  - Parse output into 6-8 separate completion strings (split on newlines)
  - Handle special tokens (BOS, EOS, pad) correctly

### Acceptance

- No TODO comments remain in llmWorker.ts
- Worker loads model and reports "ready"
- `complete` message with prompt "I feel" → returns array of relevant completions
- Completions are medically appropriate (symptoms, emotions, needs)

---

## Task 6: Wire Whisper small worker with real tensors

**Status:** done
**Depends on:** Task 3

### What

- Update `src/models/sttWorker.ts`:
  - Replace TODO tensor names with actual names from Task 3
  - Load both encoder and decoder ONNX files as separate InferenceSessions
  - Verify mel spectrogram computation matches Whisper's expected format
  - Implement encoder → decoder pipeline:
    1. Compute mel spectrogram from audio (already implemented)
    2. Run encoder: mel → hidden states
    3. Run decoder autoregressively: hidden states + previous tokens → next token
    4. Stop on `<|endoftext|>` token
  - Implement tokenizer decoding: load tokenizer.json, map token IDs → text
  - Filter special tokens (SOT, EOT, language, timestamps) from output
  - Handle language detection or accept language hint from caller

### Acceptance

- No TODO comments remain in sttWorker.ts
- Worker loads encoder + decoder and reports "ready"
- `transcribe` message with recorded speech → returns readable transcript
- Special tokens are filtered from output
- Works for English speech (primary test case)

---

## Task 7: Update model URLs and dev server configuration

**Status:** done
**Depends on:** Tasks 1-3

### What

- Update `src/models/types.ts` MODEL_URLS to point to actual file paths:
  - For dev: relative paths served by Vite (`/models/chatterbox-turbo/...`)
  - For production: CDN URLs (configurable via environment variable or build flag)
- Update `vite.config.ts` if needed to serve large model files correctly (increase timeout, configure CORS headers)
- Add model files to `.gitignore` (they're too large for git)
- Create a `scripts/download-models.sh` that downloads all model files from HuggingFace into `public/models/`
- Update README or CLAUDE.md with model setup instructions

### Acceptance

- `npm run dev` serves model files from `public/models/`
- Workers can load models from the dev server URLs
- Model files are gitignored
- Download script works: `./scripts/download-models.sh` populates `public/models/`

---

## Task 8: End-to-end verification

**Status:** done
**Depends on:** Tasks 4-7

### What

- Start dev server and open in a WebGPU-capable browser (Chrome or Safari)
- Test TTS end-to-end:
  - Run setup wizard, upload a voice sample
  - Verify embedding extraction completes
  - Tap a phrase → verify it plays in the cloned voice
  - Verify Web Speech API fallback works when model is not loaded
- Test LLM end-to-end:
  - Open sentence builder
  - Type a partial sentence not in curated trees
  - Verify LLM suggestions appear within 200ms
  - Verify curated tree suggestions still work instantly
- Test STT end-to-end:
  - Open listen panel, tap mic button
  - Speak a sentence
  - Verify transcript appears in the textarea
  - Verify "Add to conversation" posts the transcript
- Test graceful degradation:
  - Delete model files → verify app falls back to stubs without crashing
  - Verify patient reset clears all model data
- Document any issues found and fix them

### Acceptance

- All three models load and produce correct output
- The fallback chain works when models are unavailable
- No crashes or unhandled errors in any test scenario

---

## Dependency Graph

```
Tasks 1, 2, 3 (download + inspect) — run in parallel
├── Task 4 (wire Chatterbox) ← Task 1
├── Task 5 (wire Gemma) ← Task 2
├── Task 6 (wire Whisper) ← Task 3
└── Task 7 (URLs + dev config) ← Tasks 1, 2, 3
    └── Task 8 (end-to-end verification) ← Tasks 4, 5, 6, 7
```

## Notes

- Model files total ~600-800 MB. They must NOT be committed to git.
- The download/inspect tasks (1-3) require Python with `onnxruntime` installed, or use netron.app (web-based model inspector).
- The q4f16 Gemma 3 overflow bug on WebGPU is a known risk. If q4 doesn't work, fall back to q8 (larger but correct).
- Chatterbox Turbo's ONNX export structure (single file vs. multi-model pipeline) is unknown until inspection. Task 4 may need to restructure the worker significantly if it's a multi-model pipeline.
