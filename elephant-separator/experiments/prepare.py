"""
One-time data preparation for elephant-separator autoresearch experiments.
Downloads clean elephant calls, prepares noise samples, creates synthetic
mixed training data, and caches spectrogram tensors to disk.

Usage:
    python prepare.py                         # full prep
    python prepare.py --no-download           # skip downloads, use existing audio
    python prepare.py --max-clean 50          # use only 50 clean calls (fast test)

Data and cache are stored in ~/.cache/elephant-separator/.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import shutil
import sys
import time
import zipfile

import numpy as np
import requests
import torch

# ---------------------------------------------------------------------------
# Constants (fixed, do not modify)
# ---------------------------------------------------------------------------

SR = 44100            # sample rate for all audio in the pipeline
N_FFT = 4096          # FFT window — freq resolution ≈ 10.8 Hz at 44100 Hz
HOP_LENGTH = 256      # hop — time resolution ≈ 5.8 ms
SEGMENT_DURATION = 8  # seconds per training sample
N_FRAMES = int(SR * SEGMENT_DURATION / HOP_LENGTH)   # time frames per segment
N_FREQ = N_FFT // 2 + 1                               # freq bins (2049)
TIME_BUDGET = 3600    # autoresearch training time budget in seconds (1 hour)
EVAL_SEGMENTS = 64    # number of val segments used in evaluation

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CACHE_DIR = os.path.join(os.path.expanduser("~"), ".cache", "elephant-separator")
AUDIO_DIR = os.path.join(CACHE_DIR, "audio")
CLEAN_DIR = os.path.join(AUDIO_DIR, "clean_calls")
NOISE_DIR = os.path.join(AUDIO_DIR, "noise_samples")
MIXED_DIR = os.path.join(AUDIO_DIR, "mixed")
SPEC_DIR = os.path.join(CACHE_DIR, "spectrograms")

# Source recordings are already present in the project
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RECORDINGS_DIR = os.path.join(PROJECT_ROOT, "data", "recordings")
ANNOTATIONS_CSV = os.path.join(PROJECT_ROOT, "data", "annotations.csv")

# Clean elephant calls: HiruDewmi/Audio-Classification-for-Elephant-Sounds
CLEAN_CALLS_URL = (
    "https://github.com/HiruDewmi/Audio-Classification-for-Elephant-Sounds"
    "/archive/refs/heads/main.zip"
)

# SNR range for synthetic mixes (dB) — negative means noise is louder
SNR_RANGE = (-10.0, 5.0)

# Train/val split fraction
VAL_FRACTION = 0.15

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_dirs():
    for d in (AUDIO_DIR, CLEAN_DIR, NOISE_DIR, MIXED_DIR, SPEC_DIR):
        os.makedirs(d, exist_ok=True)


def _download_file(url: str, dest: str, description: str) -> bool:
    """Download url → dest with progress dots and retries. Returns True on success."""
    max_attempts = 4
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.get(url, stream=True, timeout=60)
            resp.raise_for_status()
            tmp = dest + ".tmp"
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            with open(tmp, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        fh.write(chunk)
                        downloaded += len(chunk)
            os.rename(tmp, dest)
            size_mb = downloaded / 1e6
            print(f"  {description}: {size_mb:.1f} MB downloaded")
            return True
        except (requests.RequestException, IOError) as exc:
            print(f"  Attempt {attempt}/{max_attempts} failed for {description}: {exc}")
            for p in (dest + ".tmp", dest):
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass
            if attempt < max_attempts:
                time.sleep(2 ** attempt)
    return False

# ---------------------------------------------------------------------------
# Step 1 – Download clean elephant calls
# ---------------------------------------------------------------------------

def download_clean_calls() -> int:
    """
    Download HiruDewmi clean elephant call dataset and extract WAV files.
    Returns the number of clean WAV files available after this step.
    """
    existing = [f for f in os.listdir(CLEAN_DIR) if f.lower().endswith(".wav")]
    if len(existing) >= 50:
        print(f"Clean calls: {len(existing)} WAV files already present at {CLEAN_DIR}")
        return len(existing)

    zip_path = os.path.join(CACHE_DIR, "clean_calls.zip")
    if not os.path.exists(zip_path):
        print("Clean calls: downloading from GitHub...")
        ok = _download_file(CLEAN_CALLS_URL, zip_path, "clean_calls.zip")
        if not ok:
            print("Clean calls: download failed — skipping")
            return len(existing)

    print("Clean calls: extracting WAV files...")
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            wav_entries = [
                name for name in zf.namelist()
                if name.lower().endswith(".wav")
                and any(
                    kind in name
                    for kind in ("Rumble", "Trumpet", "Roar")
                )
            ]
            for entry in wav_entries:
                basename = os.path.basename(entry)
                dest = os.path.join(CLEAN_DIR, basename)
                if not os.path.exists(dest):
                    with zf.open(entry) as src, open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst)
    except zipfile.BadZipFile as exc:
        print(f"Clean calls: bad zip — {exc}")
        os.remove(zip_path)
        return len(existing)

    available = [f for f in os.listdir(CLEAN_DIR) if f.lower().endswith(".wav")]
    print(f"Clean calls: {len(available)} WAV files ready at {CLEAN_DIR}")
    return len(available)


# ---------------------------------------------------------------------------
# Step 2 – Collect noise samples from the project recordings
# ---------------------------------------------------------------------------

def prepare_noise_samples() -> int:
    """
    Copy noise-only recordings from the project data directory into NOISE_DIR.
    Files without annotated elephant calls are treated as noise references.
    Returns the number of noise WAV files available.
    """
    try:
        import pandas as pd
    except ImportError:
        print("Noise samples: pandas not installed — skipping noise preparation")
        return 0

    if not os.path.exists(ANNOTATIONS_CSV):
        print(f"Noise samples: annotations CSV not found at {ANNOTATIONS_CSV}")
        return 0

    ann = pd.read_csv(ANNOTATIONS_CSV)
    annotated_files = set(ann["Sound_file"].tolist())

    noise_files = [
        f for f in os.listdir(RECORDINGS_DIR)
        if f.lower().endswith(".wav") and f not in annotated_files
    ]

    # Also include annotated files — the non-elephant portions serve as noise
    # For simplicity, copy all recordings; the mixer below will handle snipping
    all_recordings = [f for f in os.listdir(RECORDINGS_DIR) if f.lower().endswith(".wav")]

    copied = 0
    for fname in all_recordings:
        src = os.path.join(RECORDINGS_DIR, fname)
        dst = os.path.join(NOISE_DIR, fname)
        if not os.path.exists(dst):
            shutil.copy2(src, dst)
            copied += 1

    total = len([f for f in os.listdir(NOISE_DIR) if f.lower().endswith(".wav")])
    if copied:
        print(f"Noise samples: copied {copied} recordings → {NOISE_DIR} ({total} total)")
    else:
        print(f"Noise samples: {total} files already present at {NOISE_DIR}")
    return total


# ---------------------------------------------------------------------------
# Step 3 – Build synthetic mixed dataset
# ---------------------------------------------------------------------------

def _load_audio(path: str, sr: int = SR) -> np.ndarray:
    """Load mono audio at target SR using librosa."""
    import librosa  # deferred so the module is importable without librosa
    audio, _ = librosa.load(path, sr=sr, mono=True)
    return audio.astype(np.float32)


def _mix_at_snr(
    clean: np.ndarray,
    noise: np.ndarray,
    snr_db: float,
) -> np.ndarray:
    """Mix clean signal into noise at the requested SNR in dB."""
    if len(noise) < len(clean):
        repeats = math.ceil(len(clean) / len(noise))
        noise = np.tile(noise, repeats)

    # Random offset to avoid always aligning noise start with signal start
    max_offset = max(0, len(noise) - len(clean))
    offset = random.randint(0, max_offset)
    noise_seg = noise[offset : offset + len(clean)]

    sig_power = float(np.mean(clean ** 2)) + 1e-10
    nse_power = float(np.mean(noise_seg ** 2)) + 1e-10
    target_nse_power = sig_power / (10 ** (snr_db / 10))
    scale = math.sqrt(target_nse_power / nse_power)

    mixed = clean + scale * noise_seg
    peak = float(np.max(np.abs(mixed))) + 1e-10
    return (mixed / peak * 0.9).astype(np.float32)


def build_mixed_dataset(max_clean: int = 200, mixes_per_call: int = 3) -> int:
    """
    Create synthetic (mixed, clean) audio pairs and cache to MIXED_DIR.
    Each pair is saved as:
        mixed_<stem>_<noise_stem>_snr<snr>.npz  →  {'mixed': arr, 'clean': arr}
    Returns the number of pairs created.
    """
    clean_files = sorted(
        f for f in os.listdir(CLEAN_DIR) if f.lower().endswith(".wav")
    )
    noise_files = sorted(
        f for f in os.listdir(NOISE_DIR) if f.lower().endswith(".wav")
    )

    if not clean_files:
        print("Mixed dataset: no clean calls found — skipping")
        return 0
    if not noise_files:
        print("Mixed dataset: no noise files found — skipping")
        return 0

    clean_files = clean_files[:max_clean]
    seg_samples = SR * SEGMENT_DURATION

    existing = len([f for f in os.listdir(MIXED_DIR) if f.endswith(".npz")])
    expected = len(clean_files) * mixes_per_call
    if existing >= expected:
        print(f"Mixed dataset: {existing} pairs already cached at {MIXED_DIR}")
        return existing

    print(f"Mixed dataset: building {expected} pairs from {len(clean_files)} clean calls...")
    created = 0

    for clean_fname in clean_files:
        clean_audio = _load_audio(os.path.join(CLEAN_DIR, clean_fname))
        if len(clean_audio) < seg_samples:
            # Pad short clips with zeros
            clean_audio = np.pad(clean_audio, (0, seg_samples - len(clean_audio)))
        else:
            clean_audio = clean_audio[:seg_samples]

        for _ in range(mixes_per_call):
            noise_fname = random.choice(noise_files)
            noise_audio = _load_audio(os.path.join(NOISE_DIR, noise_fname))
            snr_db = random.uniform(*SNR_RANGE)

            mixed = _mix_at_snr(clean_audio, noise_audio, snr_db)

            snr_tag = f"{snr_db:+.1f}".replace(".", "p").replace("+", "pos").replace("-", "neg")
            noise_stem = os.path.splitext(noise_fname)[0][:20]
            clean_stem = os.path.splitext(clean_fname)[0]
            out_name = f"mixed_{clean_stem}_{noise_stem}_{snr_tag}.npz"
            out_path = os.path.join(MIXED_DIR, out_name)

            if not os.path.exists(out_path):
                np.savez_compressed(out_path, mixed=mixed, clean=clean_audio)
                created += 1

    total = len([f for f in os.listdir(MIXED_DIR) if f.endswith(".npz")])
    print(f"Mixed dataset: {total} pairs ready ({created} newly created)")
    return total


# ---------------------------------------------------------------------------
# Step 4 – Precompute spectrogram cache
# ---------------------------------------------------------------------------

def _audio_to_spec(audio: np.ndarray) -> torch.Tensor:
    """Compute log-magnitude spectrogram from mono float32 audio."""
    from scipy.signal import stft as scipy_stft

    _, _, Zxx = scipy_stft(audio, fs=SR, nperseg=N_FFT, noverlap=N_FFT - HOP_LENGTH)
    mag = np.abs(Zxx).astype(np.float32)
    log_mag = np.log1p(mag)
    return torch.from_numpy(log_mag)  # shape: (N_FREQ, n_time)


def _trim_or_pad(spec: torch.Tensor, n_frames: int) -> torch.Tensor:
    """Trim or zero-pad the time axis of a spectrogram to exactly n_frames."""
    T = spec.shape[1]
    if T >= n_frames:
        return spec[:, :n_frames]
    return torch.nn.functional.pad(spec, (0, n_frames - T))


def build_spectrogram_cache() -> tuple[int, int]:
    """
    Convert all .npz pairs to spectrogram tensors and save as .pt files.
    Returns (n_train, n_val).
    """
    npz_files = sorted(f for f in os.listdir(MIXED_DIR) if f.endswith(".npz"))
    if not npz_files:
        print("Spectrogram cache: no .npz pairs found — run build_mixed_dataset first")
        return 0, 0

    train_dir = os.path.join(SPEC_DIR, "train")
    val_dir = os.path.join(SPEC_DIR, "val")
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)

    existing_train = len([f for f in os.listdir(train_dir) if f.endswith(".pt")])
    existing_val = len([f for f in os.listdir(val_dir) if f.endswith(".pt")])
    if existing_train + existing_val >= len(npz_files):
        print(
            f"Spectrogram cache: {existing_train} train + {existing_val} val already cached"
        )
        return existing_train, existing_val

    print(f"Spectrogram cache: converting {len(npz_files)} pairs...")

    random.shuffle(npz_files)
    n_val = max(1, int(len(npz_files) * VAL_FRACTION))
    val_set = set(npz_files[:n_val])
    train_set = set(npz_files[n_val:])

    n_train_created = n_val_created = 0

    for fname in npz_files:
        stem = os.path.splitext(fname)[0]
        split = "val" if fname in val_set else "train"
        out_path = os.path.join(SPEC_DIR, split, stem + ".pt")
        if os.path.exists(out_path):
            continue

        data = np.load(os.path.join(MIXED_DIR, fname))
        mixed_spec = _trim_or_pad(_audio_to_spec(data["mixed"]), N_FRAMES)
        clean_spec = _trim_or_pad(_audio_to_spec(data["clean"]), N_FRAMES)

        torch.save({"noisy": mixed_spec, "clean": clean_spec}, out_path)

        if split == "train":
            n_train_created += 1
        else:
            n_val_created += 1

    total_train = len([f for f in os.listdir(train_dir) if f.endswith(".pt")])
    total_val = len([f for f in os.listdir(val_dir) if f.endswith(".pt")])
    print(f"Spectrogram cache: {total_train} train + {total_val} val at {SPEC_DIR}")
    return total_train, total_val


# ---------------------------------------------------------------------------
# Runtime utilities (imported by train.py)
# ---------------------------------------------------------------------------

class SpectrogramDataset(torch.utils.data.Dataset):
    """
    Lazy spectrogram dataset.  Each item is a dict:
        {'noisy': Tensor(1, N_FREQ, N_FRAMES),
         'clean': Tensor(1, N_FREQ, N_FRAMES)}
    """

    def __init__(self, split: str = "train"):
        assert split in ("train", "val")
        split_dir = os.path.join(SPEC_DIR, split)
        self.paths = sorted(
            os.path.join(split_dir, f)
            for f in os.listdir(split_dir)
            if f.endswith(".pt")
        )
        if len(self.paths) == 0:
            raise RuntimeError(
                f"No .pt files in {split_dir}. Run prepare.py first."
            )

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, idx: int):
        data = torch.load(self.paths[idx], weights_only=True)
        noisy = data["noisy"].unsqueeze(0)  # (1, N_FREQ, N_FRAMES)
        clean = data["clean"].unsqueeze(0)
        return noisy, clean


def make_dataloader(split: str, batch_size: int, num_workers: int = 2):
    """Return a DataLoader for the cached spectrogram split."""
    ds = SpectrogramDataset(split)
    return torch.utils.data.DataLoader(
        ds,
        batch_size=batch_size,
        shuffle=(split == "train"),
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        drop_last=True,
    )


# ---------------------------------------------------------------------------
# Evaluation (DO NOT CHANGE — this is the fixed metric)
# ---------------------------------------------------------------------------

@torch.no_grad()
def evaluate(model: torch.nn.Module, device: str = "cpu") -> float:
    """
    Reconstruction MSE on spectrogram targets.
    Model receives a noisy spectrogram (B, 1, N_FREQ, N_FRAMES) and outputs
    a soft mask of the same shape.  Reconstructed = mask * noisy.
    Returns mean MSE (lower is better).
    """
    model.eval()
    val_loader = make_dataloader("val", batch_size=8, num_workers=0)
    total_loss = 0.0
    steps = 0

    for noisy, clean in val_loader:
        if steps >= EVAL_SEGMENTS // 8:
            break
        noisy = noisy.to(device)
        clean = clean.to(device)
        mask = model(noisy)
        reconstructed = mask * noisy
        loss = torch.nn.functional.mse_loss(reconstructed, clean)
        total_loss += float(loss.item())
        steps += 1

    model.train()
    return total_loss / max(steps, 1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Prepare data for elephant-separator autoresearch"
    )
    parser.add_argument(
        "--no-download",
        action="store_true",
        help="Skip downloading clean elephant calls (use what is already cached)",
    )
    parser.add_argument(
        "--max-clean",
        type=int,
        default=200,
        help="Maximum number of clean call files to use for synthetic mixing",
    )
    parser.add_argument(
        "--mixes-per-call",
        type=int,
        default=3,
        help="Number of (noise, SNR) combinations per clean call",
    )
    args = parser.parse_args()

    print(f"Cache directory: {CACHE_DIR}")
    print(f"Project recordings: {RECORDINGS_DIR}")
    print()

    _ensure_dirs()

    # Step 1: Clean calls
    if args.no_download:
        n_clean = len([f for f in os.listdir(CLEAN_DIR) if f.lower().endswith(".wav")])
        print(f"Clean calls: skipping download ({n_clean} WAV files already in {CLEAN_DIR})")
    else:
        n_clean = download_clean_calls()
    print()

    if n_clean == 0:
        print(
            "WARNING: no clean elephant calls found.\n"
            "  Place WAV files named Rumble*.wav / Trumpet*.wav / Roar*.wav\n"
            f"  into {CLEAN_DIR} and re-run prepare.py."
        )
        sys.exit(1)

    # Step 2: Noise samples
    n_noise = prepare_noise_samples()
    print()

    if n_noise == 0:
        print(
            "WARNING: no noise recordings found.\n"
            f"  Ensure {RECORDINGS_DIR} contains WAV files and re-run prepare.py."
        )
        sys.exit(1)

    # Step 3: Synthetic mixes
    n_pairs = build_mixed_dataset(
        max_clean=args.max_clean,
        mixes_per_call=args.mixes_per_call,
    )
    print()

    if n_pairs == 0:
        print("ERROR: no mixed pairs created. Check audio directories.")
        sys.exit(1)

    # Step 4: Spectrogram cache
    n_train, n_val = build_spectrogram_cache()
    print()

    if n_train == 0:
        print("ERROR: no training spectrograms cached.")
        sys.exit(1)

    print(
        f"Done!  {n_train} train + {n_val} val spectrograms ready.\n"
        f"  Each sample: noisy/clean pair, shape (1, {N_FREQ}, {N_FRAMES})\n"
        f"  TIME_BUDGET for training: {TIME_BUDGET}s ({TIME_BUDGET // 60} min)\n"
        f"  Run:  python train.py"
    )
