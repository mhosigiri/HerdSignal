"use client";

import { useEffect, useRef } from "react";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useState } from "react";

import { useMapQuery } from "@/lib/hooks/useMapQuery";
import { useMapStore } from "@/store/mapStore";
import type {
  HabitatZone,
  HeatmapPoint,
  MigrationRoute,
  ThreatIncident,
  AudioMarker,
} from "@/types/map";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? "";

// ── Sub-components that need the map instance ──────────────────────────────

function MigrationLayer({ routes }: { routes: MigrationRoute[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = routes.map(
      (route) =>
        new mapsLib.Polyline({
          path: route.coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
          map,
          strokeColor: "#87c58c",
          strokeWeight: 4,
          strokeOpacity: 0.85,
        })
    );
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, routes]);

  return null;
}

function HabitatLayer({ zones }: { zones: HabitatZone[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = zones.map(
      (zone) =>
        new mapsLib.Polygon({
          paths: zone.coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
          map,
          strokeColor: "#d2a24f",
          strokeWeight: 2,
          fillColor: "#d2a24f",
          fillOpacity: 0.18,
        })
    );
    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, zones]);

  return null;
}

function PopulationLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = points.map(
      (pt) =>
        new mapsLib.Circle({
          center: { lat: pt.latitude, lng: pt.longitude },
          radius: 12000 + pt.intensity * 24000,
          map,
          strokeColor: "#5f8c61",
          strokeWeight: 1,
          fillColor: "#d2c25b",
          fillOpacity: 0.18,
        })
    );
    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
    };
  }, [map, mapsLib, points]);

  return null;
}

// ── Threat markers (declarative AdvancedMarker with popups) ────────────────

function ThreatMarkers({ threats }: { threats: ThreatIncident[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      {threats.map((item) => (
        <AdvancedMarker
          key={item.id}
          position={{ lat: item.latitude, lng: item.longitude }}
          onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
        >
          {/* Custom circle pin */}
          <div
            style={{
              width: `${12 + item.severity * 4}px`,
              height: `${12 + item.severity * 4}px`,
              borderRadius: "50%",
              background: "#d76848",
              border: "2px solid #f7efe1",
              cursor: "pointer",
            }}
          />
        </AdvancedMarker>
      ))}

      {threats
        .filter((t) => t.id === selectedId)
        .map((t) => (
          <InfoWindow
            key={`info-${t.id}`}
            position={{ lat: t.latitude, lng: t.longitude }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="text-sm">
              <strong>{t.title}</strong>
              <br />
              {t.category} · severity {t.severity}
            </div>
          </InfoWindow>
        ))}
    </>
  );
}

// ── Audio markers ──────────────────────────────────────────────────────────

function AudioMarkers({ markers }: { markers: AudioMarker[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      {markers.map((item) => (
        <AdvancedMarker
          key={item.id}
          position={{ lat: item.latitude, lng: item.longitude }}
          onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: item.quality === "separated" ? "#f7efe1" : "#d2a24f",
              border: "2px solid #27452d",
              cursor: "pointer",
            }}
          />
        </AdvancedMarker>
      ))}

      {markers
        .filter((m) => m.id === selectedId)
        .map((m) => (
          <InfoWindow
            key={`info-${m.id}`}
            position={{ lat: m.latitude, lng: m.longitude }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="text-sm">
              <strong>{m.title}</strong>
              <br />
              {m.quality === "separated" ? "Separated reference" : "Raw field recording"}
            </div>
          </InfoWindow>
        ))}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function MapContent() {
  const { data } = useMapQuery();
  const { activeLayers } = useMapStore();

  return (
    <>
      {activeLayers.population && data?.heatmap && (
        <PopulationLayer points={data.heatmap} />
      )}
      {activeLayers.threats && data?.threats && (
        <ThreatMarkers threats={data.threats} />
      )}
      {activeLayers.migration && data?.migration && (
        <MigrationLayer routes={data.migration} />
      )}
      {activeLayers.habitats && data?.habitats && (
        <HabitatLayer zones={data.habitats} />
      )}
      {activeLayers.audio && data?.audio && (
        <AudioMarkers markers={data.audio} />
      )}
    </>
  );
}

export function ElephantMap() {
  const { data } = useMapQuery();

  return (
    <div className="relative h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#14251a]">
      <APIProvider apiKey={API_KEY}>
        <Map
          mapId={MAP_ID || undefined}
          defaultCenter={{ lat: -2.2, lng: 36.8 }}
          defaultZoom={5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full"
          mapTypeId="hybrid"
        >
          <MapContent />
        </Map>
      </APIProvider>

      {!data && (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl bg-black/45 px-4 py-3 text-sm text-stone-100 backdrop-blur">
          Loading conservation layers…
        </div>
      )}
    </div>
  );
}
