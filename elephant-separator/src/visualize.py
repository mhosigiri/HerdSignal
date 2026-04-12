"""Visualization entry points for spectrogram inspection."""

from __future__ import annotations

import io

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def _render_spectrogram(zxx: np.ndarray, title: str = "Spectrogram") -> tuple[plt.Figure, plt.Axes]:
    magnitude_db = 20.0 * np.log10(np.maximum(np.abs(zxx), 1e-10))
    figure, axis = plt.subplots(figsize=(12, 6))
    image = axis.imshow(magnitude_db, origin="lower", aspect="auto", cmap="magma")
    figure.colorbar(image, label="dB")
    axis.set_title(title)
    axis.set_xlabel("Frame")
    axis.set_ylabel("Frequency Bin")
    figure.tight_layout()
    return figure, axis


def save_spectrogram_plot(zxx: np.ndarray, output_path: str, title: str = "Spectrogram") -> None:
    """Persist a log-magnitude spectrogram visualization to disk."""
    figure, _ = _render_spectrogram(zxx, title=title)
    figure.savefig(output_path, dpi=150)
    plt.close(figure)


def spectrogram_png_bytes(zxx: np.ndarray, title: str = "Spectrogram") -> bytes:
    """Render a spectrogram to PNG bytes for API responses."""
    figure, _ = _render_spectrogram(zxx, title=title)
    buffer = io.BytesIO()
    figure.savefig(buffer, format="png", dpi=150)
    plt.close(figure)
    buffer.seek(0)
    return buffer.read()
