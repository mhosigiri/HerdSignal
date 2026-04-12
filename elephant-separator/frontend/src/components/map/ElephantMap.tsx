"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import CountryInsightCard from "@/components/map/CountryInsightCard";
import HeatmapLegend from "@/components/map/HeatmapLegend";
import HeatmapTogglePanel from "@/components/map/HeatmapTogglePanel";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import countriesGeoRaw from "@/lib/map/countries.json";
import { getMetricColor } from "@/lib/map/colorScale";
import {
  MAP_BEARING,
  MAP_CENTER,
  MAP_PITCH,
  MAP_STYLE_URL,
  MAP_ZOOM,
} from "@/lib/map/mapStyle";
import type {
  HeatmapMetric,
  MapCountryMetric,
  SelectedCountryDetail,
} from "@/lib/map/types";

/** Natural Earth boundaries bundled as JSON (`.json` extension required for Next/Turbopack). */
const countriesGeo = countriesGeoRaw as FeatureCollection;

const SOURCE_ID = "choropleth-countries";
const FILL_LAYER_ID = "choropleth-fill";
const LINE_LAYER_ID = "choropleth-line";

/**
 * Choropleth runtime gate — use before queryRenderedFeatures, setPaintProperty, setFeatureState.
 * All of: map instance, GeoJSON source, fill layer, line layer.
 */
function isChoroplethReady(map: maplibregl.Map | null): boolean {
  if (!map) return false;
  if (map.getSource(SOURCE_ID) == null) return false;
  if (map.getLayer(FILL_LAYER_ID) == null) return false;
  if (map.getLayer(LINE_LAYER_ID) == null) return false;
  return true;
}

/** Natural Earth ISO 3166-1 alpha-3; matches Supabase `iso_code` / `MapCountryMetric.isoCode`. */
const ISO_JOIN_PROPERTY = "iso_a3";

/** Plain \`fill-color\` when no metric, no rows, or no valid pairs — always valid MapLibre output. */
const CHOROPLETH_PLAIN_FILL = "#2d4a3d";

/** Country outlines — quiet sage, not bright cream. */
const DEFAULT_BORDER_COLOR = "rgba(148, 168, 160, 0.38)";

const PAINT_TRANSITION_MS = 420;
const PAINT_OPACITY_TRANSITION_MS = 280;

/**
 * Fill opacity: lower in neutral mode; slightly stronger when a metric is active.
 * Hover lifts gently via feature-state.
 */
function buildFillOpacityExpression(metric: HeatmapMetric | null): unknown {
  if (metric === null) {
    return [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      0.5,
      0.34,
    ];
  }
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.72,
    0.54,
  ];
}

function applyChoroplethPaintTransitions(map: maplibregl.Map): void {
  if (!isChoroplethReady(map)) return;
  const tColor = { duration: PAINT_TRANSITION_MS, delay: 0 };
  const tOpacity = { duration: PAINT_OPACITY_TRANSITION_MS, delay: 0 };
  try {
    map.setPaintProperty(
      FILL_LAYER_ID,
      "fill-color-transition",
      tColor as never,
    );
    map.setPaintProperty(
      FILL_LAYER_ID,
      "fill-opacity-transition",
      tOpacity as never,
    );
    map.setPaintProperty(
      LINE_LAYER_ID,
      "line-opacity-transition",
      { duration: 220, delay: 0 } as never,
    );
  } catch {
    /* older MapLibre builds may omit transition paint keys */
  }
}

let loggedSampleGeoJsonProps = false;

function pickIsoFromFeatureProps(
  props: Record<string, unknown> | null | undefined,
): string {
  if (!props) return "";
  const raw = props.iso_a3 ?? props.adm0_a3;
  const s =
    typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
  if (!s || s === "-99") return "";
  return s;
}

function pickCountryLabelFromProps(
  props: Record<string, unknown> | null | undefined,
  fallback: string,
): string {
  if (!props) return fallback;
  for (const key of ["admin", "name", "name_en", "name_long"] as const) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function getMetricValue(
  row: MapCountryMetric,
  metric: HeatmapMetric,
): unknown {
  switch (metric) {
    case "population":
      return row.population;
    case "elephantType":
      return row.elephantType;
    case "lifeExpectancy":
      return row.lifeExpectancy;
    case "poachingRate":
      return row.poachingRate;
    default:
      return undefined;
  }
}

/**
 * MapLibre `fill-color`: plain string, or complete `match` on ISO → colors.
 * Never returns an incomplete `['match', ['get', ...]]` (needs ≥1 pair + default).
 */
function buildFillExpression(
  metric: HeatmapMetric | null,
  rows: MapCountryMetric[],
): unknown {
  if (process.env.NODE_ENV !== "production") {
    console.log("[buildFillExpression] metric:", metric);
    console.log("[buildFillExpression] rows length:", rows.length);
  }

  if (metric === null) {
    return CHOROPLETH_PLAIN_FILL;
  }

  if (!rows.length) {
    return CHOROPLETH_PLAIN_FILL;
  }

  const seen = new Set<string>();
  const pairs: { iso: string; color: string }[] = [];

  for (const row of rows) {
    const iso = String(row.isoCode ?? "").trim().toUpperCase();
    if (!iso || !/^[A-Z]{3}$/.test(iso) || seen.has(iso)) continue;
    const val = getMetricValue(row, metric);
    const color = getMetricColor(metric, val);
    if (typeof color !== "string" || !color.trim()) continue;
    seen.add(iso);
    pairs.push({ iso, color });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[buildFillExpression] valid pairs length:", pairs.length);
  }

  if (pairs.length === 0) {
    return CHOROPLETH_PLAIN_FILL;
  }

  const expr: unknown[] = ["match", ["get", ISO_JOIN_PROPERTY]];
  for (const p of pairs) {
    expr.push(p.iso, p.color);
  }
  expr.push(CHOROPLETH_PLAIN_FILL);
  return expr;
}

export default function ElephantMap() {
  const { data: heatmapRows, loading: heatmapLoading, error: heatmapError } =
    useHeatmapData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMetricRef = useRef<HeatmapMetric | null>(null);
  const metricByIsoRef = useRef<Map<string, MapCountryMetric>>(new Map());
  const rowsRef = useRef<MapCountryMetric[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<HeatmapMetric | null>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<SelectedCountryDetail | null>(null);

  useLayoutEffect(() => {
    rowsRef.current = heatmapRows;
    const m = new Map<string, MapCountryMetric>();
    for (const row of heatmapRows) {
      const iso = String(row.isoCode ?? "").trim().toUpperCase();
      if (iso) m.set(iso, row);
    }
    metricByIsoRef.current = m;
  }, [heatmapRows]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const sampleIso = heatmapRows
      .slice(0, 10)
      .map((r) => String(r.isoCode ?? "").trim().toUpperCase());
    const gj0 = countriesGeo.features?.[0]?.properties as
      | Record<string, unknown>
      | undefined;
    console.log("[choropleth verify] heatmapRows first 10 isoCodes:", sampleIso);
    console.log(
      "[choropleth verify] GeoJSON first feature join key",
      ISO_JOIN_PROPERTY,
      "=",
      gj0?.[ISO_JOIN_PROPERTY],
      "(adm0_a3:",
      gj0?.adm0_a3,
      ")",
    );
    console.log("[choropleth verify] metricByIsoRef.size:", metricByIsoRef.current.size);
  }, [heatmapRows]);

  useEffect(() => {
    selectedMetricRef.current = selectedMetric;
  }, [selectedMetric]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      bearing: MAP_BEARING,
      pitch: MAP_PITCH,
    });
    mapRef.current = map;

    let hoveredId: string | number | undefined;
    let interactionListenersAttached = false;

    function clearHoverFeatureState(): void {
      if (hoveredId === undefined || hoveredId === null) return;
      if (!isChoroplethReady(map)) {
        hoveredId = undefined;
        return;
      }
      try {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredId },
          { hover: false },
        );
      } catch {
        /* source/layer gone (e.g. style swap) or stale id */
      }
      hoveredId = undefined;
    }

    const setupLayers = () => {
      if (map.getSource(SOURCE_ID)) return;
      if (
        process.env.NODE_ENV === "development" &&
        !loggedSampleGeoJsonProps &&
        countriesGeo.features?.length
      ) {
        loggedSampleGeoJsonProps = true;
        console.log(
          "[choropleth] sample GeoJSON properties:",
          countriesGeo.features[0]?.properties,
        );
      }
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: countriesGeo,
        generateId: true,
      });
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": buildFillExpression(
            selectedMetricRef.current,
            rowsRef.current,
          ) as never,
          "fill-opacity": buildFillOpacityExpression(
            selectedMetricRef.current,
          ) as never,
        },
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": DEFAULT_BORDER_COLOR,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.05,
            0.48,
          ],
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.38,
            0.2,
          ],
        },
      });
      applyChoroplethPaintTransitions(map);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!isChoroplethReady(map)) {
        hoveredId = undefined;
        map.getCanvas().style.cursor = "";
        return;
      }
      const hits = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID],
      });
      clearHoverFeatureState();
      const hit = hits[0];
      if (hit?.id !== undefined) {
        hoveredId = hit.id;
        if (isChoroplethReady(map)) {
          try {
            map.setFeatureState(
              { source: SOURCE_ID, id: hoveredId },
              { hover: true },
            );
          } catch {
            hoveredId = undefined;
          }
        } else {
          hoveredId = undefined;
        }
      }
      map.getCanvas().style.cursor = hits.length ? "pointer" : "";
    };

    /** MapLibre uses `mouseout` for leaving the map canvas (browser `mouseleave` equivalent). */
    const onMouseOut = () => {
      if (!isChoroplethReady(map)) {
        hoveredId = undefined;
        map.getCanvas().style.cursor = "";
        return;
      }
      clearHoverFeatureState();
      map.getCanvas().style.cursor = "";
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!isChoroplethReady(map)) return;
      const hits = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID],
      });
      if (!hits.length) {
        setSelectedCountry(null);
        return;
      }
      const f = hits[0];
      const props = f.properties as Record<string, unknown> | null;
      const iso = pickIsoFromFeatureProps(props);
      if (!iso) {
        setSelectedCountry(null);
        return;
      }
      const row = metricByIsoRef.current.get(iso);
      if (!row) {
        setSelectedCountry(null);
        return;
      }
      const name = pickCountryLabelFromProps(props, row.country);
      setSelectedCountry({
        ...row,
        displayName: name,
        featureId: f.id as string | number | undefined,
      });
    };

    function attachInteractionHandlers(): void {
      if (interactionListenersAttached || !isChoroplethReady(map)) return;
      map.on("mousemove", onMove);
      map.on("mouseout", onMouseOut);
      map.on("click", onClick);
      interactionListenersAttached = true;
    }

    const onMapLoad = () => {
      setupLayers();
      attachInteractionHandlers();
    };

    if (map.loaded()) onMapLoad();
    else map.once("load", onMapLoad);

    return () => {
      try {
        if (interactionListenersAttached) {
          map.off("mousemove", onMove);
          map.off("mouseout", onMouseOut);
          map.off("click", onClick);
        }
        if (
          isChoroplethReady(map) &&
          hoveredId !== undefined &&
          hoveredId !== null
        ) {
          try {
            map.setFeatureState(
              { source: SOURCE_ID, id: hoveredId },
              { hover: false },
            );
          } catch {
            /* teardown */
          }
        }
      } catch {
        /* partial init */
      } finally {
        try {
          map.remove();
        } catch {
          /* already removed */
        }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isChoroplethReady(map)) return;
    try {
      map.setPaintProperty(
        FILL_LAYER_ID,
        "fill-color",
        buildFillExpression(selectedMetric, heatmapRows) as never,
      );
      map.setPaintProperty(
        FILL_LAYER_ID,
        "fill-opacity",
        buildFillOpacityExpression(selectedMetric) as never,
      );
    } catch {
      /* layer not ready or style in flux */
    }
  }, [selectedMetric, heatmapRows]);

  return (
    <div
      className="relative h-full w-full min-h-0 overflow-hidden"
      style={{ background: "#080808" }}
    >
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="h-full w-full min-h-0"
        style={{ minHeight: "100%" }}
      />

      {/* ── Left panel — vertical filter + legend column ── */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: "1.25rem",
          top: "1.25rem",
          bottom: "1.25rem",
          zIndex: 500,
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          width: "11rem",
        }}
      >
        <HeatmapTogglePanel
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
        <HeatmapLegend selectedMetric={selectedMetric} />
      </div>

      {/* ── Loading / error status chip ── */}
      {(heatmapLoading || heatmapError) && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            zIndex: 499,
            fontSize: "0.625rem",
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.28)",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "9999px",
            padding: "0.3rem 0.75rem",
            border: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {heatmapLoading ? "Loading metrics…" : "Metrics unavailable"}
        </div>
      )}

      {/* ── Country insight card — bottom right ── */}
      <CountryInsightCard
        detail={selectedCountry}
        selectedMetric={selectedMetric}
        onClose={() => setSelectedCountry(null)}
      />
    </div>
  );
}
