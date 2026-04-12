"""Batch runner for elephant-call separation across the annotated dataset."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import pandas as pd
import soundfile as sf
from tqdm import tqdm

from .dataset import load_annotations
from .feature_matching import ElephantCallMatcher
from .layer1_preprocess import load_recording, preprocess
from .layer2_separate import DeepLearningSeparator, NMFSeparator
from .layer3_postprocess import postprocess
from .visualize import save_spectrogram_plot


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run elephant-call separation on all annotated calls.")
    parser.add_argument("--method", choices=("nmf", "dl"), default="nmf", help="Separation method to run.")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Path to the elephant-separator project root.",
    )
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=None,
        help="Required for --method dl. Path to a saved DeepLearningSeparator checkpoint.",
    )
    parser.add_argument(
        "--output-tag",
        default=None,
        help="Optional output folder suffix. Defaults to the method name.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Optional limit for smoke runs.")
    parser.add_argument("--skip-spectrograms", action="store_true", help="Do not save spectrogram images.")
    parser.add_argument("--n-fft", type=int, default=1024, help="STFT size for preprocessing.")
    parser.add_argument("--hop-length", type=int, default=256, help="STFT hop length.")
    parser.add_argument("--nmf-components", type=int, default=3, help="NMF component count.")
    parser.add_argument("--nmf-max-iter", type=int, default=600, help="NMF iteration cap.")
    return parser.parse_args()


def _build_output_dirs(project_root: Path, method: str, output_tag: str | None) -> dict[str, Path]:
    tag = output_tag or method
    separated_dir = project_root / "results" / "separated_calls" / tag
    spectrogram_dir = project_root / "results" / "spectrograms" / tag
    manifest_path = project_root / "results" / f"{tag}_manifest.csv"
    separated_dir.mkdir(parents=True, exist_ok=True)
    spectrogram_dir.mkdir(parents=True, exist_ok=True)
    return {
        "separated_dir": separated_dir,
        "spectrogram_dir": spectrogram_dir,
        "manifest_path": manifest_path,
    }


def _build_matcher(clean_samples_dir: Path) -> ElephantCallMatcher | None:
    if not clean_samples_dir.exists():
        return None
    if not any(clean_samples_dir.iterdir()):
        return None

    matcher = ElephantCallMatcher()
    matcher.fit_reference_directory(clean_samples_dir)
    return matcher


def _record_basename(row: pd.Series) -> str:
    source_stem = Path(str(row["filename"])).stem.replace(" ", "_")
    selection = str(row["selection_id"]).replace(" ", "_")
    call_family = str(row["call_family"]).replace(" ", "_")
    return f"{source_stem}__sel_{selection}__{call_family}"


def _run_nmf(
    row: pd.Series,
    recordings_dir: Path,
    sample_rate: int,
    n_fft: int,
    hop_length: int,
    separator: NMFSeparator,
) -> tuple[Any, Any, dict[str, Any]]:
    audio, sr = load_recording(str(recordings_dir / row["filename"]), target_sr=sample_rate)
    _, _, zxx = preprocess(
        audio,
        sr=sr,
        noise_type=row["noise_type"],
        call_start_time=float(row["start_time"]),
        call_end_time=float(row["end_time"]),
        n_fft=n_fft,
        hop_length=hop_length,
        source_name=row["filename"],
    )
    elephant_zxx, elephant_audio, info = separator.separate(
        zxx,
        sr=sr,
        call_start_time=float(row["start_time"]),
        call_end_time=float(row["end_time"]),
        hop_length=hop_length,
        noise_type=row["noise_type"],
    )
    return elephant_zxx, postprocess(elephant_audio, sr=sr), info


def _run_dl(
    row: pd.Series,
    recordings_dir: Path,
    sample_rate: int,
    separator: DeepLearningSeparator,
) -> tuple[Any, Any, dict[str, Any]]:
    audio, sr = load_recording(str(recordings_dir / row["filename"]), target_sr=sample_rate)
    segment_start = max(0, int((float(row["start_time"]) - 1.0) * sr))
    segment_end = min(len(audio), int((float(row["end_time"]) + 1.0) * sr))
    segment = audio[segment_start:segment_end]
    elephant_audio, _, info = separator.separate_waveform(segment, sr=sr)

    _, _, elephant_zxx = preprocess(
        elephant_audio,
        sr=sr,
        noise_type=row["noise_type"],
        call_start_time=0.0,
        call_end_time=max(0.25, float(row["end_time"]) - float(row["start_time"])),
        n_fft=separator.n_fft,
        hop_length=separator.hop_length,
        source_name=row["filename"],
    )
    return elephant_zxx, postprocess(elephant_audio, sr=sr), info


def main() -> None:
    args = _parse_args()
    project_root = args.project_root.resolve()
    data_dir = project_root / "data"
    recordings_dir = data_dir / "recordings"
    annotations = load_annotations(data_dir / "annotations.csv")
    if args.limit is not None:
        annotations = annotations.head(max(0, args.limit)).copy()

    outputs = _build_output_dirs(project_root, args.method, args.output_tag)
    matcher = _build_matcher(data_dir / "clean_samples")

    if args.method == "dl":
        if args.checkpoint is None:
            raise SystemExit("--checkpoint is required when --method dl")
        checkpoint_path = args.checkpoint
        if not checkpoint_path.is_absolute():
            checkpoint_path = (project_root / checkpoint_path).resolve()
        separator = DeepLearningSeparator.load_checkpoint(checkpoint_path)
        sample_rate = separator.sample_rate
    else:
        separator = NMFSeparator(
            n_components=args.nmf_components,
            max_iter=args.nmf_max_iter,
            random_state=42,
        )
        sample_rate = 44100

    manifest_rows: list[dict[str, Any]] = []
    iterator = tqdm(annotations.itertuples(index=False), total=len(annotations), desc=f"separating-{args.method}")

    for row_tuple in iterator:
        row = pd.Series(row_tuple._asdict())
        base_name = _record_basename(row)
        wav_path = outputs["separated_dir"] / f"{base_name}.wav"
        png_path = outputs["spectrogram_dir"] / f"{base_name}.png"

        manifest_row: dict[str, Any] = {
            "annotation_id": row["annotation_id"],
            "filename": row["filename"],
            "selection_id": row["selection_id"],
            "call_type": row["call_type"],
            "call_family": row["call_family"],
            "noise_type": row["noise_type"],
            "method": args.method,
            "output_wav": str(wav_path.relative_to(project_root)),
            "output_spectrogram": str(png_path.relative_to(project_root)),
            "status": "ok",
        }

        try:
            if args.method == "dl":
                elephant_zxx, elephant_audio, info = _run_dl(
                    row=row,
                    recordings_dir=recordings_dir,
                    sample_rate=sample_rate,
                    separator=separator,
                )
            else:
                elephant_zxx, elephant_audio, info = _run_nmf(
                    row=row,
                    recordings_dir=recordings_dir,
                    sample_rate=sample_rate,
                    n_fft=args.n_fft,
                    hop_length=args.hop_length,
                    separator=separator,
                )

            sf.write(wav_path, elephant_audio, sample_rate)
            if not args.skip_spectrograms:
                save_spectrogram_plot(elephant_zxx, str(png_path), title=base_name)

            manifest_row["peak"] = float(abs(elephant_audio).max()) if len(elephant_audio) else 0.0
            if matcher is not None and len(elephant_audio):
                match = matcher.match(elephant_audio, sr=sample_rate)
                manifest_row["best_match_label"] = match["best_match_label"]
                manifest_row["best_match_key"] = match["best_match_key"]
                manifest_row["best_match_score"] = match["best_match_score"]
                manifest_row["contamination_score"] = match["contamination_score"]

            for key, value in info.items():
                if isinstance(value, (str, int, float, bool)):
                    manifest_row[f"info_{key}"] = value
        except Exception as exc:
            manifest_row["status"] = "error"
            manifest_row["error"] = repr(exc)

        manifest_rows.append(manifest_row)

    manifest = pd.DataFrame(manifest_rows)
    manifest.to_csv(outputs["manifest_path"], index=False)

    ok_count = int((manifest["status"] == "ok").sum()) if not manifest.empty else 0
    error_count = int((manifest["status"] == "error").sum()) if not manifest.empty else 0
    print(f"Completed {ok_count} items, {error_count} errors.")
    print(f"Manifest: {outputs['manifest_path']}")
    print(f"WAV outputs: {outputs['separated_dir']}")
    if not args.skip_spectrograms:
        print(f"Spectrograms: {outputs['spectrogram_dir']}")


if __name__ == "__main__":
    main()
