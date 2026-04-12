-- =========================================================
-- Elephant Conservation Platform
-- Supabase PostgreSQL + PostGIS schema
-- Run this in the Supabase SQL Editor
-- =========================================================

begin;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;

set search_path = public, extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1. Reference tables
-- =========================================================

create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null unique,
  common_name text not null,
  short_code text not null unique,
  iucn_status text not null default 'Unknown'
    check (iucn_status in ('CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'EW', 'EX', 'Unknown')),
  family text,
  genus text,
  native_range text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region_type text not null
    check (region_type in ('country', 'region', 'protected_area', 'corridor', 'landscape', 'survey_zone')),
  iso_code text,
  continent text,
  country_name text,
  boundary geography(multipolygon, 4326),
  centroid geography(point, 4326),
  area_sq_km double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, region_type)
);

create index if not exists idx_regions_boundary on public.regions using gist (boundary);
create index if not exists idx_regions_centroid on public.regions using gist (centroid);
create index if not exists idx_regions_region_type on public.regions (region_type);
create index if not exists idx_regions_continent on public.regions (continent);

-- =========================================================
-- 2. Population and conservation pressure
-- =========================================================

create table if not exists public.population_estimates (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  estimate_year integer not null check (estimate_year between 1900 and 2100),
  estimate integer,
  estimate_low integer,
  estimate_high integer,
  survey_method text,
  confidence text default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  source_name text,
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (species_id, region_id, estimate_year, survey_method)
);

create index if not exists idx_population_species_year
  on public.population_estimates (species_id, estimate_year);
create index if not exists idx_population_region_year
  on public.population_estimates (region_id, estimate_year);

create table if not exists public.threat_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null
    check (category in ('direct', 'indirect', 'habitat', 'climate', 'disease', 'policy')),
  severity integer not null default 1 check (severity between 1 and 5),
  icon text,
  color text not null default '#DC2626',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.threat_incidents (
  id uuid primary key default gen_random_uuid(),
  threat_category_id uuid not null references public.threat_categories(id) on delete restrict,
  species_id uuid references public.species(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  title text not null,
  description text,
  incident_date date,
  severity integer check (severity between 1 and 5),
  elephants_affected integer default 0,
  elephants_killed integer default 0,
  ivory_seized_kg double precision default 0,
  location geography(point, 4326),
  source_name text,
  source_url text,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_threat_incidents_category
  on public.threat_incidents (threat_category_id, incident_date desc);
create index if not exists idx_threat_incidents_region
  on public.threat_incidents (region_id);
create index if not exists idx_threat_incidents_location
  on public.threat_incidents using gist (location);

-- =========================================================
-- 3. Habitat and movement
-- =========================================================

create table if not exists public.habitats (
  id uuid primary key default gen_random_uuid(),
  species_id uuid references public.species(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  habitat_type text not null
    check (habitat_type in ('savanna', 'forest', 'grassland', 'wetland', 'desert', 'mixed', 'corridor')),
  boundary geography(multipolygon, 4326),
  centroid geography(point, 4326),
  area_sq_km double precision,
  year_assessed integer check (year_assessed between 1900 and 2100),
  quality_score numeric(4,3) default 0.500 check (quality_score between 0 and 1),
  connectivity_score numeric(4,3) default 0.500 check (connectivity_score between 0 and 1),
  protection_status text,
  source_name text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habitats_species on public.habitats (species_id, year_assessed);
create index if not exists idx_habitats_region on public.habitats (region_id);
create index if not exists idx_habitats_boundary on public.habitats using gist (boundary);
create index if not exists idx_habitats_centroid on public.habitats using gist (centroid);

create table if not exists public.migration_corridors (
  id uuid primary key default gen_random_uuid(),
  species_id uuid references public.species(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  corridor_type text not null default 'seasonal'
    check (corridor_type in ('seasonal', 'dispersal', 'nomadic', 'calving', 'daily')),
  route geography(linestring, 4326),
  start_point geography(point, 4326),
  end_point geography(point, 4326),
  width_km double precision,
  distance_km double precision,
  season_start text,
  season_end text,
  threat_level integer default 1 check (threat_level between 1 and 5),
  is_active boolean not null default true,
  source_name text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_corridors_species on public.migration_corridors (species_id, is_active);
create index if not exists idx_corridors_route on public.migration_corridors using gist (route);
create index if not exists idx_corridors_start_point on public.migration_corridors using gist (start_point);
create index if not exists idx_corridors_end_point on public.migration_corridors using gist (end_point);

create table if not exists public.gps_tracking_points (
  id uuid primary key default gen_random_uuid(),
  elephant_tag text not null,
  species_id uuid references public.species(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  observed_at timestamptz not null,
  location geography(point, 4326) not null,
  speed_kmh double precision,
  heading_degrees double precision,
  temperature_c double precision,
  activity text,
  source_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gps_tag_time
  on public.gps_tracking_points (elephant_tag, observed_at desc);
create index if not exists idx_gps_region_time
  on public.gps_tracking_points (region_id, observed_at desc);
create index if not exists idx_gps_location
  on public.gps_tracking_points using gist (location);

-- =========================================================
-- 4. Audio and separator pipeline
-- =========================================================

create table if not exists public.audio_recordings (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_bucket text,
  storage_path text,
  species_id uuid references public.species(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  recorded_at timestamptz,
  location geography(point, 4326),
  sample_rate_hz integer default 44100,
  duration_seconds numeric(10,3),
  channels integer default 1,
  call_type text
    check (call_type in ('rumble', 'trumpet', 'roar', 'scream', 'cry', 'mixed', 'unknown')),
  noise_type text
    check (noise_type in ('airplane', 'car', 'vehicle', 'generator', 'wind', 'none', 'unknown')),
  has_mechanical_noise boolean not null default false,
  source_name text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_audio_recordings_filename
  on public.audio_recordings (filename);
create index if not exists idx_audio_recordings_location
  on public.audio_recordings using gist (location);
create index if not exists idx_audio_recordings_call_type
  on public.audio_recordings (call_type, noise_type);

create table if not exists public.audio_annotations (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.audio_recordings(id) on delete cascade,
  selection_label text,
  start_seconds numeric(10,3) not null check (start_seconds >= 0),
  end_seconds numeric(10,3) not null check (end_seconds > start_seconds),
  call_type text not null default 'rumble',
  confidence text default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  annotated_by text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audio_annotations_recording
  on public.audio_annotations (recording_id, start_seconds);

create table if not exists public.separation_runs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.audio_recordings(id) on delete cascade,
  output_recording_id uuid references public.audio_recordings(id) on delete set null,
  model_name text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  output_storage_bucket text,
  output_storage_path text,
  quality_score numeric(4,3) check (quality_score between 0 and 1),
  metrics jsonb not null default '{}'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_separation_runs_recording
  on public.separation_runs (recording_id, created_at desc);
create index if not exists idx_separation_runs_status
  on public.separation_runs (status, created_at desc);

-- =========================================================
-- 5. Dashboard-friendly views
-- =========================================================

create or replace view public.v_population_trend as
select
  pe.id,
  pe.estimate_year,
  pe.estimate,
  pe.estimate_low,
  pe.estimate_high,
  pe.confidence,
  pe.source_name,
  s.id as species_id,
  s.common_name as species_name,
  s.short_code as species_code,
  r.id as region_id,
  r.name as region_name,
  lag(pe.estimate) over (
    partition by pe.species_id, pe.region_id
    order by pe.estimate_year
  ) as previous_estimate
from public.population_estimates pe
join public.species s on s.id = pe.species_id
join public.regions r on r.id = pe.region_id;

create or replace view public.v_population_heatmap as
select
  pe.id,
  pe.estimate_year,
  pe.estimate,
  s.common_name as species_name,
  s.short_code as species_code,
  r.name as region_name,
  r.region_type,
  st_x(r.centroid::geometry) as longitude,
  st_y(r.centroid::geometry) as latitude,
  st_asgeojson(r.centroid::geometry)::jsonb as centroid_geojson
from public.population_estimates pe
join public.species s on s.id = pe.species_id
join public.regions r on r.id = pe.region_id
where r.centroid is not null;

create or replace view public.v_threat_map as
select
  ti.id,
  ti.title,
  ti.incident_date,
  coalesce(ti.severity, tc.severity) as severity,
  ti.elephants_affected,
  ti.elephants_killed,
  tc.name as threat_name,
  tc.category as threat_category,
  tc.color,
  r.name as region_name,
  st_x(ti.location::geometry) as longitude,
  st_y(ti.location::geometry) as latitude,
  st_asgeojson(ti.location::geometry)::jsonb as location_geojson
from public.threat_incidents ti
join public.threat_categories tc on tc.id = ti.threat_category_id
left join public.regions r on r.id = ti.region_id
where ti.location is not null;

create or replace view public.v_habitat_map as
select
  h.id,
  h.name,
  h.habitat_type,
  h.quality_score,
  h.connectivity_score,
  h.year_assessed,
  s.common_name as species_name,
  r.name as region_name,
  st_asgeojson(h.boundary::geometry)::jsonb as boundary_geojson,
  st_asgeojson(coalesce(h.centroid::geometry, st_centroid(h.boundary::geometry)))::jsonb as centroid_geojson
from public.habitats h
left join public.species s on s.id = h.species_id
left join public.regions r on r.id = h.region_id
where h.boundary is not null;

create or replace view public.v_migration_map as
select
  mc.id,
  mc.name,
  mc.corridor_type,
  mc.distance_km,
  mc.threat_level,
  mc.is_active,
  s.common_name as species_name,
  r.name as region_name,
  st_asgeojson(mc.route::geometry)::jsonb as route_geojson
from public.migration_corridors mc
left join public.species s on s.id = mc.species_id
left join public.regions r on r.id = mc.region_id
where mc.route is not null;

create or replace view public.v_audio_map as
select
  ar.id,
  ar.filename,
  ar.call_type,
  ar.noise_type,
  ar.has_mechanical_noise,
  ar.recorded_at,
  r.name as region_name,
  st_x(ar.location::geometry) as longitude,
  st_y(ar.location::geometry) as latitude,
  st_asgeojson(ar.location::geometry)::jsonb as location_geojson
from public.audio_recordings ar
left join public.regions r on r.id = ar.region_id
where ar.location is not null;

-- =========================================================
-- 6. Seed reference data
-- =========================================================

insert into public.species (
  scientific_name,
  common_name,
  short_code,
  iucn_status,
  family,
  genus,
  native_range
)
values
  ('Loxodonta africana', 'African Savanna Elephant', 'AFR-SAV', 'EN', 'Elephantidae', 'Loxodonta', 'Sub-Saharan Africa'),
  ('Loxodonta cyclotis', 'African Forest Elephant', 'AFR-FOR', 'CR', 'Elephantidae', 'Loxodonta', 'Central and West African forests'),
  ('Elephas maximus', 'Asian Elephant', 'ASIAN', 'EN', 'Elephantidae', 'Elephas', 'South and Southeast Asia')
on conflict (scientific_name) do update
set
  common_name = excluded.common_name,
  short_code = excluded.short_code,
  iucn_status = excluded.iucn_status,
  family = excluded.family,
  genus = excluded.genus,
  native_range = excluded.native_range,
  updated_at = now();

insert into public.threat_categories (
  name,
  category,
  severity,
  icon,
  color,
  description
)
values
  (
    'Poaching for Ivory',
    'direct',
    5,
    'shield-alert',
    '#B94F35',
    'Illegal killing for ivory remains a major driver of decline in many elephant landscapes.'
  ),
  (
    'Habitat Loss & Fragmentation',
    'habitat',
    5,
    'trees',
    '#D29D48',
    'Range conversion and fragmentation reduce viable movement corridors and access to forage.'
  ),
  (
    'Human-Elephant Conflict',
    'indirect',
    4,
    'siren',
    '#DD7452',
    'Crop raiding and settlement pressure often drive retaliatory killing or displacement.'
  ),
  (
    'Climate Change & Drought',
    'climate',
    4,
    'thermometer',
    '#8F7B57',
    'Extended drought and changing rainfall patterns reduce water access and vegetation quality.'
  ),
  (
    'Illegal Wildlife Trade',
    'direct',
    5,
    'route',
    '#8F2D1F',
    'Cross-border trafficking sustains poaching incentives and undermines conservation enforcement.'
  )
on conflict (name) do update
set
  category = excluded.category,
  severity = excluded.severity,
  icon = excluded.icon,
  color = excluded.color,
  description = excluded.description,
  updated_at = now();

-- =========================================================
-- 7. Row-level security and read policies
-- Frontend reads via anon key; writes stay service-role only
-- =========================================================

alter table public.species enable row level security;
alter table public.regions enable row level security;
alter table public.population_estimates enable row level security;
alter table public.threat_categories enable row level security;
alter table public.threat_incidents enable row level security;
alter table public.habitats enable row level security;
alter table public.migration_corridors enable row level security;
alter table public.gps_tracking_points enable row level security;
alter table public.audio_recordings enable row level security;
alter table public.audio_annotations enable row level security;
alter table public.separation_runs enable row level security;

drop policy if exists "species_public_read" on public.species;
create policy "species_public_read" on public.species
for select
to anon, authenticated
using (true);

drop policy if exists "regions_public_read" on public.regions;
create policy "regions_public_read" on public.regions
for select
to anon, authenticated
using (true);

drop policy if exists "population_public_read" on public.population_estimates;
create policy "population_public_read" on public.population_estimates
for select
to anon, authenticated
using (true);

drop policy if exists "threat_categories_public_read" on public.threat_categories;
create policy "threat_categories_public_read" on public.threat_categories
for select
to anon, authenticated
using (true);

drop policy if exists "threat_incidents_public_read" on public.threat_incidents;
create policy "threat_incidents_public_read" on public.threat_incidents
for select
to anon, authenticated
using (true);

drop policy if exists "habitats_public_read" on public.habitats;
create policy "habitats_public_read" on public.habitats
for select
to anon, authenticated
using (true);

drop policy if exists "migration_public_read" on public.migration_corridors;
create policy "migration_public_read" on public.migration_corridors
for select
to anon, authenticated
using (true);

drop policy if exists "gps_public_read" on public.gps_tracking_points;
create policy "gps_public_read" on public.gps_tracking_points
for select
to anon, authenticated
using (true);

drop policy if exists "audio_recordings_public_read" on public.audio_recordings;
create policy "audio_recordings_public_read" on public.audio_recordings
for select
to anon, authenticated
using (true);

drop policy if exists "audio_annotations_public_read" on public.audio_annotations;
create policy "audio_annotations_public_read" on public.audio_annotations
for select
to anon, authenticated
using (true);

drop policy if exists "separation_runs_public_read" on public.separation_runs;
create policy "separation_runs_public_read" on public.separation_runs
for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on
  public.species,
  public.regions,
  public.population_estimates,
  public.threat_categories,
  public.threat_incidents,
  public.habitats,
  public.migration_corridors,
  public.gps_tracking_points,
  public.audio_recordings,
  public.audio_annotations,
  public.separation_runs
to anon, authenticated;

grant select on
  public.v_population_trend,
  public.v_population_heatmap,
  public.v_threat_map,
  public.v_habitat_map,
  public.v_migration_map,
  public.v_audio_map
to anon, authenticated;

-- =========================================================
-- 8. updated_at triggers
-- =========================================================

drop trigger if exists trg_species_updated_at on public.species;
create trigger trg_species_updated_at
before update on public.species
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_regions_updated_at on public.regions;
create trigger trg_regions_updated_at
before update on public.regions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_population_updated_at on public.population_estimates;
create trigger trg_population_updated_at
before update on public.population_estimates
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_threat_categories_updated_at on public.threat_categories;
create trigger trg_threat_categories_updated_at
before update on public.threat_categories
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_threat_incidents_updated_at on public.threat_incidents;
create trigger trg_threat_incidents_updated_at
before update on public.threat_incidents
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_habitats_updated_at on public.habitats;
create trigger trg_habitats_updated_at
before update on public.habitats
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_migration_updated_at on public.migration_corridors;
create trigger trg_migration_updated_at
before update on public.migration_corridors
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_gps_updated_at on public.gps_tracking_points;
create trigger trg_gps_updated_at
before update on public.gps_tracking_points
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_audio_recordings_updated_at on public.audio_recordings;
create trigger trg_audio_recordings_updated_at
before update on public.audio_recordings
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_audio_annotations_updated_at on public.audio_annotations;
create trigger trg_audio_annotations_updated_at
before update on public.audio_annotations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_separation_runs_updated_at on public.separation_runs;
create trigger trg_separation_runs_updated_at
before update on public.separation_runs
for each row execute procedure public.set_updated_at();

commit;
