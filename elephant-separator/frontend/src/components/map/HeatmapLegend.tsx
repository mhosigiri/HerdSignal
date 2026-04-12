"use client";

import { getMetricLegendItems } from "@/lib/map/colorScale";
import type { HeatmapLegendItem, HeatmapMetric } from "@/lib/map/types";

const METRICS: HeatmapMetric[] = [
  "population",
  "elephantType",
  "lifeExpectancy",
  "poachingRate",
  "conservationStatus",
  "populationTrend",
];

function isValidMetric(m: unknown): m is HeatmapMetric {
  return typeof m === "string" && (METRICS as string[]).includes(m);
}

function isLegendItemValid(item: unknown): item is HeatmapLegendItem {
  if (!item || typeof item !== "object") return false;
  const x = item as Record<string, unknown>;
  return (
    typeof x.label === "string" &&
    x.label.trim() !== "" &&
    typeof x.color === "string" &&
    x.color.trim() !== ""
  );
}

function formatLegendLabel(item: HeatmapLegendItem): string {
  if (item.min != null && item.max != null) return `${item.min} – ${item.max}`;
  if (item.min != null) return `≥ ${item.min}`;
  if (item.max != null) return `≤ ${item.max}`;
  return item.label;
}

function metricTitle(metric: HeatmapMetric): string {
  switch (metric) {
    case "population":          return "Population (est. elephants)";
    case "elephantType":        return "Dominant elephant type";
    case "lifeExpectancy":      return "Life expectancy (years)";
    case "poachingRate":        return "Poaching pressure (index)";
    case "conservationStatus":  return "IUCN conservation status";
    case "populationTrend":     return "Population trend";
    default:                    return "Legend";
  }
}

type Props = { selectedMetric: HeatmapMetric | null };

export default function HeatmapLegend({ selectedMetric }: Props) {
  if (!selectedMetric || !isValidMetric(selectedMetric)) {
    return (
      <div
        className="pointer-events-auto"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderRadius: "1rem",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: "0.75rem 0.875rem",
          minWidth: "10rem",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.01em",
          }}
        >
          Select a metric to view legend
        </p>
      </div>
    );
  }

  const items = getMetricLegendItems(selectedMetric).filter(isLegendItemValid);

  if (items.length === 0) {
    return (
      <div
        className="pointer-events-auto"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderRadius: "1rem",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: "0.75rem 0.875rem",
          minWidth: "10rem",
        }}
      >
        <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>
          Legend unavailable
        </p>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-auto"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        minWidth: "10rem",
      }}
    >
      {/* Legend header */}
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
            color: "rgba(210,162,79,0.6)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {metricTitle(selectedMetric)}
        </p>
      </div>

      {/* Legend rows — vertical stack */}
      <div style={{ padding: "0.5rem 0" }}>
        {items.map((item) => (
          <div
            key={`${item.label}-${item.color}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.35rem 0.875rem",
            }}
          >
            {/* Color swatch — wider bar feel */}
            <span
              aria-hidden
              style={{
                width: "18px",
                height: "10px",
                borderRadius: "3px",
                background: item.color,
                flexShrink: 0,
                opacity: 0.9,
              }}
            />
            {/* Label */}
            <span
              style={{
                fontSize: "0.6875rem",
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.35,
                letterSpacing: "0.01em",
              }}
            >
              {item.label}
            </span>
            {/* Range value */}
            {(item.min != null || item.max != null) && (
              <span
                style={{
                  fontSize: "0.5625rem",
                  color: "rgba(255,255,255,0.28)",
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                {formatLegendLabel(item)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
