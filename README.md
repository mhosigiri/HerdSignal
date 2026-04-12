# 🐘 Elephant Conservation Platform

> *Listening to the wild, clearing the noise.* A full-stack application built at HackSMU that combines acoustic signal processing and geospatial analysis to support elephant conservation efforts.

---

## 💡 Inspiration
Monitoring endangered elephant populations often relies on acoustic sensors hidden in their habitats. The problem? The wild is noisy. Field recordings are constantly interrupted by airplanes, vehicles, generators, and weather. We wanted to build a tool that could filter out this human and environmental interference, isolating the true sounds of the savannah while simultaneously tracking the animals on a global scale. 

## ⚙️ What it does
Our platform tackles conservation from two angles:
1. **Acoustic Separation:** Users can upload noisy field recordings. Our backend uses Non-negative Matrix Factorization (NMF) to cleanly separate elephant vocalizations from background noise. It's completely unsupervised, requiring no labeled training data.
2. **Geospatial Heatmaps:** A comprehensive map that visualizes elephant population estimates, poaching incidents, and habitat boundaries across Africa and Asia, helping conservationists identify high-risk zones.
3. **AI Assistant:** A Groq-powered chat interface built right into the app that can answer questions about the map data and explain the acoustic separation results.

## 🛠️ How we built it
We split the architecture into a high-performance audio processing backend and an interactive frontend:
- **Backend (Audio/API):** Built with Python and FastAPI. The core separation engine uses `NumPy`, `SciPy`, and `librosa` to compute spectrograms, factorize the matrices, and classify frequency-band energy to isolate the elephant calls. 
- **Frontend:** A Next.js (React) application styled with Tailwind CSS. We integrated Google Maps and Leaflet for the interactive map, Recharts for data visualization, and React Three Fiber for a 3D audio visualizer.
- **Database:** We used Supabase (PostgreSQL) loaded with the PostGIS extension. By using spatial indexing (GiST), the frontend can rapidly query regions and cluster threat incidents.

## 🚧 Challenges we ran into
Our biggest hurdle was the audio separation. Training a deep learning model required massive amounts of clean, labeled data that we simply didn't have during a 24-hour hackathon. We pivoted to an unsupervised mathematical approach (NMF) which required intense tuning of our frequency-band energy ratios to ensure we didn't distort the elephant rumbles while removing generator hums. 

Additionally, rendering continental-scale geospatial data without lagging the browser forced us to deeply optimize our PostGIS queries.

## 🏆 Accomplishments that we're proud of
We validated our NMF separation pipeline across **212 actual field recordings**. It achieved a **0.72 match score** against clean reference calls and demonstrated near-zero noise contamination for vehicle and generator interference. We built a fully working, complex math pipeline and wrapped it in a beautiful, accessible UI.

## 🧠 What we learned
- How to apply advanced signal processing techniques (STFT, NMF, Spectral Gating) to real-world audio problems.
- How to structure and index complex geographic data types (`geography(multipolygon, 4326)`) using PostGIS.
- How to seamlessly connect a Python audio-processing backend with a Next.js frontend using Docker.

## 🚀 What's next
In the future, we want to optimize our NMF pipeline to run on edge devices (like Raspberry Pi) so it can process audio directly in the field. We also plan to integrate live data feeds from existing conservation IoT networks to make the heatmap update in real-time.

---

## 💻 Quick Start (Docker)

You can spin up the entire project (FastAPI backend + Next.js frontend) with a single command. 

Ensure Docker Desktop is running, then execute:

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

Once it builds and starts, access the app:
- **Web App:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

*To stop the servers, just press `Ctrl+C` in your terminal.*

---

## 🧰 Built With

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