import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { mapDataset } from "@/lib/api/mock-data";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabase();

  // Start with mock data as baseline; replace layers as real data arrives
  const dataset = structuredClone(mapDataset);

  if (!supabase) {
    return NextResponse.json(dataset);
  }

  // ── threat_incidents ──────────────────────────────────────────────────────
  // PostgREST returns PostGIS geography as GeoJSON automatically via the
  // `location` column: { type: "Point", coordinates: [lng, lat] }
  try {
    const { data: incidents } = await supabase
      .from("threat_incidents")
      .select(
        "id, incident_date, severity, elephants_killed, ivory_seized_kg, location, threat_categories(name)"
      )
      .order("incident_date", { ascending: false })
      .limit(200);

    if (incidents && incidents.length > 0) {
      const mapped = incidents
        .filter((row) => row.location?.coordinates)
        .map((row, idx) => {
          const [lng, lat] = row.location.coordinates as [number, number];
          const catName =
            (row.threat_categories as { name?: string } | null)?.name ??
            "Unknown";
          return {
            id: row.id ?? `threat-${idx}`,
            category: catName,
            severity: row.severity ?? 3,
            title: `${catName} — ${row.incident_date ?? "unknown date"}`,
            longitude: lng,
            latitude: lat,
          };
        });

      if (mapped.length > 0) dataset.threats = mapped;
    }
  } catch (err) {
    console.warn("[/api/heatmap] threat_incidents query failed:", err);
  }

  // ── population_estimates → heatmap bubbles ────────────────────────────────
  // regions table has centroid (geography) when populated
  try {
    const { data: popRows } = await supabase
      .from("population_estimates")
      .select("estimate, estimate_year, regions(name, centroid)")
      .eq("estimate_year", 2024)
      .limit(50);

    if (popRows && popRows.length > 0) {
      const maxEstimate = Math.max(...popRows.map((r) => r.estimate ?? 0));
      const heatmap = popRows
        .filter((r) => (r.regions as { centroid?: unknown } | null)?.centroid)
        .map((r, idx) => {
          const centroid = (r.regions as { centroid?: { coordinates?: [number, number] } } | null)
            ?.centroid;
          const [lng, lat] = centroid?.coordinates ?? [0, 0];
          return {
            longitude: lng,
            latitude: lat,
            intensity: maxEstimate > 0 ? (r.estimate ?? 0) / maxEstimate : 0.5,
            label:
              (r.regions as { name?: string } | null)?.name ??
              `Region ${idx + 1}`,
          };
        });

      if (heatmap.length > 0) dataset.heatmap = heatmap;
    }
  } catch (err) {
    console.warn("[/api/heatmap] population_estimates query failed:", err);
  }

  return NextResponse.json(dataset);
}
