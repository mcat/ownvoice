#!/usr/bin/env python3
"""
Run end-to-end Chatterbox Multilingual synthesis to produce a WAV file.

Used to validate that the fp16 speech_encoder still produces audible voice
clones (issue #163, Phase 1) and as a CLI smoke test for future model bumps.
Loads encoder + embed_tokens + LM + conditional_decoder, takes a reference
voice WAV + a target text, runs the full pipeline, saves a WAV.

Notes:
- Multilingual uses argmax + rep_penalty (greedy + 1.2 penalty) for the
  autoregressive LM, not sampling — matches `ttsWorker.ts` and the upstream
  generation_config.json. Bare argmax gets trapped on repeating-token
  attractors and never emits STOP.
- position_ids per upstream: wrapper tokens (START_SPEECH, EXAGGERATION)
  get position 0; text-side tokens use arange(N) - 1.
- KV cache is fp32 for q4 LM (q4f16 used fp16; activation precision moves
  with the suffix).

Usage:
    python3 scripts/synthesize-with-encoder.py \
        --model-dir public/models/2026-04-29/chatterbox-multilingual \
        --reference /tmp/some.wav \
        --text "Hello, how are you?" \
        --output /tmp/clone.wav

`--encoder-dir` overrides only the speech_encoder; defaults to --model-dir.
"""
from __future__ import annotations

import argparse
import sys
import unicodedata
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

# Architectural constants (Chatterbox Multilingual — Llama-30 backbone)
NUM_LAYERS = 30
NUM_HEADS = 16
HEAD_DIM = 64
START_SPEECH = 6561
STOP_SPEECH = 6562
SILENCE_TOKEN = 4299
SAMPLE_RATE = 24000
MIN_NEW_TOKENS = 10
MAX_NEW_TOKENS = 768
REPETITION_PENALTY = 1.2
EXAGGERATION = 0.5


def decode_wav(path: Path) -> np.ndarray:
    """Decode a 16-bit PCM mono WAV at 16 kHz to float32 in [-1, 1]."""
    with wave.open(str(path), "rb") as wf:
        if wf.getnchannels() != 1:
            raise ValueError(f"{path}: must be mono (got {wf.getnchannels()} channels)")
        if wf.getsampwidth() != 2:
            raise ValueError(f"{path}: must be 16-bit PCM (got {wf.getsampwidth()*8}-bit)")
        if wf.getframerate() != 16000:
            raise ValueError(f"{path}: must be 16 kHz (got {wf.getframerate()} Hz)")
        n = wf.getnframes()
        raw = wf.readframes(n)
        return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def load_session(path: Path) -> ort.InferenceSession:
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", required=True, type=Path)
    parser.add_argument("--encoder-dir", type=Path, default=None,
                        help="speech_encoder dir override; defaults to --model-dir")
    parser.add_argument("--reference", required=True, type=Path,
                        help="reference voice WAV (mono 16-bit @ 16 kHz)")
    parser.add_argument("--text", required=True)
    parser.add_argument("--language", default="en")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    encoder_dir = args.encoder_dir or args.model_dir

    # Tokenizer: HF tokenizers applies the post-processor template (EXAGGERATION
    # + BOS + … + EOS + START_SPEECH × 2) automatically.
    tok = Tokenizer.from_file(str(args.model_dir / "tokenizer.json"))

    # Match `prepareLanguage` in src/models/multilingualTokenizer.ts:
    #   text → puncNorm → lowercase → NFKD → "[lang]<text>"
    # puncNorm is the upstream punctuation normalizer; for our purposes here
    # the cheap subset (just lowercase + NFKD + lang tag) reproduces the
    # working behaviour for English. Other languages (Chinese, Korean, Hebrew,
    # Russian) would need their per-language preprocessors ported — out of
    # scope for this validation script.
    normalized = unicodedata.normalize("NFKD", args.text.lower())
    prepared = f"[{args.language}]{normalized}"
    input_ids = tok.encode(prepared).ids
    print(f"Prepared: {prepared!r}")
    print(f"Token IDs ({len(input_ids)}): first 8 = {input_ids[:8]}, last 4 = {input_ids[-4:]}")

    # Load encoder, run on reference audio → speakerData.
    print(f"\nLoading speech_encoder from {encoder_dir} ...")
    enc_sess = load_session(encoder_dir / "speech_encoder.onnx")
    audio = decode_wav(args.reference)
    # Take first 6 s (matches the validate-fp16-encoder.mjs convention)
    clip = audio[: 16000 * 6]
    print(f"  reference: {len(clip)/16000:.2f}s @ 16 kHz")

    enc_out = enc_sess.run(None, {"audio_values": clip.reshape(1, -1).astype(np.float32)})
    out_names = [o.name for o in enc_sess.get_outputs()]
    cond_emb = enc_out[out_names.index("audio_features")]
    prompt_token = enc_out[out_names.index("audio_tokens")]
    speaker_emb = enc_out[out_names.index("speaker_embeddings")]
    speaker_feat = enc_out[out_names.index("speaker_features")]
    print(f"  cond_emb: {cond_emb.shape}, speaker_emb: {speaker_emb.shape}")

    # Load synth-side models (parallel — overlaps disk I/O + ORT init).
    print(f"\nLoading synth models from {args.model_dir} ...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        embed_f = pool.submit(load_session, args.model_dir / "embed_tokens.onnx")
        lm_f = pool.submit(load_session, args.model_dir / "language_model_q4.onnx")
        dec_f = pool.submit(load_session, args.model_dir / "conditional_decoder.onnx")
        embed_sess, lm_sess, dec_sess = embed_f.result(), lm_f.result(), dec_f.result()

    # Step 2: embed text tokens.
    # Per upstream HF reference (mirrored in ttsWorker.ts:586):
    #   position_ids = where(input_ids >= START_SPEECH, 0, arange(N) - 1)
    # i.e. wrapper tokens get position 0, text tokens use arange-1.
    n = len(input_ids)
    ids_arr = np.array(input_ids, dtype=np.int64)
    position_ids = np.where(ids_arr >= START_SPEECH, 0, np.arange(n) - 1).astype(np.int64)
    embed_out = embed_sess.run(None, {
        "input_ids": ids_arr.reshape(1, -1),
        "position_ids": position_ids.reshape(1, -1),
        "exaggeration": np.array([EXAGGERATION], dtype=np.float32),
    })
    text_embeds = embed_out[0]  # inputs_embeds
    print(f"  text_embeds: {text_embeds.shape}")

    # Step 3: combined initial input = [cond_emb, text_embeds]
    combined = np.concatenate([cond_emb, text_embeds], axis=1).astype(np.float32)
    cond_len, text_len = cond_emb.shape[1], text_embeds.shape[1]
    total_len = cond_len + text_len
    print(f"\nLM init: combined={combined.shape} (cond={cond_len} + text={text_len})")

    # Build initial LM inputs with empty KV cache (fp32 for q4 LM).
    lm_inputs = {
        "inputs_embeds": combined,
        "attention_mask": np.ones((1, total_len), dtype=np.int64),
    }
    for i in range(NUM_LAYERS):
        lm_inputs[f"past_key_values.{i}.key"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float32)
        lm_inputs[f"past_key_values.{i}.value"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float32)

    output_names = [o.name for o in lm_sess.get_outputs()]
    logits_idx = output_names.index("logits")
    generated = [START_SPEECH]

    print(f"\nGenerating speech tokens (max {MAX_NEW_TOKENS}) ...")
    for step in range(MAX_NEW_TOKENS):
        lm_result = lm_sess.run(None, lm_inputs)
        logits = lm_result[logits_idx]
        last = logits[0, -1, :].astype(np.float32).copy()

        # Mask invalid tokens: only [0, 6560] + STOP (6562) are valid speech codes.
        # START (6561) shouldn't appear mid-sequence; > 6562 are text-side.
        last[START_SPEECH] = -np.inf
        last[STOP_SPEECH + 1:] = -np.inf
        if step < MIN_NEW_TOKENS:
            last[STOP_SPEECH] = -np.inf

        # HF-convention repetition penalty (in-place).
        for tok_id in set(generated):
            if tok_id < len(last):
                if last[tok_id] > 0:
                    last[tok_id] /= REPETITION_PENALTY
                else:
                    last[tok_id] *= REPETITION_PENALTY

        max_idx = int(np.argmax(last))
        if max_idx == STOP_SPEECH:
            print(f"  STOP at step {step + 1}")
            break
        generated.append(max_idx)

        # Next step: feed only the new token's embedding + accumulated KV cache.
        next_position = total_len + step  # absolute position of the new token
        # For speech tokens (always < START_SPEECH), use arange-1 indexing
        # continuation; the embed_tokens model handles wrapper-vs-text branching.
        next_embed_out = embed_sess.run(None, {
            "input_ids": np.array([[max_idx]], dtype=np.int64),
            "position_ids": np.array([[step + 1]], dtype=np.int64),
            "exaggeration": np.array([EXAGGERATION], dtype=np.float32),
        })
        next_embeds = next_embed_out[0]

        new_len = total_len + step + 1
        lm_inputs = {
            "inputs_embeds": next_embeds,
            "attention_mask": np.ones((1, new_len), dtype=np.int64),
        }
        for name, value in zip(output_names, lm_result):
            if name.startswith("present."):
                lm_inputs["past_key_values." + name[len("present."):]] = value

    print(f"  generated {len(generated)} tokens")

    # Step 4: decode via conditional_decoder.
    # speech_tokens = prompt_token (from encoder) + generated[1:] (skip START) + 3× silence padding
    prompt_list = prompt_token.flatten().tolist()
    decoder_tokens = prompt_list + generated[1:] + [SILENCE_TOKEN] * 3
    print(f"\nDecoder: {len(decoder_tokens)} tokens "
          f"(prompt={len(prompt_list)}, gen={len(generated)-1}, silence=3)")

    dec_out = dec_sess.run(None, {
        "speech_tokens": np.array([decoder_tokens], dtype=np.int64),
        "speaker_embeddings": speaker_emb,
        "speaker_features": speaker_feat,
    })
    audio_out = dec_out[0].flatten().astype(np.float32)
    peak = float(np.max(np.abs(audio_out)))
    rms = float(np.sqrt(np.mean(audio_out ** 2)))
    print(f"  audio: {len(audio_out)} samples = {len(audio_out)/SAMPLE_RATE:.2f}s "
          f"(peak={peak:.4f}, rms={rms:.4f})")

    # Save normalized 16-bit PCM WAV.
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if peak > 0.001:
        norm = (audio_out / peak * 0.9 * 32767).astype(np.int16)
    else:
        print("  WARNING: output audio is silent (peak < 0.001)", file=sys.stderr)
        norm = (audio_out * 32767).astype(np.int16)
    with wave.open(str(args.output), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(norm.tobytes())
    print(f"\nSaved: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
