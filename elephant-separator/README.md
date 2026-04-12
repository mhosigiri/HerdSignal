# Elephant Separator

Elephant call isolation pipeline for noisy field recordings with:

- noise-aware preprocessing
- tuned NMF batch separation for the 212 annotated calls
- a lightweight trainable deep-learning separator
- Demucs batch inference for whole-recording comparison
- spectrogram and WAV export for review

## Runtime Pieces

- `frontend/`: Next.js app
- `src/`: separation pipeline and batch runners
- `data/`: recordings, annotations, clean references, noise references
- `results/separated_calls/`: generated WAV outputs
- `results/spectrograms/`: generated spectrograms
- `database/`: Supabase schema and setup notes

## Main Commands

From the project root:

```bash
source .venv/bin/activate
python -m pytest -q
python -m src.run_batch_separation --method nmf --output-tag nmf_full
python -m src.run_batch_demucs --model htdemucs --output-tag demucs_full
```

Frontend:

```bash
cd frontend
npm run dev
```

## Kept In Repo

- production and evaluation code under `src/`
- tests for the implemented pipeline
- Supabase schema docs
- frontend app

## Removed Or De-prioritized

- PCA-based matching and PCA visualization
- placeholder notebooks
- research-only experiment scaffolding
- disposable smoke outputs and oversized Demucs artifacts
