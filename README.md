# Elephant Conservation Platform

A full-stack app we built at HackSMU. It uses signal processing to clean up noisy field recordings and geospatial analysis to track elephant populations and threats.

## What It Does

**Acoustic Separation:** Field recordings are noisy—think generators, vehicles, and wind. We use Non-negative Matrix Factorization (NMF) to separate elephant calls from the background noise. It's unsupervised, requires no training data, and we validated it on 212 field recordings with a 0.72 match score.

**Geospatial Heatmaps:** We use PostgreSQL and PostGIS to map elephant populations, poaching incidents, and habitat boundaries. The frontend renders interactive heatmaps so you can see where conservation efforts are needed most across Africa and Asia.

**Frontend:** A Next.js app with Google Maps, real-time charts, 3D elements, and audio playback for the separated calls.

**AI Assistant:** A built-in Groq-powered chat interface that answers questions about the map data and separation results.

## Quick Start (Docker)

You can run the entire stack (FastAPI backend + Next.js frontend) with one command.

Make sure Docker Desktop is running, then open your terminal and run:

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

This builds the container image, installs all dependencies, and starts both servers. 

Once it's ready, open:
- **App:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

To stop the servers, just press `Ctrl+C`.

## Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/NumPy-013243?style=flat&logo=numpy&logoColor=white" alt="NumPy" />
  <img src="https://img.shields.io/badge/SciPy-8CAAE6?style=flat&logo=scipy&logoColor=white" alt="SciPy" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase" />
</p>