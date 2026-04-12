# Frontend Audit Report — Elephant Conservation Platform

## Build: April 11, 2026 | Server: localhost:3000

---

## Executive Summary

The frontend compiles and serves all 4 routes successfully (200 OK). However, **every data-driven feature uses hardcoded mock data** — nothing is connected to the Supabase database. The Supabase client is configured but never imported or called. Several features have UI scaffolding but no real backend logic.

---

## Database vs Frontend Schema Alignment

### Supabase Tables (Actual State)

| Table | Records | Populated? |
|-------|---------|-----------|
| `species` | 3 | ✅ Yes |
| `regions` | 43 | ⚠️ Partial (no boundary/centroid geometries) |
| `population_estimates` | 43 | ✅ Yes (but column names differ from code) |
| `threat_categories` | 6 | ✅ Yes (duplicate: "Poaching" + "Poaching for Ivory") |
| `threat_incidents` | 77 | ✅ Yes (but column names differ from code) |
| `habitats` | 0 | ❌ Empty |
| `migration_corridors` | 0 | ❌ Empty |
| `gps_tracking` | ❌ Table missing | — |
| `audio_recordings` | 0 | ❌ Empty |
| `interventions` | ❌ Table missing | — |

---

## Route-by-Route Audit

### 1. Dashboard (`/`) — ⚠️ Partially Working

**Status**: Renders with stats cards + charts using mock data

**What's Working:**
- Layout renders (sidebar + main content)
- Stats cards display: Total Population (415,000), Species (3), Countries (37), Threat Level
- Population trend chart (Recharts line chart) renders with mock data
- Threat breakdown pie chart renders with mock data
- Species comparison bar chart renders with mock data
- Dark theme styling is applied

**What's NOT Working:**
- ❌ All numbers are **hardcoded** in `mock-data.ts` — not from Supabase
- ❌ Chart data is static — doesn't respond to filters
- ❌ No year selector / time range filter
- ❌ No loading states while data fetches
- ❌ No error handling if Supabase is unreachable

**Mock data source:** `src/lib/api/mock-data.ts` (lines 9-80)

---

### 2. Interactive Map (`/map`) — ⚠️ Partially Working

**Status**: Renders Mapbox map with mock heatmap + markers

**What's Working:**
- Mapbox GL JS map loads with dark theme
- Map is centered on East Africa (zoom 4)
- Navigation controls (zoom, compass) present
- Layer toggle panel renders (5 checkboxes)
- Mock heatmap data renders as colored circles on the map
- Mock migration route renders as a line from Kenya to Tanzania
- Year slider (2016-2024) renders and updates a label

**What's NOT Working:**
- ❌ **Mapbox token is hardcoded** in `ElephantMap.tsx` — needs env var `NEXT_PUBLIC_MAPBOX_TOKEN`
- ❌ Heatmap uses **mock GeoJSON** from `mock-data.ts`, not Supabase
- ❌ Layer toggles call `setVisibility` but **don't re-fetch data** — they just toggle map layer visibility
- ❌ Year slider **changes a label only** — does not filter/re-render data
- ❌ No real-time data updates
- ❌ No popup/info windows when clicking markers
- ❌ Migration route is a single hardcoded line, not from database
- ❌ No threat clustering (mock data is flat points)
- ❌ Audio recording markers not implemented (mock data exists but no layer)

**Mock data source:** `src/lib/api/mock-data.ts` (lines 82-150 for map dataset)

---

### 3. Call Separator (`/separator`) — ❌ Non-Functional

**Status**: UI renders but separation does not work

**What's Working:**
- Upload zone renders (drag & drop area)
- File input accepts audio files
- Noise type selector renders (airplane/car/generator buttons)
- "Separate" button renders
- Before/after audio player UI renders

**What's NOT Working:**
- ❌ **Separator API is unreachable** — `NEXT_PUBLIC_SEPARATOR_API_URL` points to Supabase URL (`rlslfkhudlnefsolymkt.supabase.co`), which is a database, not a separation service
- ❌ POST to `/api/separate` route doesn't exist in the Next.js app (no `app/api/separate/route.ts`)
- ❌ SpectrogramView canvas exists but **no Web Audio API** code to render actual spectrograms
- ❌ No audio processing happens in the browser either
- ❌ No Python backend is running for the separation pipeline
- ❌ After clicking "Separate", the fetch will fail silently

**Root cause:** The separator needs a Python backend (FastAPI/Flask) running on a separate port. The frontend calls `NEXT_PUBLIC_SEPARATOR_API_URL` which currently points to Supabase (wrong).

---

### 4. Voice Mode (`/voice`) — ❌ Non-Functional

**Status**: Three.js scene renders but voice features don't work

**What's Working:**
- Three.js canvas renders with dark background
- Particle field (floating dots) animates
- SoundWave sphere renders (blue distorted sphere)
- Wireframe ring around the sphere renders
- Waveform rings render (20 concentric rings)
- Microphone button renders (blue/red states)
- Auto-rotation of the 3D scene

**What's NOT Working:**
- ❌ **Microphone access** — `navigator.mediaDevices.getUserMedia` likely works but the full STT flow is never completed
- ❌ **Whisper STT** — `OPENAI_API_KEY` is not in `.env` — calls to `api.openai.com` will fail with 401
- ❌ **TTS narration** — `ELEVENLABS_API_KEY` is not in `.env` — calls to ElevenLabs API will fail
- ❌ **GPT explanation** — `/api/explain` route doesn't exist in the Next.js app (no `app/api/explain/route.ts`)
- ❌ The audio visualizer (`audioLevel`, `audioData`) always shows **zero** — no real audio analysis runs
- ❌ Transcript and response bubbles never appear (no successful STT → GPT → TTS flow)

**Root cause:** Three API keys are missing and 2 API routes don't exist.

---

## Column Name Mismatches (Frontend vs Supabase)

### `population_estimates`

| Mock Data Field | Supabase Column | Match? |
|----------------|----------------|--------|
| `year` | `estimate_year` | ❌ **MISMATCH** |
| `population` | `estimate` | ❌ **MISMATCH** |
| `change` | (not in DB) | ❌ **MISSING** |
| `species` | (join via `species_id`) | ❌ **NEEDS JOIN** |
| `region` | (join via `region_id`) | ❌ **NEEDS JOIN** |
| `confidence` | `confidence` | ✅ Match |

### `threat_incidents`

| Mock Data Field | Supabase Column | Match? |
|----------------|----------------|--------|
| `threatType` | (join via `threat_category_id`) | ❌ **NEEDS JOIN** |
| `location.lat` | `location` (geography, not separate columns) | ❌ **SCHEMA MISMATCH** |
| `location.lng` | `location` (single geography column) | ❌ **SCHEMA MISMATCH** |
| `elephantsKilled` | `elephants_killed` | ✅ Match |
| `date` | `incident_date` | ❌ **MISMATCH** |
| `severity` | `severity` | ✅ Match |

### `regions`

| Mock Data Field | Supabase Column | Match? |
|----------------|----------------|--------|
| `name` | `name` | ✅ Match |
| `population` | (in population_estimates, not regions) | ❌ **DIFFERENT TABLE** |
| `coordinates` | `centroid` (null — not populated) | ❌ **NULL** |
| `boundary` | `boundary` (null — not populated) | ❌ **NULL** |

### `species`

| Mock Data Field | Supabase Column | Match? |
|----------------|----------------|--------|
| `name` | `common_name` | ❌ **MISMATCH** |
| `population` | (not in species table) | ❌ **DIFFERENT TABLE** |
| `status` | `iucn_status` | ❌ **MISMATCH** |
| `id` | UUID (not integer) | ❌ **TYPE MISMATCH** |

---

## Supabase Client Integration Status

| Component | File | Imports Supabase? | Uses Real Data? |
|-----------|------|------------------|----------------|
| Dashboard | `overview.ts` | ❌ No | Mock only |
| Map | `mapStore.ts` | ❌ No | Mock only |
| Separator | `SeparatorPanel.tsx` | ❌ No | API call to wrong URL |
| Voice | `VoiceMode.tsx` | ❌ No | API calls to missing routes |
| Supabase client | `lib/supabase/client.ts` | ✅ Exists | **NEVER IMPORTED** |

---

## Missing API Routes (Next.js)

| Route | Called By | Status |
|-------|----------|--------|
| `POST /api/separate` | SeparatorPanel.tsx | ❌ Missing |
| `POST /api/explain` | VoiceMode.tsx | ❌ Missing |
| `GET /api/heatmap` | ElephantMap.tsx | ❌ Missing (map uses inline mock data) |

---

## Missing Environment Variables

| Variable | Used By | Status |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | client.ts | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client.ts | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | — (unused) | ✅ Set |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ElephantMap.tsx | ❌ **NOT SET** (hardcoded) |
| `OPENAI_API_KEY` | VoiceMode.tsx (Whisper) | ❌ **NOT SET** |
| `ELEVENLABS_API_KEY` | VoiceMode.tsx (TTS) | ❌ **NOT SET** |
| `NEXT_PUBLIC_SEPARATOR_API_URL` | SeparatorPanel.tsx | ⚠️ Points to Supabase (wrong) |

---

## All Features NOT Working — Complete List

### 🔴 Critical (Nothing functional)

| # | Feature | Issue | Fix Required |
|---|---------|-------|-------------|
| 1 | **Elephant Separator** | No backend. API URL points to Supabase instead of Python service. No `/api/separate` route. | Deploy Python FastAPI backend + update env var |
| 2 | **Voice STT (Whisper)** | Missing `OPENAI_API_KEY`. No `/api/explain` route. | Add key to `.env` + create route |
| 3 | **Voice TTS (ElevenLabs)** | Missing `ELEVENLABS_API_KEY` | Add key to `.env` |
| 4 | **Database Connection** | Supabase client exists but is never imported anywhere | Replace all mock-data imports with supabase queries |
| 5 | **Real Heatmap Data** | Map uses hardcoded mock GeoJSON | Connect to `population_estimates` + `threat_incidents` via Supabase |

### 🟡 Important (UI exists, data is static)

| # | Feature | Issue | Fix Required |
|---|---------|-------|-------------|
| 6 | **Year Slider** | Changes label text only, doesn't filter data | Wire to Supabase query with `estimate_year` filter |
| 7 | **Layer Toggles** | Toggle map layer visibility but don't re-fetch from DB | Fetch from Supabase when toggled |
| 8 | **Population Chart** | Static mock line chart | Query `population_estimates` grouped by year |
| 9 | **Threat Chart** | Static mock pie chart | Query `threat_incidents` grouped by `threat_category_id` |
| 10 | **Species Comparison** | Static mock bar chart | Query population per species |
| 11 | **Migration Routes** | Single hardcoded line | Query `migration_corridors` (currently 0 records) |
| 12 | **Habitat Polygons** | No layer rendered | Query `habitats` (currently 0 records) |

### 🟢 Minor (UI polish needed)

| # | Feature | Issue | Fix Required |
|---|---------|-------|-------------|
| 13 | **Map Popups** | No info on marker click | Add popup with incident/call details |
| 14 | **Loading States** | No spinners during data fetch | Add Suspense + loading components |
| 15 | **Error Boundaries** | No error handling for failed API calls | Add error components |
| 16 | **Spectrogram** | Canvas exists but renders nothing | Implement Web Audio API spectrogram drawing |
| 17 | **Mapbox Token** | Hardcoded in component, not env var | Move to `NEXT_PUBLIC_MAPBOX_TOKEN` |
| 18 | **Audio Playback** | Player UI exists but no separated audio to play | Requires working separator backend |

---

## What Needs to Change for Supabase Integration

### Step 1: Replace mock data imports with Supabase queries

**Every file in `src/lib/api/` currently imports from `mock-data.ts`:**
```
overview.ts    → imports from mock-data
population.ts  → imports from mock-data
threats.ts     → imports from mock-data
migration.ts   → imports from mock-data
habitats.ts    → imports from mock-data
audio.ts       → imports from mock-data
```

**Each needs to be rewritten to use the Supabase client:**
```typescript
// Before (current)
import { populationTrend } from "@/lib/api/mock-data";

// After (needed)
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getPopulationTrend() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('population_estimates')
    .select('estimate_year, estimate, species_id, region_id, confidence')
    .order('estimate_year');
  if (error) throw error;
  return data;
}
```

### Step 2: Fix column name mismatches

Create a **mapping layer** in the API files:

```typescript
// src/lib/api/mappers.ts
export function mapPopulationRow(row: any) {
  return {
    year: row.estimate_year,
    population: row.estimate,
    confidence: row.confidence,
    speciesId: row.species_id,
    regionId: row.region_id,
  };
}

export function mapThreatIncident(row: any) {
  return {
    id: row.id,
    threatType: row.threat_category_id,
    date: row.incident_date,
    elephantsKilled: row.elephants_killed,
    severity: row.severity,
    ivorySeized: row.ivory_seized_kg,
    location: row.location,
  };
}
```

### Step 3: Create missing API routes

**`app/api/heatmap/route.ts`** — Query Supabase, return GeoJSON for Mapbox
**`app/api/separate/route.ts`** — Proxy to Python separator backend
**`app/api/explain/route.ts`** — Accept query, fetch Supabase data, call GPT

### Step 4: Populate empty Supabase tables

| Table | Records Needed | Data Source |
|-------|---------------|-------------|
| `habitats` | 20+ polygons | WDPA / IUCN range maps |
| `migration_corridors` | 10+ routes | Movebank GPS data |
| `gps_tracking` | Table + 100K+ points | Movebank |
| `audio_recordings` | 44+ entries | Hackathon dataset metadata |
| `interventions` | Table + 50+ entries | Manual compilation |

### Step 5: Populate null columns in existing tables

| Table | Column | Current State | Needed |
|-------|--------|--------------|--------|
| `regions` | `boundary` | All NULL | GeoJSON polygons from Natural Earth |
| `regions` | `centroid` | All NULL | Points from Natural Earth centroids |
| `regions` | `area_sq_km` | All NULL | Computed from boundary geometry |

### Step 6: Add missing environment variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
NEXT_PUBLIC_SEPARATOR_API_URL=http://localhost:8000  # NOT Supabase
```

### Step 7: Fix duplicate in threat_categories

Delete the "Poaching" row (id=6) — keep "Poaching for Ivory" (id=3) which matches the schema guide.

---

## Priority Action Items

| Priority | Action | Effort | Dependencies |
|----------|--------|--------|-------------|
| 🔴 P0 | Replace all mock-data imports with Supabase queries | 4-6 hrs | None |
| 🔴 P0 | Fix column name mappings (year→estimate_year, etc.) | 2 hrs | None |
| 🔴 P0 | Add `NEXT_PUBLIC_MAPBOX_TOKEN` to .env | 5 min | Mapbox account |
| 🟡 P1 | Create `/api/explain` route (GPT integration) | 2 hrs | OpenAI API key |
| 🟡 P1 | Create `/api/heatmap` route (Supabase → GeoJSON) | 3 hrs | P0 items |
| 🟡 P1 | Wire year slider to filter data | 1 hr | P0 items |
| 🟡 P1 | Populate `regions.boundary` + `centroid` | 2 hrs | Natural Earth data |
| 🟡 P2 | Deploy Python separator backend | 6-8 hrs | Docker/Railway |
| 🟡 P2 | Add OpenAI + ElevenLabs keys for voice mode | 30 min | API keys |
| 🟢 P3 | Populate `habitats` table | 3 hrs | WDPA data |
| 🟢 P3 | Populate `migration_corridors` table | 3 hrs | Movebank data |
| 🟢 P3 | Add map popups for markers | 2 hrs | P1 items |
| 🟢 P3 | Add loading/error states | 2 hrs | None |

---

*Audit Report v1.0 — April 11, 2026*
*All 4 routes render (200 OK) but 0 database connections are active*
