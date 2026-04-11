# Elephant Conservation Database — Implementation Guide

## GIS Data, Population Tracking & Habitat Analysis

---

## Database Recommendation

### Why PostgreSQL + PostGIS (Not Redis)

| Factor | PostgreSQL + PostGIS | Redis | MongoDB | Supabase |
|--------|---------------------|-------|---------|----------|
| **Geospatial queries** | ✅ Best-in-class (PostGIS) | ❌ Very limited | ⚠️ Basic 2D indexing | ✅ PostGIS built-in |
| **Heatmap generation** | ✅ ST_AsMVT, ST_AsGeoJSON | ❌ | ⚠️ Manual | ✅ Same as PG |
| **Temporal queries** | ✅ Advanced window functions | ⚠️ Sorted sets only | ✅ Good | ✅ Same as PG |
| **Time-series population data** | ✅ Native | ✅ RedisTimeSeries | ✅ Collections | ✅ Same as PG |
| **GeoJSON output** | ✅ Native | ❌ | ⚠️ Manual | ✅ Native |
| **Vector tiles (Mapbox)** | ✅ ST_AsMVT | ❌ | ❌ | ✅ ST_AsMVT |
| **Real-time updates** | ⚠️ LISTEN/NOTIFY | ✅ Pub/Sub | ✅ Change streams | ✅ Real-time |
| **Free self-host** | ✅ | ✅ | ✅ | ✅ Free tier |
| **Complex JOINs** | ✅ Excellent | ❌ No joins | ⚠️ $lookup | ✅ Same as PG |
| **Full-text search** | ✅ tsvector | ❌ | ✅ Text indexes | ✅ Same as PG |
| **Spatial clustering** | ✅ ST_ClusterDBSCAN | ❌ | ❌ | ✅ Same as PG |

### Recommended Stack

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
│  Next.js (Frontend) ←→ REST/GraphQL API             │
└─────────────┬───────────────────────┬───────────────┘
              │                       │
┌─────────────▼──────────┐  ┌────────▼───────────────┐
│  PostgreSQL + PostGIS   │  │  Redis (Cache Layer)   │
│  - GIS data storage     │  │  - Session cache        │
│  - Population records   │  │  - Query result cache   │
│  - Migration routes     │  │  - Real-time pub/sub    │
│  - Habitat boundaries   │  │  - Rate limiting        │
│  - Poaching incidents   │  │                         │
│  - Audio metadata       │  │                         │
└────────────────────────┘  └─────────────────────────┘
```

**Why this combo:**
- **PostgreSQL + PostGIS** handles all geospatial queries, heatmap generation, and complex data relationships
- **Redis** handles caching, real-time features, and session management (what it's actually good at)
- Do NOT use Redis as your primary database — it lacks geospatial indexing, complex queries, and data durability guarantees needed for GIS

---

## Project Structure

```
elephant-separator/
├── elephant-audio-samples.md          # (existing)
├── elephant-pipeline-guide.md         # (existing)
├── elephant-voice-research.md         # (existing)
├── database/
│   ├── DATABASE_GUIDE.md              # ← THIS FILE
│   ├── init.sql                       # Database schema & seed data
│   ├── migrations/
│   │   ├── 001_create_core_tables.sql
│   │   ├── 002_add_gis_extensions.sql
│   │   ├── 003_seed_population_data.sql
│   │   ├── 004_seed_habitat_data.sql
│   │   ├── 005_seed_migration_data.sql
│   │   ├── 006_seed_threat_data.sql
│   │   └── 007_seed_audio_metadata.sql
│   ├── seed_scripts/
│   │   ├── import_kaggle_population.py
│   │   ├── import_iucn_habitat.py
│   │   ├── import_migration_gps.py
│   │   ├── import_poaching_data.py
│   │   ├── import_habitat_loss.py
│   │   └── import_cites_data.py
│   ├── etl/
│   │   ├── transform_geojson.py       # Convert raw data to PostGIS format
│   │   ├── validate_spatial.py        # Validate geometries
│   │   └── aggregate_population.py    # Roll up population by region/year
│   └── queries/
│       ├── heatmap_population.sql
│       ├── heatmap_migration.sql
│       ├── heatmap_threats.sql
│       ├── population_trend.sql
│       ├── habitat_coverage.sql
│       └── api_queries.sql
├── frontend/
│   ├── FRONTEND_GUIDE.md              # ← Frontend implementation guide
│   └── ...                            # (covered in separate guide)
├── downloaded_data/                   # Raw downloaded datasets
│   ├── gis/
│   ├── conservation/
│   ├── habitat/
│   ├── migration/
│   └── audio/
└── src/
    └── ...                            # (existing separation code)
```

---

## Database Schema

### Tech Stack

| Component | Tool | Install |
|-----------|------|---------|
| Database | PostgreSQL 16+ | `brew install postgresql@16` |
| GIS Extension | PostGIS 3.4+ | `brew install postgis` |
| Cache | Redis 7+ | `brew install redis` |
| ORM | Drizzle ORM (TypeScript) | `npm install drizzle-orm` |
| Migration | dbmate | `brew install dbmate` |
| Geo processing | GDAL/OGR | `brew install gdal` |

### Core Schema (`init.sql`)

```sql
-- ============================================
-- Elephant Conservation Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gist;     -- GiST index for spatial

-- ============================================
-- 1. SPECIES & TAXONOMY
-- ============================================

CREATE TABLE species (
    id              SERIAL PRIMARY KEY,
    scientific_name VARCHAR(200) NOT NULL UNIQUE,
    common_name     VARCHAR(200) NOT NULL,
    iucn_status     VARCHAR(20) DEFAULT 'Unknown',  -- CR, EN, VU, NT, LC
    family          VARCHAR(100),
    genus           VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with elephant species
INSERT INTO species (scientific_name, common_name, iucn_status, family, genus) VALUES
('Loxodonta africana', 'African Savanna Elephant', 'EN', 'Elephantidae', 'Loxodonta'),
('Loxodonta cyclotis', 'African Forest Elephant', 'CR', 'Elephantidae', 'Loxodonta'),
('Elephas maximus', 'Asian Elephant', 'EN', 'Elephantidae', 'Elephas');

-- ============================================
-- 2. REGIONS & COUNTRIES
-- ============================================

CREATE TABLE regions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    region_type     VARCHAR(50) NOT NULL CHECK (region_type IN ('country', 'region', 'protected_area', 'corridor', 'landscape')),
    iso_code        VARCHAR(3),                    -- ISO 3166-1 alpha-3
    continent       VARCHAR(20),
    boundary        GEOGRAPHY(MULTIPOLYGON, 4326), -- PostGIS geography (WGS84)
    area_sq_km      DOUBLE PRECISION,
    centroid        GEOGRAPHY(POINT, 4326),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast boundary queries
CREATE INDEX idx_regions_boundary ON regions USING GIST (boundary);
CREATE INDEX idx_regions_centroid ON regions USING GIST (centroid);
CREATE INDEX idx_regions_type ON regions (region_type);
CREATE INDEX idx_regions_continent ON regions (continent);

-- ============================================
-- 3. POPULATION DATA (Core time-series)
-- ============================================

CREATE TABLE population_estimates (
    id              SERIAL PRIMARY KEY,
    species_id      INTEGER REFERENCES species(id),
    region_id       INTEGER REFERENCES regions(id),
    year            INTEGER NOT NULL,
    estimate        INTEGER,                      -- Point estimate
    estimate_low    INTEGER,                      -- Lower bound
    estimate_high   INTEGER,                      -- Upper bound
    survey_method   VARCHAR(100),                 -- 'aerial_count', 'dung_count', 'individual_id', 'model'
    confidence      VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High
    source          VARCHAR(300),                  -- 'IUCN', 'African Elephant Database', 'CITES', etc.
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries
    UNIQUE(species_id, region_id, year, survey_method)
);

CREATE INDEX idx_pop_species_year ON population_estimates (species_id, year);
CREATE INDEX idx_pop_region ON population_estimates (region_id);
CREATE INDEX idx_pop_source ON population_estimates (source);

-- ============================================
-- 4. THREATS & POPULATION DECLINE CAUSES
-- Top 5 causes of elephant population decline
-- ============================================

CREATE TABLE threat_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL UNIQUE,
    category        VARCHAR(100) NOT NULL,        -- 'direct', 'indirect', 'habitat', 'climate'
    severity        INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5), -- 5 = most severe
    description     TEXT,
    icon            VARCHAR(50),                  -- Emoji or icon name for UI
    color           VARCHAR(7) DEFAULT '#FF0000', -- Hex color for heatmap
    metadata        JSONB DEFAULT '{}'
);

-- Top 5 threats
INSERT INTO threat_categories (name, category, severity, description, icon, color) VALUES
(
    'Poaching for Ivory',
    'direct',
    5,
    'Illegal killing of elephants for their ivory tusks. The single largest driver of elephant population decline in Africa. Between 2010-2014, over 100,000 elephants were killed for ivory.',
    '🦣',
    '#DC2626'
),
(
    'Habitat Loss & Fragmentation',
    'habitat',
    5,
    'Conversion of natural habitats for agriculture, infrastructure, and human settlement. Elephants have lost over 50% of their historic range. Fragmentation isolates populations and blocks migration routes.',
    '🏗️',
    '#F59E0B'
),
(
    'Human-Elephant Conflict',
    'indirect',
    4,
    'Crop raiding by elephants leads to retaliatory killing. As human populations expand into elephant territories, conflict intensifies. Results in injuries and deaths on both sides.',
    '⚔️',
    '#EF4444'
),
(
    'Climate Change & Drought',
    'climate',
    4,
    'Altered rainfall patterns reduce water and food availability. Droughts in Amboseli (2022) killed hundreds of elephants. Changing climate shifts vegetation patterns critical for elephant survival.',
    '🌡️',
    '#F97316'
),
(
    'Illegal Wildlife Trade',
    'direct',
    5,
    'International trafficking of ivory, live elephants, and elephant parts. Despite CITES bans, a thriving black market continues, fueling poaching across Africa and Asia.',
    '💰',
    '#991B1B'
);

-- ============================================
-- 5. THREAT INCIDENTS (Geolocated events)
-- ============================================

CREATE TABLE threat_incidents (
    id              SERIAL PRIMARY KEY,
    threat_id       INTEGER REFERENCES threat_categories(id),
    region_id       INTEGER REFERENCES regions(id),
    location        GEOGRAPHY(POINT, 4326),       -- Incident location
    incident_date   DATE,
    elephants_affected INTEGER DEFAULT 0,
    elephants_killed   INTEGER DEFAULT 0,
    ivory_seized_kg    DOUBLE PRECISION DEFAULT 0,
    description      TEXT,
    source           VARCHAR(300),
    verified         BOOLEAN DEFAULT FALSE,
    metadata         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_threat ON threat_incidents (threat_id);
CREATE INDEX idx_incidents_region ON threat_incidents (region_id);
CREATE INDEX idx_incidents_date ON threat_incidents (incident_date);
CREATE INDEX idx_incidents_location ON threat_incidents USING GIST (location);

-- ============================================
-- 6. HABITAT & RANGE DATA
-- ============================================

CREATE TABLE habitats (
    id              SERIAL PRIMARY KEY,
    species_id      INTEGER REFERENCES species(id),
    region_id       INTEGER REFERENCES regions(id),
    habitat_type    VARCHAR(100),                  -- 'savanna', 'forest', 'grassland', 'wetland', 'desert'
    boundary        GEOGRAPHY(MULTIPOLYGON, 4326), -- Habitat boundary polygon
    area_sq_km      DOUBLE PRECISION,
    quality_score   FLOAT DEFAULT 0.5 CHECK (quality_score BETWEEN 0 AND 1), -- 1=pristine, 0=degraded
    year_assessed   INTEGER,
    vegetation_type VARCHAR(200),
    water_access    BOOLEAN DEFAULT TRUE,
    connectivity    FLOAT DEFAULT 0.5,             -- Corridor connectivity score
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habitats_species ON habitats (species_id);
CREATE INDEX idx_habitats_boundary ON habitats USING GIST (boundary);
CREATE INDEX idx_habitats_type ON habitats (habitat_type);
CREATE INDEX idx_habitats_quality ON habitats (quality_score);

-- ============================================
-- 7. MIGRATION & MOVEMENT DATA
-- ============================================

CREATE TABLE migration_corridors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200),
    species_id      INTEGER REFERENCES species(id),
    corridor_type   VARCHAR(50) DEFAULT 'seasonal', -- 'seasonal', 'dispersal', 'nomadic', 'calving'
    route           GEOGRAPHY(LINESTRING, 4326),   -- Migration path
    width_km        DOUBLE PRECISION DEFAULT 5.0,  -- Corridor width
    season_start    VARCHAR(20),                   -- 'January', 'Dry season', etc.
    season_end      VARCHAR(20),
    distance_km     DOUBLE PRECISION,
    is_active       BOOLEAN DEFAULT TRUE,
    threat_level    INTEGER DEFAULT 1,              -- 1=safe, 5=blocked
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corridors_species ON migration_corridors (species_id);
CREATE INDEX idx_corridors_route ON migration_corridors USING GIST (route);

-- GPS collar tracking points
CREATE TABLE gps_tracking (
    id              SERIAL PRIMARY KEY,
    elephant_id     VARCHAR(100),                   -- Elephant identifier from collar
    species_id      INTEGER REFERENCES species(id),
    timestamp       TIMESTAMPTZ NOT NULL,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh       DOUBLE PRECISION,
    heading         DOUBLE PRECISION,
    temperature     DOUBLE PRECISION,
    activity        VARCHAR(50),                    -- 'walking', 'feeding', 'resting', 'running'
    accuracy_m      DOUBLE PRECISION,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partition GPS tracking by year for performance
CREATE INDEX idx_gps_elephant_time ON gps_tracking (elephant_id, timestamp);
CREATE INDEX idx_gps_location ON gps_tracking USING GIST (location);
CREATE INDEX idx_gps_timestamp ON gps_tracking (timestamp);

-- ============================================
-- 8. AUDIO RECORDINGS & VOCALIZATION DATA
-- (Integrates with elephant separator)
-- ============================================

CREATE TABLE audio_recordings (
    id              SERIAL PRIMARY KEY,
    filename        VARCHAR(500) NOT NULL,
    file_path       VARCHAR(1000),
    species_id      INTEGER REFERENCES species(id),
    region_id       INTEGER REFERENCES regions(id),
    recording_date  DATE,
    location        GEOGRAPHY(POINT, 4326),
    sample_rate_hz  INTEGER DEFAULT 44100,
    duration_sec    DOUBLE PRECISION,
    call_type       VARCHAR(50),                    -- 'rumble', 'trumpet', 'roar', 'scream', 'cry'
    noise_type      VARCHAR(50),                    -- 'airplane', 'car', 'generator', 'none'
    has_mechanical_noise BOOLEAN DEFAULT FALSE,
    separated       BOOLEAN DEFAULT FALSE,          -- Has separation been applied?
    separated_path  VARCHAR(1000),                   -- Path to separated audio
    quality_score   FLOAT,                          -- Separation quality (0-1)
    f0_min_hz       DOUBLE PRECISION,               -- Detected fundamental frequency range
    f0_max_hz       DOUBLE PRECISION,
    num_harmonics   INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_species ON audio_recordings (species_id);
CREATE INDEX idx_audio_call_type ON audio_recordings (call_type);
CREATE INDEX idx_audio_location ON audio_recordings USING GIST (location);
CREATE INDEX idx_audio_separated ON audio_recordings (separated);

-- ============================================
-- 9. CONSERVATION INTERVENTIONS
-- ============================================

CREATE TABLE interventions (
    id              SERIAL PRIMARY KEY,
    region_id       INTEGER REFERENCES regions(id),
    intervention_type VARCHAR(100),                 -- 'anti_poaching', 'corridor_restoration', 'community', 'policy'
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(20) DEFAULT 'ongoing',  -- 'planned', 'ongoing', 'completed', 'cancelled'
    effectiveness   FLOAT,                          -- 0-1 score
    budget_usd      BIGINT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. VIEWS FOR API CONSUMPTION
-- ============================================

-- Population trend view (what the frontend heatmaps need)
CREATE OR REPLACE VIEW v_population_heatmap AS
SELECT
    pe.id,
    s.common_name AS species,
    s.iucn_status,
    r.name AS region,
    r.continent,
    pe.year,
    pe.estimate,
    pe.estimate_low,
    pe.estimate_high,
    pe.confidence,
    r.centroid AS location,
    -- Calculate year-over-year change
    LAG(pe.estimate) OVER (
        PARTITION BY pe.species_id, pe.region_id 
        ORDER BY pe.year
    ) AS prev_estimate,
    pe.estimate - LAG(pe.estimate) OVER (
        PARTITION BY pe.species_id, pe.region_id 
        ORDER BY pe.year
    ) AS change_from_prev_year,
    -- Location as GeoJSON for frontend
    ST_AsGeoJSON(r.centroid) AS location_geojson
FROM population_estimates pe
JOIN species s ON pe.species_id = s.id
JOIN regions r ON pe.region_id = r.id;

-- Threat incidents heatmap view
CREATE OR REPLACE VIEW v_threat_heatmap AS
SELECT
    ti.id,
    tc.name AS threat_type,
    tc.category,
    tc.severity,
    tc.icon,
    tc.color,
    r.name AS region,
    ti.incident_date,
    ti.elephants_killed,
    ti.ivory_seized_kg,
    ST_AsGeoJSON(ti.location) AS location_geojson,
    ST_Y(ti.location::geometry) AS latitude,
    ST_X(ti.location::geometry) AS longitude
FROM threat_incidents ti
JOIN threat_categories tc ON ti.threat_id = tc.id
JOIN regions r ON ti.region_id = r.id;

-- Migration corridors GeoJSON view
CREATE OR REPLACE VIEW v_migration_geojson AS
SELECT
    mc.id,
    mc.name,
    s.common_name AS species,
    mc.corridor_type,
    mc.season_start,
    mc.season_end,
    mc.distance_km,
    mc.is_active,
    mc.threat_level,
    ST_AsGeoJSON(mc.route) AS route_geojson,
    ST_AsGeoJSON(
        ST_Buffer(mc.route::geometry, mc.width_km / 111.32) -- Approximate km to degrees
    ) AS corridor_geojson
FROM migration_corridors mc
JOIN species s ON mc.species_id = s.id;

-- Habitat coverage view
CREATE OR REPLACE VIEW v_habitat_heatmap AS
SELECT
    h.id,
    s.common_name AS species,
    r.name AS region,
    h.habitat_type,
    h.quality_score,
    h.year_assessed,
    h.connectivity,
    h.area_sq_km,
    ST_AsGeoJSON(h.boundary) AS boundary_geojson,
    ST_Centroid(h.boundary::geometry) AS centroid
FROM habitats h
JOIN species s ON h.species_id = s.id
JOIN regions r ON h.region_id = r.id;

-- Audio recordings with location (for map markers)
CREATE OR REPLACE VIEW v_audio_map AS
SELECT
    ar.id,
    ar.filename,
    ar.call_type,
    ar.noise_type,
    ar.separated,
    ar.quality_score,
    r.name AS region,
    ar.recording_date,
    ST_AsGeoJSON(ar.location) AS location_geojson,
    ST_Y(ar.location::geometry) AS latitude,
    ST_X(ar.location::geometry) AS longitude
FROM audio_recordings ar
JOIN regions r ON ar.region_id = r.id
WHERE ar.location IS NOT NULL;
```

---

## Population Decline: Top 5 Causes (Data)

### 1. Poaching for Ivory
| Metric | Value | Source |
|--------|-------|--------|
| Peak poaching years | 2010-2012 | CITES / MIKE |
| Elephants killed for ivory (2010-2014) | ~100,000 | Great Elephant Census |
| Annual illegal killing rate (PIKE) | Peaked at 0.83 in 2011 | CITES MIKE Program |
| Ivory price (per kg, black market) | $700-$2,100 | TRAFFIC |
| Major trafficking routes | East Africa → Asia | UNODC |
| Countries with highest poaching | Tanzania, Mozambique, DRC | IUCN |

### 2. Habitat Loss & Fragmentation
| Metric | Value | Source |
|--------|-------|--------|
| Historic range lost | ~50% | IUCN SSC |
| Current African elephant range | ~3.4 million km² | African Elephant Database |
| Annual habitat conversion | ~2-3% of remaining | WWF |
| Key drivers | Agriculture (40%), Infrastructure (25%), Logging (20%) | CBD |
| Elephant population in fragmented areas | ~60% | IUCN |

### 3. Human-Elephant Conflict
| Metric | Value | Source |
|--------|-------|--------|
| Countries with significant HEC | 38 in Africa, 13 in Asia | IUCN |
| Annual human deaths from elephants | ~400-500 globally | Various |
| Annual crop damage incidents | ~50,000+ | WWF |
| Cost of crop damage (annual) | $1-2 billion | Various |
| Retaliatory killings per year | ~100-200 | Elephant Voices |

### 4. Climate Change & Drought
| Metric | Value | Source |
|--------|-------|--------|
| Amboseli 2022 drought deaths | 400+ elephants | Kenya Wildlife Service |
| Water-dependent populations | ~70% | IUCN |
| Predicted range shift by 2050 | 40-70% reduction in suitable habitat | Nature Climate Change |
| Drought frequency increase (2100) | 2-3x current | IPCC |
| Impact on calf survival | 30-50% reduction during drought | Amboseli Trust |

### 5. Illegal Wildlife Trade
| Metric | Value | Source |
|--------|-------|--------|
| Ivory seizures (2019) | 44,000 kg globally | ETIS |
| Largest consumer markets | China, Thailand, Vietnam | TRAFFIC |
| Online ivory listings (2020) | ~1,800 across 9 platforms | WWF |
| Live elephant trade (2010-2019) | ~2,000+ exported | CITES |
| Trade routes | Africa → Middle East → Asia | UNODC |

---

## ETL Pipeline: Importing Downloaded Datasets

### Installation

```bash
# Database
brew install postgresql@16
brew install postgis
brew install redis
brew install gdal          # For ogr2ogr GeoJSON processing

# Python ETL dependencies
pip install psycopg2-binary sqlalchemy geoalchemy2 pandas shapely pyproj
pip install requests kaggle  # For downloading datasets
```

### Database Setup

```bash
# Start PostgreSQL
brew services start postgresql@16
brew services start redis

# Create database
createdb elephant_conservation

# Enable PostGIS
psql elephant_conservation -c "CREATE EXTENSION postgis;"

# Run schema
psql elephant_conservation -f database/init.sql
```

### ETL Script: Population Data (`import_kaggle_population.py`)

```python
#!/usr/bin/env python3
"""
Import elephant population data from CSV/Excel into PostgreSQL.
Expects columns: country, year, estimate, species, source, survey_method
"""

import pandas as pd
from sqlalchemy import create_engine, text
import geopandas as gpd
from pathlib import Path

DB_URL = "postgresql://localhost/elephant_conservation"

def import_population_csv(csv_path: str):
    """Import population estimates from CSV."""
    engine = create_engine(DB_URL)
    df = pd.read_csv(csv_path)

    # Standardize column names
    df.columns = df.columns.str.lower().str.strip()

    # Map country names to region IDs
    with engine.connect() as conn:
        regions = pd.read_sql("SELECT id, name, iso_code FROM regions", conn)

    country_to_id = dict(zip(regions['name'], regions['id']))

    # Map species names
    species_map = {
        'african savanna elephant': 1,
        'african forest elephant': 2,
        'asian elephant': 3,
        'loxodonta africana': 1,
        'loxodonta cyclotis': 2,
        'elephas maximus': 3,
        'african elephant': 1,  # Default to savanna
    }

    for _, row in df.iterrows():
        region_id = country_to_id.get(row.get('country'), row.get('region_id'))
        species_id = species_map.get(str(row.get('species', '')).lower(), 1)

        if region_id is None:
            # Insert new region
            with engine.connect() as conn:
                result = conn.execute(text(
                    "INSERT INTO regions (name, region_type, continent) "
                    "VALUES (:name, 'country', :continent) RETURNING id"
                ), {"name": row['country'], "continent": row.get('continent', 'Africa')})
                region_id = result.fetchone()[0]
                country_to_id[row['country']] = region_id
                conn.commit()

        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO population_estimates
                    (species_id, region_id, year, estimate, estimate_low, estimate_high,
                     survey_method, confidence, source, notes)
                VALUES
                    (:species_id, :region_id, :year, :estimate, :estimate_low, :estimate_high,
                     :survey_method, :confidence, :source, :notes)
                ON CONFLICT (species_id, region_id, year, survey_method) DO UPDATE
                SET estimate = EXCLUDED.estimate
            """), {
                "species_id": species_id,
                "region_id": region_id,
                "year": int(row['year']),
                "estimate": row.get('estimate'),
                "estimate_low": row.get('estimate_low'),
                "estimate_high": row.get('estimate_high'),
                "survey_method": row.get('survey_method', 'aerial_count'),
                "confidence": row.get('confidence', 'Medium'),
                "source": row.get('source', 'Kaggle'),
                "notes": row.get('notes'),
            })
            conn.commit()

    print(f"Imported {len(df)} population records from {csv_path}")


def import_threat_incidents(csv_path: str, threat_type: str):
    """Import geolocated threat incidents from CSV."""
    engine = create_engine(DB_URL)
    df = pd.read_csv(csv_path)

    threat_map = {
        'poaching': 1,
        'ivory': 1,
        'habitat_loss': 2,
        'human_conflict': 3,
        'climate': 4,
        'wildlife_trade': 5,
    }

    threat_id = threat_map.get(threat_type.lower(), 1)

    for _, row in df.iterrows():
        lat = row.get('latitude', row.get('lat'))
        lon = row.get('longitude', row.get('lng', row.get('lon')))

        if pd.notna(lat) and pd.notna(lon):
            with engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO threat_incidents
                        (threat_id, region_id, location, incident_date,
                         elephants_killed, ivory_seized_kg, description, source)
                    VALUES
                        (:threat_id, 1, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                         :date, :killed, :ivory_kg, :desc, :source)
                """), {
                    "threat_id": threat_id,
                    "lon": float(lon),
                    "lat": float(lat),
                    "date": row.get('date'),
                    "killed": row.get('elephants_killed', 0),
                    "ivory_kg": row.get('ivory_seized_kg', 0),
                    "desc": row.get('description'),
                    "source": row.get('source', 'Imported'),
                })
                conn.commit()

    print(f"Imported {len(df)} threat incidents ({threat_type})")


def import_migration_geojson(geojson_path: str):
    """Import migration routes from GeoJSON."""
    engine = create_engine(DB_URL)
    gdf = gpd.read_file(geojson_path)

    # Ensure WGS84
    if gdf.crs is None:
        gdf = gdf.set_crs('EPSG:4326')
    gdf = gdf.to_crs('EPSG:4326')

    with engine.connect() as conn:
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom.geom_type == 'LineString':
                conn.execute(text("""
                    INSERT INTO migration_corridors
                        (name, species_id, corridor_type, route, distance_km,
                         season_start, season_end, is_active, description)
                    VALUES
                        (:name, 1, :type, ST_SetSRID(:geom::geometry, 4326)::geography,
                         :distance, :season_start, :season_end, true, :desc)
                """), {
                    "name": row.get('name', f"Route_{row.name}"),
                    "type": row.get('corridor_type', 'seasonal'),
                    "geom": geom.wkt,
                    "distance": row.get('distance_km'),
                    "season_start": row.get('season_start'),
                    "season_end": row.get('season_end'),
                    "desc": row.get('description'),
                })
        conn.commit()

    print(f"Imported {len(gdf)} migration corridors from {geojson_path}")


def import_habitat_geojson(geojson_path: str):
    """Import habitat boundaries from GeoJSON."""
    engine = create_engine(DB_URL)
    gdf = gpd.read_file(geojson_path)

    if gdf.crs is None:
        gdf = gdf.set_crs('EPSG:4326')
    gdf = gdf.to_crs('EPSG:4326')

    with engine.connect() as conn:
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom.geom_type in ('Polygon', 'MultiPolygon'):
                # Calculate area in km²
                area = gpd.GeoSeries([geom], crs='EPSG:4326').to_crs('EPSG:3857').area.iloc[0] / 1e6

                conn.execute(text("""
                    INSERT INTO habitats
                        (species_id, habitat_type, boundary, area_sq_km,
                         quality_score, year_assessed, connectivity)
                    VALUES
                        (1, :type, ST_SetSRID(:geom::geometry, 4326)::geography,
                         :area, :quality, :year, 0.5)
                """), {
                    "type": row.get('habitat_type', 'savanna'),
                    "geom": geom.wkt,
                    "area": area,
                    "quality": row.get('quality_score', 0.5),
                    "year": row.get('year_assessed', 2024),
                })
        conn.commit()

    print(f"Imported {len(gdf)} habitat polygons from {geojson_path}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--population', help='CSV file with population data')
    parser.add_argument('--threats', help='CSV file with threat incidents')
    parser.add_argument('--threat-type', default='poaching', help='Type of threat')
    parser.add_argument('--migration', help='GeoJSON file with migration routes')
    parser.add_argument('--habitat', help='GeoJSON file with habitat boundaries')
    args = parser.parse_args()

    if args.population:
        import_population_csv(args.population)
    if args.threats:
        import_threat_incidents(args.threats, args.threat_type)
    if args.migration:
        import_migration_geojson(args.migration)
    if args.habitat:
        import_habitat_geojson(args.habitat)
```

---

## Key API Queries for Frontend

### Heatmap: Population Density by Year
```sql
-- Returns data for frontend heatmap rendering
SELECT
    s.common_name AS species,
    r.name AS region,
    pe.year,
    pe.estimate AS population,
    ST_Y(r.centroid::geometry) AS lat,
    ST_X(r.centroid::geometry) AS lng,
    pe.estimate - COALESCE(
        LAG(pe.estimate) OVER (
            PARTITION BY pe.species_id, pe.region_id ORDER BY pe.year
        ), pe.estimate
    ) AS yoy_change
FROM population_estimates pe
JOIN species s ON pe.species_id = s.id
JOIN regions r ON pe.region_id = r.id
WHERE pe.year = :year
ORDER BY pe.estimate DESC;
```

### Heatmap: Threat Incidents (Clustered)
```sql
-- Cluster incidents into heatmap cells
SELECT
    tc.name AS threat_type,
    tc.color,
    tc.icon,
    COUNT(*) AS incident_count,
    SUM(ti.elephants_killed) AS total_killed,
    ST_Y(ST_Centroid(ST_Collect(ti.location::geometry))) AS lat,
    ST_X(ST_Centroid(ST_Collect(ti.location::geometry))) AS lng
FROM threat_incidents ti
JOIN threat_categories tc ON ti.threat_id = tc.id
WHERE ti.incident_date BETWEEN :start_date AND :end_date
GROUP BY tc.name, tc.color, tc.icon;
```

### Migration Routes as GeoJSON
```sql
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(mc.route::geometry)::json,
            'properties', json_build_object(
                'name', mc.name,
                'species', s.common_name,
                'type', mc.corridor_type,
                'distance', mc.distance_km,
                'season', mc.season_start || ' - ' || mc.season_end,
                'threatLevel', mc.threat_level,
                'active', mc.is_active
            )
        )
    )
) AS geojson
FROM migration_corridors mc
JOIN species s ON mc.species_id = s.id;
```

### Habitat Coverage as GeoJSON (for map polygons)
```sql
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(h.boundary::geometry)::json,
            'properties', json_build_object(
                'species', s.common_name,
                'habitatType', h.habitat_type,
                'quality', h.quality_score,
                'areaKm2', h.area_sq_km,
                'connectivity', h.connectivity,
                'year', h.year_assessed
            )
        )
    )
) AS geojson
FROM habitats h
JOIN species s ON h.species_id = s.id;
```

### Population Trend Over Time (for charts)
```sql
SELECT
    year,
    SUM(estimate) AS total_africa,
    SUM(CASE WHEN species_id = 1 THEN estimate ELSE 0 END) AS savanna,
    SUM(CASE WHEN species_id = 2 THEN estimate ELSE 0 END) AS forest
FROM population_estimates
WHERE year BETWEEN :start_year AND :end_year
GROUP BY year
ORDER BY year;
```

### Audio Recording Locations
```sql
SELECT
    ar.filename,
    ar.call_type,
    ar.noise_type,
    ar.separated,
    ar.quality_score,
    ST_Y(ar.location::geometry) AS lat,
    ST_X(ar.location::geometry) AS lng,
    ar.recording_date,
    r.name AS region
FROM audio_recordings ar
JOIN regions r ON ar.region_id = r.id
WHERE ar.location IS NOT NULL
ORDER BY ar.recording_date DESC;
```

---

## Redis: What to Actually Use It For

```python
# redis_config.py - Redis as caching layer, NOT primary DB

import redis
import json
import hashlib

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def cache_key(query: str, params: dict) -> str:
    """Generate deterministic cache key."""
    raw = f"{query}:{json.dumps(params, sort_keys=True)}"
    return f"elephant:cache:{hashlib.md5(raw.encode()).hexdigest()}"

def get_cached(query: str, params: dict, ttl: int = 3600):
    """Get cached query result."""
    key = cache_key(query, params)
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    return None

def set_cached(query: str, params: dict, data: dict, ttl: int = 3600):
    """Cache query result with TTL."""
    key = cache_key(query, params)
    r.setex(key, ttl, json.dumps(data))

def publish_event(channel: str, event: dict):
    """Publish real-time event (e.g., new threat incident)."""
    r.publish(f"elephant:{channel}", json.dumps(event))

# Usage in API
def get_population_heatmap(year: int):
    cache = get_cached("population_heatmap", {"year": year})
    if cache:
        return cache

    # Query PostgreSQL...
    result = query_postgres(year)

    set_cached("population_heatmap", {"year": year}, result, ttl=3600)
    return result
```

**Redis use cases in this project:**
| Use Case | Redis Feature | TTL |
|----------|--------------|-----|
| Heatmap query results | GET/SETEX | 1 hour |
| Session management | SET with EX | 24 hours |
| Real-time incident alerts | PUBLISH/SUBSCRIBE | — |
| API rate limiting | INCR + EXPIRE | 1 minute |
| Audio processing queue | LPUSH/BRPOP | — |
| Frontend WebSocket cache | Hash | 5 minutes |

---

## Environment Setup (One Command)

```bash
# Full database stack setup
brew install postgresql@16 postgis redis gdal
brew services start postgresql@16
brew services start redis

# Create and initialize database
createdb elephant_conservation
psql elephant_conservation -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run all migrations
for f in database/migrations/*.sql; do
    psql elephant_conservation -f "$f"
    echo "Applied: $f"
done

# Python ETL
pip install psycopg2-binary sqlalchemy geoalchemy2 pandas geopandas shapely pyproj requests

# Verify
psql elephant_conservation -c "SELECT PostGIS_Version();"
# Should return: 3.x.x
```

---

*Database Implementation Guide v1.0*
*Date: April 11, 2026*
