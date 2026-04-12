# Supabase Setup

This file defines the database shape for the elephant conservation platform and the exact SQL to run in Supabase.

## Env Check

The active frontend env file is `frontend/.env`.

Current required frontend variables are present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SEPARATOR_API_URL`

Recommended additional variables for future server-side scripts and ETL:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

These recommended keys were added as placeholders to [frontend/.env.example](/Users/arniskc/Desktop/HackSMU/elephant-separator/frontend/.env.example).

## What To Create In Supabase

Run [supabase_schema.sql](/Users/arniskc/Desktop/HackSMU/elephant-separator/database/supabase_schema.sql) in the Supabase SQL Editor.

That SQL creates:

1. Extensions:
   - `postgis`
   - `pgcrypto`
   - `btree_gist`
   - `pg_trgm`
2. Core tables:
   - `species`
   - `regions`
   - `population_estimates`
   - `threat_categories`
   - `threat_incidents`
   - `habitats`
   - `migration_corridors`
   - `gps_tracking_points`
   - `audio_recordings`
   - `audio_annotations`
   - `separation_runs`
3. Read-focused views:
   - `v_population_trend`
   - `v_population_heatmap`
   - `v_threat_map`
   - `v_habitat_map`
   - `v_migration_map`
   - `v_audio_map`
4. Seed data:
   - elephant species
   - top threat categories
5. Supabase access setup:
   - RLS enabled on all tables
   - public read policies for `anon` and `authenticated`
   - no write policies, so writes remain service-role only by default

## Why These Tables Exist

### `species`
Reference table for African savanna, African forest, and Asian elephants.

### `regions`
Countries, protected areas, corridors, survey zones, and landscapes. This is the main geospatial anchor for aggregate map data.

### `population_estimates`
Year-by-year counts by species and region. This powers trend charts and regional heatmaps.

### `threat_categories`
Canonical threat taxonomy for poaching, habitat loss, conflict, drought, and trade pressure.

### `threat_incidents`
Individual mapped conservation events with severity, date, location, and source metadata.

### `habitats`
Polygon or multipolygon habitat boundaries with quality and connectivity scores.

### `migration_corridors`
Line geometries for seasonal or persistent movement routes.

### `gps_tracking_points`
Fine-grained collar telemetry if you ingest movement data later.

### `audio_recordings`
Field recordings tied to geography, noise type, call type, and storage location.

### `audio_annotations`
Call segments inside recordings. This matches your current annotated separator workflow much better than storing only file-level metadata.

### `separation_runs`
Tracks separator jobs, output files, run parameters, and quality metrics.

## How To Run It In Supabase

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Create a new query.
4. Paste the full contents of [supabase_schema.sql](/Users/arniskc/Desktop/HackSMU/elephant-separator/database/supabase_schema.sql).
5. Run the query once.

If it succeeds, you should then see the tables and views in `Table Editor`.

## What The Frontend Should Read First

If you want to replace the current mock frontend data first, start with these views:

- `v_population_heatmap`
- `v_threat_map`
- `v_habitat_map`
- `v_migration_map`
- `v_audio_map`
- `v_population_trend`

Those are the cleanest read models for the Leaflet map and dashboard charts.

## Suggested Import Order

1. Insert `regions`
2. Insert `population_estimates`
3. Insert `threat_incidents`
4. Insert `habitats`
5. Insert `migration_corridors`
6. Insert `audio_recordings`
7. Insert `audio_annotations`
8. Insert `separation_runs`

## Storage Recommendation

Use Supabase Storage buckets for actual audio files:

- `raw-audio`
- `separated-audio`

Then store bucket and object paths in:

- `audio_recordings.storage_bucket`
- `audio_recordings.storage_path`
- `separation_runs.output_storage_bucket`
- `separation_runs.output_storage_path`

## Notes

- The schema uses `uuid` primary keys, which is a better fit for Supabase than `serial`.
- Geospatial columns use PostGIS `geography(...)` types for point, line, and polygon data.
- The anon frontend can read, but cannot write, because the SQL intentionally creates read-only RLS policies.
- If you later want the frontend to submit user-generated data directly, add separate insert/update policies instead of loosening the existing ones.
