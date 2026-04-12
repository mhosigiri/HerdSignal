import tempfile
import unittest
from pathlib import Path

import numpy as np

from src.layer2_separate import DeepLearningSeparator


class TestDeepLearningSeparator(unittest.TestCase):
    def test_fit_and_separate_synthetic_audio(self) -> None:
        rng = np.random.default_rng(0)
        sr = 4000
        duration = 1.5
        time = np.linspace(0.0, duration, int(sr * duration), endpoint=False)

        call_mask_a = ((time >= 0.25) & (time <= 1.1)).astype(np.float32)
        call_mask_b = ((time >= 0.4) & (time <= 1.25)).astype(np.float32)

        clean_a = (0.65 * np.sin(2 * np.pi * 35 * time) * call_mask_a).astype(np.float32)
        clean_a += (0.20 * np.sin(2 * np.pi * 70 * time) * call_mask_a).astype(np.float32)
        clean_b = (0.55 * np.sin(2 * np.pi * 55 * time) * call_mask_b).astype(np.float32)
        clean_b += (0.12 * np.sin(2 * np.pi * 110 * time) * call_mask_b).astype(np.float32)

        noise_a = (0.35 * np.sin(2 * np.pi * 260 * time) + 0.04 * rng.normal(size=time.shape[0])).astype(np.float32)
        noise_b = (0.28 * np.sin(2 * np.pi * 180 * time) + 0.03 * rng.normal(size=time.shape[0])).astype(np.float32)

        separator = DeepLearningSeparator(
            sample_rate=sr,
            n_fft=256,
            hop_length=64,
            base_channels=8,
            device="cpu",
        )
        history = separator.fit(
            clean_audios=[clean_a, clean_b],
            noise_audios=[noise_a, noise_b],
            epochs=3,
            steps_per_epoch=6,
            batch_size=2,
            segment_duration=1.0,
            learning_rate=5e-3,
            seed=0,
        )

        self.assertEqual(len(history["train_loss"]), 3)
        self.assertTrue(np.isfinite(history["train_loss"]).all())

        mixture = np.clip(clean_a + 0.9 * noise_a, -1.0, 1.0).astype(np.float32)
        elephant_audio, noise_audio, info = separator.separate_waveform(mixture, sr=sr)

        self.assertEqual(elephant_audio.shape, mixture.shape)
        self.assertEqual(noise_audio.shape, mixture.shape)
        self.assertIn("mask_mean", info)
        self.assertIn("history", info)

        target_projection = float(np.abs(np.dot(elephant_audio, clean_a)))
        noise_projection = float(np.abs(np.dot(elephant_audio, noise_a)))
        self.assertGreater(target_projection, noise_projection)

    def test_checkpoint_round_trip(self) -> None:
        sr = 2000
        separator = DeepLearningSeparator(
            sample_rate=sr,
            n_fft=128,
            hop_length=32,
            base_channels=8,
            device="cpu",
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            checkpoint_path = Path(temp_dir) / "separator.pt"
            separator.save_checkpoint(checkpoint_path)
            restored = DeepLearningSeparator.load_checkpoint(checkpoint_path, device="cpu")

        self.assertEqual(restored.sample_rate, sr)
        self.assertEqual(restored.n_fft, 128)
        self.assertEqual(restored.hop_length, 32)

