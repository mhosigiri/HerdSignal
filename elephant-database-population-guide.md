# Database Population Guide — Data Sources for Every Table

## Where to get data for each schema table & how to load it

---

## Schema Tables Reference

| # | Table | Records Needed | Primary Data Source |
|---|-------|---------------|---------------------|
| 1 | `species` | 3 (seeded) | Hardcoded in `init.sql` |
| 2 | `regions` | 50-100 | Natural Earth / GADM |
| 3 | `population_estimates` | 500-2000 | African Elephant Database |
| 4 | `threat_categories` | 5 (seeded) | Hardcoded in `init.sql` |
| 5 | `threat_incidents` | 100-5000 | CITES ETIS / MIKE / WWF |
| 6 | `habitats` | 20-100 | WDPA / IUCN / Global Forest Watch |
| 7 | `migration_corridors` | 10-50 | Save the Elephants / IUCN |
| 8 | `gps_tracking` | 100K-1M | Movebank / STE |
| 9 | `audio_recordings` | 44+44 | Hackathon dataset + Congo Soundscapes |
| 10 | `interventions` | 50-200 | Various conservation orgs |

---

## Table 1: `species` — ✅ Already Seeded

No external data needed. Three elephant species are hardcoded in `init.sql`:
- African Savanna Elephant (EN)
- African Forest Elephant (CR)
- Asian Elephant (EN)

---

## Table 2: `regions` — Country Boundaries & Centroids

### Data Sources

| Source | URL | Format | Coverage | Auth Required |
|--------|-----|--------|----------|--------------|
| **Natural Earth (Admin 0)** | https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/ | GeoJSON/SHP | All countries | ❌ No |
| **GADM** | https://gadm.org/download_country.html | GeoJSON/SHP | Admin boundaries level 0-5 | ❌ Free (registration) |
| **Our World in Data** | https://github.com/owid/country-iso-converter | CSV | ISO codes + lat/lng | ❌ No |

### Primary Recommendation: Natural Earth

Natural Earth provides clean, ready-to-use country polygons in WGS84 (EPSG:4326) — exactly what PostGIS expects.

**Download:**
```bash
mkdir -p downloaded_data/gis
cd downloaded_data/gis

# Country boundaries (110m resolution — good for continental/heatmap view)
curl -L -o ne_110m_admin_0_countries.zip \
  "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
unzip ne_110m_admin_0_countries.zip

# Higher resolution (50m) for regional detail
curl -L -o ne_50m_admin_0_countries.zip \
  "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip"
unzip ne_50m_admin_0_countries.zip
```

### ETL Script: Load Regions

```python
#!/usr/bin/env python3
"""
Populate `regions` table from Natural Earth GeoJSON.
Filters for elephant-range countries only.
"""

import json
import geopandas as gpd
from sqlalchemy import create_engine, text
import numpy as np

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

# Elephant-range countries (ISO alpha-3 codes)
ELEPHANT_RANGE_COUNTRIES = {
    # Africa — Savanna Elephant
    'AGO', 'BWA', 'CMR', 'CAF', 'TCD', 'COD', 'COG', 'CIV',
    'DJI', 'GNQ', 'ERI', 'SWZ', 'ETH', 'GAB', 'GMB', 'GHA',
    'GIN', 'KEN', 'LSO', 'LBR', 'MDG', 'MWI', 'MLI', 'MRT',
    'MOZ', 'NAM', 'NER', 'NGA', 'RWA', 'SEN', 'SLE', 'SOM',
    'ZAF', 'SSD', 'SDN', 'TZA', 'TGO', 'UGA', 'ZMB', 'ZWE',
    # Asia — Asian Elephant
    'BGD', 'BTN', 'MMR', 'KHM', 'CHN', 'IND', 'IDN', 'LAO',
    'MYS', 'NPL', 'LKA', 'THA', 'VNM',
}

# Continent mapping
CONTINENT_MAP = {
    'AGO': 'Africa', 'BWA': 'Africa', 'CMR': 'Africa', 'CAF': 'Africa',
    'TCD': 'Africa', 'COD': 'Africa', 'COG': 'Africa', 'CIV': 'Africa',
    'DJI': 'Africa', 'GNQ': 'Africa', 'ERI': 'Africa', 'SWZ': 'Africa',
    'ETH': 'Africa', 'GAB': 'Africa', 'GMB': 'Africa', 'GHA': 'Africa',
    'GIN': 'Africa', 'KEN': 'Africa', 'LSO': 'Africa', 'LBR': 'Africa',
    'MDG': 'Africa', 'MWI': 'Africa', 'MLI': 'Africa', 'MRT': 'Africa',
    'MOZ': 'Africa', 'NAM': 'Africa', 'NER': 'Africa', 'NGA': 'Africa',
    'RWA': 'Africa', 'SEN': 'Africa', 'SLE': 'Africa', 'SOM': 'Africa',
    'ZAF': 'Africa', 'SSD': 'Africa', 'SDN': 'Africa', 'TZA': 'Africa',
    'TGO': 'Africa', 'UGA': 'Africa', 'ZMB': 'Africa', 'ZWE': 'Africa',
    'BGD': 'Asia', 'BTN': 'Asia', 'MMR': 'Asia', 'KHM': 'Asia',
    'CHN': 'Asia', 'IND': 'Asia', 'IDN': 'Asia', 'LAO': 'Asia',
    'MYS': 'Asia', 'NPL': 'Asia', 'LKA': 'Asia', 'THA': 'Asia',
    'VNM': 'Asia',
}

def import_regions(geojson_path: str):
    """Import elephant-range countries as regions."""
    gdf = gpd.read_file(geojson_path)

    # Filter to elephant-range countries
    gdf = gdf[gdf['ISO_A3'].isin(ELEPHANT_RANGE_COUNTRIES)]
    gdf = gdf.to_crs('EPSG:4326')

    with engine.connect() as conn:
        for _, row in gdf.iterrows():
            geom = row.geometry
            centroid = geom.centroid

            # Calculate area in km²
            area = gpd.GeoSeries([geom], crs='EPSG:4326').to_crs('EPSG:3857').area.iloc[0] / 1e6

            conn.execute(text("""
                INSERT INTO regions (name, region_type, iso_code, continent, boundary, area_sq_km, centroid)
                VALUES (
                    :name, 'country', :iso, :continent,
                    ST_SetSRID(:geom::geometry, 4326)::geography,
                    :area,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                )
                ON CONFLICT DO NOTHING
            """), {
                "name": row['NAME'],
                "iso": row['ISO_A3'],
                "continent": CONTINENT_MAP.get(row['ISO_A3'], 'Africa'),
                "geom": geom.wkt,
                "area": area,
                "lat": centroid.y,
                "lng": centroid.x,
            })
        conn.commit()

    print(f"Imported {len(gdf)} elephant-range countries")

# Run
import_regions("downloaded_data/gis/ne_110m_admin_0_countries.geojson")
```

### Also add protected areas:
```bash
# Protected areas in elephant range (from WDPA)
# https://www.protectedplanet.net/en/thematic-areas/wdpa
curl -L -o downloaded_data/gis/wdpa_africa.geojson \
  "https://d2EtZKIq6jNF7o.cloudfront.net/public/2024-1/WDOECO_2024_Africa_GeoJSON.zip"
```

---

## Table 3: `population_estimates` — Population Counts by Year

### Data Sources

| Source | URL | Format | Years | Coverage | Quality |
|--------|-----|--------|-------|----------|---------|
| **African Elephant Database** | https://www.elephantdatabase.org/ | CSV (export) | 1930-2023 | 37 African range states | ⭐⭐⭐⭐⭐ Gold standard |
| **IUCN Red List Assessments** | https://www.iucnredlist.org/species/12392/3335966 | PDF + data | 2021-2024 | Global | ⭐⭐⭐⭐ |
| **Great Elephant Census** | https://www.greatelephantcensus.com/ | PDF/CSV | 2014-2016 | 18 African countries | ⭐⭐⭐⭐⭐ |
| **CITES MIKE Programme** | https://www.cites.org/eng/prog/mike | CSV | 2002-present | 60+ sites | ⭐⭐⭐ |
| **WWF Living Planet Report** | https://livingplanet.panda.org/en-GB/ | Data download | 1970-2022 | Global | ⭐⭐⭐ |
| **Asian Elephant Database** | https://www.asianelephantdata.org/ | CSV | Various | 13 range states | ⭐⭐⭐⭐ |

### Primary Recommendation: African Elephant Database

The AED is the **most comprehensive** source — maintained by IUCN/SSC with population estimates from aerial surveys, dung counts, and individual identification for every African elephant range state.

**Access method:**
```bash
# The AED provides CSV export at:
# https://www.elephantdatabase.org/
# Click "Data" → "Download" → "Country population estimates"

# Manual steps:
# 1. Go to https://www.elephantdatabase.org/
# 2. Navigate to "Data & Reports"
# 3. Download "Population estimates" CSV
# 4. Save to: downloaded_data/conservation/aed_population.csv
```

**Expected CSV columns:**
```csv
Country,Year,Species,Type,Estimate,Lower,Upper,Method,Source,Confidence
Tanzania,2022,African savanna elephant,aerial_count,43000,38000,48000,Stratified aerial count,Government of Tanzania,Medium
Botswana,2022,African savanna elephant,aerial_count,131906,118816,145996,Total aerial count,Department of Wildlife & National Parks,High
...
```

### ETL: Population Data

```python
#!/usr/bin/env python3
"""
Import population estimates from African Elephant Database CSV.
Target table: population_estimates
"""

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

SPECIES_MAP = {
    'african savanna elephant': 1,
    'loxodonta africana': 1,
    'african forest elephant': 2,
    'loxodonta cyclotis': 2,
    'asian elephant': 3,
    'elephas maximus': 3,
    'african elephant': 1,   # Legacy entries
    'elephant': 1,            # Generic
}

METHOD_MAP = {
    'aerial survey': 'aerial_count',
    'aerial count': 'aerial_count',
    'dung count': 'dung_count',
    'dung survey': 'dung_count',
    'individual identification': 'individual_id',
    'model': 'model',
    'ground count': 'ground_count',
    'total count': 'aerial_count',
}

def import_population(csv_path: str):
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    inserted = 0
    with engine.connect() as conn:
        # Get region lookup
        regions = pd.read_sql("SELECT id, name FROM regions", conn)
        name_to_id = dict(zip(regions['name'].str.lower(), regions['id']))

        for _, row in df.iterrows():
            country = str(row.get('country', '')).strip().lower()
            region_id = name_to_id.get(country)

            if region_id is None:
                # Try fuzzy match
                for k, v in name_to_id.items():
                    if country in k or k in country:
                        region_id = v
                        break

            if region_id is None:
                continue  # Skip non-range countries

            species_id = SPECIES_MAP.get(
                str(row.get('species', '')).strip().lower(), 1
            )
            method = METHOD_MAP.get(
                str(row.get('method', '')).strip().lower(), 'model'
            )

            try:
                conn.execute(text("""
                    INSERT INTO population_estimates
                        (species_id, region_id, year, estimate, estimate_low,
                         estimate_high, survey_method, confidence, source)
                    VALUES (
                        :species_id, :region_id, :year, :estimate,
                        :low, :high, :method, :confidence, :source
                    )
                    ON CONFLICT (species_id, region_id, year, survey_method) DO UPDATE
                    SET estimate = EXCLUDED.estimate,
                        estimate_low = EXCLUDED.estimate_low,
                        estimate_high = EXCLUDED.estimate_high
                """), {
                    "species_id": species_id,
                    "region_id": region_id,
                    "year": int(row.get('year', 2020)),
                    "estimate": row.get('estimate'),
                    "low": row.get('lower', row.get('low')),
                    "high": row.get('upper', row.get('high')),
                    "method": method,
                    "confidence": str(row.get('confidence', 'Medium')),
                    "source": str(row.get('source', 'African Elephant Database')),
                })
                inserted += 1
            except Exception as e:
                print(f"  Skip {country} {row.get('year')}: {e}")

        conn.commit()
    print(f"Imported {inserted} population estimates")

import_population("downloaded_data/conservation/aed_population.csv")
```

### Supplementary: Great Elephant Census Data
```
URL: https://www.greatelephantcensus.com/final-report.html
Format: PDF with data tables → extract to CSV
Years: 2014-2016
Coverage: Angola, Botswana, Cameroon, Chad, DRC, Mozambique,
          Namibia, South Africa, Tanzania, Zambia, Zimbabwe + 7 more
```

### Supplementary: Asian Elephant Data
```
URL: https://www.asianelephantdata.org/
Format: Country fact sheets → manual CSV compilation
Coverage: Bangladesh, Bhutan, Cambodia, China, India, Indonesia,
          Laos, Malaysia, Myanmar, Nepal, Sri Lanka, Thailand, Vietnam
```

---

## Table 5: `threat_incidents` — Geolocated Poaching & Conflict Events

### Data Sources

| Source | URL | Format | Type | Auth |
|--------|-----|--------|------|------|
| **CITES ETIS Database** | https://etis.cites.org/ | CSV export | Ivory seizures | ❌ Free (registration) |
| **CITES MIKE Programme** | https://www.cites.org/eng/prog/mike/data | CSV | PIKE data (poaching rate) | ❌ Free |
| **TRAFFIC Reports** | https://www.traffic.org/site/publications/ | PDF → CSV | Seizure records | ❌ Free |
| **Born Free Foundation** | https://www.bornfree.org.uk/elephant-poaching-statistics/ | Web → CSV | Country-level stats | ❌ No |
| **Poaching Data (Kaggle)** | https://www.kaggle.com/search?q=elephant+poaching | CSV | Various | Free (account) |
| **Human-Elephant Conflict (IUCN)** | https://www.iucn.org/theme/species/our-work/human-elephant-conflict | Reports | HEC incidents | ❌ Free |
| **Congo Soundscapes** | s3://congo8khz-pnnn (AWS) | WAV + metadata | Acoustic detections | ❌ No |

### Primary: CITES ETIS (Elephant Trade Information System)

ETIS tracks ivory seizures globally with geolocation, date, weight, and transport method.

**Download:**
```bash
# 1. Register at https://etis.cites.org/ (free)
# 2. Navigate to "Data" → "Download"
# 3. Select: All records, All years, All countries
# 4. Export as CSV → save to downloaded_data/conservation/cites_etis_seizures.csv
```

**Expected columns:**
```csv
Year,Seizure_Date,Country_of_Origin,Transit_Country,Destination_Country,
Ivory_Weight_kg,Number_of_Elephants_Equivalent,Seizure_Location,Latitude,
Longitude,Transport_Method,Enforcement_Action
```

### Primary: CITES MIKE (Monitoring Illegal Killing of Elephants)

MIKE provides the **PIKE** (Proportion of Illegally Killed Elephants) metric — the key indicator of poaching pressure at each monitoring site.

**Download:**
```bash
# Direct data export:
# https://www.cites.org/eng/prog/mike/data

# PIKE data includes:
# - Site name (GPS coordinates)
# - Year
# - Number of carcasses found
# - Number illegally killed
# - PIKE score (0-1)
```

### ETL: Threat Incidents

```python
#!/usr/bin/env python3
"""
Import threat incidents from CITES ETIS and MIKE CSV exports.
Target table: threat_incidents
"""

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

def import_etis_seizures(csv_path: str):
    """Import ivory seizure records as poaching/incidents."""
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    with engine.connect() as conn:
        regions = pd.read_sql("SELECT id, name FROM regions", conn)
        name_to_id = dict(zip(regions['name'].str.lower(), regions['id']))

        for _, row in df.iterrows():
            # Try to find region from country name
            origin_country = str(row.get('country_of_origin', '')).lower()
            region_id = name_to_id.get(origin_country)

            lat = row.get('latitude', row.get('lat'))
            lon = row.get('longitude', row.get('lng', row.get('lon')))

            if lat is None or lon is None or pd.isna(lat) or pd.isna(lon):
                continue

            threat_id = 5  # Illegal Wildlife Trade (for seizures)
            if 'poach' in str(row.get('description', '')).lower():
                threat_id = 1  # Poaching for Ivory

            conn.execute(text("""
                INSERT INTO threat_incidents
                    (threat_id, region_id, location, incident_date,
                     elephants_killed, ivory_seized_kg, description, source, verified)
                VALUES (
                    :threat_id, :region_id,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :date, :killed, :ivory_kg, :desc, :source, true
                )
            """), {
                "threat_id": threat_id,
                "region_id": region_id,
                "lon": float(lon),
                "lat": float(lat),
                "date": row.get('seizure_date', row.get('date')),
                "killed": row.get('number_of_elephants_equivalent', 0),
                "ivory_kg": row.get('ivory_weight_kg', 0),
                "desc": row.get('description', row.get('notes')),
                "source": "CITES ETIS",
            })
        conn.commit()

    print(f"Imported {len(df)} threat incidents from ETIS")


def import_mike_pike(csv_path: str):
    """Import MIKE PIKE monitoring data as poaching indicators."""
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    with engine.connect() as conn:
        for _, row in df.iterrows():
            lat = row.get('latitude', row.get('site_lat'))
            lon = row.get('longitude', row.get('site_lng'))

            if lat is None or lon is None or pd.isna(lat) or pd.isna(lon):
                continue

            conn.execute(text("""
                INSERT INTO threat_incidents
                    (threat_id, region_id, location, incident_date,
                     elephants_killed, description, source, verified)
                VALUES (
                    1, NULL,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :date, :killed,
                    :desc, 'CITES MIKE Programme', true
                )
            """), {
                "lon": float(lon),
                "lat": float(lat),
                "date": row.get('year'),
                "killed": row.get('carcasses_illegally_killed', 0),
                "desc": f"PIKE site: {row.get('site_name')}. PIKE={row.get('pike')}",
            })
        conn.commit()

    print(f"Imported {len(df)} MIKE monitoring records")

# Run both
import_etis_seizures("downloaded_data/conservation/cites_etis_seizures.csv")
import_mike_pike("downloaded_data/conservation/mike_pike_data.csv")
```

### Human-Elephant Conflict Data

```
URL: https://www.iucn.org/theme/species/our-work/human-elephant-conflict
Additional: https://www.worldbank.org/en/topic/environment/brief/human-elephant-conflict
Format: Country-level reports → extract incident data to CSV
Key fields needed: latitude, longitude, date, people_injured, elephants_killed, crop_damage_usd
Threat category ID: 3 (Human-Elephant Conflict)
```

---

## Table 6: `habitats` — Habitat Boundaries & Quality

### Data Sources

| Source | URL | Format | What It Provides |
|--------|-----|--------|-----------------|
| **WDPA (World Database on Protected Areas)** | https://www.protectedplanet.net/en | GeoJSON/SHP | Protected area boundaries, IUCN categories |
| **IUCN Red List Habitats** | https://www.iucnredlist.org/species/12392/habitats | Structured data | Habitat suitability codes |
| **Global Forest Watch** | https://www.globalforestwatch.org/ | Raster/GeoJSON | Tree cover loss (2000-present) |
| **DOPA (Digital Observatory for Protected Areas)** | https://dopa.jrc.ec.europa.eu/en | GeoJSON | Habitat fragmentation metrics |
| **Elephant Range Maps (IUCN)** | https://www.iucnredlist.org/species/12392/map | GeoJSON | Historic + current range polygons |
| **ESA CCI Land Cover** | https://www.esa-landcover-cci.org/ | GeoTIFF | Land cover classes (savanna, forest, etc.) |

### Primary: WDPA + IUCN Range Maps

**Download WDPA:**
```bash
# African protected areas
curl -L -o downloaded_data/habitat/wdpa_africa.zip \
  "https://d2EtZKIq6jNF7o.cloudfront.net/public/2024-1/WDOECO_2024_Africa_GeoJSON.zip"

# Asian protected areas
curl -L -o downloaded_data/habitat/wdpa_asia.zip \
  "https://d2EtZKIq6jNF7o.cloudfront.net/public/2024-1/WDOECO_2024_Asia_GeoJSON.zip"
```

**Download IUCN Range Maps:**
```bash
# African Savanna Elephant range
# https://www.iucnredlist.org/species/12392/3335966 → "Map" tab → "Download range"
# Save as: downloaded_data/habitat/iucn_range_savanna.geojson

# African Forest Elephant range
# https://www.iucnredlist.org/species/181006014/12392/3335966
# Save as: downloaded_data/habitat/iucn_range_forest.geojson
```

### ETL: Habitat Boundaries

```python
#!/usr/bin/env python3
"""
Import habitat boundaries from IUCN range maps and WDPA.
Target table: habitats
"""

import geopandas as gpd
from sqlalchemy import create_engine, text

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

def import_habitats(geojson_path: str, species_id: int, habitat_type: str = 'savanna'):
    gdf = gpd.read_file(geojson_path)
    if gdf.crs is None:
        gdf = gdf.set_crs('EPSG:4326')
    gdf = gdf.to_crs('EPSG:4326')

    with engine.connect() as conn:
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom.geom_type not in ('Polygon', 'MultiPolygon'):
                continue

            # Calculate area in km²
            area = gpd.GeoSeries([geom], crs='EPSG:4326').to_crs('EPSG:3857').area.iloc[0] / 1e6

            conn.execute(text("""
                INSERT INTO habitats (species_id, habitat_type, boundary, area_sq_km,
                                     quality_score, year_assessed, connectivity)
                VALUES (:species_id, :type,
                    ST_SetSRID(:geom::geometry, 4326)::geography,
                    :area, :quality, :year, :connectivity)
            """), {
                "species_id": species_id,
                "type": habitat_type,
                "geom": geom.wkt,
                "area": area,
                "quality": row.get('quality_score', 0.7),
                "year": row.get('year_assessed', 2023),
                "connectivity": row.get('connectivity', 0.5),
            })
        conn.commit()

    print(f"Imported {len(gdf)} habitat polygons (species={species_id})")

# Run for each species
import_habitats("downloaded_data/habitat/iucn_range_savanna.geojson",
                species_id=1, habitat_type='savanna')
import_habitats("downloaded_data/habitat/iucn_range_forest.geojson",
                species_id=2, habitat_type='forest')
```

### Forest Loss Tracking (Global Forest Watch)
```bash
# Tree cover loss data — can be joined with habitat boundaries
# https://www.globalforestwatch.org/map/country/ALL/
# Export area of interest as GeoJSON
# Then calculate % loss per habitat polygon using rasterstats
```

---

## Table 7: `migration_corridors` — Migration Route Lines

### Data Sources

| Source | URL | Format | Species | Coverage |
|--------|-----|--------|---------|----------|
| **Save the Elephants (STE)** | https://www.savetheelephants.org/research/ | CSV/GeoJSON | African Savanna | Kenya, Mali, South Africa |
| **Movebank** | https://www.movebank.org/cms/movebank-main | CSV | All species | Global |
| **Elephant GPS Tracking (Kaggle)** | https://www.kaggle.com/search?q=elephant+GPS+tracking | CSV | African | Various |
| **IUCN Elephant Connectivity** | https://www.iucn.org/theme/species/our-work/elephant-connectivity | Reports | African | Regional |
| **Wildlife Corridors (GEO BON)** | https://geobon.org/essential-biodiversity-variables/ | GeoJSON | All | Global |

### Primary: Movebank

Movebank is the **global standard** for animal tracking data with GPS collar readings from hundreds of elephants.

**Download:**
```bash
# 1. Register at https://www.movebank.org/ (free academic/research account)
# 2. Search study: "elephant" or browse:
#    https://www.movebank.org/cms/movebank-main/movement-bank-search
# 3. Select studies with GPS data
# 4. Export as CSV: timestamp, location-lat, location-long, individual-id
# 5. Save to: downloaded_data/migration/movebank_elephant.csv
```

**Key Movebank studies:**
| Study | URL | Elephants | Location | Years |
|-------|-----|-----------|----------|-------|
| African Elephant GPS Tracking | Movebank search "Iain Douglas-Hamilton" | 100+ | Samburu, Kenya | 1998-present |
| Mali Elephant Migration | Movebank search "Anne Orlando" | 50+ | Gourma, Mali | 2004-2012 |
| Kruger National Park Elephants | Movebank search "Kruger" | 40+ | South Africa | 2007-2013 |
| Etosha Elephants | Movebank search "Etosha" | 30+ | Namibia | 2010-present |

### ETL: Migration Corridors (from GPS points)

```python
#!/usr/bin/env python3
"""
Convert GPS tracking points to migration corridors.
Target tables: gps_tracking + migration_corridors
"""

import pandas as pd
import numpy as np
from shapely.geometry import LineString, Point
import geopandas as gpd
from sqlalchemy import create_engine, text

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

def import_gps_tracking(csv_path: str):
    """Import individual GPS collar points."""
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    with engine.connect() as conn:
        for _, row in df.iterrows():
            lat = row.get('location-lat', row.get('lat', row.get('latitude')))
            lon = row.get('location-long', row.get('lng', row.get('longitude')))
            ts = row.get('timestamp', row.get('date', row.get('event-date')))

            if pd.isna(lat) or pd.isna(lon) or pd.isna(ts):
                continue

            conn.execute(text("""
                INSERT INTO gps_tracking
                    (elephant_id, species_id, timestamp, location,
                     speed_kmh, heading, activity)
                VALUES (
                    :elephant_id, 1, :ts,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :speed, :heading, :activity
                )
            """), {
                "elephant_id": str(row.get('individual-id', row.get('individual_id'))),
                "ts": ts,
                "lon": float(lon),
                "lat": float(lat),
                "speed": row.get('ground-speed', None),
                "heading": row.get('heading', None),
                "activity": row.get('activity', row.get('behaviour', None)),
            })
        conn.commit()

    print(f"Imported {len(df)} GPS tracking points")


def derive_corridors(csv_path: str):
    """
    Derive migration corridors from GPS tracking data by:
    1. Grouping points by individual elephant
    2. Ordering by timestamp
    3. Creating LineString geometries
    4. Calculating seasonal patterns
    """
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    corridors = []
    for elephant_id, group in df.groupby('individual-id'):
        group = group.sort_values('timestamp')
        if len(group) < 10:
            continue

        points = [Point(row['location-long'], row['location-lat'])
                  for _, row in group.iterrows()
                  if pd.notna(row.get('location-lat')) and pd.notna(row.get('location-long'))]

        if len(points) < 10:
            continue

        line = LineString(points)
        total_dist = line.length * 111.32  # Approximate degrees → km

        corridors.append({
            'name': f'Corridor: {elephant_id}',
            'elephant_id': elephant_id,
            'geometry': line,
            'distance_km': total_dist,
            'n_points': len(points),
        })

    gdf = gpd.GeoDataFrame(corridors, crs='EPSG:4326')

    with engine.connect() as conn:
        for _, row in gdf.iterrows():
            conn.execute(text("""
                INSERT INTO migration_corridors
                    (name, species_id, corridor_type, route, distance_km,
                     is_active, threat_level)
                VALUES (
                    :name, 1, 'seasonal',
                    ST_SetSRID(:geom::geometry, 4326)::geography,
                    :distance, true, 2
                )
            """), {
                "name": row['name'],
                "geom": row['geometry'].wkt,
                "distance": row['distance_km'],
            })
        conn.commit()

    print(f"Derived {len(gdf)} migration corridors from GPS data")

# Run
import_gps_tracking("downloaded_data/migration/movebank_elephant.csv")
derive_corridors("downloaded_data/migration/movebank_elephant.csv")
```

---

## Table 8: `gps_tracking` — Individual GPS Points

### Data Source: Same as Migration Corridors

Use **Movebank** (see Table 7 above). The same CSV export populates both `gps_tracking` (individual points) and `migration_corridors` (derived lines).

### Also: Congo Soundscapes (Acoustic detections, not GPS)

```
URL: s3://congo8khz-pnnn (AWS, no auth required)
Format: WAV audio files with metadata (recording location, timestamp)
Use for: Audio recordings table, not GPS tracking
```

---

## Table 9: `audio_recordings` — Elephant Call Metadata

### Data Sources

| Source | URL | Format | Location Data | Notes |
|--------|-----|--------|--------------|-------|
| **Hackathon 44 recordings** | (provided) | WAV | In spreadsheet | Has start/end annotations |
| **Congo Soundscapes** | s3://congo8khz-pnnn | WAV | Yes (metadata) | Forest elephants, AWS public |
| **ElephantVoices SoundCloud** | https://soundcloud.com/elephantvoices | MP3 | Some | Annotated, 250 tracks |
| **Macaulay Library** | https://search.macaulaylibrary.org/ | MP3 | Yes | 15+ elephant call recordings |
| **GitHub: HiruDewmi** | https://github.com/HiruDewmi/Audio-Classification-for-Elephant-Sounds | WAV | No (generic) | 232 clean samples (already downloaded) |
| **Freesound.org** | https://freesound.org/search/?q=elephant | WAV/MP3 | Varies | Community uploads |

### ETL: Audio Metadata

```python
#!/usr/bin/env python3
"""
Import audio recording metadata (not the audio files themselves).
Target table: audio_recordings
"""

import pandas as pd
from sqlalchemy import create_engine, text
import wave, os

DB_URL = "postgresql://localhost/elephant_conservation"
engine = create_engine(DB_URL)

def import_hackathon_audio(csv_path: str, audio_dir: str):
    """
    Import the 44 hackathon recordings + their annotations.
    CSV columns: filename, start_time, end_time, noise_type
    """
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.lower().str.strip()

    with engine.connect() as conn:
        for _, row in df.iterrows():
            filepath = os.path.join(audio_dir, row['filename'])
            if not os.path.exists(filepath):
                continue

            # Get audio properties
            try:
                with wave.open(filepath, 'r') as w:
                    sr = w.getframerate()
                    duration = w.getnframes() / sr
            except:
                sr = 44100
                duration = 0

            conn.execute(text("""
                INSERT INTO audio_recordings
                    (filename, file_path, species_id, region_id,
                     sample_rate_hz, duration_sec, call_type, noise_type,
                     has_mechanical_noise, separated)
                VALUES (
                    :filename, :filepath, 1, NULL,
                    :sr, :duration, 'rumble', :noise, true, false
                )
            """), {
                "filename": row['filename'],
                "filepath": filepath,
                "sr": sr,
                "duration": duration,
                "noise": row.get('noise_type', 'unknown'),
            })
        conn.commit()

    print(f"Imported {len(df)} hackathon audio records")


def import_clean_samples(audio_dir: str):
    """
    Import the 232 clean elephant call samples.
    These have no noise and serve as reference for PCA matching.
    """
    count = 0
    with engine.connect() as conn:
        for fname in os.listdir(audio_dir):
            if not fname.endswith('.wav'):
                continue

            # Determine call type from filename
            call_type = 'rumble'
            if fname.startswith('Trumpet'):
                call_type = 'trumpet'
            elif fname.startswith('Roar'):
                call_type = 'roar'

            try:
                with wave.open(os.path.join(audio_dir, fname), 'r') as w:
                    sr = w.getframerate()
                    duration = w.getnframes() / sr
            except:
                sr = 44100
                duration = 0

            conn.execute(text("""
                INSERT INTO audio_recordings
                    (filename, file_path, species_id, sample_rate_hz,
                     duration_sec, call_type, noise_type,
                     has_mechanical_noise, separated)
                VALUES (
                    :filename, :filepath, 1,
                    :sr, :duration, :call_type, 'none',
                    false, false
                )
            """), {
                "filename": fname,
                "filepath": os.path.join(audio_dir, fname),
                "sr": sr,
                "duration": duration,
                "call_type": call_type,
            })
            count += 1
        conn.commit()

    print(f"Imported {count} clean audio samples")

# Run
import_hackathon_audio(
    "downloaded/audio/hackathon_annotations.csv",
    "downloaded/audio/hackathon_recordings/"
)
import_clean_samples("data/clean_elephant_calls/")
```

### Download Congo Soundscapes Audio
```bash
# Public AWS S3 bucket — no credentials needed
brew install awscli  # If not installed

aws s3 ls s3://congo8khz-pnnn/ --no-sign-request --region us-west-2
aws s3 sync s3://congo8khz-pnnn/ downloaded_data/audio/congo_soundscapes/ \
  --no-sign-request --region us-west-2
```

---

## Table 10: `interventions` — Conservation Programs

### Data Sources

| Source | URL | What It Has |
|--------|-----|------------|
| **IUCN SOS (Save Our Species)** | https://www.iucn-sos.org/ | Funded conservation projects |
| **CITES National Reports** | https://www.cites.org/eng/reports | Country-level actions |
| **GEF (Global Environment Facility)** | https://www.thegef.org/projects?keywords=elephant | Funded projects |
| **WWF Projects** | https://www.worldwildlife.org/initiatives/items/elephant-conservation-initiative | Active programs |
| **Elephant Protection Initiative** | https://www.elephantprotectioninitiative.org/ | 21 African countries committed |

### Manual Compilation (structured CSV)

Since there's no single database of interventions, compile from reports:

```csv
title,intervention_type,region,start_date,status,effectiveness,budget_usd
"Etosha Elephant Conservation",anti_poaching,"Namibia",2018,ongoing,0.7,2500000
"KAZA TFCA Elephant Corridor",corridor_restoration,"Botswana/Zambia/Zimbabwe",2011,ongoing,0.5,10000000
"Kenya Community HEC Mitigation",community,"Kenya",2015,ongoing,0.6,1500000
"China Domestic Ivory Ban",policy,"China",2017,completed,0.8,500000
" Tanzania Serengeti Anti-Poaching",anti_poaching,"Tanzania",2014,ongoing,0.4,8000000
```

```python
def import_interventions(csv_path: str):
    df = pd.read_csv(csv_path)
    with engine.connect() as conn:
        for _, row in df.iterrows():
            conn.execute(text("""
                INSERT INTO interventions
                    (title, intervention_type, start_date, status,
                     effectiveness, budget_usd, description)
                VALUES (:title, :type, :start, :status, :eff, :budget, :desc)
            """), {
                "title": row['title'],
                "type": row['intervention_type'],
                "start": row.get('start_date'),
                "status": row.get('status', 'ongoing'),
                "eff": row.get('effectiveness', 0.5),
                "budget": row.get('budget_usd', 0),
                "desc": row.get('description'),
            })
        conn.commit()
```

---

## Master Download Script

```bash
#!/bin/bash
# master_download.sh — Download all data sources
# Run from project root

set -e
DEST="downloaded_data"
mkdir -p "$DEST"/{gis,conservation,habitat,migration,audio}

echo "=== Downloading GIS data ==="
# Country boundaries
curl -L -o "$DEST/gis/ne_110m_admin_0_countries.zip" \
  "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
cd "$DEST/gis" && unzip -o ne_110m_admin_0_countries.zip && cd -

echo "=== Downloading population data ==="
# AED — requires manual download from elephantdatabase.org
echo "⚠️  Manual: Download CSV from https://www.elephantdatabase.org/ → Data & Reports"

echo "=== Downloading threat data ==="
# CITES ETIS — requires manual download from etis.cites.org
echo "⚠️  Manual: Register at https://etis.cites.org/ → Data → Download CSV"
# CITES MIKE — requires manual download
echo "⚠️  Manual: Download from https://www.cites.org/eng/prog/mike/data"

echo "=== Downloading habitat data ==="
# WDPA
curl -L -o "$DEST/habitat/wdpa_africa.zip" \
  "https://d2EtZKIq6jNF7o.cloudfront.net/public/2024-1/WDOECO_2024_Africa_GeoJSON.zip" 2>/dev/null || true
# IUCN range maps — manual
echo "⚠️  Manual: Download range maps from IUCN Red List species pages"

echo "=== Downloading migration data ==="
# Movebank — requires manual download
echo "⚠️  Manual: Register at https://www.movebank.org/ → Search 'elephant' → Export CSV"

echo "=== Downloading audio data ==="
# Congo Soundscapes (AWS public)
if command -v aws &> /dev/null; then
  aws s3 sync s3://congo8khz-pnnn/ "$DEST/audio/congo_soundscapes/" \
    --no-sign-request --region us-west-2 2>/dev/null || echo "⚠️  AWS sync failed"
else
  echo "⚠️  Install awscli: brew install awscli"
  echo "   Then: aws s3 sync s3://congo8khz-pnnn/ $DEST/audio/congo_soundscapes/ --no-sign-request --region us-west-2"
fi

echo ""
echo "=== Summary ==="
echo "Automated downloads complete."
echo "Manual downloads needed:"
echo "  1. African Elephant Database: https://www.elephantdatabase.org/"
echo "  2. CITES ETIS: https://etis.cites.org/"
echo "  3. CITES MIKE: https://www.cites.org/eng/prog/mike/data"
echo "  4. Movebank: https://www.movebank.org/"
echo "  5. IUCN Range Maps: https://www.iucnredlist.org/species/12392/map"
echo "  6. WDPA: https://www.protectedplanet.net/"
echo ""
echo "Save all manual CSVs to: $DEST/conservation/"
echo "Save GeoJSON to: $DEST/habitat/ or $DEST/gis/"
```

---

## Data Source Priority Matrix

| Priority | Table | Source | Effort | Data Quality |
|----------|-------|--------|--------|-------------|
| 🔴 Must have | `regions` | Natural Earth | ⭐ Easy (automated) | ⭐⭐⭐⭐⭐ |
| 🔴 Must have | `population_estimates` | African Elephant Database | ⭐⭐ Manual CSV | ⭐⭐⭐⭐⭐ |
| 🔴 Must have | `threat_incidents` | CITES ETIS + MIKE | ⭐⭐ Manual registration | ⭐⭐⭐⭐ |
| 🟡 Should have | `habitats` | WDPA + IUCN ranges | ⭐⭐ Manual download | ⭐⭐⭐⭐ |
| 🟡 Should have | `migration_corridors` | Movebank | ⭐⭐⭐ Registration + export | ⭐⭐⭐⭐⭐ |
| 🟡 Should have | `gps_tracking` | Movebank (same as above) | ⭐⭐⭐ Same | ⭐⭐⭐⭐⭐ |
| 🟡 Should have | `audio_recordings` | Hackathon + Congo | ⭐ Easy | ⭐⭐⭐⭐ |
| 🟢 Nice to have | `interventions` | Manual compilation | ⭐⭐⭐ Research needed | ⭐⭐⭐ |
| ✅ Done | `species` | Hardcoded | None | N/A |
| ✅ Done | `threat_categories` | Hardcoded | None | N/A |

---

*Database Population Guide v1.0*
*Date: April 11, 2026*
