"""Visualization entry points for spectrogram inspection."""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np


def save_spectrogram_plot(zxx: np.ndarray, output_path: str, title: str = "Spectrogram") -> None:
    """Persist a log-magnitude spectrogram visualization to disk."""
    magnitude_db = 20.0 * np.log10(np.maximum(np.abs(zxx), 1e-10))
    plt.figure(figsize=(12, 6))
    plt.imshow(magnitude_db, origin="lower", aspect="auto", cmap="magma")
    plt.colorbar(label="dB")
    plt.title(title)
    plt.xlabel("Frame")
    plt.ylabel("Frequency Bin")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
