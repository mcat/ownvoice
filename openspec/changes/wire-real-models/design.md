# Design: Wire Real Models

## Approach

This is a mechanical change — no new architecture. The pattern for each model is identical:

```
1. Download model files from HuggingFace
2. Inspect with netron/onnxruntime-python to get tensor metadata
3. Update worker code: replace TODO placeholders with real names
4. Add tokenizer: encode text input / decode token output
5. Test: post message to worker → verify output
```

## Model-specific details

### Chatterbox Turbo (TTS)

**Source:** `ResembleAI/chatterbox-turbo-ONNX`

4-component ONNX pipeline with known tensor names (from HuggingFace model card):

```
Pipeline (4 ONNX sessions):

  1. Speech Encoder (setup-time only, ~178 MB q4f16)
     Input:  audio_values (float32, [1, audio_len])
     Output: cond_emb, prompt_token, speaker_embeddings, speaker_features
     → Loaded during voice setup, unloaded after. Outputs stored in IndexedDB.

  2. Embed Tokens (~34 MB q4f16)
     Input:  input_ids (int64)
     Output: inputs_embeds
     → Always loaded (tiny).

  3. Language Model (~184 MB q4f16, autoregressive)
     Input:  inputs_embeds, attention_mask, position_ids, past_key_values_*
     Output: logits, present_key_values_*
     → Always loaded. Generates speech tokens via KV-cached loop.
     → Special tokens: START_SPEECH_TOKEN=6561, STOP_SPEECH_TOKEN=6562
     → Max 1024 new tokens per generation.

  4. Conditional Decoder (~165 MB q4f16)
     Input:  speech_tokens (int64), speaker_embeddings, speaker_features
     Output: wav (float32, 24kHz audio waveform)
     → Always loaded. Single-step distilled (fast).
```

**Load strategy (on-demand speech encoder):**
- At setup: load speech_encoder → extract embeddings → store in IndexedDB → unload
- At runtime: only embed_tokens + language_model + conditional_decoder stay loaded (~383 MB)
- IndexedDB stores: speaker_embeddings, speaker_features, cond_emb, prompt_token

**Quantization:** q4f16 variant (smallest). Total download ~561 MB, runtime memory ~383 MB.

**Tokenizer:** Uses HuggingFace AutoTokenizer (tokenizer.json, 3.56 MB). Text → input_ids via standard tokenizer encode.

**Generation flow:**
1. Tokenize text → input_ids
2. embed_tokens(input_ids) → inputs_embeds
3. Concatenate [speech_encoder_outputs, text_embeds] → combined embeds
4. Language model autoregressive loop with KV cache → speech tokens
5. conditional_decoder(speech_tokens, speaker_embeddings, speaker_features) → wav
6. Play wav at 24kHz

### Gemma 3 270M (LLM)

**Source:** `onnx-community/gemma-3-270m-it-ONNX`

Standard causal LLM ONNX export. Files include `model_q4.onnx` and `model_q4.onnx_data`.

**Expected tensor names (standard for Transformers ONNX exports):**
- Input: `input_ids` (int64), `attention_mask` (int64)
- Output: `logits` (float32)

**Tokenizer:** Gemma uses a SentencePiece tokenizer. The `tokenizer.json` file from the HuggingFace repo provides the vocabulary and encoding rules. Implementation needs:
- Encode prompt text → input_ids array
- Decode output token IDs → text (for autoregressive generation)
- Handle special tokens (BOS, EOS, pad)

**Generation loop:** The LLM worker needs an autoregressive generation loop:
```
1. Encode prompt → input_ids
2. Run model → logits
3. Sample next token from logits (temperature 0.3)
4. Append token to input_ids
5. Repeat until EOS or maxTokens
6. Decode accumulated tokens → text
```

**Known issue:** There's an [ONNX Runtime bug](https://github.com/microsoft/onnxruntime/issues/26732) where fp16/q4f16 Gemma 3 models produce invalid outputs on WebGPU. Use q8 if q4 doesn't work, or test with WASM EP as fallback.

### Whisper small (STT)

**Source:** `onnx-community/whisper-small`

Whisper ONNX exports are typically split into encoder and decoder:
- `encoder_model.onnx` — mel spectrogram → encoder hidden states
- `decoder_model.onnx` (or `decoder_model_merged.onnx`) — autoregressive token generation

**Expected tensor names:**
- Encoder input: `input_features` (float32, shape [1, 80, 3000]) — 80 mel bins, 3000 time steps (30 sec at 100 fps)
- Encoder output: `last_hidden_state` (float32)
- Decoder input: `input_ids` / `encoder_hidden_states`
- Decoder output: `logits`

**Tokenizer:** Whisper uses a custom tokenizer with special tokens for language, task (transcribe/translate), timestamps, and the actual vocabulary. The `tokenizer.json` from the HuggingFace repo must be loaded. Special token handling:
- `<|startoftranscript|>`, `<|endoftext|>`, language tokens (`<|en|>`, `<|es|>`, etc.)
- Filter out timestamp tokens and special markers from the output

**The sttWorker.ts already implements mel spectrogram computation.** The main work is:
1. Verify the mel computation matches Whisper's expected input format
2. Wire up the actual encoder → decoder pipeline
3. Load and use the real tokenizer for decoding

## Tokenizer strategy

All three models need tokenizers. Rather than implementing three custom tokenizers from scratch, use the `tokenizer.json` files from HuggingFace which follow the Hugging Face Tokenizers format. Parse these JSON files in the workers to build encode/decode functions.

Alternatively, for models supported by Transformers.js, the tokenizer handling is built in. Since Chatterbox is supported in Transformers.js v4, consider using `@huggingface/transformers` for tokenization if it reduces complexity — but only for tokenization, not for inference (we use ONNX Runtime Web directly for inference).

## File organization

```
public/models/
├── chatterbox-turbo/
│   ├── speech_encoder_q4f16.onnx + _data     (~178 MB, setup-time only)
│   ├── embed_tokens_q4f16.onnx + _data        (~34 MB)
│   ├── language_model_q4f16.onnx + _data      (~184 MB)
│   ├── conditional_decoder_q4f16.onnx + _data (~165 MB)
│   └── tokenizer.json                          (~3.6 MB)
├── gemma-3-270m/
│   ├── model_q4.onnx
│   ├── model_q4.onnx_data
│   └── tokenizer.json
└── whisper-small/
    ├── encoder_model.onnx
    ├── decoder_model_merged.onnx
    └── tokenizer.json
```

For development, these are served by Vite's static file server.
For production, replace the base URLs in `src/models/types.ts` `MODEL_URLS`.

## Testing approach

Each model is tested independently:

1. **TTS:** Record a 5-second voice clip → extract embedding → synthesize "Hello, I need help" → verify audio plays
2. **LLM:** Send prompt "I feel" → verify completions include medical vocabulary (e.g., "scared", "dizzy", "better")
3. **STT:** Play a recording of speech into the mic → verify transcript appears

Testing requires a real browser (iPad Safari or desktop Chrome with WebGPU). No automated testing for model inference — this is manual verification.
