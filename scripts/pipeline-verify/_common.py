"""Shared constants, paths, and model loaders for pipeline-verify scripts.

Keeps the three test_*.py scripts working regardless of CWD by resolving
MODEL_DIR from the script location rather than the invoking shell.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import onnxruntime as ort

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MODEL_DIR = f"{REPO_ROOT}/public/models/chatterbox-turbo/"

# Chatterbox Turbo speech token IDs
START_SPEECH_TOKEN = 6561
STOP_SPEECH_TOKEN = 6562
SILENCE_TOKEN = 4299
SAMPLE_RATE = 24000


def _load_session(model_file: str) -> ort.InferenceSession:
    return ort.InferenceSession(
        MODEL_DIR + model_file,
        providers=["CPUExecutionProvider"],
    )


def load_chatterbox_sessions() -> tuple[
    ort.InferenceSession, ort.InferenceSession, ort.InferenceSession
]:
    """Load embed_tokens, language_model, and conditional_decoder concurrently.

    Each model is ~100-500 MB; loading in parallel overlaps disk I/O and
    ONNX graph initialization, cutting cold-start roughly in half on the
    debugging laptop (the ONNX Runtime call itself releases the GIL).
    """
    with ThreadPoolExecutor(max_workers=3) as pool:
        embed_f = pool.submit(_load_session, "embed_tokens_q4f16.onnx")
        lm_f = pool.submit(_load_session, "language_model_q4f16.onnx")
        dec_f = pool.submit(_load_session, "conditional_decoder_q4f16.onnx")
        return embed_f.result(), lm_f.result(), dec_f.result()
