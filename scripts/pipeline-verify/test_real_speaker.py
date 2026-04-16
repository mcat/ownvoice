"""Test pipeline with REAL speaker data exported from the browser."""

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
import wave, json

from _common import (
    SCRIPT_DIR, MODEL_DIR,
    START_SPEECH_TOKEN, STOP_SPEECH_TOKEN, SILENCE_TOKEN, SAMPLE_RATE,
)

MAX_NEW_TOKENS = 100

# Load real speaker data
print("Loading real speaker data...")
with open("/Users/mark/Downloads/speaker_data.json") as f:
    sd = json.load(f)

cond_emb = np.array(sd["condEmb"], dtype=np.float32).reshape(sd["condEmbShape"])
prompt_token = np.array(sd["promptToken"], dtype=np.int64).reshape(sd["promptTokenShape"])
speaker_emb = np.array(sd["speakerEmbeddings"], dtype=np.float32).reshape(sd["speakerEmbeddingsShape"])
speaker_feat = np.array(sd["speakerFeatures"], dtype=np.float32).reshape(sd["speakerFeaturesShape"])

print(f"  condEmb: {cond_emb.shape}, nonzero={np.count_nonzero(cond_emb)}/{cond_emb.size}")
print(f"  promptToken: {prompt_token.shape}, nonzero={np.count_nonzero(prompt_token)}/{prompt_token.size}")
print(f"  speakerEmb: {speaker_emb.shape}, nonzero={np.count_nonzero(speaker_emb)}/{speaker_emb.size}")
print(f"  speakerFeat: {speaker_feat.shape}, nonzero={np.count_nonzero(speaker_feat)}/{speaker_feat.size}")

# Load models
print("\nLoading models...")
tok = Tokenizer.from_file(MODEL_DIR + "tokenizer.json")
embed_sess = ort.InferenceSession(MODEL_DIR + "embed_tokens_q4f16.onnx", providers=["CPUExecutionProvider"])
lm_sess = ort.InferenceSession(MODEL_DIR + "language_model_q4f16.onnx", providers=["CPUExecutionProvider"])
dec_sess = ort.InferenceSession(MODEL_DIR + "conditional_decoder_q4f16.onnx", providers=["CPUExecutionProvider"])

# Tokenize
text = "Yes"
enc = tok.encode(text)
input_ids = np.array([enc.ids], dtype=np.int64)
print(f"Tokenized '{text}' → {enc.ids}")

# Embed text
text_embeds = embed_sess.run(None, {"input_ids": input_ids})[0]
print(f"Text embeds: {text_embeds.shape}")

# Use REAL condEmb
combined = np.concatenate([cond_emb, text_embeds], axis=1).astype(np.float32)
total_len = combined.shape[1]
print(f"Combined: {combined.shape} (cond={cond_emb.shape[1]} + text={text_embeds.shape[1]})")

# LM generation
lm_inputs = {
    "inputs_embeds": combined,
    "attention_mask": np.ones((1, total_len), dtype=np.int64),
    "position_ids": np.arange(total_len, dtype=np.int64).reshape(1, -1),
}
NUM_LAYERS, NUM_HEADS, HEAD_DIM = 24, 16, 64
for i in range(NUM_LAYERS):
    lm_inputs[f"past_key_values.{i}.key"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)
    lm_inputs[f"past_key_values.{i}.value"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float16)

generated = [START_SPEECH_TOKEN]
output_names = [o.name for o in lm_sess.get_outputs()]

print(f"\nGenerating (max {MAX_NEW_TOKENS})...")
for step in range(MAX_NEW_TOKENS):
    lm_result = lm_sess.run(None, lm_inputs)
    logits = lm_result[output_names.index("logits")]
    last_logits = logits[0, -1, :]
    token = int(np.argmax(last_logits))

    if step < 10 or step % 20 == 0:
        # Show top-3 tokens
        top3 = np.argsort(last_logits)[-3:][::-1]
        print(f"  Step {step}: token={token} (top3: {list(top3)}, logits: {[f'{last_logits[t]:.2f}' for t in top3]})")

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

print(f"\nGenerated {len(generated)} tokens")
print(f"Unique: {sorted(set(generated))}")

# Decode with REAL speaker data
prompt_tokens_list = prompt_token.flatten().tolist()
decoder_tokens = prompt_tokens_list + generated[1:] + [SILENCE_TOKEN]*3
print(f"\nDecoder: {len(decoder_tokens)} tokens (prompt={len(prompt_tokens_list)}, gen={len(generated)-1}, silence=3)")

dec_result = dec_sess.run(None, {
    "speech_tokens": np.array([decoder_tokens], dtype=np.int64),
    "speaker_embeddings": speaker_emb,
    "speaker_features": speaker_feat,
})

audio = dec_result[0].flatten().astype(np.float32)
peak = np.max(np.abs(audio))
rms = np.sqrt(np.mean(audio**2))
nonzero = np.count_nonzero(np.abs(audio) > 0.001)
print(f"Audio: {len(audio)} samples = {len(audio)/SAMPLE_RATE:.2f}s")
print(f"  peak={peak:.6f}, rms={rms:.6f}, nonzero={nonzero}/{len(audio)}")

# Save normalized
fname = str(SCRIPT_DIR / "test_output_real_speaker.wav")
if peak > 0.001:
    norm = (audio / peak * 0.9 * 32767).astype(np.int16)
else:
    norm = (audio * 32767).astype(np.int16)
with wave.open(fname, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(norm.tobytes())
print(f"Saved: {fname}")
print("\nOpen test_output_real_speaker.wav and listen!")
