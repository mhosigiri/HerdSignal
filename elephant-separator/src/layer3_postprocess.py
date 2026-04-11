"""Layer 3 cleanup and reconstruction."""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt, sosfiltfilt


def _safe_sos_filter(sos: np.ndarray, audio: np.ndarray) -> np.ndarray:
    try:
        return sosfiltfilt(sos, audio)
    except ValueError:
        return sosfilt(sos, audio)


def postprocess(audio: np.ndarray, sr: int = 44100, peak_target: float = 0.99) -> np.ndarray:
    """Apply a final high-pass cleanup and peak normalization."""
    processed = np.asarray(audio, dtype=np.float32)
    sos = butter(2, 5.0, btype="highpass", fs=sr, output="sos")
    processed = _safe_sos_filter(sos, processed)

    peak = float(np.max(np.abs(processed))) if processed.size else 0.0
    if peak > 0:
        processed = processed * (peak_target / peak)
    return processed.astype(np.float32, copy=False)
