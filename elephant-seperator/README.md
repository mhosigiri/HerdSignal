# Elephant Separator

Starter scaffold for the elephant voice isolation pipeline described in [`../elephant-pipeline-guide.md`](../elephant-pipeline-guide.md).

This directory currently focuses on project structure and implementation entry points, not a finished pipeline.

## Layout

- `data/`: input recordings, annotation metadata, clean reference calls, and noise-only samples
- `src/`: preprocessing, separation, post-processing, evaluation, and visualization modules
- `models/`: checkpoints and NMF artifacts
- `notebooks/`: exploratory and modeling notebooks
- `results/`: spectrogram exports and separated audio outputs
- `experiments/`: lightweight research scripts and experiment logs
- `tests/`: placeholder test modules for the main pipeline pieces

## Quick Start

1. Create a Python 3.10+ environment.
2. Install dependencies from `requirements.txt` or `pyproject.toml`.
3. Populate `data/` with recordings and metadata.
4. Start implementing the `src/` modules in guide order: preprocess, separate, postprocess, evaluate.

## Still Needed From You

- Provide the 44 source recordings in `data/recordings/`.
- Fill `data/annotations.csv` with `filename,start_time,end_time,noise_type`.
- Add clean elephant reference clips to `data/clean_samples/`.
- Add noise-only clips to `data/noise_samples/`.
- Decide whether the project directory should stay `elephant-seperator/` or be renamed to `elephant-separator/` to match the guide.
- Create the runtime environment and install the audio/ML dependencies.
- Decide the initial model path: NMF baseline first, Demucs/Asteroid first, or both in parallel.

