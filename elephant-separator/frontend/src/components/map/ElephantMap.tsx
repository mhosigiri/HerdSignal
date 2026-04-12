"use client";

import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";

import { useMapQuery } from "@/lib/hooks/useMapQuery";
import { useMapStore } from "@/store/mapStore";

export function ElephantMap() {
  const { data } = useMapQuery();
  const { activeLayers } = useMapStore();

  return (
    <div className="relative h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#14251a]">
      <MapContainer
        center={[-2.2, 36.8]}
        zoom={5}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {activeLayers.population &&
          data?.heatmap.map((item) => (
            <Circle
              key={`population-${item.label}`}
              center={[item.latitude, item.longitude]}
              radius={12000 + item.intensity * 24000}
              pathOptions={{
                color: "#5f8c61",
                fillColor: "#d2c25b",
                fillOpacity: 0.18,
                weight: 1,
              }}
            >
              <Popup>
                <strong>{item.label}</strong>
                <br />
                Density intensity: {item.intensity.toFixed(2)}
              </Popup>
            </Circle>
          ))}

        {activeLayers.threats &&
          data?.threats.map((item) => (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              radius={4 + item.severity * 2}
              pathOptions={{
                color: "#f7efe1",
                fillColor: "#d76848",
                fillOpacity: 0.95,
                weight: 1.5,
              }}
            >
              <Popup>
                <strong>{item.title}</strong>
                <br />
                {item.category} · severity {item.severity}
              </Popup>
            </CircleMarker>
          ))}

        {activeLayers.migration &&
          data?.migration.map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates.map((coordinate) => [
                coordinate.latitude,
                coordinate.longitude,
              ])}
              pathOptions={{
                color: "#87c58c",
                weight: 4,
                opacity: 0.85,
              }}
            >
              <Popup>{route.label}</Popup>
            </Polyline>
          ))}

        {activeLayers.habitats &&
          data?.habitats.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.coordinates.map((coordinate) => [
                coordinate.latitude,
                coordinate.longitude,
              ])}
              pathOptions={{
                color: "#d2a24f",
                fillColor: "#d2a24f",
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>{zone.label}</Popup>
            </Polygon>
          ))}

        {activeLayers.audio &&
          data?.audio.map((item) => (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              radius={7}
              pathOptions={{
                color: "#27452d",
                fillColor: item.quality === "separated" ? "#f7efe1" : "#d2a24f",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{item.title}</strong>
                <br />
                {item.quality === "separated" ? "Separated reference" : "Raw field recording"}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      {!data ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl bg-black/45 px-4 py-3 text-sm text-stone-100 backdrop-blur">
          Loading conservation layers...
        </div>
      ) : null}
    </div>
  );
}
