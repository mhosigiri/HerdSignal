"""Layer 1 preprocessing entry points."""

from __future__ import annotations

from typing import Any


def load_recording(filepath: str, target_sr: int = 44100) -> tuple[Any, int]:
    """Load and resample a mono recording."""
    raise NotImplementedError("Implement audio loading with librosa/soundfile.")


def compute_stft(
    audio: Any,
    sr: int = 44100,
    n_fft: int = 16384,
    hop_length: int = 512,
) -> tuple[Any, Any, Any]:
    """Compute the high-resolution STFT used by the pipeline."""
    raise NotImplementedError("Implement STFT generation for low-frequency analysis.")


def preprocess(
    audio: Any,
    sr: int,
    noise_type: str,
    call_start_time: float,
    call_end_time: float,
    n_fft: int = 16384,
    hop_length: int = 512,
) -> tuple[Any, Any, Any]:
    """Run the noise-aware preprocessing stage before source separation."""
    raise NotImplementedError("Implement the full Layer 1 preprocessing flow.")

