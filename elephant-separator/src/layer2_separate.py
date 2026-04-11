"""Layer 2 separation strategies."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
from scipy.signal import istft
from sklearn.decomposition import NMF


ArrayLike = np.ndarray


@dataclass
class NMFSeparator:
    """Classical NMF baseline for elephant-call separation."""

    n_components: int = 3
    max_iter: int = 1000
    random_state: int = 42
    beta_loss: str = "frobenius"
    solver: str = "mu"
    init: str = "nndsvda"
    metadata: dict[str, Any] = field(default_factory=dict)

    def _build_model(self) -> NMF:
        return NMF(
            n_components=self.n_components,
            init=self.init,
            max_iter=self.max_iter,
            random_state=self.random_state,
            beta_loss=self.beta_loss,
            solver=self.solver,
        )

    def separate(
        self,
        zxx: ArrayLike,
        sr: int,
        call_start_time: float,
        call_end_time: float,
        hop_length: int = 512,
    ) -> tuple[ArrayLike, ArrayLike, dict[str, Any]]:
        """Separate an elephant source from a mixed STFT with a soft NMF mask."""
        if zxx.ndim != 2:
            raise ValueError("zxx must be a 2D complex STFT matrix")

        power_spectrogram = np.abs(zxx) ** 2 + 1e-10
        model = self._build_model()
        w = model.fit_transform(power_spectrogram)
        h = model.components_
        approximation = np.maximum(w @ h, 1e-10)

        call_start_frame = max(0, int(call_start_time * sr / hop_length))
        call_end_frame = min(power_spectrogram.shape[1], int(call_end_time * sr / hop_length))
        outside_mask = np.ones(power_spectrogram.shape[1], dtype=bool)
        outside_mask[call_start_frame:call_end_frame] = False

        activation_ratios: list[float] = []
        for idx in range(self.n_components):
            during = h[idx, call_start_frame:call_end_frame]
            outside = h[idx, outside_mask]
            during_energy = float(np.mean(during)) if during.size else 0.0
            outside_energy = float(np.mean(outside)) if outside.size else 1e-10
            activation_ratios.append((during_energy + 1e-10) / (outside_energy + 1e-10))

        elephant_idx = int(np.argmax(activation_ratios))
        elephant_component = w[:, elephant_idx : elephant_idx + 1] @ h[elephant_idx : elephant_idx + 1, :]
        soft_mask = np.clip(elephant_component / approximation, 0.0, 1.0)
        elephant_zxx = zxx * soft_mask

        n_fft = max(2, (zxx.shape[0] - 1) * 2)
        _, elephant_audio = istft(
            elephant_zxx,
            fs=sr,
            nperseg=n_fft,
            noverlap=n_fft - hop_length,
            input_onesided=True,
        )
        elephant_audio = np.asarray(elephant_audio, dtype=np.float32)

        component_info = {
            "elephant_idx": elephant_idx,
            "activation_ratios": activation_ratios,
            "soft_mask": soft_mask,
            "components": self.n_components,
            "w": w,
            "h": h,
        }
        self.metadata = component_info
        return elephant_zxx, elephant_audio, component_info
