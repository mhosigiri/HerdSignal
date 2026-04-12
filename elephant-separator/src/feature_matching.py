"""Reference-call feature matching and contamination scoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import librosa
import numpy as np
from librosa.feature import mfcc, rms, spectral_bandwidth, spectral_centroid, spectral_flatness, spectral_rolloff, zero_crossing_rate
from scipy.signal import welch
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

from .dataset import _list_audio_files, infer_call_family


def _ensure_audio_array(audio: Any) -> np.ndarray:
    array = np.asarray(audio, dtype=np.float32).flatten()
    if array.size == 0:
        raise ValueError("audio must not be empty")
    return array


def extract_features(audio: Any, sr: int = 44100) -> list[float]:
    """Extract low-frequency and timbral features for elephant-call matching."""
    samples = _ensure_audio_array(audio)

    centroid = spectral_centroid(y=samples, sr=sr)
    bandwidth = spectral_bandwidth(y=samples, sr=sr)
    rolloff = spectral_rolloff(y=samples, sr=sr, roll_percent=0.85)
    flatness = spectral_flatness(y=samples)
    zcr = zero_crossing_rate(samples)
    energy = rms(y=samples)
    mfcc_values = mfcc(y=samples, sr=sr, n_mfcc=8)

    freqs, power = welch(samples, fs=sr, nperseg=min(4096, len(samples)))
    dominant_frequency = float(freqs[np.argmax(power)]) if power.size else 0.0
    low_band = float(power[(freqs >= 8) & (freqs <= 150)].sum())
    mid_band = float(power[(freqs > 150) & (freqs <= 600)].sum())
    high_band = float(power[(freqs > 600) & (freqs <= 2000)].sum())
    total_power = low_band + mid_band + high_band + 1e-10

    features = [
        float(np.mean(centroid)),
        float(np.std(centroid)),
        float(np.mean(bandwidth)),
        float(np.std(bandwidth)),
        float(np.mean(rolloff)),
        float(np.mean(flatness)),
        float(np.std(flatness)),
        float(np.mean(zcr)),
        float(np.mean(energy)),
        dominant_frequency,
        low_band / total_power,
        mid_band / total_power,
        high_band / total_power,
        float(np.percentile(np.abs(samples), 95)),
    ]
    features.extend(float(np.mean(coeff)) for coeff in mfcc_values)
    features.extend(float(np.std(coeff)) for coeff in mfcc_values[:4])
    return features


def load_reference_directory(reference_dir: str | Path, sr: int = 44100) -> tuple[dict[str, np.ndarray], list[str]]:
    """Load clean reference samples from a directory."""
    reference_audios: dict[str, np.ndarray] = {}
    reference_labels: list[str] = []
    for path in _list_audio_files(reference_dir):
        audio, _ = librosa.load(str(path), sr=sr, mono=True)
        label = infer_call_family(path.stem, path.name)
        key = path.stem
        reference_audios[key] = np.asarray(audio, dtype=np.float32)
        reference_labels.append(label)
    return reference_audios, reference_labels


@dataclass
class ElephantCallMatcher:
    """Feature-based reference matcher for separated elephant calls."""

    scaler: StandardScaler = field(init=False, default_factory=StandardScaler)
    reference_features: np.ndarray | None = field(init=False, default=None)
    reference_keys: list[str] = field(init=False, default_factory=list)
    reference_labels: np.ndarray | None = field(init=False, default=None)
    reference_audios: dict[str, np.ndarray] = field(init=False, default_factory=dict)
    reference_flatness_mean: float = field(init=False, default=0.0)

    def fit_reference(self, reference_audios: dict[str, Any], reference_labels: list[str], sr: int = 44100) -> None:
        """Fit the feature space on clean reference calls."""
        if not reference_audios:
            raise ValueError("reference_audios must not be empty")
        if len(reference_audios) != len(reference_labels):
            raise ValueError("reference_labels must have the same length as reference_audios")

        features = []
        keys = list(reference_audios.keys())
        flatness_values: list[float] = []
        normalized_audios: dict[str, np.ndarray] = {}

        for key, label in zip(keys, reference_labels):
            audio = _ensure_audio_array(reference_audios[key])
            normalized_audios[key] = audio
            features.append(extract_features(audio, sr))
            flatness_values.append(float(np.mean(spectral_flatness(y=audio))))

        self.reference_audios = normalized_audios
        self.reference_features = np.asarray(features, dtype=np.float32)
        self.reference_keys = keys
        self.reference_labels = np.asarray(reference_labels)
        self.reference_flatness_mean = float(np.mean(flatness_values)) if flatness_values else 0.0

        self.scaler.fit(self.reference_features)

    def fit_reference_directory(self, reference_dir: str | Path, sr: int = 44100) -> None:
        """Convenience wrapper to fit from a directory of clean calls."""
        reference_audios, reference_labels = load_reference_directory(reference_dir, sr=sr)
        self.fit_reference(reference_audios, reference_labels, sr=sr)

    def match(self, test_audio: Any, sr: int = 44100) -> dict[str, Any]:
        """Compare a test call against the fitted reference library."""
        if self.reference_features is None or self.reference_labels is None:
            raise RuntimeError("reference library is not fitted")

        audio = _ensure_audio_array(test_audio)
        test_features = np.asarray(extract_features(audio, sr), dtype=np.float32)
        test_scaled = self.scaler.transform([test_features])
        ref_scaled = self.scaler.transform(self.reference_features)
        similarities = cosine_similarity(test_scaled, ref_scaled)[0]
        best_idx = int(np.argmax(similarities))
        projection = test_scaled[0, : min(3, test_scaled.shape[1])]

        flatness_value = float(np.mean(spectral_flatness(y=audio)))
        contamination_score = min(
            1.0,
            max(0.0, (flatness_value - self.reference_flatness_mean) / 0.25),
        )

        return {
            "similarity_scores": similarities,
            "best_match_idx": best_idx,
            "best_match_key": self.reference_keys[best_idx],
            "best_match_label": self.reference_labels[best_idx],
            "best_match_score": float(similarities[best_idx]),
            "feature_projection": projection,
            "contamination_score": contamination_score,
        }
