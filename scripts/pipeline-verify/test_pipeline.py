"""Test Chatterbox Turbo ONNX pipeline end-to-end in Python.
Verifies the models produce actual speech, independent of the browser runtime."""

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
import wave, struct, sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MODEL_DIR = f"{REPO_ROOT}/public/models/chatterbox-turbo/"
START_SPEECH_TOKEN = 6561
STOP_SPEECH_TOKEN = 6562
SILENCE_TOKEN = 4299
SAMPLE_RATE = 24000
MAX_NEW_TOKENS = 100  # More than browser's 50 but still fast

# Load tokenizer
tok = Tokenizer.from_file(MODEL_DIR + "tokenizer.json")

# Load models
print("Loading embed_tokens...")
embed_sess = ort.InferenceSession(MODEL_DIR + "embed_tokens_q4f16.onnx", providers=["CPUExecutionProvider"])
print("Loading language_model...")
lm_sess = ort.InferenceSession(MODEL_DIR + "language_model_q4f16.onnx", providers=["CPUExecutionProvider"])
print("Loading conditional_decoder...")
dec_sess = ort.InferenceSession(MODEL_DIR + "conditional_decoder_q4f16.onnx", providers=["CPUExecutionProvider"])

# Check model I/O
print("\n=== embed_tokens inputs:", [i.name for i in embed_sess.get_inputs()])
print("=== embed_tokens outputs:", [o.name for o in embed_sess.get_outputs()])
print("=== language_model inputs:", [i.name for i in lm_sess.get_inputs()])
print("=== language_model outputs:", [o.name for o in lm_sess.get_outputs()])
print("=== decoder inputs:", [i.name for i in dec_sess.get_inputs()])
print("=== decoder outputs:", [o.name for o in dec_sess.get_outputs()])

# Tokenize
text = "Yes"
enc = tok.encode(text)
input_ids = np.array([enc.ids], dtype=np.int64)
print(f"\nTokenized '{text}' → {enc.ids} (tokens: {enc.tokens})")

# Step 1: Embed tokens
embed_result = embed_sess.run(None, {"input_ids": input_ids})
text_embeds = embed_result[0]  # [1, seq_len, 1024]
print(f"Text embeddings shape: {text_embeds.shape}, dtype: {text_embeds.dtype}")

# For testing WITHOUT voice cloning, use zero condEmb
# (matches the user's all-zero prompt situation)
cond_len = 151
embed_dim = text_embeds.shape[2]
cond_emb = np.zeros((1, cond_len, embed_dim), dtype=np.float32)

# Concatenate [cond_emb, text_embeds]
combined = np.concatenate([cond_emb, text_embeds], axis=1).astype(np.float32)
total_len = combined.shape[1]
print(f"Combined embeddings: {combined.shape} (cond={cond_len} + text={text_embeds.shape[1]})")

# Step 2: Autoregressive generation
attention_mask = np.ones((1, total_len), dtype=np.int64)
position_ids = np.arange(total_len, dtype=np.int64).reshape(1, -1)

lm_inputs = {
    "inputs_embeds": combined,
    "attention_mask": attention_mask,
    "position_ids": position_ids,
}

# Empty KV cache
NUM_LAYERS = 24
NUM_HEADS = 16
HEAD_DIM = 64
for i in range(NUM_LAYERS):
    lm_inputs[f"past_key_values.{i}.key"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)
    lm_inputs[f"past_key_values.{i}.value"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)

generated = [START_SPEECH_TOKEN]
print(f"\nGenerating speech tokens (max {MAX_NEW_TOKENS})...")

for step in range(MAX_NEW_TOKENS):
    lm_result = lm_sess.run(None, lm_inputs)

    # Find logits output
    output_names = [o.name for o in lm_sess.get_outputs()]
    logits_idx = output_names.index("logits")
    logits = lm_result[logits_idx]

    # Greedy decode last position
    last_logits = logits[0, -1, :]
    token = int(np.argmax(last_logits))

    if step < 5 or step % 10 == 0:
        print(f"  Step {step}: token={token}, logit={last_logits[token]:.3f}")

    if token == STOP_SPEECH_TOKEN:
        print(f"  STOP at step {step}")
        break

    generated.append(token)

    # Embed next token for next step
    next_ids = np.array([[token]], dtype=np.int64)
    # For single token, Slice sends it through speech_emb
    embed_idx = min(token, 6560)  # Same ORT bug workaround
    next_embed = embed_sess.run(None, {"input_ids": np.array([[embed_idx]], dtype=np.int64)})[0]

    new_len = total_len + step + 1
    next_mask = np.ones((1, new_len), dtype=np.int64)
    next_pos = np.array([[new_len - 1]], dtype=np.int64)

    lm_inputs = {
        "inputs_embeds": next_embed,
        "attention_mask": next_mask,
        "position_ids": next_pos,
    }

    # KV cache from previous step
    for name, value in zip(output_names, lm_result):
        if name.startswith("present."):
            past_name = "past_key_values." + name[len("present."):]
            lm_inputs[past_name] = value

print(f"\nGenerated {len(generated)} tokens: {generated[:20]}{'...' if len(generated) > 20 else ''}")

# Step 3: Decode to audio
# Strip START/STOP, use zero prompt, add silence
decoder_tokens = generated
if decoder_tokens[0] == START_SPEECH_TOKEN:
    decoder_tokens = decoder_tokens[1:]
if decoder_tokens and decoder_tokens[-1] == STOP_SPEECH_TOKEN:
    decoder_tokens = decoder_tokens[:-1]

# Use zero prompt tokens (250) like in browser
prompt_tokens = [0] * 250
decoder_tokens = prompt_tokens + decoder_tokens + [SILENCE_TOKEN] * 3
print(f"Decoder input: {len(decoder_tokens)} tokens")

speech_tensor = np.array([decoder_tokens], dtype=np.int64)
# Use zero speaker embeddings
speaker_emb = np.zeros((1, 192), dtype=np.float32)
speaker_feat = np.zeros((1, 500, 80), dtype=np.float32)

print("Running conditional decoder...")
dec_result = dec_sess.run(None, {
    "speech_tokens": speech_tensor,
    "speaker_embeddings": speaker_emb,
    "speaker_features": speaker_feat,
})

# Check output
dec_output_names = [o.name for o in dec_sess.get_outputs()]
print(f"Decoder outputs: {dec_output_names}")
audio = dec_result[0].flatten().astype(np.float32)
print(f"Audio: {len(audio)} samples = {len(audio)/SAMPLE_RATE:.2f}s")
print(f"  max={np.max(np.abs(audio)):.6f}, rms={np.sqrt(np.mean(audio**2)):.6f}")
print(f"  nonzero={np.count_nonzero(np.abs(audio) > 0.001)}/{len(audio)}")

# Save to WAV
outfile = str(SCRIPT_DIR / "test_output.wav")
peak = np.max(np.abs(audio))
if peak > 0.001:
    audio_norm = (audio / peak * 0.9 * 32767).astype(np.int16)
else:
    audio_norm = (audio * 32767).astype(np.int16)

with wave.open(outfile, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(audio_norm.tobytes())

print(f"\nSaved to {outfile} — open it to check if there's speech!")
