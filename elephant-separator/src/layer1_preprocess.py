"""Layer 1 preprocessing entry points."""

from __future__ import annotations

from typing import Any

import numpy as np
import soundfile as sf
import librosa
from scipy.signal import butter, filtfilt, iirnotch, sosfilt, sosfiltfilt, stft


ArrayLike = np.ndarray


def load_recording(filepath: str, target_sr: int = 44100) -> tuple[ArrayLike, int]:
    """Load a recording as mono audio at the target sample rate."""
    try:
        audio, sr = sf.read(filepath, always_2d=False)
        audio = np.asarray(audio, dtype=np.float32)

        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        if sr != target_sr:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            sr = target_sr
    except Exception:  # noqa: BLE001
        audio, sr = librosa.load(filepath, sr=target_sr, mono=True)
        audio = np.asarray(audio, dtype=np.float32)

    return np.asarray(audio, dtype=np.float32), sr


def compute_stft(
    audio: ArrayLike,
    sr: int = 44100,
    n_fft: int = 16384,
    hop_length: int = 512,
) -> tuple[ArrayLike, ArrayLike, ArrayLike]:
    """Compute a high-resolution STFT suitable for low-frequency elephant calls."""
    if audio.ndim != 1:
        raise ValueError("audio must be a 1D mono signal")
    if hop_length <= 0 or hop_length >= n_fft:
        raise ValueError("hop_length must be positive and smaller than n_fft")

    frequencies, times, zxx = stft(
        audio,
        fs=sr,
        nperseg=n_fft,
        noverlap=n_fft - hop_length,
        boundary="zeros",
        padded=True,
    )
    return frequencies, times, zxx


def stft_to_spectrogram(zxx: ArrayLike) -> ArrayLike:
    """Convert a complex STFT to a magnitude spectrogram."""
    return np.abs(zxx)


def stft_to_power_spectrogram(zxx: ArrayLike) -> ArrayLike:
    """Convert a complex STFT to a power spectrogram."""
    return np.abs(zxx) ** 2


def normalize_noise_type(noise_type: str | None, source_name: str | None = None) -> str:
    """Normalize the incoming noise type or infer it from a file name."""
    tokens = []
    if noise_type:
        tokens.append(str(noise_type).strip().lower())
    if source_name:
        tokens.append(str(source_name).strip().lower())
    joined = " ".join(tokens)

    if "generator" in joined:
        return "generator"
    if "airplane" in joined or "plane" in joined or "aircraft" in joined:
        return "airplane"
    if "car" in joined or "vehicle" in joined or "truck" in joined:
        return "car"
    return "unknown"


def _safe_sos_filter(sos: ArrayLike, audio: ArrayLike) -> ArrayLike:
    try:
        return sosfiltfilt(sos, audio)
    except ValueError:
        return sosfilt(sos, audio)


def _safe_ba_filter(b: ArrayLike, a: ArrayLike, audio: ArrayLike) -> ArrayLike:
    try:
        return filtfilt(b, a, audio)
    except ValueError:
        return audio


def remove_subsonic_rumble(audio: ArrayLike, sr: int = 44100, cutoff_hz: float = 5.0) -> ArrayLike:
    """Remove DC and subsonic energy that does not help elephant-call separation."""
    sos = butter(2, cutoff_hz, btype="highpass", fs=sr, output="sos")
    return _safe_sos_filter(sos, audio)


def remove_generator_harmonics(
    audio: ArrayLike,
    sr: int = 44100,
    fundamental: float = 50.0,
    num_harmonics: int = 10,
    q_factor: float = 100.0,
) -> ArrayLike:
    """Apply narrow notch filters at the generator fundamental and harmonics."""
    filtered = np.asarray(audio, dtype=np.float32).copy()

    for harmonic in range(1, num_harmonics + 1):
        freq = fundamental * harmonic
        if freq >= sr / 2:
            break
        b, a = iirnotch(freq, q_factor, fs=sr)
        filtered = _safe_ba_filter(b, a, filtered).astype(np.float32, copy=False)

    return filtered


def spectral_subtraction(
    zxx: ArrayLike,
    noise_start_frame: int,
    noise_end_frame: int,
    alpha: float = 1.5,
    beta: float = 0.01,
) -> ArrayLike:
    """Reduce stationary noise by subtracting a noise-only magnitude profile."""
    magnitude = np.abs(zxx)
    phase = np.angle(zxx)

    start = max(0, noise_start_frame)
    end = min(zxx.shape[1], noise_end_frame)
    if end <= start:
        return zxx

    noise_mean = np.mean(magnitude[:, start:end], axis=1, keepdims=True)
    cleaned_magnitude = magnitude - alpha * noise_mean
    spectral_floor = beta * noise_mean
    cleaned_magnitude = np.maximum(cleaned_magnitude, spectral_floor)

    return cleaned_magnitude * np.exp(1j * phase)


def car_noise_preemphasis(audio: ArrayLike, sr: int = 44100) -> ArrayLike:
    """Gently reduce low-end vehicle rumble while preserving elephant fundamentals."""
    sos = butter(2, 8.0, btype="highpass", fs=sr, output="sos")
    return _safe_sos_filter(sos, audio)


def preprocess(
    audio: ArrayLike,
    sr: int,
    noise_type: str | None,
    call_start_time: float,
    call_end_time: float,
    n_fft: int = 16384,
    hop_length: int = 512,
    source_name: str | None = None,
) -> tuple[ArrayLike, ArrayLike, ArrayLike]:
    """Run the first-pass noise-aware preprocessing pipeline."""
    normalized_noise = normalize_noise_type(noise_type, source_name=source_name)
    processed_audio = np.asarray(audio, dtype=np.float32)
    processed_audio = remove_subsonic_rumble(processed_audio, sr=sr)

    if normalized_noise == "generator":
        processed_audio = remove_generator_harmonics(processed_audio, sr=sr)
    elif normalized_noise == "car":
        processed_audio = car_noise_preemphasis(processed_audio, sr=sr)

    frequencies, times, zxx = compute_stft(
        processed_audio,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
    )

    if normalized_noise == "airplane":
        call_start_frame = max(0, int(call_start_time * sr / hop_length))
        noise_window_frames = max(1, int(sr / hop_length))
        noise_start_frame = max(0, call_start_frame - noise_window_frames)
        noise_end_frame = call_start_frame
        zxx = spectral_subtraction(zxx, noise_start_frame, noise_end_frame)

    return frequencies, times, zxx
