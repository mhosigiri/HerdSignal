"""Layer 2 separation strategies."""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

import librosa
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.signal import istft
from sklearn.decomposition import NMF
from sklearn.exceptions import ConvergenceWarning

from .layer1_preprocess import normalize_noise_type

try:
    import torch
    from torch import nn
    from torch.nn import functional as F
except ImportError:  # pragma: no cover - optional runtime dependency
    torch = None
    nn = None
    F = None


ArrayLike = np.ndarray


def _safe_peak_normalize(audio: np.ndarray, peak_target: float = 0.95) -> np.ndarray:
    samples = np.asarray(audio, dtype=np.float32).flatten()
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak <= 1e-8:
        return samples
    return (samples * (peak_target / peak)).astype(np.float32, copy=False)


class SpectrogramMaskNet(nn.Module if nn is not None else object):
    """Lightweight spectrogram masking network for rapid iteration."""

    def __init__(self, base_channels: int = 16) -> None:
        if nn is None:
            raise ImportError("Deep-learning separator requires the optional torch dependencies.")
        super().__init__()
        hidden = max(8, base_channels)
        self.net = nn.Sequential(
            nn.Conv2d(1, hidden, kernel_size=5, padding=2),
            nn.BatchNorm2d(hidden),
            nn.SiLU(),
            nn.Conv2d(hidden, hidden * 2, kernel_size=5, padding=2),
            nn.BatchNorm2d(hidden * 2),
            nn.SiLU(),
            nn.Conv2d(hidden * 2, hidden * 2, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden * 2),
            nn.SiLU(),
            nn.Conv2d(hidden * 2, hidden, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden),
            nn.SiLU(),
            nn.Conv2d(hidden, 1, kernel_size=1),
            nn.Sigmoid(),
        )

    def forward(self, magnitude: "torch.Tensor") -> "torch.Tensor":
        return self.net(magnitude)


@dataclass
class NMFSeparator:
    """Classical NMF baseline with elephant-band-aware component scoring."""

    n_components: int = 3
    max_iter: int = 600
    random_state: int = 42
    beta_loss: str = "auto"
    solver: str = "mu"
    init: str = "nndsvda"
    tol: float = 1e-4
    alpha_w: float = 0.0
    alpha_h: float = 0.0
    l1_ratio: float = 0.0
    n_restarts: int = 1
    candidate_components: tuple[int, ...] | None = None
    component_score_threshold: float = 0.78
    metadata: dict[str, Any] = field(default_factory=dict)

    def _build_model(self, n_components: int, beta_loss: str, random_state: int) -> NMF:
        return NMF(
            n_components=n_components,
            init=self.init,
            max_iter=self.max_iter,
            random_state=random_state,
            beta_loss=beta_loss,
            solver=self.solver,
            tol=self.tol,
            alpha_W=self.alpha_w,
            alpha_H=self.alpha_h,
            l1_ratio=self.l1_ratio,
        )

    def _candidate_component_counts(self) -> tuple[int, ...]:
        if self.candidate_components:
            return tuple(sorted({max(2, int(value)) for value in self.candidate_components}))
        return (max(2, self.n_components),)

    def _candidate_beta_losses(self, noise_type: str | None) -> tuple[str, ...]:
        if self.beta_loss != "auto":
            return (self.beta_loss,)

        normalized_noise = normalize_noise_type(noise_type)
        if normalized_noise == "generator":
            return ("itakura-saito",)
        if normalized_noise == "airplane":
            return ("kullback-leibler",)
        return ("frobenius",)

    def _score_components(
        self,
        w: np.ndarray,
        h: np.ndarray,
        sr: int,
        hop_length: int,
        call_start_frame: int,
        call_end_frame: int,
    ) -> dict[str, list[float]]:
        n_frames = h.shape[1]
        pre_context = max(1, int(0.75 * sr / hop_length))
        post_context = max(1, int(0.75 * sr / hop_length))

        before_start = max(0, call_start_frame - pre_context)
        before = slice(before_start, max(call_start_frame, before_start + 1))
        during = slice(call_start_frame, min(max(call_end_frame, call_start_frame + 1), n_frames))
        after = slice(min(call_end_frame, n_frames), min(n_frames, call_end_frame + post_context))

        freqs = np.linspace(0.0, sr / 2.0, w.shape[0], dtype=np.float32)
        elephant_band = (freqs >= 8.0) & (freqs <= 250.0)
        upper_mid_band = (freqs > 250.0) & (freqs <= 1200.0)

        component_scores: list[float] = []
        activation_ratios: list[float] = []
        band_focus_scores: list[float] = []

        for idx in range(h.shape[0]):
            during_values = h[idx, during]
            outside_values = np.concatenate([h[idx, before], h[idx, after]]) if after.stop > after.start else h[idx, before]

            during_energy = float(np.median(during_values)) if during_values.size else 0.0
            during_peak = float(np.max(during_values)) if during_values.size else 0.0
            outside_energy = float(np.median(outside_values)) if outside_values.size else 1e-8
            outside_peak = float(np.max(outside_values)) if outside_values.size else 1e-8

            activation_ratio = (during_energy + 1e-8) / (outside_energy + 1e-8)
            peak_ratio = (during_peak + 1e-8) / (outside_peak + 1e-8)

            spectrum = np.maximum(w[:, idx], 1e-10)
            total_energy = float(spectrum.sum()) + 1e-8
            elephant_band_ratio = float(spectrum[elephant_band].sum()) / total_energy
            upper_mid_ratio = float(spectrum[upper_mid_band].sum()) / total_energy

            score = (
                np.log1p(activation_ratio)
                + 0.6 * np.log1p(peak_ratio)
                + 1.8 * elephant_band_ratio
                - 0.45 * upper_mid_ratio
            )

            component_scores.append(float(score))
            activation_ratios.append(float(activation_ratio))
            band_focus_scores.append(float(elephant_band_ratio))

        return {
            "component_scores": component_scores,
            "activation_ratios": activation_ratios,
            "band_focus_scores": band_focus_scores,
        }

    def separate(
        self,
        zxx: ArrayLike,
        sr: int,
        call_start_time: float,
        call_end_time: float,
        hop_length: int = 512,
        noise_type: str | None = None,
    ) -> tuple[ArrayLike, ArrayLike, dict[str, Any]]:
        """Separate an elephant source from a mixed STFT with tuned NMF masking."""
        if zxx.ndim != 2:
            raise ValueError("zxx must be a 2D complex STFT matrix")

        power_spectrogram = np.abs(zxx) ** 2 + 1e-8
        call_start_frame = max(0, int(call_start_time * sr / hop_length))
        call_end_frame = min(power_spectrogram.shape[1], int(call_end_time * sr / hop_length))

        best_candidate: dict[str, Any] | None = None
        candidate_components = self._candidate_component_counts()
        candidate_losses = self._candidate_beta_losses(noise_type)

        for beta_loss in candidate_losses:
            for n_components in candidate_components:
                for restart_idx in range(max(1, self.n_restarts)):
                    seed = self.random_state + restart_idx + 13 * n_components
                    model = self._build_model(n_components=n_components, beta_loss=beta_loss, random_state=seed)

                    with warnings.catch_warnings(record=True) as caught:
                        warnings.simplefilter("always", ConvergenceWarning)
                        try:
                            w = model.fit_transform(power_spectrogram)
                        except (FloatingPointError, ValueError):
                            continue

                    h = model.components_
                    scores = self._score_components(
                        w=w,
                        h=h,
                        sr=sr,
                        hop_length=hop_length,
                        call_start_frame=call_start_frame,
                        call_end_frame=call_end_frame,
                    )

                    component_scores = np.asarray(scores["component_scores"], dtype=np.float32)
                    best_idx = int(np.argmax(component_scores))
                    best_score = float(component_scores[best_idx])

                    selected_components = [
                        idx
                        for idx, score in enumerate(component_scores)
                        if score >= best_score * self.component_score_threshold
                        and scores["band_focus_scores"][idx] >= 0.05
                    ]
                    if best_idx not in selected_components:
                        selected_components.append(best_idx)
                    selected_components = sorted(set(selected_components))

                    approximation = np.maximum(w @ h, 1e-8)
                    elephant_component = w[:, selected_components] @ h[selected_components, :]
                    soft_mask = np.clip(elephant_component / approximation, 0.0, 1.0)
                    soft_mask = np.clip(gaussian_filter(soft_mask, sigma=(0.35, 0.75)), 0.0, 1.0)
                    elephant_zxx = zxx * soft_mask

                    convergence_penalty = 0.35 if caught else 0.0
                    candidate_score = (
                        best_score
                        + 0.15 * float(np.mean(component_scores[selected_components]))
                        - 0.01 * float(model.reconstruction_err_)
                        - convergence_penalty
                    )

                    if best_candidate is None or candidate_score > best_candidate["candidate_score"]:
                        best_candidate = {
                            "candidate_score": float(candidate_score),
                            "elephant_idx": best_idx,
                            "selected_components": selected_components,
                            "component_scores": scores["component_scores"],
                            "activation_ratios": scores["activation_ratios"],
                            "band_focus_scores": scores["band_focus_scores"],
                            "soft_mask": soft_mask,
                            "components": n_components,
                            "beta_loss": beta_loss,
                            "reconstruction_err": float(model.reconstruction_err_),
                            "w": w,
                            "h": h,
                            "converged": not caught,
                            "elephant_zxx": elephant_zxx,
                        }

        if best_candidate is None:
            raise RuntimeError("NMF separation failed for all candidate configurations")

        n_fft = max(2, (zxx.shape[0] - 1) * 2)
        _, elephant_audio = istft(
            best_candidate["elephant_zxx"],
            fs=sr,
            nperseg=n_fft,
            noverlap=n_fft - hop_length,
            input_onesided=True,
        )
        elephant_audio = _safe_peak_normalize(elephant_audio)

        component_info = {
            "elephant_idx": best_candidate["elephant_idx"],
            "selected_components": best_candidate["selected_components"],
            "component_scores": best_candidate["component_scores"],
            "activation_ratios": best_candidate["activation_ratios"],
            "band_focus_scores": best_candidate["band_focus_scores"],
            "soft_mask": best_candidate["soft_mask"],
            "components": best_candidate["components"],
            "beta_loss": best_candidate["beta_loss"],
            "reconstruction_err": best_candidate["reconstruction_err"],
            "converged": best_candidate["converged"],
            "w": best_candidate["w"],
            "h": best_candidate["h"],
        }
        self.metadata = component_info
        return best_candidate["elephant_zxx"], np.asarray(elephant_audio, dtype=np.float32), component_info


@dataclass
class DeepLearningSeparator:
    """Small trainable mask estimator built for the current dataset and timeline."""

    sample_rate: int = 44100
    n_fft: int = 1024
    hop_length: int = 256
    base_channels: int = 16
    device: str | None = None
    model: SpectrogramMaskNet = field(init=False)
    optimizer: torch.optim.Optimizer | None = field(init=False, default=None)
    training_history: dict[str, list[float]] = field(init=False, default_factory=lambda: {"train_loss": []})

    def __post_init__(self) -> None:
        if torch is None or nn is None or F is None:
            raise ImportError("DeepLearningSeparator requires the optional torch dependencies.")
        if self.device is None:
            if torch.cuda.is_available():
                resolved_device = "cuda"
            elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                resolved_device = "mps"
            else:
                resolved_device = "cpu"
        else:
            resolved_device = self.device

        self.device = resolved_device
        self.model = SpectrogramMaskNet(base_channels=self.base_channels).to(self.device)

    def _window(self, device: torch.device | str) -> torch.Tensor:
        return torch.hann_window(self.n_fft, device=device)

    def _stft(self, waveform: torch.Tensor) -> torch.Tensor:
        return torch.stft(
            waveform,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            win_length=self.n_fft,
            window=self._window(waveform.device),
            return_complex=True,
        )

    def _istft(self, stft_tensor: torch.Tensor, length: int) -> torch.Tensor:
        return torch.istft(
            stft_tensor,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            win_length=self.n_fft,
            window=self._window(stft_tensor.device),
            length=length,
        )

    def _ensure_audio_arrays(self, audios: Sequence[np.ndarray | torch.Tensor]) -> list[np.ndarray]:
        normalized: list[np.ndarray] = []
        for audio in audios:
            if isinstance(audio, torch.Tensor):
                samples = audio.detach().cpu().numpy()
            else:
                samples = np.asarray(audio)
            normalized.append(np.asarray(samples, dtype=np.float32).flatten())
        return normalized

    def _segment_audio(self, audio: np.ndarray, segment_samples: int, rng: np.random.Generator) -> np.ndarray:
        samples = np.asarray(audio, dtype=np.float32).flatten()
        if samples.size >= segment_samples:
            max_offset = max(0, samples.size - segment_samples)
            offset = int(rng.integers(0, max_offset + 1)) if max_offset else 0
            segment = samples[offset : offset + segment_samples]
        else:
            segment = np.pad(samples, (0, segment_samples - samples.size))
        return _safe_peak_normalize(segment)

    def _build_batch(
        self,
        clean_audios: Sequence[np.ndarray],
        noise_audios: Sequence[np.ndarray],
        batch_size: int,
        segment_samples: int,
        rng: np.random.Generator,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        mixtures = []
        cleans = []
        noises = []

        for _ in range(batch_size):
            clean_source = clean_audios[int(rng.integers(0, len(clean_audios)))]
            noise_source = noise_audios[int(rng.integers(0, len(noise_audios)))]

            clean = self._segment_audio(clean_source, segment_samples, rng)
            noise = self._segment_audio(noise_source, segment_samples, rng)

            clean_rms = float(np.sqrt(np.mean(clean**2)) + 1e-8)
            noise_rms = float(np.sqrt(np.mean(noise**2)) + 1e-8)
            snr_db = float(rng.uniform(-6.0, 6.0))
            target_noise_rms = clean_rms / (10 ** (snr_db / 20.0))
            noise_scale = target_noise_rms / noise_rms
            noise = noise * noise_scale

            mixture = np.clip(clean + noise, -1.0, 1.0).astype(np.float32, copy=False)
            mixtures.append(mixture)
            cleans.append(clean.astype(np.float32, copy=False))
            noises.append(noise.astype(np.float32, copy=False))

        mixture_tensor = torch.from_numpy(np.stack(mixtures)).to(self.device)
        clean_tensor = torch.from_numpy(np.stack(cleans)).to(self.device)
        noise_tensor = torch.from_numpy(np.stack(noises)).to(self.device)
        return mixture_tensor, clean_tensor, noise_tensor

    def _compute_loss(self, mixture: torch.Tensor, clean: torch.Tensor, noise: torch.Tensor) -> torch.Tensor:
        mixture_stft = self._stft(mixture)
        clean_stft = self._stft(clean)
        noise_stft = self._stft(noise)

        mixture_mag = mixture_stft.abs()
        clean_mag = clean_stft.abs()
        noise_mag = noise_stft.abs()

        ideal_mask = clean_mag / (clean_mag + noise_mag + 1e-8)
        pred_mask = self.model(mixture_mag.unsqueeze(1)).squeeze(1).clamp(0.0, 1.0)

        est_clean_mag = pred_mask * mixture_mag
        est_noise_mag = (1.0 - pred_mask) * mixture_mag

        mask_loss = F.mse_loss(pred_mask, ideal_mask)
        magnitude_loss = F.l1_loss(est_clean_mag, clean_mag) + 0.35 * F.l1_loss(est_noise_mag, noise_mag)
        consistency_loss = F.l1_loss(est_clean_mag + est_noise_mag, mixture_mag)
        return mask_loss + 0.6 * magnitude_loss + 0.1 * consistency_loss

    def fit(
        self,
        clean_audios: Sequence[np.ndarray | torch.Tensor],
        noise_audios: Sequence[np.ndarray | torch.Tensor],
        epochs: int = 4,
        steps_per_epoch: int = 32,
        batch_size: int = 8,
        segment_duration: float = 4.0,
        learning_rate: float = 1e-3,
        seed: int = 42,
    ) -> dict[str, list[float]]:
        """Train on synthetic mixtures generated from clean and noise reference clips."""
        clean_bank = self._ensure_audio_arrays(clean_audios)
        noise_bank = self._ensure_audio_arrays(noise_audios)
        if not clean_bank:
            raise ValueError("clean_audios must not be empty")
        if not noise_bank:
            raise ValueError("noise_audios must not be empty")

        segment_samples = int(max(segment_duration, 0.25) * self.sample_rate)
        rng = np.random.default_rng(seed)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        self.training_history = {"train_loss": []}

        self.model.train()
        for _ in range(max(1, epochs)):
            epoch_losses: list[float] = []
            for _ in range(max(1, steps_per_epoch)):
                mixture, clean, noise = self._build_batch(
                    clean_audios=clean_bank,
                    noise_audios=noise_bank,
                    batch_size=max(1, batch_size),
                    segment_samples=segment_samples,
                    rng=rng,
                )
                assert self.optimizer is not None
                self.optimizer.zero_grad(set_to_none=True)
                loss = self._compute_loss(mixture, clean, noise)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=3.0)
                self.optimizer.step()
                epoch_losses.append(float(loss.item()))

            self.training_history["train_loss"].append(float(np.mean(epoch_losses)))

        self.model.eval()
        return self.training_history

    def fit_reference_directories(
        self,
        clean_dir: str | Path,
        noise_dir: str | Path,
        epochs: int = 4,
        steps_per_epoch: int = 32,
        batch_size: int = 8,
        segment_duration: float = 4.0,
        learning_rate: float = 1e-3,
        seed: int = 42,
    ) -> dict[str, list[float]]:
        """Load reference clips from disk and train the separator."""
        from .dataset import _list_audio_files

        clean_audios = [
            librosa.load(str(path), sr=self.sample_rate, mono=True)[0].astype(np.float32, copy=False)
            for path in _list_audio_files(clean_dir)
        ]
        noise_audios = [
            librosa.load(str(path), sr=self.sample_rate, mono=True)[0].astype(np.float32, copy=False)
            for path in _list_audio_files(noise_dir)
        ]
        return self.fit(
            clean_audios=clean_audios,
            noise_audios=noise_audios,
            epochs=epochs,
            steps_per_epoch=steps_per_epoch,
            batch_size=batch_size,
            segment_duration=segment_duration,
            learning_rate=learning_rate,
            seed=seed,
        )

    def separate_waveform(
        self,
        audio: np.ndarray | torch.Tensor,
        sr: int | None = None,
    ) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
        """Separate a waveform into elephant and residual-noise estimates."""
        if isinstance(audio, torch.Tensor):
            samples = audio.detach().cpu().numpy()
        else:
            samples = np.asarray(audio)
        samples = np.asarray(samples, dtype=np.float32).flatten()

        original_sr = sr or self.sample_rate
        if original_sr != self.sample_rate:
            samples = librosa.resample(samples, orig_sr=original_sr, target_sr=self.sample_rate)

        waveform = torch.from_numpy(samples).unsqueeze(0).to(self.device)
        self.model.eval()

        with torch.no_grad():
            mixture_stft = self._stft(waveform)
            mixture_mag = mixture_stft.abs()
            pred_mask = self.model(mixture_mag.unsqueeze(1)).squeeze(1).clamp(0.0, 1.0)
            elephant_stft = mixture_stft * pred_mask
            noise_stft = mixture_stft * (1.0 - pred_mask)
            elephant_audio = self._istft(elephant_stft, length=waveform.shape[-1]).squeeze(0).cpu().numpy()
            noise_audio = self._istft(noise_stft, length=waveform.shape[-1]).squeeze(0).cpu().numpy()

        elephant_audio = _safe_peak_normalize(elephant_audio)
        noise_audio = _safe_peak_normalize(noise_audio)

        if original_sr != self.sample_rate:
            elephant_audio = librosa.resample(elephant_audio, orig_sr=self.sample_rate, target_sr=original_sr)
            noise_audio = librosa.resample(noise_audio, orig_sr=self.sample_rate, target_sr=original_sr)

        info = {
            "mask_mean": float(pred_mask.mean().item()),
            "mask_std": float(pred_mask.std().item()),
            "sample_rate": self.sample_rate,
            "device": str(self.device),
            "history": self.training_history,
        }
        return (
            np.asarray(elephant_audio, dtype=np.float32),
            np.asarray(noise_audio, dtype=np.float32),
            info,
        )

    def separate(
        self,
        zxx: ArrayLike,
        sr: int,
    ) -> tuple[ArrayLike, ArrayLike, dict[str, Any]]:
        """Separate directly from a complex STFT matrix when it matches the model STFT."""
        expected_bins = self.n_fft // 2 + 1
        if zxx.ndim != 2:
            raise ValueError("zxx must be a 2D complex STFT matrix")
        if zxx.shape[0] != expected_bins:
            raise ValueError(
                f"zxx frequency bins ({zxx.shape[0]}) do not match model n_fft ({self.n_fft})"
            )

        stft_tensor = torch.from_numpy(np.asarray(zxx, dtype=np.complex64)).unsqueeze(0).to(self.device)
        self.model.eval()
        with torch.no_grad():
            magnitude = stft_tensor.abs()
            pred_mask = self.model(magnitude.unsqueeze(1)).squeeze(1).clamp(0.0, 1.0)
            elephant_stft = stft_tensor * pred_mask
            elephant_audio = self._istft(elephant_stft, length=(zxx.shape[1] - 1) * self.hop_length).squeeze(0)

        elephant_zxx = elephant_stft.squeeze(0).cpu().numpy()
        elephant_audio_np = _safe_peak_normalize(elephant_audio.cpu().numpy())

        if sr != self.sample_rate:
            elephant_audio_np = librosa.resample(
                elephant_audio_np,
                orig_sr=self.sample_rate,
                target_sr=sr,
            )

        info = {
            "mask_mean": float(pred_mask.mean().item()),
            "mask_std": float(pred_mask.std().item()),
            "sample_rate": self.sample_rate,
            "device": str(self.device),
            "history": self.training_history,
        }
        return elephant_zxx, np.asarray(elephant_audio_np, dtype=np.float32), info

    def save_checkpoint(self, checkpoint_path: str | Path) -> None:
        path = Path(checkpoint_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "state_dict": self.model.state_dict(),
                "sample_rate": self.sample_rate,
                "n_fft": self.n_fft,
                "hop_length": self.hop_length,
                "base_channels": self.base_channels,
                "history": self.training_history,
            },
            path,
        )

    @classmethod
    def load_checkpoint(cls, checkpoint_path: str | Path, device: str | None = None) -> "DeepLearningSeparator":
        checkpoint = torch.load(checkpoint_path, map_location=device or "cpu")
        separator = cls(
            sample_rate=int(checkpoint["sample_rate"]),
            n_fft=int(checkpoint["n_fft"]),
            hop_length=int(checkpoint["hop_length"]),
            base_channels=int(checkpoint["base_channels"]),
            device=device,
        )
        separator.model.load_state_dict(checkpoint["state_dict"])
        separator.training_history = checkpoint.get("history", {"train_loss": []})
        separator.model.eval()
        return separator
