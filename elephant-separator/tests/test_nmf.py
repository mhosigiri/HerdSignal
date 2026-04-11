import unittest

import numpy as np

from src.layer1_preprocess import compute_stft
from src.layer2_separate import NMFSeparator


class TestNMFSeparator(unittest.TestCase):
    def test_separate_returns_component_and_audio(self) -> None:
        sr = 8000
        duration = 2.0
        call_start = 0.6
        call_end = 1.4

        time = np.linspace(0.0, duration, int(sr * duration), endpoint=False)
        background = 0.05 * np.sin(2 * np.pi * 120 * time)
        target = 0.2 * np.sin(2 * np.pi * 260 * time)
        call_mask = ((time >= call_start) & (time <= call_end)).astype(np.float32)
        mixture = (background + target * call_mask).astype(np.float32)

        _, _, zxx = compute_stft(mixture, sr=sr, n_fft=256, hop_length=64)
        separator = NMFSeparator(n_components=2, max_iter=300, random_state=0)
        elephant_zxx, elephant_audio, info = separator.separate(
            zxx,
            sr=sr,
            call_start_time=call_start,
            call_end_time=call_end,
            hop_length=64,
        )

        self.assertEqual(elephant_zxx.shape, zxx.shape)
        self.assertEqual(info["components"], 2)
        self.assertIn("elephant_idx", info)
        self.assertEqual(len(info["activation_ratios"]), 2)
        self.assertGreater(len(elephant_audio), 0)

        before = elephant_audio[: int(sr * 0.4)]
        during = elephant_audio[int(sr * 0.8) : int(sr * 1.2)]
        self.assertGreater(np.mean(np.abs(during)), np.mean(np.abs(before)))
