"use client";

import type { HeatmapMetric, HeatmapToggleOption } from "@/lib/map/types";

const DEFAULT_OPTIONS: HeatmapToggleOption[] = [
  { label: "Population",          metric: "population" },
  { label: "Elephant type",       metric: "elephantType" },
  { label: "Life expectancy",     metric: "lifeExpectancy" },
  { label: "Poaching rate",       metric: "poachingRate" },
  { label: "Conservation status", metric: "conservationStatus" },
  { label: "Population trend",    metric: "populationTrend" },
];

const METRICS: HeatmapMetric[] = [
  "population",
  "elephantType",
  "lifeExpectancy",
  "poachingRate",
  "conservationStatus",
  "populationTrend",
];

const METRIC_ICONS: Record<HeatmapMetric, string> = {
  population:          "◉",
  elephantType:        "◈",
  lifeExpectancy:      "◎",
  poachingRate:        "◆",
  conservationStatus:  "◍",
  populationTrend:     "◬",
};

function isValidMetric(v: unknown): v is HeatmapMetric {
  return typeof v === "string" && (METRICS as string[]).includes(v);
}

function handleMetricClick(
  next: unknown,
  current: HeatmapMetric | null,
  onMetricChange?: (metric: HeatmapMetric | null) => void,
): void {
  if (!isValidMetric(next)) return;
  if (typeof onMetricChange !== "function") return;
  onMetricChange(current !== null && next === current ? null : next);
}

type Props = {
  selectedMetric?: HeatmapMetric | null;
  onMetricChange?: (metric: HeatmapMetric | null) => void;
  options?: HeatmapToggleOption[];
};

export default function HeatmapTogglePanel({
  selectedMetric,
  onMetricChange,
  options = DEFAULT_OPTIONS,
}: Props) {
  const valid = (Array.isArray(options) ? options : []).filter(
    (o) => o && typeof o.label === "string" && o.label.trim() !== "" && isValidMetric(o.metric),
  );
  if (valid.length === 0) return null;

  const active = isValidMetric(selectedMetric) ? selectedMetric : null;

  return (
    <div
      className="pointer-events-auto"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        minWidth: "10rem",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "0.625rem 0.875rem 0.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p
          style={{
            fontSize: "0.5625rem",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          Metric filter
        </p>
      </div>

      {/* Filter rows */}
      {valid.map((opt) => {
        const selected = active !== null && opt.metric === active;
        return (
          <button
            key={opt.metric}
            type="button"
            aria-pressed={selected}
            onClick={() => handleMetricClick(opt.metric, active, onMetricChange)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              background: selected
                ? "rgba(210,162,79,0.12)"
                : "transparent",
              color: selected
                ? "rgba(210,162,79,0.95)"
                : "rgba(255,255,255,0.45)",
              fontSize: "0.8125rem",
              fontWeight: selected ? 600 : 400,
              letterSpacing: "-0.005em",
              transition: "background 0.15s ease, color 0.15s ease",
              cursor: "pointer",
              border: "none",
              width: "100%",
              textAlign: "left",
              borderLeft: selected
                ? "2px solid rgba(210,162,79,0.7)"
                : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.75)";
              }
            }}
            onMouseLeave={(e) => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.45)";
              }
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                opacity: selected ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              {METRIC_ICONS[opt.metric]}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
