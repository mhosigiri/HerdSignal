import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

from src.feature_matching import ElephantCallMatcher, extract_features


class TestFeatureMatching(unittest.TestCase):
    def test_extract_features_returns_finite_values(self) -> None:
        sr = 8000
        time = np.linspace(0.0, 2.0, int(sr * 2.0), endpoint=False)
        audio = (0.2 * np.sin(2 * np.pi * 55 * time)).astype(np.float32)
        features = extract_features(audio, sr=sr)

        self.assertGreater(len(features), 10)
        self.assertTrue(np.isfinite(features).all())

    def test_matcher_prefers_closest_reference(self) -> None:
        sr = 8000
        time = np.linspace(0.0, 2.0, int(sr * 2.0), endpoint=False)
        ref_rumble = (0.22 * np.sin(2 * np.pi * 45 * time)).astype(np.float32)
        ref_trumpet = (0.12 * np.sin(2 * np.pi * 220 * time)).astype(np.float32)
        test_audio = (0.2 * np.sin(2 * np.pi * 47 * time)).astype(np.float32)

        matcher = ElephantCallMatcher()
        matcher.fit_reference(
            {"rumble_ref": ref_rumble, "trumpet_ref": ref_trumpet},
            ["rumble", "trumpet"],
            sr=sr,
        )
        result = matcher.match(test_audio, sr=sr)

        self.assertEqual(result["best_match_label"], "rumble")
        self.assertGreater(result["best_match_score"], 0.0)
        self.assertGreaterEqual(result["contamination_score"], 0.0)
        self.assertLessEqual(result["contamination_score"], 1.0)

    def test_fit_reference_directory_loads_audio_files(self) -> None:
        sr = 8000
        time = np.linspace(0.0, 1.0, sr, endpoint=False)
        audio = (0.15 * np.sin(2 * np.pi * 60 * time)).astype(np.float32)

        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            sf.write(directory / "Rumble01.wav", audio, sr)
            sf.write(directory / "Trumpet02.wav", audio, sr)

            matcher = ElephantCallMatcher()
            matcher.fit_reference_directory(directory, sr=sr)

        self.assertEqual(len(matcher.reference_keys), 2)
        self.assertIsNotNone(matcher.reference_features)
