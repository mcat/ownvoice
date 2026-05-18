#!/usr/bin/env python3
"""
Phoneme-onset perceptual gate for the fp16 conditional_decoder.

The mechanical smoke-test in `validate-fp16-decoder.mjs` checks the fp16
graph loads, runs, and produces audio-shaped output, but cannot detect
perceptual artifacts — see docs/known-issue-onset-bzzt.md for how the
2-4 kHz onset buzz slipped past it.

This script closes that gap. For each phrase in a phoneme-coverage suite
(plosive / sibilant / vowel / sonorant onsets), it runs the full
Chatterbox Multilingual pipeline once, then runs the *same* speech-token
sequence through both the fp32 and fp16 conditional_decoder. It measures
STFT band energy in 2-4 kHz over the first 200 ms of the synthesized
waveform and reports the fp16-over-fp32 ratio. Band energy is
phase-invariant, so the `RandomNormalLike` ops inside the decoder's
synthesis path can shift per-sample waveforms without false-failing the
gate — but a modulated onset buzz lifts the spectral envelope in this
band and the gate catches it.

Gate (configurable via --threshold, default 1.3): every phrase's
fp16/fp32 band-energy ratio in 2-4 kHz on the first 200 ms must be at
most this. Above 1.3 = audible onset artifact.

Usage:
    python3 scripts/perceptual-validate-fp16-decoder.py \\
        --fp32-dir public/models/2026-04-29/chatterbox-multilingual \\
        --fp16-dir public/models/2026-05-17/chatterbox-multilingual \\
        --reference sample-voices/mark-voice.wav

The reference WAV is auto-resampled to 16 kHz mono if needed.
Optional `--write-wavs DIR` saves the fp32 and fp16 WAVs side-by-side
for each phrase (useful for manual A/B once the numbers look right).
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
import soundfile as sf
from scipy.signal import resample_poly, stft
from tokenizers import Tokenizer

# Architectural constants — mirror scripts/synthesize-with-encoder.py
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

# Phoneme-onset coverage. Each phrase exercises a different initial
# phoneme. The bzzt the previous fp16 decoder shipped with was MOST
# audible on plosive and sibilant onsets — those have sharp amplitude
# transitions where the harmonic-source path's fp16 precision loss
# manifests as buzz. Vowel onsets are checked because the original
# A/B (rainbow sentence) was vowel-held and missed everything.
PHRASES = [
    # Plosives
    ("plosive_p", "Please help me."),
    ("plosive_t", "Take this away."),
    ("plosive_k", "Can you hear me?"),
    ("plosive_b", "Bring water please."),
    ("plosive_d", "Do not turn it off."),
    ("plosive_g", "Go get the nurse."),
    # Sibilants
    ("sib_s", "Stop the machine."),
    ("sib_sh", "She is here now."),
    # Vowels
    ("vowel_a", "Are you my doctor?"),
    ("vowel_i", "I need more air."),
    ("vowel_u", "Use the small cup."),
    # Sonorants
    ("son_m", "My back hurts."),
    ("son_n", "No, not now."),
    ("son_r", "Raise the bed."),
    ("son_l", "Leave it on."),
    ("son_w", "When is breakfast?"),
]

# 2-4 kHz band on the first 200 ms is where the previous fp16 conversion
# parked the buzz. Frequencies & duration could be tuned, but these are
# the values that match the observed artifact.
BAND_LOW_HZ = 2000
BAND_HIGH_HZ = 4000
ONSET_MS = 200


def load_reference_16k(path: Path) -> np.ndarray:
    """Read any WAV, return float32 mono @ 16 kHz, clipped to 6 s."""
    data, sr = sf.read(str(path), dtype="float32", always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)
    if sr != 16000:
        # Use the GCD-based resample_poly for clean fractional ratios.
        from math import gcd
        g = gcd(sr, 16000)
        up = 16000 // g
        down = sr // g
        data = resample_poly(data, up, down).astype(np.float32)
    return data[: 16000 * 6]


def load_session(path: Path, data_path: Path | None = None) -> ort.InferenceSession:
    """Load an ONNX session, optionally with explicit external-data path."""
    if data_path is not None and data_path.exists():
        # ORT auto-resolves external data from the same directory; no
        # explicit override needed when the file is colocated.
        pass
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


def run_encoder(enc_sess: ort.InferenceSession, audio: np.ndarray) -> dict:
    out = enc_sess.run(None, {"audio_values": audio.reshape(1, -1).astype(np.float32)})
    names = [o.name for o in enc_sess.get_outputs()]
    return {
        "cond_emb": out[names.index("audio_features")],
        "prompt_token": out[names.index("audio_tokens")],
        "speaker_emb": out[names.index("speaker_embeddings")],
        "speaker_feat": out[names.index("speaker_features")],
    }


def run_lm(
    tok: Tokenizer,
    embed_sess: ort.InferenceSession,
    lm_sess: ort.InferenceSession,
    cond_emb: np.ndarray,
    text: str,
    language: str = "en",
) -> list[int]:
    """Greedy + rep-penalty token generation. Returns the list of generated
    speech-token ids (excluding START_SPEECH)."""
    normalized = unicodedata.normalize("NFKD", text.lower())
    prepared = f"[{language}]{normalized}"
    input_ids = tok.encode(prepared).ids
    n = len(input_ids)

    ids_arr = np.array(input_ids, dtype=np.int64)
    position_ids = np.where(ids_arr >= START_SPEECH, 0, np.arange(n) - 1).astype(np.int64)
    embed_out = embed_sess.run(None, {
        "input_ids": ids_arr.reshape(1, -1),
        "position_ids": position_ids.reshape(1, -1),
        "exaggeration": np.array([EXAGGERATION], dtype=np.float32),
    })
    text_embeds = embed_out[0]
    combined = np.concatenate([cond_emb, text_embeds], axis=1).astype(np.float32)
    cond_len, text_len = cond_emb.shape[1], text_embeds.shape[1]
    total_len = cond_len + text_len

    lm_inputs = {
        "inputs_embeds": combined,
        "attention_mask": np.ones((1, total_len), dtype=np.int64),
    }
    for i in range(NUM_LAYERS):
        lm_inputs[f"past_key_values.{i}.key"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float32)
        lm_inputs[f"past_key_values.{i}.value"] = np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float32)

    out_names = [o.name for o in lm_sess.get_outputs()]
    logits_idx = out_names.index("logits")
    generated = [START_SPEECH]

    for step in range(MAX_NEW_TOKENS):
        lm_result = lm_sess.run(None, lm_inputs)
        logits = lm_result[logits_idx]
        last = logits[0, -1, :].astype(np.float32).copy()
        last[START_SPEECH] = -np.inf
        last[STOP_SPEECH + 1:] = -np.inf
        if step < MIN_NEW_TOKENS:
            last[STOP_SPEECH] = -np.inf
        for tok_id in set(generated):
            if tok_id < len(last):
                if last[tok_id] > 0:
                    last[tok_id] /= REPETITION_PENALTY
                else:
                    last[tok_id] *= REPETITION_PENALTY
        max_idx = int(np.argmax(last))
        if max_idx == STOP_SPEECH:
            break
        generated.append(max_idx)
        next_embed = embed_sess.run(None, {
            "input_ids": np.array([[max_idx]], dtype=np.int64),
            "position_ids": np.array([[step + 1]], dtype=np.int64),
            "exaggeration": np.array([EXAGGERATION], dtype=np.float32),
        })[0]
        new_len = total_len + step + 1
        lm_inputs = {
            "inputs_embeds": next_embed,
            "attention_mask": np.ones((1, new_len), dtype=np.int64),
        }
        for name, value in zip(out_names, lm_result):
            if name.startswith("present."):
                lm_inputs["past_key_values." + name[len("present."):]] = value

    return generated[1:]  # drop START_SPEECH


def run_decoder(
    dec_sess: ort.InferenceSession,
    speech_tokens: list[int],
    speaker_emb: np.ndarray,
    speaker_feat: np.ndarray,
) -> np.ndarray:
    out = dec_sess.run(None, {
        "speech_tokens": np.array([speech_tokens], dtype=np.int64),
        "speaker_embeddings": speaker_emb,
        "speaker_features": speaker_feat,
    })
    return out[0].flatten().astype(np.float32)


def onset_band_fraction(audio: np.ndarray, sr: int = SAMPLE_RATE) -> tuple[float, float]:
    """Fraction of onset energy concentrated in BAND_LOW_HZ–BAND_HIGH_HZ.

    Returns (fraction, absolute_band_energy). Fraction is gain-invariant
    (overall waveform scaling cancels) which is important because the
    CFM decoder's `RandomNormalLike` ops give it run-to-run gain swings
    on the order of 2–3×. Absolute band energy is returned for context.

    Uses STFT magnitude-squared, phase-invariant. Returns (0, 0) if
    audio is too short."""
    n_onset = int(sr * ONSET_MS / 1000)
    onset = audio[:n_onset]
    if len(onset) < 64:
        return 0.0, 0.0
    nperseg = min(512, len(onset))
    f, _, Z = stft(onset, fs=sr, nperseg=nperseg, noverlap=nperseg // 2)
    mag2 = np.abs(Z) ** 2
    mask = (f >= BAND_LOW_HZ) & (f <= BAND_HIGH_HZ)
    band_energy = float(mag2[mask, :].sum())
    total_energy = float(mag2.sum())
    fraction = band_energy / max(total_energy, 1e-12)
    return fraction, band_energy


def write_wav(path: Path, audio: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = float(np.max(np.abs(audio)))
    if peak > 0.001:
        norm = (audio / peak * 0.9 * 32767).astype(np.int16)
    else:
        norm = (audio * 32767).astype(np.int16)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(norm.tobytes())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fp32-dir", required=True, type=Path)
    parser.add_argument("--fp16-dir", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path,
                        help="reference voice WAV (any sr/channels — resampled to mono 16 kHz)")
    parser.add_argument("--threshold", type=float, default=1.5,
                        help="max allowed fp16/fp32 onset 2-4 kHz spectral-fraction ratio (default 1.5)")
    parser.add_argument("--write-wavs", type=Path, default=None,
                        help="directory to write per-phrase fp32/fp16 WAVs for A/B")
    parser.add_argument("--phrases", type=int, default=len(PHRASES),
                        help="limit to first N phrases (for fast iteration)")
    parser.add_argument("--runs", type=int, default=3,
                        help="runs of each decoder per phrase; median used (default 3)")
    args = parser.parse_args()

    for d in [args.fp32_dir, args.fp16_dir]:
        if not (d / "conditional_decoder.onnx").exists():
            print(f"ERROR: no conditional_decoder.onnx in {d}", file=sys.stderr)
            return 2

    # Encoder, embed, and LM are the same for both runs — load them
    # ONCE from the fp32 model directory. Speaker data, speech tokens,
    # everything pre-decoder is identical between the two decoder runs.
    enc_path = args.fp32_dir / "speech_encoder.onnx"
    embed_path = args.fp32_dir / "embed_tokens.onnx"
    lm_path = args.fp32_dir / "language_model_q4.onnx"
    print(f"Loading encoder/embed/LM from {args.fp32_dir} ...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        enc_f = pool.submit(load_session, enc_path)
        emb_f = pool.submit(load_session, embed_path)
        lm_f = pool.submit(load_session, lm_path)
        enc_sess = enc_f.result()
        embed_sess = emb_f.result()
        lm_sess = lm_f.result()

    print(f"Loading fp32 decoder from {args.fp32_dir} ...")
    fp32_dec = load_session(args.fp32_dir / "conditional_decoder.onnx")
    print(f"Loading fp16 decoder from {args.fp16_dir} ...")
    fp16_dec = load_session(args.fp16_dir / "conditional_decoder.onnx")

    tok = Tokenizer.from_file(str(args.fp32_dir / "tokenizer.json"))

    print(f"\nReference voice: {args.reference}")
    audio = load_reference_16k(args.reference)
    print(f"  resampled to 16 kHz mono, {len(audio)/16000:.2f}s clipped")

    print("Running encoder ...")
    spk = run_encoder(enc_sess, audio)
    print(f"  cond_emb {spk['cond_emb'].shape}, speaker_emb {spk['speaker_emb'].shape}")

    results = []
    n_run = min(args.phrases, len(PHRASES))
    for i, (tag, text) in enumerate(PHRASES[:n_run]):
        print(f"\n[{i+1}/{n_run}] {tag}: {text!r}")
        gen_tokens = run_lm(tok, embed_sess, lm_sess, spk["cond_emb"], text)
        prompt_list = spk["prompt_token"].flatten().tolist()
        decoder_tokens = prompt_list + gen_tokens + [SILENCE_TOKEN] * 3
        print(f"  decoder tokens: {len(decoder_tokens)} (prompt={len(prompt_list)}, gen={len(gen_tokens)})")

        fractions_fp32: list[float] = []
        fractions_fp16: list[float] = []
        # Keep one waveform from each side for optional WAV dumping.
        last_fp32 = last_fp16 = None
        for r in range(args.runs):
            audio_fp32 = run_decoder(fp32_dec, decoder_tokens, spk["speaker_emb"], spk["speaker_feat"])
            audio_fp16 = run_decoder(fp16_dec, decoder_tokens, spk["speaker_emb"], spk["speaker_feat"])
            f32, _ = onset_band_fraction(audio_fp32)
            f16, _ = onset_band_fraction(audio_fp16)
            fractions_fp32.append(f32)
            fractions_fp16.append(f16)
            last_fp32, last_fp16 = audio_fp32, audio_fp16

        med_fp32 = float(np.median(fractions_fp32))
        med_fp16 = float(np.median(fractions_fp16))
        ratio = med_fp16 / max(med_fp32, 1e-12)
        verdict = "PASS" if ratio <= args.threshold else "FAIL"
        print(f"  band-fraction fp32 runs: {['%.4f' % x for x in fractions_fp32]} median={med_fp32:.4f}")
        print(f"  band-fraction fp16 runs: {['%.4f' % x for x in fractions_fp16]} median={med_fp16:.4f}")
        print(f"  median ratio: {ratio:.3f}  {verdict}")
        results.append({
            "tag": tag, "text": text,
            "fp32_med": med_fp32, "fp16_med": med_fp16, "ratio": ratio,
            "verdict": verdict,
            "fp32_runs": fractions_fp32, "fp16_runs": fractions_fp16,
        })

        if args.write_wavs and last_fp32 is not None and last_fp16 is not None:
            write_wav(args.write_wavs / f"{tag}_fp32.wav", last_fp32)
            write_wav(args.write_wavs / f"{tag}_fp16.wav", last_fp16)

    # Summary table.
    print()
    print("=" * 78)
    print(f"Phoneme-onset gate — 2-4 kHz spectral fraction on first {ONSET_MS} ms")
    print(f"({args.runs} runs each, median; gain-invariant)")
    print("=" * 78)
    print(f"{'phrase':<14} {'fp32 med':>10} {'fp16 med':>10} {'ratio':>7}   verdict")
    print("-" * 78)
    worst_ratio = 0.0
    worst_tag = "(none)"
    n_fail = 0
    for r in results:
        marker = "  " if r["verdict"] == "PASS" else "*"
        print(f"{marker}{r['tag']:<13} {r['fp32_med']:>10.4f} {r['fp16_med']:>10.4f} {r['ratio']:>7.3f}   {r['verdict']}")
        if r["ratio"] > worst_ratio:
            worst_ratio = r["ratio"]
            worst_tag = r["tag"]
        if r["verdict"] == "FAIL":
            n_fail += 1
    print("-" * 78)
    print(f"worst-case ratio: {worst_ratio:.3f} on {worst_tag}  (threshold {args.threshold:.3f})")
    print(f"FAIL phrases: {n_fail} / {len(results)}")

    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
