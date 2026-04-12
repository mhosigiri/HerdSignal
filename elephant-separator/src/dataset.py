"""Dataset and augmentation utilities for elephant-call separation."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import audiomentations
import librosa
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

from .layer1_preprocess import normalize_noise_type


AUDIO_EXTENSIONS = {".wav", ".flac", ".ogg", ".mp3", ".m4a"}
CALL_TYPE_KEYWORDS = ("rumble", "trumpet", "roar", "bark")


def infer_call_family(call_type: str | None, fallback_name: str | None = None) -> str:
    """Normalize call labels into a small stable family set."""
    tokens = []
    if call_type:
        tokens.append(str(call_type).strip().lower())
    if fallback_name:
        tokens.append(str(fallback_name).strip().lower())
    joined = " ".join(tokens)

    if "trumpet" in joined:
        return "trumpet"
    if "roar" in joined:
        return "roar"
    if "bark" in joined:
        return "bark"
    return "rumble"


def _list_audio_files(directory: str | Path) -> list[Path]:
    path = Path(directory)
    if not path.exists():
        return []
    return sorted(
        file_path for file_path in path.iterdir() if file_path.is_file() and file_path.suffix.lower() in AUDIO_EXTENSIONS
    )


def _load_audio_file(path: str | Path, sr: int) -> np.ndarray:
    audio, _ = librosa.load(str(path), sr=sr, mono=True)
    return np.asarray(audio, dtype=np.float32)


def load_annotations(annotations_csv: str | Path) -> pd.DataFrame:
    """Load and normalize the current annotations schema."""
    df = pd.read_csv(annotations_csv)
    column_map = {
        "Selection": "selection_id",
        "Sound_file": "filename",
        "Start_time": "start_time",
        "End_time": "end_time",
        "Call_type": "call_type",
    }
    missing = [column for column in column_map if column not in df.columns]
    if missing:
        raise ValueError(f"annotations file is missing required columns: {missing}")

    normalized = df.rename(columns=column_map).copy()
    normalized["selection_id"] = normalized["selection_id"].astype(str)
    normalized["filename"] = normalized["filename"].astype(str)
    normalized["start_time"] = normalized["start_time"].astype(float)
    normalized["end_time"] = normalized["end_time"].astype(float)
    normalized["call_type"] = normalized["call_type"].fillna("rumble").astype(str)
    normalized["call_family"] = normalized.apply(
        lambda row: infer_call_family(row["call_type"], row["filename"]),
        axis=1,
    )
    normalized["noise_type"] = normalized["filename"].map(lambda name: normalize_noise_type(None, name))
    normalized["duration_seconds"] = normalized["end_time"] - normalized["start_time"]
    normalized["annotation_id"] = normalized["filename"] + "::" + normalized["selection_id"]
    return normalized.sort_values(["filename", "start_time"]).reset_index(drop=True)


def build_reference_index(directory: str | Path) -> dict[str, list[Path]]:
    """Index reference samples by inferred call family."""
    index: dict[str, list[Path]] = {key: [] for key in CALL_TYPE_KEYWORDS}
    for path in _list_audio_files(directory):
        family = infer_call_family(path.stem)
        index.setdefault(family, []).append(path)
    return {key: value for key, value in index.items() if value}


def build_noise_index(directory: str | Path) -> dict[str, list[Path]]:
    """Index noise samples by inferred noise family."""
    index: dict[str, list[Path]] = {"airplane": [], "car": [], "generator": [], "unknown": []}
    for path in _list_audio_files(directory):
        family = normalize_noise_type(None, path.name)
        index.setdefault(family, []).append(path)
    return {key: value for key, value in index.items() if value}


@dataclass
class ElephantCallDataset(Dataset):
    """Annotated training/inference dataset over noisy field recordings."""

    annotations_csv: str
    recordings_dir: str
    sr: int = 44100
    segment_duration: float = 8.0
    augment: bool = True
    clean_samples_dir: str | None = None
    noise_samples_dir: str | None = None
    replicate_factor: int = 1
    random_state: int = 42
    annotations: pd.DataFrame = field(init=False)
    recording_paths: dict[str, Path] = field(init=False)
    clean_reference_index: dict[str, list[Path]] = field(init=False)
    noise_reference_index: dict[str, list[Path]] = field(init=False)
    _audio_cache: dict[str, np.ndarray] = field(init=False, default_factory=dict)
    _reference_cache: dict[str, np.ndarray] = field(init=False, default_factory=dict)
    _augmentor: audiomentations.Compose = field(init=False)

    def __post_init__(self) -> None:
        self.annotations = load_annotations(self.annotations_csv)
        recordings_root = Path(self.recordings_dir)
        self.recording_paths = {path.name: path for path in _list_audio_files(recordings_root)}
        missing_files = sorted(set(self.annotations["filename"]) - set(self.recording_paths))
        if missing_files:
            raise FileNotFoundError(f"missing recording files referenced by annotations: {missing_files[:5]}")

        clean_root = self.clean_samples_dir or str(Path(self.recordings_dir).parent / "clean_samples")
        noise_root = self.noise_samples_dir or str(Path(self.recordings_dir).parent / "noise_samples")
        self.clean_reference_index = build_reference_index(clean_root)
        self.noise_reference_index = build_noise_index(noise_root)

        self._augmentor = audiomentations.Compose(
            [
                audiomentations.AddGaussianNoise(min_amplitude=0.0005, max_amplitude=0.008, p=0.35),
                audiomentations.TimeStretch(min_rate=0.92, max_rate=1.08, p=0.25),
                audiomentations.Gain(min_gain_db=-6, max_gain_db=6, p=0.4),
                audiomentations.Shift(min_shift=-0.08, max_shift=0.08, shift_unit="fraction", p=0.25),
            ]
        )

    @property
    def segment_samples(self) -> int:
        return int(self.segment_duration * self.sr)

    def __len__(self) -> int:
        return len(self.annotations) * max(self.replicate_factor, 1)

    def _load_recording(self, filename: str) -> np.ndarray:
        if filename not in self._audio_cache:
            self._audio_cache[filename] = _load_audio_file(self.recording_paths[filename], self.sr)
        return self._audio_cache[filename].copy()

    def _load_reference_audio(self, path: Path) -> np.ndarray:
        cache_key = str(path.resolve())
        if cache_key not in self._reference_cache:
            self._reference_cache[cache_key] = _load_audio_file(path, self.sr)
        return self._reference_cache[cache_key].copy()

    def _select_reference_path(self, paths: list[Path], idx: int) -> Path | None:
        if not paths:
            return None
        return paths[idx % len(paths)]

    def _extract_segment(self, audio: np.ndarray, start_sample: int, end_sample: int) -> np.ndarray:
        segment = audio[start_sample:end_sample]
        if len(segment) >= self.segment_samples:
            return segment[: self.segment_samples].astype(np.float32, copy=False)
        pad_width = self.segment_samples - len(segment)
        return np.pad(segment, (0, pad_width)).astype(np.float32, copy=False)

    def _build_noise_reference(self, audio_segment: np.ndarray, call_mask: np.ndarray, noise_type: str, idx: int) -> np.ndarray:
        local_noise = audio_segment * (1.0 - call_mask)
        if np.max(np.abs(local_noise)) > 1e-6:
            return local_noise.astype(np.float32, copy=False)

        reference_path = self._select_reference_path(
            self.noise_reference_index.get(noise_type)
            or self.noise_reference_index.get("unknown", []),
            idx,
        )
        if reference_path is None:
            return np.zeros_like(audio_segment, dtype=np.float32)

        reference_audio = self._load_reference_audio(reference_path)
        if len(reference_audio) >= self.segment_samples:
            start = idx % max(len(reference_audio) - self.segment_samples + 1, 1)
            return reference_audio[start : start + self.segment_samples].astype(np.float32, copy=False)
        return np.pad(reference_audio, (0, self.segment_samples - len(reference_audio))).astype(np.float32, copy=False)

    def _build_clean_reference(self, call_family: str, idx: int) -> np.ndarray:
        reference_path = self._select_reference_path(self.clean_reference_index.get(call_family, []), idx)
        if reference_path is None:
            return np.zeros(self.segment_samples, dtype=np.float32)

        reference_audio = self._load_reference_audio(reference_path)
        if len(reference_audio) >= self.segment_samples:
            start = idx % max(len(reference_audio) - self.segment_samples + 1, 1)
            return reference_audio[start : start + self.segment_samples].astype(np.float32, copy=False)
        return np.pad(reference_audio, (0, self.segment_samples - len(reference_audio))).astype(np.float32, copy=False)

    def __getitem__(self, idx: int) -> dict[str, Any]:
        base_idx = idx % len(self.annotations)
        row = self.annotations.iloc[base_idx]
        audio = self._load_recording(row["filename"])

        call_center = ((row["start_time"] + row["end_time"]) / 2.0) * self.sr
        segment_start = int(max(0, call_center - self.segment_samples / 2))
        segment_end = min(len(audio), segment_start + self.segment_samples)
        segment_start = max(0, segment_end - self.segment_samples)

        audio_segment = self._extract_segment(audio, segment_start, segment_end)
        segment_start_time = segment_start / self.sr

        call_mask = np.zeros(self.segment_samples, dtype=np.float32)
        local_call_start = max(0, int((row["start_time"] - segment_start_time) * self.sr))
        local_call_end = min(self.segment_samples, int((row["end_time"] - segment_start_time) * self.sr))
        if local_call_end > local_call_start:
            call_mask[local_call_start:local_call_end] = 1.0

        clean_reference = self._build_clean_reference(row["call_family"], base_idx)
        noise_reference = self._build_noise_reference(audio_segment, call_mask, row["noise_type"], base_idx)

        if self.augment:
            audio_segment = self._augmentor(samples=audio_segment, sample_rate=self.sr).astype(np.float32, copy=False)

        return {
            "annotation_id": row["annotation_id"],
            "selection_id": row["selection_id"],
            "filename": row["filename"],
            "call_type": row["call_type"],
            "call_family": row["call_family"],
            "noise_type": row["noise_type"],
            "start_time": float(row["start_time"]),
            "end_time": float(row["end_time"]),
            "segment_start_time": float(segment_start_time),
            "segment_end_time": float(segment_start_time + self.segment_duration),
            "audio": torch.from_numpy(audio_segment).unsqueeze(0),
            "call_mask": torch.from_numpy(call_mask).unsqueeze(0),
            "noise_mask": torch.from_numpy(1.0 - call_mask).unsqueeze(0),
            "clean_reference": torch.from_numpy(clean_reference).unsqueeze(0),
            "noise_reference": torch.from_numpy(noise_reference).unsqueeze(0),
        }
