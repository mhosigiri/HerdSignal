"""Batch Demucs runner for all recordings in the project."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import librosa
import numpy as np
import pandas as pd
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model
from tqdm import tqdm


AUDIO_EXTENSIONS = {".wav", ".flac", ".ogg", ".mp3", ".m4a"}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Demucs on every recording in data/recordings.")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Path to the elephant-separator project root.",
    )
    parser.add_argument("--model", default="htdemucs", help="Demucs model name, e.g. htdemucs, hdemucs, demucs.")
    parser.add_argument("--device", default=None, help="cuda, mps, or cpu. Defaults to best available.")
    parser.add_argument("--shifts", type=int, default=1, help="Number of equivariant shifts.")
    parser.add_argument("--overlap", type=float, default=0.25, help="Chunk overlap for split inference.")
    parser.add_argument("--no-split", action="store_true", help="Disable chunked inference.")
    parser.add_argument("--output-tag", default=None, help="Optional folder suffix. Defaults to model name.")
    parser.add_argument("--limit", type=int, default=None, help="Optional limit for smoke runs.")
    return parser.parse_args()


def _resolve_device(requested: str | None) -> str:
    if requested:
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _list_recordings(recordings_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in recordings_dir.iterdir()
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    )


def _load_audio(path: Path, target_sr: int, target_channels: int) -> np.ndarray:
    audio, sr = sf.read(path, always_2d=True)
    audio = np.asarray(audio, dtype=np.float32).T

    if sr != target_sr:
        audio = np.stack(
            [librosa.resample(channel, orig_sr=sr, target_sr=target_sr) for channel in audio],
            axis=0,
        ).astype(np.float32, copy=False)

    if audio.shape[0] == 1 and target_channels == 2:
        audio = np.repeat(audio, 2, axis=0)
    elif audio.shape[0] > target_channels:
        audio = audio[:target_channels]
    elif audio.shape[0] < target_channels:
        repeats = int(np.ceil(target_channels / audio.shape[0]))
        audio = np.tile(audio, (repeats, 1))[:target_channels]

    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 1.0:
        audio = audio / peak
    return audio.astype(np.float32, copy=False)


def _write_stem(path: Path, audio: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, audio.T, sample_rate)


def main() -> None:
    args = _parse_args()
    project_root = args.project_root.resolve()
    recordings_dir = project_root / "data" / "recordings"
    output_tag = args.output_tag or args.model
    raw_stems_root = project_root / "results" / "demucs" / output_tag
    separated_root = project_root / "results" / "separated_calls" / output_tag
    manifest_path = project_root / "results" / f"{output_tag}_demucs_manifest.csv"

    raw_stems_root.mkdir(parents=True, exist_ok=True)
    separated_root.mkdir(parents=True, exist_ok=True)

    model = get_model(args.model)
    device = _resolve_device(args.device)
    model.to(device)
    model.eval()

    recordings = _list_recordings(recordings_dir)
    if args.limit is not None:
        recordings = recordings[: max(0, args.limit)]

    manifest_rows: list[dict[str, Any]] = []
    iterator = tqdm(recordings, desc=f"demucs-{args.model}")

    bass_idx = model.sources.index("bass") if "bass" in model.sources else 0

    for recording_path in iterator:
        recording_stem = recording_path.stem.replace(" ", "_")
        stem_dir = raw_stems_root / recording_stem
        elephant_proxy_path = separated_root / f"{recording_stem}__elephant_proxy.wav"
        noise_proxy_path = separated_root / f"{recording_stem}__noise_proxy.wav"

        manifest_row: dict[str, Any] = {
            "recording": recording_path.name,
            "model": args.model,
            "device": device,
            "status": "ok",
            "elephant_proxy": str(elephant_proxy_path.relative_to(project_root)),
            "noise_proxy": str(noise_proxy_path.relative_to(project_root)),
        }

        try:
            audio = _load_audio(
                recording_path,
                target_sr=model.samplerate,
                target_channels=model.audio_channels,
            )
            mixture = torch.from_numpy(audio).unsqueeze(0).to(device)
            with torch.no_grad():
                sources = apply_model(
                    model,
                    mixture,
                    device=device,
                    split=not args.no_split,
                    overlap=args.overlap,
                    shifts=args.shifts,
                    progress=False,
                )[0].detach().cpu().numpy()

            for idx, source_name in enumerate(model.sources):
                stem_path = stem_dir / f"{source_name}.wav"
                _write_stem(stem_path, sources[idx], model.samplerate)
                manifest_row[f"stem_{source_name}"] = str(stem_path.relative_to(project_root))

            elephant_proxy = np.mean(sources[bass_idx], axis=0).astype(np.float32, copy=False)
            residual_sources = [sources[idx] for idx in range(len(model.sources)) if idx != bass_idx]
            noise_proxy_stereo = np.sum(residual_sources, axis=0) if residual_sources else np.zeros_like(sources[bass_idx])
            noise_proxy = np.mean(noise_proxy_stereo, axis=0).astype(np.float32, copy=False)

            _write_stem(elephant_proxy_path, elephant_proxy[None, :], model.samplerate)
            _write_stem(noise_proxy_path, noise_proxy[None, :], model.samplerate)

            manifest_row["sample_rate"] = model.samplerate
            manifest_row["samples"] = int(elephant_proxy.shape[-1])
            manifest_row["sources"] = ",".join(model.sources)
            manifest_row["elephant_proxy_source"] = model.sources[bass_idx]
        except Exception as exc:
            manifest_row["status"] = "error"
            manifest_row["error"] = repr(exc)

        manifest_rows.append(manifest_row)

    pd.DataFrame(manifest_rows).to_csv(manifest_path, index=False)
    ok_count = sum(1 for row in manifest_rows if row["status"] == "ok")
    error_count = sum(1 for row in manifest_rows if row["status"] == "error")

    print(f"Completed {ok_count} recordings, {error_count} errors.")
    print(f"Raw stems: {raw_stems_root}")
    print(f"Proxy outputs: {separated_root}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
