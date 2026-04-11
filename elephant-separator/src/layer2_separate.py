"""Layer 2 separation strategies."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class NMFSeparator:
    """Placeholder NMF separator configuration."""

    n_components: int = 3
    max_iter: int = 1000
    random_state: int = 42
    metadata: dict[str, Any] = field(default_factory=dict)

    def separate(
        self,
        zxx: Any,
        sr: int,
        call_start_time: float,
        call_end_time: float,
        hop_length: int = 512,
    ) -> tuple[Any, Any, dict[str, Any]]:
        """Separate an elephant source from a mixed STFT."""
        raise NotImplementedError("Implement NMF-based source separation.")

