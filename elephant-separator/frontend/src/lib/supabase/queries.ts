/**
 * Heatmap data is built from existing public tables (read-only via anon key).
 * No Supabase DDL/migrations from this app without explicit team approval.
 *
 * Join key: `regions.iso_code` → trimmed uppercase → ISO 3166-1 alpha-3 to match Natural Earth `iso_a3`.
 * Alpha-2 codes from the DB are converted with `i18n-iso-countries`.
 */
import { alpha2ToAlpha3 } from "i18n-iso-countries";

import type { ElephantType, IucnStatusCode, MapCountryMetric, TrendDirection } from "@/lib/map/types";

import { getSupabaseBrowserClient } from "./client";

const VALID_ELEPHANT = new Set<ElephantType>([
  "AfricanSavanna",
  "AfricanForest",
  "Asian",
  "Mixed",
  "Unknown",
]);

function optFiniteNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Normalize numeric metrics for API/UI: nearest value with two digits after the decimal. */
function roundTwoDecimalPlaces(n: number): number {
  return Number(n.toFixed(2));
}

function speciesToElephantType(commonName: string, shortCode: string): ElephantType {
  const name = commonName.toLowerCase();
  const code = shortCode.toUpperCase();
  if (code.includes("SAV") || name.includes("savanna")) return "AfricanSavanna";
  if (code.includes("FOR") || name.includes("forest")) return "AfricanForest";
  if (code.includes("ASIAN") || name.includes("asian")) return "Asian";
  return "Unknown";
}

/** Natural Earth `iso_a3` is ISO 3166-1 alpha-3 (exactly 3 letters). */
function normalizeIsoAlpha3(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  if (s.length === 0) return null;
  if (/^[A-Z]{3}$/.test(s)) return s;
  if (/^[A-Z]{2}$/.test(s)) {
    const a3 = alpha2ToAlpha3(s);
    if (a3 && /^[A-Z]{3}$/.test(a3)) return a3;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[fetchHeatmapData] skipping region: iso_code not a mappable ISO alpha-2/alpha-3:",
      JSON.stringify(raw),
    );
  }
  return null;
}

function isBlankCountryName(name: string | undefined): boolean {
  return name == null || typeof name !== "string" || name.trim() === "";
}

function rowHasAnyMetric(row: MapCountryMetric): boolean {
  if (row.population != null && row.population > 0) return true;
  if (row.lifeExpectancy != null) return true;
  if (row.poachingRate != null) return true;
  if (row.elephantType != null && row.elephantType !== "Unknown") return true;
  if (row.conservationStatus != null && row.conservationStatus !== "Unknown") return true;
  if (row.populationTrend != null && row.populationTrend !== "UNKNOWN") return true;
  return false;
}

function isValidHeatmapRow(row: MapCountryMetric): boolean {
  if (isBlankCountryName(row.country)) return false;
  const iso = String(row.isoCode ?? "").trim().toUpperCase();
  if (!iso || !/^[A-Z]{3}$/.test(iso)) return false;
  if (!rowHasAnyMetric(row)) return false;
  return true;
}

type RegionRow = {
  id: string;
  name: string;
  country_name: string | null;
  iso_code: string | null;
  region_type: string;
};

type SpeciesRow = {
  id: string;
  common_name: string;
  short_code: string;
};

type PopRow = {
  species_id: string;
  region_id: string;
  estimate: number | null;
  estimate_year: number;
};

type CorridorRow = {
  region_id: string | null;
  threat_level: number | null;
  is_active: boolean | null;
};

type ThreatRow = {
  region_id: string | null;
  severity: number | null;
  elephants_killed: number | null;
};

type ConservationStatusRow = {
  region_id: string | null;
  iucn_status_code: string | null;
  iucn_status: string | null;
};

type PopulationTrendRow = {
  region_id: string | null;
  overall_trend: string | null;
  trend_direction: string | null;
};

async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const supabase = getSupabaseBrowserClient();
  const pageSize = 1000;
  const acc: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`[selectAll ${table}]`, error);
      throw new Error(error.message);
    }
    const chunk = (data ?? []) as T[];
    acc.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return acc;
}

/**
 * Aggregates population, species (dominant type), migration corridors, and threats per country region.
 * Duplicate ISO codes: **last region row in stable id order** wins when merging metrics.
 */
export async function fetchHeatmapData(): Promise<MapCountryMetric[]> {
  const supabase = getSupabaseBrowserClient();

  const [
    { data: regionsData, error: regionsError },
    speciesList,
    popList,
    corridorList,
    threatList,
    conservationStatusList,
    populationTrendList,
  ] =
    await Promise.all([
      supabase
        .from("regions")
        .select("id, name, country_name, iso_code, region_type")
        .eq("region_type", "country")
        .not("iso_code", "is", null)
        .order("id", { ascending: true }),
      selectAll<SpeciesRow>("species", "id, common_name, short_code"),
      selectAll<PopRow>(
        "population_estimates",
        "species_id, region_id, estimate, estimate_year",
      ),
      selectAll<CorridorRow>(
        "migration_corridors",
        "region_id, threat_level, is_active",
      ),
      selectAll<ThreatRow>(
        "threat_incidents",
        "region_id, severity, elephants_killed",
      ),
      selectAll<ConservationStatusRow>(
        "elephant_conservation_status",
        "region_id, iucn_status_code, iucn_status",
      ),
      selectAll<PopulationTrendRow>(
        "elephant_population_trend",
        "region_id, overall_trend, trend_direction",
      ),
    ]);

  if (regionsError) {
    console.error("[fetchHeatmapData] regions", regionsError);
    throw new Error(regionsError.message);
  }

  const speciesById = new Map<string, SpeciesRow>();
  for (const s of speciesList) {
    speciesById.set(s.id, s);
  }

  const regions = (regionsData ?? []) as RegionRow[];

  /** Latest year per region */
  const latestYearByRegion = new Map<string, number>();
  for (const p of popList) {
    const y = p.estimate_year;
    if (!Number.isFinite(y)) continue;
    const prev = latestYearByRegion.get(p.region_id);
    if (prev === undefined || y > prev) latestYearByRegion.set(p.region_id, y);
  }

  /** Sum of estimates by region at latest year, and per-species breakdown */
  const popSumByRegion = new Map<string, number>();
  const popByRegionSpecies = new Map<string, Map<string, number>>();

  for (const p of popList) {
    const ly = latestYearByRegion.get(p.region_id);
    if (ly === undefined || p.estimate_year !== ly) continue;
    const est = optFiniteNumber(p.estimate);
    if (est === undefined) continue;
    const add = Math.round(est);
    popSumByRegion.set(
      p.region_id,
      (popSumByRegion.get(p.region_id) ?? 0) + add,
    );
    let m = popByRegionSpecies.get(p.region_id);
    if (!m) {
      m = new Map();
      popByRegionSpecies.set(p.region_id, m);
    }
    m.set(p.species_id, (m.get(p.species_id) ?? 0) + add);
  }

  /** Corridors: active only; avg threat_level per region */
  const corridorByRegion = new Map<string, number[]>();
  for (const c of corridorList) {
    if (c.is_active === false) continue;
    if (!c.region_id) continue;
    const tl = optFiniteNumber(c.threat_level);
    if (tl === undefined) continue;
    let arr = corridorByRegion.get(c.region_id);
    if (!arr) {
      arr = [];
      corridorByRegion.set(c.region_id, arr);
    }
    arr.push(tl);
  }

  /** Threats: avg severity per region (incidents with region_id) */
  const threatSeverities = new Map<string, number[]>();
  for (const t of threatList) {
    if (!t.region_id) continue;
    const sev = optFiniteNumber(t.severity);
    if (sev === undefined) continue;
    let arr = threatSeverities.get(t.region_id);
    if (!arr) {
      arr = [];
      threatSeverities.set(t.region_id, arr);
    }
    arr.push(sev);
  }

  /** Conservation status: pick first row per region_id */
  const conservationByRegion = new Map<string, ConservationStatusRow>();
  for (const c of conservationStatusList) {
    if (!c.region_id) continue;
    if (!conservationByRegion.has(c.region_id)) {
      conservationByRegion.set(c.region_id, c);
    }
  }

  /** Population trend: pick first row per region_id */
  const trendByRegion = new Map<string, PopulationTrendRow>();
  for (const t of populationTrendList) {
    if (!t.region_id) continue;
    if (!trendByRegion.has(t.region_id)) {
      trendByRegion.set(t.region_id, t);
    }
  }

  const VALID_IUCN = new Set<IucnStatusCode>([
    "CR", "EN", "VU", "NT", "LC", "DD", "EW", "EX", "Unknown",
  ]);

  const VALID_TREND = new Set<TrendDirection>(["UP", "DOWN", "FLAT", "UNKNOWN"]);

  const byIso = new Map<string, MapCountryMetric>();

  for (const r of regions) {
    const isoCode = normalizeIsoAlpha3(r.iso_code);
    if (!isoCode) continue;

    const country =
      (r.country_name && r.country_name.trim()) ||
      (r.name && r.name.trim()) ||
      isoCode;

    const row: MapCountryMetric = {
      country,
      isoCode,
    };

    const totalPop = popSumByRegion.get(r.id);
    if (totalPop !== undefined && totalPop > 0) {
      row.population = roundTwoDecimalPlaces(totalPop);
    }

    const perSp = popByRegionSpecies.get(r.id);
    if (perSp && perSp.size > 0) {
      const sorted = [...perSp.entries()].sort((a, b) => b[1] - a[1]);
      const [id0, v0] = sorted[0]!;
      const sp0 = speciesById.get(id0);
      const et0 = sp0
        ? speciesToElephantType(sp0.common_name, sp0.short_code)
        : "Unknown";
      if (sorted.length >= 2) {
        const [id1, v1] = sorted[1]!;
        const sp1 = speciesById.get(id1);
        const et1 = sp1
          ? speciesToElephantType(sp1.common_name, sp1.short_code)
          : "Unknown";
        const close =
          v0 > 0 && v1 >= v0 * 0.8 && et0 !== "Unknown" && et1 !== "Unknown";
        row.elephantType =
          close && et0 !== et1 ? "Mixed" : (VALID_ELEPHANT.has(et0) ? et0 : "Unknown");
      } else {
        row.elephantType = VALID_ELEPHANT.has(et0) ? et0 : "Unknown";
      }
    } else {
      row.elephantType = "Unknown";
    }

    const ctls = corridorByRegion.get(r.id);
    if (ctls && ctls.length > 0) {
      const avg =
        ctls.reduce((a, b) => a + b, 0) / ctls.length;
      /** Proxy on 55–68 scale so existing life-expectancy color breaks stay usable (not literal years). */
      row.lifeExpectancy = roundTwoDecimalPlaces(
        Math.min(68, Math.max(55, 58 + (5 - avg) * 2.5)),
      );
    }

    const sevs = threatSeverities.get(r.id);
    if (sevs && sevs.length > 0) {
      const avg = sevs.reduce((a, b) => a + b, 0) / sevs.length;
      row.poachingRate = roundTwoDecimalPlaces(
        Math.min(10, Math.max(0, avg * 1.15)),
      );
    }

    const cons = conservationByRegion.get(r.id);
    if (cons) {
      const code = String(cons.iucn_status_code ?? "Unknown").trim() as IucnStatusCode;
      row.conservationStatus = VALID_IUCN.has(code) ? code : "Unknown";
    }

    const trend = trendByRegion.get(r.id);
    if (trend) {
      const dir = String(trend.trend_direction ?? "UNKNOWN").trim() as TrendDirection;
      row.populationTrend = VALID_TREND.has(dir) ? dir : "UNKNOWN";
      if (trend.overall_trend) {
        row.populationTrendLabel = trend.overall_trend;
      }
    }

    if (!isValidHeatmapRow(row)) continue;

    byIso.set(isoCode, row);
  }

  const deduped = Array.from(byIso.values()).sort((a, b) =>
    a.isoCode.localeCompare(b.isoCode),
  );

  if (process.env.NODE_ENV !== "production") {
    console.log("[fetchHeatmapData] deduped row count:", deduped.length);
    if (deduped[0]) {
      console.log("[fetchHeatmapData] sample mapped row:", deduped[0]);
    }
  }

  return deduped;
}
