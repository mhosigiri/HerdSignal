# Elephant Conservation Platform

A full-stack application built at HackSMU that combines signal processing and geospatial analysis to support elephant conservation efforts.

## What It Does

**Acoustic Separation** -- Field recordings from elephant habitats are full of noise: generators, vehicles, wind, rain. Our backend uses Non-negative Matrix Factorization (NMF) to decompose audio spectrograms into additive components, cleanly isolating elephant vocalizations from background noise. NMF works by factoring a spectrogram matrix V into two non-negative matrices W (spectral bases) and H (activations), then classifying each component as "elephant" or "noise" using frequency-band energy ratios. This is unsupervised -- no labeled training data required -- and has been validated across 212 field recordings with a 0.72 match score and near-zero noise contamination. The separation pipeline runs in three layers: preprocessing (resampling, normalization), NMF separation, and postprocessing (spectral gating, smoothing).

**Geospatial Heatmaps** -- We use PostgreSQL with the PostGIS extension inside Supabase to store and query elephant population estimates, threat incidents, poaching events, and habitat boundaries -- all as geographic data types (`geography(point, 4326)`, `geography(multipolygon, 4326)`). PostGIS spatial indexing (GiST indexes on location, boundary, and centroid columns) lets the frontend query regions, cluster incidents, and render interactive heatmaps showing population density, threat severity, and conservation pressure across Africa and Asia. The schema tracks species, regions, population trends over time, threat categories, and individual incidents with precise coordinates.

**Frontend** -- A Next.js app with interactive maps (Google Maps API + Leaflet), real-time data visualization (Recharts), 3D elements (React Three Fiber), and audio playback of separated elephant calls. State management with Zustand, data fetching with TanStack Query + tRPC, and Supabase for auth and real-time subscriptions.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React 19, TypeScript, Tailwind CSS |
| Maps & Viz | Google Maps API, Leaflet, Recharts, React Three Fiber |
| State & Data | Zustand, TanStack Query, tRPC |
| Backend API | FastAPI, Uvicorn |
| Audio/ML | NMF (NumPy/SciPy/librosa), PyTorch, Asteroid, Demucs |
| Database | PostgreSQL + PostGIS (Supabase) |
| AI | Groq LLM integration |

## Quick Start

```bash
chmod +x setup_and_run.sh
```

The `setup_and_run.sh` script handles everything:

```bash
# Install all dependencies AND start both servers
./setup_and_run.sh

# Install dependencies only (no servers started)
./setup_and_run.sh --install

# Start servers only (skip install, use when deps are already installed)
./setup_and_run.sh --run
```

The script creates a Python virtual environment, installs backend packages from `requirements.txt`, runs `npm install` for the frontend, and launches both servers. The backend runs on `http://localhost:8000` and the frontend on `http://localhost:3000`. Press `Ctrl+C` to stop both.

**Prerequisites:** Python 3.11+, Node.js 18+, npm

## Project Structure

```
elephant-separator/
  api_server.py          # FastAPI server (NMF separation endpoints)
  src/                   # Separation pipeline (preprocess, NMF, postprocess)
  database/              # Supabase PostgreSQL + PostGIS schema
  frontend/              # Next.js app
  models/                # Trained model artifacts
  tests/                 # Backend test suite
```
