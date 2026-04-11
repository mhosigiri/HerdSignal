"""Evaluation helpers for elephant separation experiments."""

from __future__ import annotations

from typing import Any


def evaluate_separation(reference_audio: Any, predicted_audio: Any, sr: int = 44100) -> dict[str, float]:
    """Return objective metrics for a predicted separation result."""
    raise NotImplementedError("Implement SDR/SIR/SAR or equivalent metrics.")

