"""Evaluation helpers for elephant separation experiments."""

from __future__ import annotations

import numpy as np


def _align_signals(reference_audio: np.ndarray, predicted_audio: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    length = min(len(reference_audio), len(predicted_audio))
    if length == 0:
        raise ValueError("reference_audio and predicted_audio must not be empty")
    return (
        np.asarray(reference_audio[:length], dtype=np.float32),
        np.asarray(predicted_audio[:length], dtype=np.float32),
    )


def scale_invariant_sdr(reference_audio: np.ndarray, predicted_audio: np.ndarray) -> float:
    """Compute SI-SDR for a single reference/prediction pair."""
    reference, predicted = _align_signals(reference_audio, predicted_audio)
    reference = reference - np.mean(reference)
    predicted = predicted - np.mean(predicted)

    reference_energy = float(np.dot(reference, reference)) + 1e-10
    projection = (np.dot(predicted, reference) / reference_energy) * reference
    noise = predicted - projection

    signal_power = float(np.dot(projection, projection)) + 1e-10
    noise_power = float(np.dot(noise, noise)) + 1e-10
    return 10.0 * np.log10(signal_power / noise_power)


def spectral_convergence(reference_audio: np.ndarray, predicted_audio: np.ndarray) -> float:
    """Compute a simple spectral convergence score in the time domain."""
    reference, predicted = _align_signals(reference_audio, predicted_audio)
    numerator = np.linalg.norm(reference - predicted)
    denominator = np.linalg.norm(reference) + 1e-10
    return float(numerator / denominator)


def evaluate_separation(reference_audio: np.ndarray, predicted_audio: np.ndarray, sr: int = 44100) -> dict[str, float]:
    """Return objective baseline metrics for a predicted separation result."""
    reference, predicted = _align_signals(reference_audio, predicted_audio)
    residual = reference - predicted
    mse = float(np.mean(residual**2))
    rmse = float(np.sqrt(mse))
    return {
        "sample_rate": float(sr),
        "mse": mse,
        "rmse": rmse,
        "si_sdr": float(scale_invariant_sdr(reference, predicted)),
        "spectral_convergence": float(spectral_convergence(reference, predicted)),
    }
