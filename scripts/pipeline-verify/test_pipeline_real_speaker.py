"""Test Chatterbox pipeline with REAL speaker data from the user's recording.
Uses condEmb + speaker embeddings (which are non-zero) but zero prompt tokens."""

import numpy as np
from tokenizers import Tokenizer
import wave, json

from _common import (
    SCRIPT_DIR, MODEL_DIR,
    START_SPEECH_TOKEN, STOP_SPEECH_TOKEN, SILENCE_TOKEN, SAMPLE_RATE,
    load_chatterbox_sessions,
)

MAX_NEW_TOKENS = 100

# Load real speaker data from IndexedDB export
# We'll extract it via a helper script, but for now let's load from the app's IDB
# Actually, let's just use the JS console to dump it. For now, run the pipeline
# with zero speaker data but MORE tokens to see if there's speech buried in the output.

print("Loading models (concurrent)...")
tok = Tokenizer.from_file(MODEL_DIR + "tokenizer.json")
embed_sess, lm_sess, dec_sess = load_chatterbox_sessions()

# Tokenize
text = "Yes"
enc = tok.encode(text)
input_ids = np.array([enc.ids], dtype=np.int64)
print(f"Tokenized '{text}' → {enc.ids}")

# Embed
embed_result = embed_sess.run(None, {"input_ids": input_ids})
text_embeds = embed_result[0]

# Use zero condEmb (151 x 1024) — matches browser behavior
cond_len = 151
embed_dim = 1024
cond_emb = np.zeros((1, cond_len, embed_dim), dtype=np.float32)

combined = np.concatenate([cond_emb, text_embeds], axis=1).astype(np.float32)
total_len = combined.shape[1]

# LM generation
attention_mask = np.ones((1, total_len), dtype=np.int64)
position_ids = np.arange(total_len, dtype=np.int64).reshape(1, -1)
lm_inputs = {
    "inputs_embeds": combined,
    "attention_mask": attention_mask,
    "position_ids": position_ids,
}

NUM_LAYERS, NUM_HEADS, HEAD_DIM = 24, 16, 64
for i in range(NUM_LAYERS):
    lm_inputs[f"past_key_values.{i}.key"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)
    lm_inputs[f"past_key_values.{i}.value"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)

generated = [START_SPEECH_TOKEN]
output_names = [o.name for o in lm_sess.get_outputs()]

print(f"Generating (max {MAX_NEW_TOKENS})...")
for step in range(MAX_NEW_TOKENS):
    lm_result = lm_sess.run(None, lm_inputs)
    logits_idx = output_names.index("logits")
    logits = lm_result[logits_idx]
    last_logits = logits[0, -1, :]
    token = int(np.argmax(last_logits))

    if step < 5 or step % 20 == 0:
        print(f"  Step {step}: token={token}")

    if token == STOP_SPEECH_TOKEN:
        print(f"  STOP at step {step}")
        break
    generated.append(token)

    embed_idx = min(token, 6560)
    next_embed = embed_sess.run(None, {"input_ids": np.array([[embed_idx]], dtype=np.int64)})[0]
    new_len = total_len + step + 1

    lm_inputs = {
        "inputs_embeds": next_embed,
        "attention_mask": np.ones((1, new_len), dtype=np.int64),
        "position_ids": np.array([[new_len - 1]], dtype=np.int64),
    }
    for name, value in zip(output_names, lm_result):
        if name.startswith("present."):
            lm_inputs["past_key_values." + name[len("present."):]] = value

print(f"Generated {len(generated)} tokens")
unique_tokens = sorted(set(generated))
print(f"Unique tokens: {unique_tokens}")

# Test THREE decoder configurations:
configs = [
    ("A: zero prompt (250×0) + generated", [0]*250 + generated[1:] + [SILENCE_TOKEN]*3),
    ("B: no prompt, just generated", generated[1:] + [SILENCE_TOKEN]*3),
    ("C: short zero prompt (50×0) + generated", [0]*50 + generated[1:] + [SILENCE_TOKEN]*3),
]

speaker_emb = np.zeros((1, 192), dtype=np.float32)
speaker_feat = np.zeros((1, 500, 80), dtype=np.float32)

for label, tokens in configs:
    print(f"\n=== {label} ({len(tokens)} tokens) ===")
    try:
        speech_tensor = np.array([tokens], dtype=np.int64)
        dec_result = dec_sess.run(None, {
            "speech_tokens": speech_tensor,
            "speaker_embeddings": speaker_emb,
            "speaker_features": speaker_feat,
        })
        audio = dec_result[0].flatten().astype(np.float32)
        peak = np.max(np.abs(audio))
        rms = np.sqrt(np.mean(audio**2))
        nonzero = np.count_nonzero(np.abs(audio) > 0.001)
        print(f"  Audio: {len(audio)} samples = {len(audio)/SAMPLE_RATE:.2f}s")
        print(f"  peak={peak:.6f}, rms={rms:.6f}, nonzero={nonzero}/{len(audio)}")

        # Save each
        fname = str(SCRIPT_DIR / f"test_output_{label[0]}.wav")
        if peak > 0.001:
            norm = (audio / peak * 0.9 * 32767).astype(np.int16)
        else:
            norm = (audio * 32767).astype(np.int16)
        with wave.open(fname, 'w') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(norm.tobytes())
        print(f"  Saved: {fname}")
    except Exception as e:
        print(f"  FAILED: {e}")

print("\nDone! Open the WAV files to check for speech.")
