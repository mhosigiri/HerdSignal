import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

from src.dataset import ElephantCallDataset, infer_call_family, load_annotations


class TestDataset(unittest.TestCase):
    def test_load_annotations_normalizes_expected_columns(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "annotations.csv"
            csv_path.write_text(
                "Selection,Sound_file,Start_time,End_time,Call_type\n"
                "1,sample_vehicle.wav,1.0,2.5,rumble\n",
                encoding="utf-8",
            )
            df = load_annotations(csv_path)

        self.assertIn("filename", df.columns)
        self.assertIn("noise_type", df.columns)
        self.assertEqual(df.iloc[0]["noise_type"], "car")
        self.assertEqual(df.iloc[0]["call_family"], "rumble")

    def test_infer_call_family_handles_mixed_labels(self) -> None:
        self.assertEqual(infer_call_family("bark-rumble"), "bark")
        self.assertEqual(infer_call_family("trumpet-rumble"), "trumpet")
        self.assertEqual(infer_call_family("roar-rumble"), "roar")
        self.assertEqual(infer_call_family("unknown"), "rumble")

    def test_dataset_returns_expected_training_tensors(self) -> None:
        sr = 8000
        duration = 5.0
        time = np.linspace(0.0, duration, int(sr * duration), endpoint=False)
        recording = (0.1 * np.sin(2 * np.pi * 120 * time)).astype(np.float32)
        clean_ref = (0.2 * np.sin(2 * np.pi * 40 * time[:sr])).astype(np.float32)
        noise_ref = (0.03 * np.sin(2 * np.pi * 240 * time[:sr])).astype(np.float32)

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            recordings_dir = temp / "recordings"
            clean_dir = temp / "clean_samples"
            noise_dir = temp / "noise_samples"
            recordings_dir.mkdir()
            clean_dir.mkdir()
            noise_dir.mkdir()

            sf.write(recordings_dir / "sample_vehicle.wav", recording, sr)
            sf.write(clean_dir / "Rumble01.wav", clean_ref, sr)
            sf.write(noise_dir / "vehicle_noise.wav", noise_ref, sr)

            csv_path = temp / "annotations.csv"
            csv_path.write_text(
                "Selection,Sound_file,Start_time,End_time,Call_type\n"
                "1,sample_vehicle.wav,1.25,2.25,rumble\n",
                encoding="utf-8",
            )

            dataset = ElephantCallDataset(
                annotations_csv=str(csv_path),
                recordings_dir=str(recordings_dir),
                clean_samples_dir=str(clean_dir),
                noise_samples_dir=str(noise_dir),
                sr=sr,
                segment_duration=3.0,
                augment=False,
            )
            item = dataset[0]

        self.assertEqual(len(dataset), 1)
        self.assertEqual(item["audio"].shape[0], 1)
        self.assertEqual(item["audio"].shape, item["clean_reference"].shape)
        self.assertEqual(item["audio"].shape, item["noise_reference"].shape)
        self.assertEqual(item["call_mask"].shape, item["noise_mask"].shape)
        self.assertGreater(float(item["call_mask"].sum().item()), 0.0)
        self.assertEqual(item["noise_type"], "car")

