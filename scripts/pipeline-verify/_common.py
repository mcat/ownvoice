"""Shared constants and paths for pipeline-verify scripts.

Keeps the three test_*.py scripts working regardless of CWD by resolving
MODEL_DIR from the script location rather than the invoking shell.
"""

from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MODEL_DIR = f"{REPO_ROOT}/public/models/chatterbox-turbo/"

# Chatterbox Turbo speech token IDs
START_SPEECH_TOKEN = 6561
STOP_SPEECH_TOKEN = 6562
SILENCE_TOKEN = 4299
SAMPLE_RATE = 24000
