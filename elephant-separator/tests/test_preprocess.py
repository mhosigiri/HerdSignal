import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

from src.layer1_preprocess import (
    compute_stft,
    load_recording,
    normalize_noise_type,
    preprocess,
)


class TestPreprocess(unittest.TestCase):
    def test_load_recording_resamples_and_converts_to_mono(self) -> None:
        sr = 8000
        duration = 0.5
        time = np.linspace(0.0, duration, int(sr * duration), endpoint=False)
        stereo_audio = np.stack(
            [
                0.2 * np.sin(2 * np.pi * 110 * time),
                0.2 * np.sin(2 * np.pi * 220 * time),
            ],
            axis=1,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "stereo.wav"
            sf.write(path, stereo_audio, sr)
            audio, loaded_sr = load_recording(str(path), target_sr=16000)

        self.assertEqual(loaded_sr, 16000)
        self.assertEqual(audio.ndim, 1)
        self.assertGreater(len(audio), len(stereo_audio))

    def test_compute_stft_returns_expected_dimensions(self) -> None:
        sr = 8000
        audio = np.random.randn(sr).astype(np.float32)
        frequencies, times, zxx = compute_stft(audio, sr=sr, n_fft=256, hop_length=64)

        self.assertEqual(frequencies.shape[0], 129)
        self.assertEqual(zxx.shape[0], 129)
        self.assertEqual(zxx.shape[1], times.shape[0])

    def test_normalize_noise_type_infers_from_filename(self) -> None:
        self.assertEqual(normalize_noise_type(None, "sample_vehicle_noise.wav"), "car")
        self.assertEqual(normalize_noise_type(None, "sample_airplane_noise.wav"), "airplane")
        self.assertEqual(normalize_noise_type(None, "sample_generator_noise.wav"), "generator")

    def test_preprocess_returns_valid_stft(self) -> None:
        sr = 8000
        duration = 2.0
        time = np.linspace(0.0, duration, int(sr * duration), endpoint=False)
        audio = (
            0.08 * np.sin(2 * np.pi * 80 * time)
            + 0.04 * np.sin(2 * np.pi * 180 * time)
            + 0.01 * np.random.randn(time.size)
        ).astype(np.float32)

        frequencies, times, zxx = preprocess(
            audio,
            sr=sr,
            noise_type="airplane",
            call_start_time=0.7,
            call_end_time=1.4,
            n_fft=256,
            hop_length=64,
        )

        self.assertEqual(zxx.shape[0], frequencies.shape[0])
        self.assertEqual(zxx.shape[1], times.shape[0])
        self.assertFalse(np.isnan(zxx).any())
