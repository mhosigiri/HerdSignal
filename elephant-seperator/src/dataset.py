"""Dataset and augmentation scaffold."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ElephantCallDataset:
    """Placeholder dataset wrapper for annotated training segments."""

    annotations_csv: str
    recordings_dir: str
    sr: int = 44100
    segment_duration: float = 8.0
    augment: bool = True

    def __len__(self) -> int:
        raise NotImplementedError("Implement dataset length logic.")

    def __getitem__(self, idx: int):
        raise NotImplementedError("Implement dataset loading and augmentation.")

