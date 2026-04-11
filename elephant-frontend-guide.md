# Elephant Conservation Platform — Frontend Implementation Guide

## Interactive Maps, Voice Mode & Data Visualization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App (React)                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐ │
│  │ Map View  │  │ Charts   │  │ Separator  │  │  Voice Mode   │ │
│  │ (Mapbox)  │  │ (Recharts)│  │  Panel     │  │  (Three.js)   │ │
│  └─────┬─────┘  └─────┬────┘  └─────┬─────┘  └──────┬────────┘ │
│        │              │             │                │          │
│  ┌─────▼──────────────▼─────────────▼────────────────▼────────┐ │
│  │              API Layer (tRPC / REST)                        │ │
│  │  - Heatmap data endpoints                                    │ │
│  │  - Audio separation endpoints                                │ │
│  │  - Whisper STT / TTS endpoints                               │ │
│  └────────────────────┬────────────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │PostgreSQL│  │  Redis   │  │ Elephant Sep │
  │ +PostGIS │  │  Cache   │  │  (Python)    │
  └──────────┘  └──────────┘  └──────────────┘
```

---

## Tech Stack — Complete Definition

| Category | Tool | Version | Role |
|----------|------|---------|------|
| **Framework** | Next.js | 14+ (App Router) | React framework + SSR |
| **Language** | TypeScript | 5.x | Type safety |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS |
| **Map Library** | Mapbox GL JS | 3.x | Interactive maps + heatmaps |
| **Vector Tiles** | Mapbox Studio | — | Custom styled map tiles |
| **3D Graphics** | Three.js | r169+ | Voice mode soundwave visualization |
| **Audio Analysis** | Web Audio API | Native | Real-time audio processing + playback |
| **Charts** | Recharts | 2.x | Population trend charts |
| **STT** | Whisper (OpenAI) | whisper-1 API | Voice → text |
| **TTS** | ElevenLabs | API | Text → natural voice narration |
| **State** | Zustand | 4.x | Lightweight state management |
| **Data Fetching** | TanStack Query | 5.x | Server state + caching |
| **Animation** | Framer Motion | 11.x | UI animations |
| **API** | tRPC | 10.x | End-to-end type-safe API |
| **Audio Player** | Howler.js | 2.x | Audio playback |
| **WebSocket** | Socket.io | 4.x | Real-time updates |

### Install Everything
```bash
# Create Next.js project
npx create-next-app@latest elephant-platform --typescript --tailwind --app --src-dir

cd elephant-platform

# Map & visualization
npm install mapbox-gl @types/mapbox-gl recharts howler framer-motion

# 3D visualization
npm install three @react-three/fiber @react-three/drei

# State & data
npm install zustand @tanstack/react-query

# Audio processing
npm install @types/howler

# STT/TTS integration
npm install openai

# API layer
npm install @trpc/server @trpc/react-server @trpc/client

# WebSocket
npm install socket.io socket.io-client

# HTTP client
npm install axios
```

---

## Project Structure

```
elephant-separator/frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Dashboard / landing
│   │   ├── map/
│   │   │   └── page.tsx                  # Interactive map view
│   │   ├── separator/
│   │   │   └── page.tsx                  # Elephant separator tool
│   │   └── voice/
│   │       └── page.tsx                  # Voice mode (Three.js)
│   ├── components/
│   │   ├── map/
│   │   │   ├── ElephantMap.tsx           # Main map component
│   │   │   ├── HeatmapLayer.tsx          # Dynamic heatmap rendering
│   │   │   ├── MigrationLayer.tsx        # Migration route lines
│   │   │   ├── HabitatLayer.tsx          # Habitat polygon overlay
│   │   │   ├── ThreatLayer.tsx           # Threat incident markers
│   │   │   ├── AudioMarkerLayer.tsx      # Audio recording pins
│   │   │   └── MapControls.tsx           # Layer toggles, filters
│   │   ├── charts/
│   │   │   ├── PopulationTrend.tsx       # Line chart: population over time
│   │   │   ├── ThreatDistribution.tsx    # Pie/bar chart: threat types
│   │   │   ├── HabitatCoverage.tsx       # Area chart: habitat loss
│   │   │   └── SpeciesComparison.tsx     # Multi-species comparison
│   │   ├── separator/
│   │   │   ├── SeparatorPanel.tsx        # Upload + separate interface
│   │   │   ├── SpectrogramView.tsx       # Canvas spectrogram visualization
│   │   │   ├── AudioPlayer.tsx           # Before/after playback
│   │   │   └── SeparationProgress.tsx    # Processing indicator
│   │   ├── voice/
│   │   │   ├── VoiceMode.tsx             # Main voice mode container
│   │   │   ├── SoundWaveScene.tsx        # Three.js soundwave visualization
│   │   │   ├── WhisperInput.tsx          # STT integration
│   │   │   ├── TTSNarrator.tsx           # TTS narration output
│   │   │   └── DataExplainer.tsx         # AI explanation logic
│   │   └── ui/
│   │       ├── Sidebar.tsx               # Navigation sidebar
│   │       ├── DatasetToggle.tsx         # Toggle datasets on/off
│   │       ├── ThemeToggle.tsx           # Dark/light mode
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                 # API client (tRPC/axios)
│   │   │   ├── population.ts             # Population data endpoints
│   │   │   ├── threats.ts                # Threat data endpoints
│   │   │   ├── habitats.ts               # Habitat data endpoints
│   │   │   ├── migration.ts              # Migration data endpoints
│   │   │   ├── audio.ts                  # Audio separation endpoints
│   │   │   └── voice.ts                  # Whisper + TTS endpoints
│   │   ├── hooks/
│   │   │   ├── useMapQuery.ts            # Map data fetching
│   │   │   ├── useAudioPlayback.ts       # Audio control hook
│   │   │   ├── useWhisper.ts             # Speech-to-text hook
│   │   │   ├── useTTS.ts                 # Text-to-speech hook
│   │   │   └── useHeatmap.ts             # Heatmap layer management
│   │   └── utils/
│   │       ├── geojson.ts                # GeoJSON processing utilities
│   │       ├── audio.ts                  # Audio processing utilities
│   │       └── threejs.ts                # Three.js scene utilities
│   ├── store/
│   │   ├── mapStore.ts                   # Map state (layers, filters, year)
│   │   ├── audioStore.ts                 # Audio playback state
│   │   └── voiceStore.ts                 # Voice mode state
│   └── types/
│       ├── map.ts                        # Map-related types
│       ├── elephant.ts                   # Elephant data types
│       └── audio.ts                      # Audio types
├── public/
│   ├── audio/                            # Separated elephant calls
│   ├── icons/                            # Custom map markers
│   └── textures/                         # Three.js textures
├── .env.local                            # API keys
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 1. Interactive Heatmap Map (Mapbox)

### Mapbox Setup
```bash
# Get free Mapbox token: https://account.mapbox.com/access-tokens/
# Free tier: 50,000 map loads/month
```

### `.env.local`
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
OPENAI_API_KEY=sk-your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL=postgresql://localhost/elephant_conservation
```

### Main Map Component

```tsx
// src/components/map/ElephantMap.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/store/mapStore';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapLayer {
  id: string;
  label: string;
  visible: boolean;
  type: 'heatmap' | 'line' | 'fill' | 'circle' | 'symbol';
  color: string;
}

export default function ElephantMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { activeLayers, selectedYear, selectedSpecies, threatFilter } = useMapStore();

  // Available layers
  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'population', label: '📊 Population Density', visible: true, type: 'heatmap', color: '#3B82F6' },
    { id: 'threats', label: '⚠️ Threat Incidents', visible: true, type: 'circle', color: '#EF4444' },
    { id: 'migration', label: '🗺️ Migration Routes', visible: true, type: 'line', color: '#10B981' },
    { id: 'habitats', label: '🌿 Habitat Coverage', visible: false, type: 'fill', color: '#F59E0B' },
    { id: 'audio', label: '🔊 Audio Recordings', visible: false, type: 'symbol', color: '#8B5CF6' },
  ]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',  // Dark theme for impact
      center: [35, -2],                          // Centered on East Africa
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    return () => map.current?.remove();
  }, []);

  // Load data when filters change
  useEffect(() => {
    if (!map.current) return;

    const loadData = async () => {
      const res = await fetch(`/api/heatmap?year=${selectedYear}&species=${selectedSpecies}&threats=${threatFilter.join(',')}`);
      const data = await res.json();

      map.current!.on('load', () => {
        addHeatmapLayers(data);
      });

      // Force reload if already loaded
      if (map.current!.loaded()) {
        addHeatmapLayers(data);
      }
    };

    loadData();
  }, [selectedYear, selectedSpecies, threatFilter]);

  function addHeatmapLayers(data: any) {
    const m = map.current!;

    // Population Heatmap Layer
    if (data.population && activeLayers.includes('population')) {
      if (!m.getSource('population')) {
        m.addSource('population', {
          type: 'geojson',
          data: data.population,
        });
      }
      if (!m.getLayer('population-heat')) {
        m.addLayer({
          id: 'population-heat',
          type: 'heatmap',
          source: 'population',
          maxzoom: 12,
          paint: {
            'heatmap-weight': [
              'interpolate', ['linear'], ['get', 'population'],
              0, 0,      // No elephants = no weight
              1000, 0.3,
              10000, 0.7,
              50000, 1,  // 50K+ = maximum intensity
            ],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 12, 2],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',      // Blue (low)
              0.25, 'rgba(0, 255, 128, 0.4)',  // Green
              0.5, 'rgba(255, 255, 0, 0.6)',   // Yellow
              0.75, 'rgba(255, 128, 0, 0.8)',  // Orange
              1, 'rgba(255, 0, 0, 1)',           // Red (high)
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              0, 20,   // Large radius when zoomed out
              12, 40,  // Even larger when zoomed in
            ],
            'heatmap-opacity': 0.7,
          },
        });
      }
    }

    // Threat Incidents Layer (circle markers)
    if (data.threats && activeLayers.includes('threats')) {
      if (!m.getSource('threats')) {
        m.addSource('threats', {
          type: 'geojson',
          data: data.threats,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 50,
        });
      }
      if (!m.getLayer('threat-clusters')) {
        m.addLayer({
          id: 'threat-clusters',
          type: 'circle',
          source: 'threats',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step', ['get', 'point_count'],
              '#FEE08B', 5,
              '#FDAE61', 10,
              '#F46D43', 25,
              '#D53E4F', 50,
              '#9E0142',
            ],
            'circle-radius': ['step', ['get', 'point_count'], 15, 5, 20, 10, 25, 25, 30],
            'circle-opacity': 0.7,
          },
        });
      }
      if (!m.getLayer('threat-points')) {
        m.addLayer({
          id: 'threat-points',
          type: 'circle',
          source: 'threats',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],  // Per-threat color
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });
      }
    }

    // Migration Routes Layer
    if (data.migration && activeLayers.includes('migration')) {
      if (!m.getSource('migration')) {
        m.addSource('migration', {
          type: 'geojson',
          data: data.migration,
        });
      }
      if (!m.getLayer('migration-routes')) {
        m.addLayer({
          id: 'migration-routes',
          type: 'line',
          source: 'migration',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              2, 2,
              10, 6,
            ],
            'line-opacity': [
              'case',
              ['boolean', ['get', 'active'], false], 0.3,  // Inactive = faded
              0.9,                                          // Active = bright
            ],
          },
        });
      }
    }

    // Habitat Polygons Layer
    if (data.habitats && activeLayers.includes('habitats')) {
      if (!m.getSource('habitats')) {
        m.addSource('habitats', {
          type: 'geojson',
          data: data.habitats,
        });
      }
      if (!m.getLayer('habitat-polygons')) {
        m.addLayer({
          id: 'habitat-polygons',
          type: 'fill',
          source: 'habitats',
          paint: {
            'fill-color': ['interpolate', ['linear'], ['get', 'qualityScore'],
              0, '#DC2626',    // Degraded = red
              0.5, '#F59E0B',  // Medium = yellow
              1, '#22C55E',    // Pristine = green
            ],
            'fill-opacity': 0.4,
            'fill-outline-color': '#ffffff',
          },
        });
      }
    }

    // Audio Recording Markers
    if (data.audio && activeLayers.includes('audio')) {
      if (!m.getSource('audio')) {
        m.addSource('audio', {
          type: 'geojson',
          data: data.audio,
        });
      }
      if (!m.getLayer('audio-markers')) {
        m.addLayer({
          id: 'audio-markers',
          type: 'symbol',
          source: 'audio',
          layout: {
            'icon-image': ['match', ['get', 'callType'],
              'rumble', 'elephant-rumble-icon',
              'trumpet', 'elephant-trumpet-icon',
              'elephant-default-icon',
            ],
            'icon-size': 1.5,
            'text-field': ['get', 'callType'],
            'text-font': ['Open Sans Regular'],
            'text-size': 11,
            'text-offset': [0, 1.5],
          },
          paint: {
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          },
        });
      }
    }
  }

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    if (!map.current) return;
    const layerNames: Record<string, string[]> = {
      population: ['population-heat'],
      threats: ['threat-clusters', 'threat-points'],
      migration: ['migration-routes'],
      habitats: ['habitat-polygons'],
      audio: ['audio-markers'],
    };

    const names = layerNames[layerId] || [];
    const isVisible = !map.current.getLayoutProperty(names[0], 'visibility');

    names.forEach(name => {
      map.current!.setLayoutProperty(name, 'visibility', isVisible ? 'visible' : 'none');
    });

    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: isVisible } : l
    ));
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Layer Toggle Panel */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-xl p-4 text-white space-y-2 z-10">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Map Layers</h3>
        {layers.map(layer => (
          <label key={layer.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg px-2 py-1.5">
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={() => toggleLayer(layer.id)}
              className="rounded"
            />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
            <span className="text-sm">{layer.label}</span>
          </label>
        ))}
      </div>

      {/* Year Selector */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-full px-6 py-3 z-10">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">Year:</span>
          <input
            type="range"
            min={1970}
            max={2024}
            value={selectedYear}
            onChange={e => useMapStore.getState().setYear(parseInt(e.target.value))}
            className="w-64"
          />
          <span className="text-white font-mono text-lg">{selectedYear}</span>
        </div>
      </div>
    </div>
  );
}
```

### API Route for Heatmap Data

```tsx
// src/app/api/heatmap/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2024');
  const species = searchParams.get('species') || 'all';
  const threats = searchParams.get('threats') || 'all';

  const [popRes, threatRes, migRes, habRes, audioRes] = await Promise.all([
    // Population heatmap data
    pool.query(`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(centroid::geometry)::json,
            'properties', json_build_object(
              'species', species,
              'region', region,
              'population', estimate,
              'yoyChange', change_from_prev_year
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM v_population_heatmap
      WHERE year = $1 ${species !== 'all' ? 'AND species = $2' : ''}
    `, species !== 'all' ? [year, species] : [year]),

    // Threat incidents
    pool.query(`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', json_build_object('type','Point','coordinates',
              ARRAY[longitude, latitude]),
            'properties', json_build_object(
              'threatType', threat_type,
              'severity', severity,
              'color', color,
              'icon', icon,
              'date', incident_date,
              'killed', elephants_killed
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM v_threat_heatmap
      WHERE EXTRACT(YEAR FROM incident_date) = $1
    `, [year]),

    // Migration routes
    pool.query(`SELECT * FROM v_migration_geojson`),

    // Habitats
    pool.query(`SELECT * FROM v_habitat_heatmap`),

    // Audio recordings
    pool.query(`SELECT * FROM v_audio_map`),
  ]);

  return NextResponse.json({
    population: popRes.rows[0]?.geojson,
    threats: threatRes.rows[0]?.geojson,
    migration: migRes.rows[0]?.geojson,
    habitats: habRes.rows[0]?.geojson,
    audio: audioRes.rows[0]?.geojson,
  });
}
```

---

## 2. Voice Mode with Three.js Soundwave Design

### Concept
When the user enters Voice Mode:
1. Immersive Three.js soundwave visualization fills the screen
2. User speaks → **Whisper** transcribes → intent detected → data fetched
3. AI formulates an explanation → **ElevenLabs TTS** narrates back
4. Soundwave visualization reacts to the spoken audio in real-time

### Three.js Soundwave Scene

```tsx
// src/components/voice/SoundWaveScene.tsx

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function SoundWaveSphere({ audioLevel }: { audioLevel: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireframeRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const level = audioLevel / 255; // Normalize 0-1

    // Distort the sphere based on audio level
    meshRef.current.scale.setScalar(1 + level * 0.3 + Math.sin(t * 2) * 0.05);
    wireframeRef.current.scale.setScalar(1.3 + level * 0.5 + Math.sin(t * 1.5) * 0.1);

    // Rotate slowly
    meshRef.current.rotation.y += 0.005;
    meshRef.current.rotation.x += 0.002;
    wireframeRef.current.rotation.y -= 0.003;
  });

  return (
    <group>
      {/* Core sphere — reacts to audio */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#3B82F6"
          speed={3}
          distort={0.3 + (audioLevel / 255) * 0.7}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>

      {/* Outer wireframe — pulsing ring */}
      <Sphere ref={wireframeRef} args={[1, 32, 32]}>
        <meshBasicMaterial
          color="#8B5CF6"
          wireframe
          transparent
          opacity={0.2 + (audioLevel / 255) * 0.5}
        />
      </Sphere>
    </group>
  );
}

function WaveformRings({ audioData }: { audioData: Float32Array | null }) {
  const ringsRef = useRef<THREE.Group>(null!);

  const rings = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      radius: 1.5 + i * 0.15,
      amplitude: 0,
      frequency: 2 + i * 0.5,
      phase: (i * Math.PI) / 10,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    rings.forEach((ring, i) => {
      const child = ringsRef.current.children[i] as THREE.Mesh;
      if (!child) return;

      // Get audio data for this ring
      const dataIndex = Math.floor((i / rings.length) * (audioData?.length || 1));
      const audioValue = audioData ? audioData[dataIndex] / 255 : 0;

      // Scale ring based on audio
      const scale = ring.radius + audioValue * 0.3 + Math.sin(t * ring.frequency + ring.phase) * 0.05;
      child.scale.set(scale, scale, 1);

      // Pulse opacity
      const material = child.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + audioValue * 0.4;
    });
  });

  return (
    <group ref={ringsRef} rotation={[Math.PI / 2, 0, 0]}>
      {rings.map((ring, i) => (
        <mesh key={i}>
          <ringGeometry args={[ring.radius - 0.02, ring.radius + 0.02, 128]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? '#3B82F6' : i % 3 === 1 ? '#10B981' : '#8B5CF6'}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null!);
  const count = 2000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    particlesRef.current.rotation.y = t * 0.02;
    particlesRef.current.rotation.x = Math.sin(t * 0.01) * 0.1;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#60A5FA"
        size={0.03}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function SoundWaveScene({
  audioLevel,
  audioData,
}: {
  audioLevel: number;
  audioData: Float32Array | null;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
      <color attach="background" args={['#030712']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <SoundWaveSphere audioLevel={audioLevel} />
      <WaveformRings audioData={audioData} />
      <ParticleField />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
```

### Voice Mode Container (Whisper + TTS)

```tsx
// src/components/voice/VoiceMode.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useVoiceStore } from '@/store/voiceStore';

const SoundWaveScene = dynamic(() => import('./SoundWaveScene'), { ssr: false });

// Whisper API integration
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  const data = await res.json();
  return data.text;
}

// TTS via ElevenLabs
async function speak(text: string): Promise<void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?optimize_streaming_latency=3`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  const audioBlob = await res.blob();
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  audio.play();
  return new Promise(resolve => { audio.onended = resolve; });
}

// AI explanation based on query + data
async function generateExplanation(query: string, data: any): Promise<string> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, data }),
  });
  const { explanation } = await res.json();
  return explanation;
}

export default function VoiceMode() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Audio visualization loop
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    setAudioLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length);
    setAudioData(new Float32Array(dataArray));

    animFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isListening]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start recording
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        // Transcribe with Whisper
        const text = await transcribeAudio(blob);
        setTranscript(text);

        // Fetch relevant data and generate explanation
        const explainRes = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text }),
        });
        const { explanation, audioToPlay } = await explainRes;
        setResponse(explanation);

        // Optionally play separated elephant rumble
        if (audioToPlay) {
          const audio = new Audio(`/audio/${audioToPlay}`);
          audio.play();
        }

        // Narrate with TTS
        await speak(explanation);
      };

      mediaRecorder.start();
      setIsListening(true);
      updateAudioLevel();
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopListening = () => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    setAudioData(null);
  };

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0 z-0">
        <SoundWaveScene audioLevel={audioLevel} audioData={audioData} />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20">
        {/* Transcript */}
        {transcript && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 mb-6 max-w-2xl w-full mx-4">
            <p className="text-white/60 text-sm mb-1">You said:</p>
            <p className="text-white text-lg">{transcript}</p>
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="bg-blue-500/20 backdrop-blur-xl rounded-2xl px-6 py-4 mb-6 max-w-2xl w-full mx-4 border border-blue-500/30">
            <p className="text-blue-300 text-sm mb-1">Elephant Intelligence:</p>
            <p className="text-white text-lg">{response}</p>
          </div>
        )}

        {/* Microphone Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)] animate-pulse'
              : 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)]'
          }`}
        >
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            {isListening ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z m5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            )}
          </svg>
        </button>

        <p className="text-white/40 text-sm mt-4">
          {isListening ? 'Listening...' : 'Tap to ask about elephants'}
        </p>
      </div>
    </div>
  );
}
```

### AI Explanation API Route

```tsx
// src/app/api/explain/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pool } from 'pg';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  // 1. Fetch relevant data from database
  const [popData, threatData] = await Promise.all([
    pool.query(`
      SELECT year, SUM(estimate) as total,
             SUM(estimate) - LAG(SUM(estimate)) OVER (ORDER BY year) as change
      FROM population_estimates pe
      JOIN species s ON pe.species_id = s.id
      GROUP BY year ORDER BY year DESC LIMIT 10
    `),
    pool.query(`
      SELECT tc.name, tc.description, COUNT(*) as incident_count,
             SUM(ti.elephants_killed) as total_killed
      FROM threat_incidents ti
      JOIN threat_categories tc ON ti.threat_id = tc.id
      GROUP BY tc.name, tc.description
      ORDER BY incident_count DESC
    `),
  ]);

  // 2. Build context for GPT
  const systemPrompt = `You are an elephant conservation expert AI. Use the following data to answer questions.
  Speak in a warm, knowledgeable tone. Keep responses concise but informative (2-4 sentences).

  Current population data (most recent years):
  ${JSON.stringify(popData.rows)}

  Threat summary:
  ${JSON.stringify(threatData.rows)}`;

  // 3. Generate explanation
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const explanation = completion.choices[0].message.content || '';

  return NextResponse.json({
    explanation,
    dataContext: {
      population: popData.rows,
      threats: threatData.rows,
    },
  });
}
```

---

## 3. Elephant Separator Panel (Integrated)

```tsx
// src/components/separator/SeparatorPanel.tsx

'use client';

import { useState, useRef, useCallback } from 'react';

export default function SeparatorPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ original: string; separated: string } | null>(null);
  const [noiseType, setNoiseType] = useState<string>('airplane');

  const handleSeparate = async () => {
    if (!file) return;
    setProcessing(true);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('noiseType', noiseType);

    const res = await fetch('/api/separate', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setResult(data);
    setProcessing(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">🐘 Elephant Call Separator</h2>
      <p className="text-gray-400">Upload a recording with elephant rumble + mechanical noise</p>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          accept="audio/wav,audio/mp3,audio/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="hidden"
          id="audio-upload"
        />
        <label htmlFor="audio-upload" className="cursor-pointer text-gray-300 hover:text-white">
          {file ? file.name : '📁 Drop audio file or click to upload'}
        </label>
      </div>

      {/* Noise Type Selector */}
      <div className="flex gap-2">
        {['airplane', 'car', 'generator'].map(type => (
          <button
            key={type}
            onClick={() => setNoiseType(type)}
            className={`px-4 py-2 rounded-lg transition ${
              noiseType === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type === 'airplane' ? '✈️' : type === 'car' ? '🚗' : '⚡'} {type}
          </button>
        ))}
      </div>

      {/* Process Button */}
      <button
        onClick={handleSeparate}
        disabled={!file || processing}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500
                   text-white font-medium py-3 rounded-xl transition"
      >
        {processing ? '⏳ Processing...' : '🔊 Separate Elephant Call'}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-2">Original (with noise)</h3>
            <audio controls src={result.original} className="w-full" />
          </div>
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
            <h3 className="text-sm text-green-400 mb-2">✅ Separated Elephant Rumble</h3>
            <audio controls src={result.separated} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Navigation Layout

```tsx
// src/app/layout.tsx

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white">
        <div className="flex h-screen">
          {/* Sidebar */}
          <nav className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
            <div className="text-xl font-bold mb-8">🐘 ElephantOS</div>

            <div className="space-y-1 flex-1">
              {[
                { href: '/', label: '📊 Dashboard', icon: 'chart' },
                { href: '/map', label: '🗺️ Interactive Map', icon: 'map' },
                { href: '/separator', label: '🔊 Call Separator', icon: 'audio' },
                { href: '/voice', label: '🎙️ Voice Mode', icon: 'voice' },
              ].map(item => (
                <a key={item.href} href={item.href}
                   className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
                  {item.label}
                </a>
              ))}
            </div>

            <div className="text-xs text-gray-600">
              Elephant Conservation Platform v1.0
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

---

## Deployment Options

| Option | Cost | Best For |
|--------|------|----------|
| **Vercel** (frontend) | Free tier | Next.js hosting, serverless API |
| **Supabase** (database) | Free tier | Managed PostGIS + real-time |
| **Railway** (Python backend) | $5/mo | Elephant separator API |
| **Cloudflare R2** (audio storage) | Free 10GB | Separated audio file serving |
| **Self-host** (all) | Free | Full control |

### Recommended: Vercel + Supabase + Railway

```bash
# Frontend → Vercel
vercel deploy

# Database → Supabase (free PostGIS database)
# Already has PostGIS enabled, real-time subscriptions, auth
# https://supabase.com → New Project → Connect to Next.js

# Separator API → Railway
railway init
railway up

# Audio files → Cloudflare R2 (S3-compatible)
# Store separated elephant calls for playback
```

---

## Quick Start

```bash
# 1. Clone & install
git clone <repo>
cd elephant-separator/frontend
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Start PostgreSQL + PostGIS + Redis
brew services start postgresql@16
brew services start redis

# 4. Initialize database
createdb elephant_conservation
psql elephant_conservation -c "CREATE EXTENSION postgis;"
psql elephant_conservation -f ../database/init.sql

# 5. Start development
npm run dev
# Open http://localhost:3000
```

---

*Frontend Implementation Guide v1.0*
*Date: April 11, 2026*
