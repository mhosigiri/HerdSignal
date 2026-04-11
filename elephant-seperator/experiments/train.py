"""Lightweight experiment baseline from the pipeline guide."""

from __future__ import annotations

import torch
import torch.nn as nn


class SeparationModel(nn.Module):
    """Small 1D-convolution baseline over spectrogram frames."""

    def __init__(self, n_freq: int = 2048, n_hidden: int = 256, n_layers: int = 4):
        super().__init__()
        layers: list[nn.Module] = []
        in_ch = 1

        for i in range(n_layers):
            out_ch = n_hidden if i < n_layers - 1 else 1
            layers.append(nn.Conv1d(in_ch, out_ch, kernel_size=7, padding=3))
            layers.append(nn.ReLU())
            in_ch = out_ch

        self.net = nn.Sequential(*layers)
        self.n_freq = n_freq

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.sigmoid(self.net(x))


TIME_BUDGET = 300
EVAL_EVERY = 50


def evaluate(model: nn.Module, val_data) -> float:
    """Fixed evaluation hook from the guide."""
    model.eval()
    total_loss = 0.0
    count = 0

    with torch.no_grad():
        for noisy_spec, clean_spec, _mask in val_data:
            pred_mask = model(noisy_spec)
            reconstructed = pred_mask * noisy_spec
            loss = nn.functional.mse_loss(reconstructed, clean_spec)
            total_loss += float(loss.item())
            count += 1

    model.train()
    return total_loss / max(count, 1)

