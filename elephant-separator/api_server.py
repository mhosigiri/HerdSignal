"""FastAPI server for the NMF-based elephant separator.

The product upload route uses the tuned NMF baseline rather than the
deep-learning path. NMF is unsupervised and already proven across 212 files
with solid matching and low contamination on the annotated dataset.

Start with:
    cd /Users/arniskc/Desktop/HackSMU/elephant-separator
    source .venv/bin/activate
    uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import base64
import csv
import io
import sys
import tempfile
from pathlib import Path
from typing import Any

import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from src.layer1_preprocess import load_recording, preprocess
from src.layer2_separate import NMFSeparator
from src.layer3_postprocess import postprocess
from src.visualize import spectrogram_png_bytes

# ── Config ───────────────────────────────────────────────────────────────────

SAMPLE_RATE = 44100
# Match the batch runner defaults that produced 212/212 successful separations.
N_FFT = 1024
HOP_LENGTH = 256

app = FastAPI(
    title="Elephant Separator API",
    version="2.1.0",
    description="NMF-based acoustic separator — proven on 212 field recordings.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _audio_to_base64(audio: np.ndarray, sr: int) -> str:
    buf = io.BytesIO()
    sf.write(buf, np.asarray(audio, dtype=np.float32), sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")


def _png_to_base64(png_bytes: bytes) -> str:
    return base64.b64encode(png_bytes).decode("ascii")


def _build_annotation_csv(annotations: list[dict[str, Any]]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=["annotation_id", "start_time", "end_time", "duration_seconds",
                     "peak_amplitude", "confidence"],
    )
    writer.writeheader()
    for row in annotations:
        writer.writerow(row)
    return buf.getvalue()


def _detect_call_region(
    audio: np.ndarray,
    sr: int,
    hop_length: int = 256,
    frame_length: int = 1024,
) -> tuple[float, float]:
    """Detect the strongest call region in the audio using RMS energy.

    Returns (start_seconds, end_seconds) of the dominant energy region.
    This gives the NMF component scorer a real before/during/after signal.
    """
    samples = np.asarray(audio, dtype=np.float32).flatten()
    duration = len(samples) / sr

    if duration < 1.5:
        # Too short to meaningfully partition — use full file
        return 0.0, duration

    rms = librosa.feature.rms(y=samples, frame_length=frame_length, hop_length=hop_length)[0]
    if rms.size == 0:
        return 0.0, duration

    # Smooth and find regions above threshold
    kernel = np.ones(7, dtype=np.float32) / 7.0
    smoothed = np.convolve(rms, kernel, mode="same")
    baseline = float(np.median(smoothed))
    peak = float(np.max(smoothed))

    if peak < 1e-6:
        return 0.0, duration

    threshold = max(baseline * 1.5, peak * 0.12)
    active = smoothed >= threshold

    # Find the largest contiguous active region
    segments: list[tuple[int, int]] = []
    start_idx: int | None = None
    for idx, is_active in enumerate(active):
        if is_active and start_idx is None:
            start_idx = idx
        elif not is_active and start_idx is not None:
            segments.append((start_idx, idx))
            start_idx = None
    if start_idx is not None:
        segments.append((start_idx, len(active)))

    if not segments:
        # Fallback: centre around the peak
        peak_frame = int(np.argmax(smoothed))
        half_window = max(1, int(0.5 * sr / hop_length))
        return (
            max(0.0, (peak_frame - half_window) * hop_length / sr),
            min(duration, (peak_frame + half_window) * hop_length / sr),
        )

    # Merge segments that are close together
    max_gap_frames = int(0.3 * sr / hop_length)
    merged = [segments[0]]
    for s, e in segments[1:]:
        ps, pe = merged[-1]
        if s - pe <= max_gap_frames:
            merged[-1] = (ps, e)
        else:
            merged.append((s, e))

    # Pick the longest merged segment
    longest = max(merged, key=lambda seg: seg[1] - seg[0])

    # Add 0.3s padding on each side for NMF context
    pad_frames = int(0.3 * sr / hop_length)
    start_frame = max(0, longest[0] - pad_frames)
    end_frame = min(len(smoothed), longest[1] + pad_frames)

    start_s = start_frame * hop_length / sr
    end_s = min(duration, end_frame * hop_length / sr)
    return start_s, end_s


def _generate_call_annotations(
    audio: np.ndarray,
    sr: int,
    hop_length: int = 256,
    frame_length: int = 1024,
    min_duration_seconds: float = 0.30,
) -> list[dict[str, Any]]:
    """Detect individual calls in the separated elephant audio."""
    samples = np.asarray(audio, dtype=np.float32).flatten()
    if samples.size == 0:
        return []

    rms = librosa.feature.rms(y=samples, frame_length=frame_length, hop_length=hop_length)[0]
    if rms.size == 0:
        return []

    kernel = np.ones(5, dtype=np.float32) / 5.0
    smoothed = np.convolve(rms, kernel, mode="same")
    baseline = float(np.median(smoothed))
    peak = float(np.max(smoothed))

    if peak < 1e-8:
        return []

    threshold = max(baseline * 1.8, peak * 0.16)
    active = smoothed >= threshold

    segments: list[tuple[int, int]] = []
    start_idx: int | None = None
    for idx, is_active in enumerate(active):
        if is_active and start_idx is None:
            start_idx = idx
        elif not is_active and start_idx is not None:
            segments.append((start_idx, idx))
            start_idx = None
    if start_idx is not None:
        segments.append((start_idx, len(active)))

    # Merge close segments
    max_gap = int(0.25 * sr / hop_length)
    merged: list[tuple[int, int]] = []
    for s, e in segments:
        if merged and s - merged[-1][1] <= max_gap:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))

    min_frames = max(1, int(min_duration_seconds * sr / hop_length))
    annotations: list[dict[str, Any]] = []
    for idx, (sf_, ef) in enumerate(merged, start=1):
        if ef - sf_ < min_frames:
            continue
        ss = sf_ * hop_length
        es = min(len(samples), ef * hop_length)
        clip = samples[ss:es]
        pk = float(np.max(np.abs(clip))) if clip.size else 0.0
        conf = min(1.0, max(0.1, float(np.mean(smoothed[sf_:ef]) / (peak + 1e-8))))
        annotations.append({
            "annotation_id": f"call_{idx}",
            "start_time": round(ss / sr, 3),
            "end_time": round(es / sr, 3),
            "duration_seconds": round((es - ss) / sr, 3),
            "peak_amplitude": round(pk, 5),
            "confidence": round(conf, 3),
        })

    # Fallback: if nothing found, mark peak region
    if not annotations:
        peak_frame = int(np.argmax(smoothed))
        half = int(max(min_duration_seconds, 0.75) * sr / (2 * hop_length))
        sf_ = max(0, peak_frame - half)
        ef = min(len(smoothed), peak_frame + half)
        ss = sf_ * hop_length
        es = min(len(samples), ef * hop_length)
        clip = samples[ss:es]
        pk = float(np.max(np.abs(clip))) if clip.size else 0.0
        conf = min(1.0, max(0.1, float(smoothed[peak_frame] / (peak + 1e-8))))
        annotations.append({
            "annotation_id": "call_1",
            "start_time": round(ss / sr, 3),
            "end_time": round(es / sr, 3),
            "duration_seconds": round((es - ss) / sr, 3),
            "peak_amplitude": round(pk, 5),
            "confidence": round(conf, 3),
        })

    return annotations


# ── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": "2.1.0",
        "model": "NMFSeparator",
        "device": "cpu",
        "sample_rate": SAMPLE_RATE,
        "n_fft": N_FFT,
        "hop_length": HOP_LENGTH,
    }


@app.post("/separate")
async def separate(
    file: UploadFile = File(..., description="Audio file (WAV / MP3 / FLAC)"),
    noise_type: str = Form(default="vehicle", description="vehicle | airplane | generator"),
) -> dict[str, Any]:
    """Separate elephant calls from background noise using NMF.

    Two-pass approach:
    1. Detect the dominant call region via RMS energy → gives NMF a
       before/during/after signal for component scoring.
    2. Run NMF with the same parameters as the proven batch runner
       (n_fft=1024, hop=256, 3 components, 600 iterations).
    """

    fname = (file.filename or "").lower()
    allowed = {".wav", ".mp3", ".flac", ".ogg", ".webm", ".m4a"}
    if not any(fname.endswith(ext) for ext in allowed):
        raise HTTPException(400, f"Unsupported format '{fname}'. Use WAV, MP3, FLAC, OGG, or WebM.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(400, "Uploaded file is empty.")

    suffix = Path(fname).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw_bytes)
        tmp_path = Path(tmp.name)

    try:
        # ── Load ─────────────────────────────────────────────────────────
        audio, sr = load_recording(str(tmp_path), target_sr=SAMPLE_RATE)
        duration = len(audio) / sr
        if duration < 0.5:
            raise HTTPException(400, "Audio too short (< 0.5 s).")

        # ── Pass 1: detect call region ───────────────────────────────────
        call_start, call_end = _detect_call_region(audio, sr, hop_length=HOP_LENGTH)

        # ── Preprocess (noise-aware) ─────────────────────────────────────
        _, _, zxx = preprocess(
            audio,
            sr=sr,
            noise_type=noise_type,
            call_start_time=call_start,
            call_end_time=call_end,
            n_fft=N_FFT,
            hop_length=HOP_LENGTH,
            source_name=file.filename,
        )

        # ── Pass 2: NMF separation ──────────────────────────────────────
        separator = NMFSeparator(
            n_components=3,
            max_iter=600,
            random_state=42,
            # Search across 2–4 components for best decomposition
            candidate_components=(2, 3, 4),
            n_restarts=2,
        )
        elephant_zxx, elephant_audio, info = separator.separate(
            zxx,
            sr=sr,
            call_start_time=call_start,
            call_end_time=call_end,
            hop_length=HOP_LENGTH,
            noise_type=noise_type,
        )

        # ── Postprocess ──────────────────────────────────────────────────
        elephant_audio = postprocess(
            np.asarray(elephant_audio, dtype=np.float32), sr=sr,
        )

        # ── Generate spectrograms ────────────────────────────────────────
        original_png = spectrogram_png_bytes(zxx, title="Input Spectrogram")
        processed_png = spectrogram_png_bytes(elephant_zxx, title="Separated Elephant Spectrogram")

        # ── Annotate calls ───────────────────────────────────────────────
        annotations = _generate_call_annotations(elephant_audio, sr=sr, hop_length=HOP_LENGTH)
        annotation_csv = _build_annotation_csv(annotations)

        # ── Serializable info ────────────────────────────────────────────
        safe_info = {
            k: v for k, v in info.items()
            if isinstance(v, (str, int, float, bool))
        }
        safe_info["detected_call_start"] = round(call_start, 3)
        safe_info["detected_call_end"] = round(call_end, 3)

        return {
            "file_name": file.filename or "uploaded_audio",
            "sample_rate": sr,
            "duration_seconds": round(duration, 3),
            "noise_type": noise_type,
            "model": "NMFSeparator",
            "device": "cpu",
            "audio_base64": _audio_to_base64(elephant_audio, sr),
            "audio_mime_type": "audio/wav",
            "original_spectrogram_base64": _png_to_base64(original_png),
            "processed_spectrogram_base64": _png_to_base64(processed_png),
            "annotations": annotations,
            "annotation_csv": annotation_csv,
            "info": safe_info,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Separation error: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)
