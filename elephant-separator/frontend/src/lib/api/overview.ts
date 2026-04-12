import { createClient } from "@supabase/supabase-js";

import type { HabitatDatum, PopulationPoint, ThreatDatum } from "@/types/elephant";
import {
  audioAssets,
  habitatCoverage,
  populationTrend as mockPopulationTrend,
  summaryMetrics,
  threatBreakdown as mockThreatBreakdown,
} from "@/lib/api/mock-data";

// Server-side Supabase client (uses service-role key when available so RLS
// doesn't block reads from the server component / API route).
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const THREAT_COLORS: Record<string, string> = {
  "Poaching for Ivory": "#b94f35",
  Poaching: "#b94f35",
  "Habitat Loss": "#d29d48",
  "Human-Elephant Conflict": "#dd7452",
  Drought: "#8f7b57",
  Disease: "#7a8f57",
  "Ivory Trafficking": "#c4783a",
};

export async function getOverviewData() {
  const supabase = getSupabase();

  let populationTrend: PopulationPoint[] = mockPopulationTrend;
  let threatBreakdown: ThreatDatum[] = mockThreatBreakdown;

  if (!supabase) {
    return { summaryMetrics, populationTrend, threatBreakdown, habitatCoverage, audioAssets };
  }

  // ── Population trend ──────────────────────────────────────────────────────
  // Supabase column: estimate_year, estimate  (audit: year/population mismatch fixed here)
  try {
    const { data: popData } = await supabase
      .from("population_estimates")
      .select("estimate_year, estimate")
      .order("estimate_year");

    if (popData && popData.length > 0) {
      // Group by year (sum across regions/species)
      const byYear = new Map<number, number>();
      for (const row of popData) {
        if (row.estimate_year && row.estimate) {
          byYear.set(
            row.estimate_year,
            (byYear.get(row.estimate_year) ?? 0) + row.estimate
          );
        }
      }
      const trend: PopulationPoint[] = Array.from(byYear.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, estimate]) => ({ year, estimate }));

      if (trend.length > 0) populationTrend = trend;
    }
  } catch (err) {
    console.warn("[overview] population_estimates query failed:", err);
  }

  // ── Threat breakdown ──────────────────────────────────────────────────────
  // Join threat_incidents → threat_categories to get the category name
  try {
    const { data: threatData } = await supabase
      .from("threat_incidents")
      .select("threat_categories(name)");

    if (threatData && threatData.length > 0) {
      const counts: Record<string, number> = {};
      for (const row of threatData) {
        const name =
          (row.threat_categories as { name?: string } | null)?.name ?? "Unknown";
        counts[name] = (counts[name] ?? 0) + 1;
      }

      const breakdown: ThreatDatum[] = Object.entries(counts)
        .map(([name, incidents]) => ({
          name,
          incidents,
          color: THREAT_COLORS[name] ?? "#8f7b57",
        }))
        .sort((a, b) => b.incidents - a.incidents);

      if (breakdown.length > 0) threatBreakdown = breakdown;
    }
  } catch (err) {
    console.warn("[overview] threat_incidents query failed:", err);
  }

  return { summaryMetrics, populationTrend, threatBreakdown, habitatCoverage, audioAssets };
}
