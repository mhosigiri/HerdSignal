# Elephant Conservation Platform

A full-stack application built at HackSMU that combines signal processing and geospatial analysis to support elephant conservation efforts.

## What It Does

**Acoustic Separation** -- Field recordings from elephant habitats are full of noise: generators, vehicles, wind, rain. Our backend uses Non-negative Matrix Factorization (NMF) to decompose audio spectrograms into additive components, cleanly isolating elephant vocalizations from background noise. NMF works by factoring a spectrogram matrix V into two non-negative matrices W (spectral bases) and H (activations), then classifying each component as "elephant" or "noise" using frequency-band energy ratios. This is unsupervised -- no labeled training data required -- and has been validated across 212 field recordings with a 0.72 match score and near-zero noise contamination. The separation pipeline runs in three layers: preprocessing (resampling, normalization), NMF separation, and postprocessing (spectral gating, smoothing).

**Geospatial Heatmaps** -- We use PostgreSQL with the PostGIS extension inside Supabase to store and query elephant population estimates, threat incidents, poaching events, and habitat boundaries -- all as geographic data types (`geography(point, 4326)`, `geography(multipolygon, 4326)`). PostGIS spatial indexing (GiST indexes on location, boundary, and centroid columns) lets the frontend query regions, cluster incidents, and render interactive heatmaps showing population density, threat severity, and conservation pressure across Africa and Asia. The schema tracks species, regions, population trends over time, threat categories, and individual incidents with precise coordinates.

**Frontend** -- A Next.js app with interactive maps (Google Maps API + Leaflet), real-time data visualization (Recharts), 3D elements (React Three Fiber), and audio playback of separated elephant calls. State management with Zustand, data fetching with TanStack Query + tRPC, and Supabase for auth and real-time subscriptions.

**AI Assistant** -- A Groq-powered LLM chat interface embedded in the app that answers questions about elephant conservation, explains separation results, and narrates map data in natural language.

## App Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with project overview and entry points |
| `/map` | Interactive geospatial heatmap of elephant populations, threat incidents, and habitat boundaries across Africa and Asia |
| `/separator` | Upload a field recording and receive a separated elephant call with before/after spectrograms and audio playback |
| `/voice` | 3D soundwave visualizer with AI-narrated insights about the selected region or recording |

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

## How to Run This Project (Step by Step)

You don't need any programming experience to run this. Just follow these steps.

### Step 1: Install Docker Desktop

Docker is a free tool that packages everything the app needs into a single container so it runs the same on any computer. Download and install it for your operating system:

- **Mac:** https://docs.docker.com/desktop/setup/install/mac-install/
- **Windows:** https://docs.docker.com/desktop/setup/install/windows-install/
- **Linux:** https://docs.docker.com/desktop/setup/install/linux/

After installing, open Docker Desktop and wait until you see "Docker Desktop is running" (the whale icon in your menu bar / system tray should be steady, not animating).

### Step 2: Download the Project

If you have the project as a ZIP file, unzip it to any folder on your computer.

If you have Git installed, you can also clone it:

```bash
git clone <repository-url>
cd HackSMU
```

### Step 3: Configure Environment Variables

The app requires API keys for the Google Maps, Supabase, and Groq services. Copy the example files and fill in your keys:

```bash
# Root .env (Groq API key for the AI assistant)
cp .env.example .env

# Frontend .env (Supabase, Google Maps, and separator API URL)
cp elephant-separator/frontend/.env.example elephant-separator/frontend/.env
```

The variables you need to set:

| Variable | Where | Description |
|----------|-------|-------------|
| `GROQ_API_KEY` | `.env` | Groq API key — get one free at https://console.groq.com |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | `frontend/.env` | Supabase service role key (server-side only) |
| `SUPABASE_DB_URL` | `frontend/.env` | PostgreSQL connection string from Supabase |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `frontend/.env` | Google Maps JavaScript API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_ID` | `frontend/.env` | Google Maps Map ID for custom styling |
| `NEXT_PUBLIC_SEPARATOR_API_URL` | `frontend/.env` | URL of the FastAPI backend (default: `http://localhost:8000`) |

### Step 4: Open a Terminal

- **Mac:** Open the **Terminal** app (search "Terminal" in Spotlight with Cmd + Space)
- **Windows:** Open **PowerShell** (search "PowerShell" in the Start menu)
- **Linux:** Open your terminal emulator

Navigate to the project folder. For example, if you unzipped it to your Desktop:

```bash
cd ~/Desktop/HackSMU
```

### Step 5: Run the Setup Script

First, make the script executable (you only need to do this once):

```bash
chmod +x setup_and_run.sh
```

Then run it:

```bash
./setup_and_run.sh
```

This single command does everything automatically:
1. Builds a Docker image with Python 3.11.9 and Node.js 20
2. Installs all backend and frontend libraries inside the container
3. Starts both servers

The first run will take a few minutes while it downloads and installs everything. After that, subsequent runs are much faster.

### Step 6: Open the App

Once you see the message that both servers are running, open your web browser and go to:

- **Frontend (the app):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API docs (Swagger UI):** http://localhost:8000/docs

### Step 7: Stop the App

Press `Ctrl+C` in the terminal to stop the app.

### Additional Commands

The setup script supports three modes:

| Command | What it does |
|---------|--------------|
| `./setup_and_run.sh` | Build the image and start the container (full setup) |
| `./setup_and_run.sh --build` | Build the image only, without starting the container |
| `./setup_and_run.sh --run` | Start the container only (use after you've already built once) |

After the first full run, you can use `./setup_and_run.sh --run` to start the app instantly without rebuilding.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Docker is not installed" error | Make sure Docker Desktop is installed and running |
| "Cannot connect to the Docker daemon" | Open Docker Desktop and wait for it to fully start |
| Port 3000 or 8000 already in use | Close any other apps using those ports, or restart your computer |
| Build fails on Windows | Make sure you're using PowerShell, not Command Prompt |
| Map is blank | Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `frontend/.env` |
| Separator returns an error | The FastAPI server may still be starting up — wait 10 seconds and try again |
| No data on the heatmap | Verify your Supabase credentials and that the schema has been applied (see `database/supabase_schema.sql`) |

## Running Without Docker (Development)

If you want to run the backend and frontend separately for local development:

**Backend (FastAPI):**

```bash
cd elephant-separator
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (Next.js):**

```bash
cd elephant-separator/frontend
npm install
npm run dev
```

**Backend test suite:**

```bash
cd elephant-separator
source .venv/bin/activate
python -m pytest -q
```

**Run the NMF batch separation pipeline** (processes all recordings in `data/`):

```bash
python -m src.run_batch_separation --method nmf --output-tag nmf_full
```

## NMF Separation — How It Works

```
Field Recording (WAV)
        │
        ▼
┌─────────────────────────────┐
│  Layer 1 — Preprocessing    │
│  • Resample to 44 100 Hz    │
│  • Normalize amplitude      │
│  • Compute STFT spectrogram │
│    (n_fft=1024, hop=256)    │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Layer 2 — NMF Separation   │
│  • Factor V ≈ W × H         │
│  • Classify components by   │
│    frequency-band energy    │
│    ratio (elephant vs noise)│
│  • Reconstruct elephant mask│
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Layer 3 — Postprocessing   │
│  • Spectral gating          │
│  • Temporal smoothing       │
│  • iSTFT → WAV export       │
└────────────┬────────────────┘
             │
             ▼
  Clean Elephant Call (WAV)
  + Spectrogram PNG
```

Validated across **212 field recordings**: 0.72 cosine match score against clean reference calls, near-zero noise contamination for vehicle and generator noise.

## Database Schema

The PostGIS schema (in `elephant-separator/database/supabase_schema.sql`) defines:

- **`species`** — African and Asian elephant subspecies with IUCN status
- **`regions`** — habitat polygons (`geography(multipolygon, 4326)`) with country and biome
- **`population_estimates`** — time-series population counts per region
- **`threat_incidents`** — point locations (`geography(point, 4326)`) of poaching, habitat loss, and human-wildlife conflict events with severity scores
- **`habitat_boundaries`** — protected area polygons for national parks and reserves

GiST spatial indexes on all geometry columns keep heatmap queries fast even at continental scale.

## Project Structure

```
HackSMU/
  Dockerfile               # Container definition (Python 3.11.9 + Node 20)
  entrypoint.sh             # Starts both servers inside the container
  setup_and_run.sh          # One-command setup script
  .env                      # Root environment variables (Groq API key)
  elephant-separator/
    api_server.py           # FastAPI server (NMF separation endpoints)
    requirements.txt        # Python dependencies
    src/
      layer1_preprocess.py  # Resampling, normalization, STFT
      layer2_separate.py    # NMF source separation
      layer3_postprocess.py # Spectral gating, smoothing, iSTFT
      run_batch_separation.py  # Batch runner for all recordings
      run_batch_demucs.py   # Demucs comparison runner
      evaluate.py           # Match-score evaluation
      visualize.py          # Spectrogram PNG export
    database/
      supabase_schema.sql   # Full PostGIS schema
    frontend/
      .env                  # Frontend environment variables
      src/app/
        page.tsx            # Landing page
        map/page.tsx        # Geospatial heatmap
        separator/page.tsx  # Audio separation UI
        voice/page.tsx      # 3D voice visualizer
    models/                 # Trained model artifacts
    tests/                  # Backend test suite
    results/
      separated_calls/      # Generated WAV outputs
      spectrograms/         # Generated spectrogram PNGs
```
