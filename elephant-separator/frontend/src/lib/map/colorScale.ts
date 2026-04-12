import type {
  ElephantType,
  HeatmapLegendItem,
  HeatmapMetric,
  IucnStatusCode,
  MapCountryMetric,
  TrendDirection,
} from "./types";

/** Muted fill for missing/invalid data — visible but not loud on dark basemaps. */
export const HEATMAP_FALLBACK_COLOR = "#5c6862";

const C_POP = {
  low: "#22c55e",
  mid: "#eab308",
  high: "#f97316",
  vhigh: "#ef4444",
} as const;

const C_SAFE = "#22c55e";
const C_WARN = "#eab308";
const C_ORANGE = "#f97316";
const C_BAD = "#ef4444";

const ELEPHANT_TYPE_COLORS: Record<ElephantType, string> = {
  AfricanSavanna: "#16a34a",
  AfricanForest: "#14532d",
  Asian: "#2563eb",
  Mixed: "#9333ea",
  Unknown: HEATMAP_FALLBACK_COLOR,
};

const IUCN_STATUS_COLORS: Record<IucnStatusCode, string> = {
  EX: "#1a1a1a",   // Extinct — near-black
  EW: "#3b1f1f",   // Extinct in Wild — dark red
  CR: "#ef4444",   // Critically Endangered — red
  EN: "#f97316",   // Endangered — orange
  VU: "#eab308",   // Vulnerable — yellow
  NT: "#84cc16",   // Near Threatened — lime
  LC: "#22c55e",   // Least Concern — green
  DD: "#6b7280",   // Data Deficient — gray
  Unknown: HEATMAP_FALLBACK_COLOR,
};

const TREND_DIRECTION_COLORS: Record<TrendDirection, string> = {
  UP: "#22c55e",      // Increasing — green
  FLAT: "#eab308",    // Stable — yellow
  DOWN: "#ef4444",    // Declining — red
  UNKNOWN: HEATMAP_FALLBACK_COLOR,
};

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || Number.isNaN(v) || !Number.isFinite(v)) {
    return null;
  }
  return v;
}

function colorPopulation(n: number): string {
  if (n < 20_000) return C_POP.low;
  if (n < 50_000) return C_POP.mid;
  if (n < 90_000) return C_POP.high;
  return C_POP.vhigh;
}

/** Wider bins (0–30 / 30–50 / 50–60 / 60+) so choropleth variation is visible vs a narrow 59–63 band. */
function colorLifeExpectancy(n: number): string {
  if (n < 30) return C_BAD;
  if (n < 50) return C_WARN;
  if (n < 60) return C_ORANGE;
  return C_SAFE;
}

/** Low poaching = green; yellow → orange → red for higher pressure. */
function colorPoaching(n: number): string {
  if (n <= 2) return C_SAFE;
  if (n <= 4) return C_WARN;
  if (n <= 6) return C_ORANGE;
  return C_BAD;
}

export function getMetricColor(metric: HeatmapMetric, value: unknown): string {
  if (value === null || value === undefined) return HEATMAP_FALLBACK_COLOR;

  if (metric === "elephantType") {
    const s = String(value);
    if (s in ELEPHANT_TYPE_COLORS) {
      return ELEPHANT_TYPE_COLORS[s as ElephantType];
    }
    return HEATMAP_FALLBACK_COLOR;
  }

  if (metric === "conservationStatus") {
    const s = String(value) as IucnStatusCode;
    if (s in IUCN_STATUS_COLORS) {
      return IUCN_STATUS_COLORS[s];
    }
    return HEATMAP_FALLBACK_COLOR;
  }

  if (metric === "populationTrend") {
    const s = String(value) as TrendDirection;
    if (s in TREND_DIRECTION_COLORS) {
      return TREND_DIRECTION_COLORS[s];
    }
    return HEATMAP_FALLBACK_COLOR;
  }

  const n = num(value);
  if (n === null) return HEATMAP_FALLBACK_COLOR;

  switch (metric) {
    case "population":
      return colorPopulation(n);
    case "lifeExpectancy":
      return colorLifeExpectancy(n);
    case "poachingRate":
      return colorPoaching(n);
    default:
      return HEATMAP_FALLBACK_COLOR;
  }
}

export function getMetricLegendItems(metric: HeatmapMetric): HeatmapLegendItem[] {
  switch (metric) {
    case "population":
      return [
        { label: "< 20k", color: C_POP.low, max: 20_000 },
        { label: "20k – 50k", color: C_POP.mid, min: 20_000, max: 50_000 },
        { label: "50k – 90k", color: C_POP.high, min: 50_000, max: 90_000 },
        { label: "≥ 90k", color: C_POP.vhigh, min: 90_000 },
      ];
    case "lifeExpectancy":
      return [
        { label: "0 – 30 yrs", color: C_BAD },
        { label: "30 – 50 yrs", color: C_WARN },
        { label: "50 – 60 yrs", color: C_ORANGE },
        { label: "≥ 60 yrs", color: C_SAFE },
      ];
    case "poachingRate":
      return [
        { label: "0 – 2", color: C_SAFE },
        { label: "2 – 4", color: C_WARN },
        { label: "4 – 6", color: C_ORANGE },
        { label: "> 6", color: C_BAD },
      ];
    case "elephantType":
      return (Object.keys(ELEPHANT_TYPE_COLORS) as ElephantType[]).map(
        (t) => ({
          label: t,
          color: ELEPHANT_TYPE_COLORS[t],
        }),
      );
    case "conservationStatus":
      return [
        { label: "Critically Endangered (CR)", color: IUCN_STATUS_COLORS.CR },
        { label: "Endangered (EN)",            color: IUCN_STATUS_COLORS.EN },
        { label: "Vulnerable (VU)",            color: IUCN_STATUS_COLORS.VU },
        { label: "Near Threatened (NT)",       color: IUCN_STATUS_COLORS.NT },
        { label: "Least Concern (LC)",         color: IUCN_STATUS_COLORS.LC },
        { label: "Data Deficient (DD)",        color: IUCN_STATUS_COLORS.DD },
      ];
    case "populationTrend":
      return [
        { label: "Increasing",  color: TREND_DIRECTION_COLORS.UP },
        { label: "Stable",      color: TREND_DIRECTION_COLORS.FLAT },
        { label: "Declining",   color: TREND_DIRECTION_COLORS.DOWN },
        { label: "Unknown",     color: TREND_DIRECTION_COLORS.UNKNOWN },
      ];
    default:
      return [
        {
          label: "Unknown metric",
          color: HEATMAP_FALLBACK_COLOR,
        },
      ];
  }
}

function pickNumeric(
  row: MapCountryMetric,
  metric: HeatmapMetric,
): number | null {
  switch (metric) {
    case "population":
      return num(row.population);
    case "lifeExpectancy":
      return num(row.lifeExpectancy);
    case "poachingRate":
      return num(row.poachingRate);
    default:
      return null;
  }
}

export function getMetricValueRange(
  metric: HeatmapMetric,
  data: MapCountryMetric[] | null | undefined,
): { min: number; max: number } | null {
  if (metric === "elephantType") return null;
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const vals: number[] = [];
  for (const row of data) {
    const v = pickNumeric(row, metric);
    if (v !== null) vals.push(v);
  }
  if (vals.length === 0) return null;

  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo === hi) {
    const pad = Math.abs(lo) > 1 ? lo * 1e-6 : 1e-6;
    return { min: lo - pad, max: hi + pad };
  }
  return { min: lo, max: hi };
}
