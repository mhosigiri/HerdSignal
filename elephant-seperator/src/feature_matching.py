"""Reference-call feature matching scaffold."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def extract_features(audio: Any, sr: int = 44100) -> list[float]:
    """Extract comparison features for a separated or clean call."""
    raise NotImplementedError("Implement feature extraction for reference matching.")


@dataclass
class ElephantCallMatcher:
    """Placeholder PCA-based call matching interface."""

    n_components: int = 3

    def fit_reference(self, reference_audios: dict[str, Any], reference_labels: list[str], sr: int = 44100) -> None:
        """Fit the reference feature space."""
        raise NotImplementedError("Implement reference feature fitting.")

    def match(self, test_audio: Any, sr: int = 44100) -> dict[str, Any]:
        """Match a separated call against the clean reference set."""
        raise NotImplementedError("Implement similarity scoring.")

