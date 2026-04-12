"use client";

import { getMetricLegendItems } from "@/lib/map/colorScale";
import type { HeatmapLegendItem, HeatmapMetric } from "@/lib/map/types";

const METRICS: HeatmapMetric[] = [
  "population",
  "elephantType",
  "lifeExpectancy",
  "poachingRate",
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
  const parts = [item.label];
  if (item.min != null && item.max != null) {
    parts.push(`${item.min} – ${item.max}`);
  } else if (item.min != null) {
    parts.push(`≥ ${item.min}`);
  } else if (item.max != null) {
    parts.push(`≤ ${item.max}`);
  }
  return parts.join(" · ");
}

function metricTitle(metric: HeatmapMetric): string {
  switch (metric) {
    case "population":
      return "Population (est. elephants)";
    case "elephantType":
      return "Dominant elephant type";
    case "lifeExpectancy":
      return "Life expectancy (years)";
    case "poachingRate":
      return "Poaching pressure (index)";
    default:
      return "Heatmap";
  }
}

type Props = { selectedMetric: HeatmapMetric | null };

export default function HeatmapLegend({ selectedMetric }: Props) {
  if (selectedMetric === null || !isValidMetric(selectedMetric)) {
    return (
      <div className="pointer-events-auto max-w-[13rem] rounded-2xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[10px] leading-snug text-stone-500 shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-md">
        {selectedMetric === null
          ? "Select a metric to view data"
          : "No legend for this metric."}
      </div>
    );
  }

  const raw = getMetricLegendItems(selectedMetric);
  const items = raw.filter(isLegendItemValid);
  if (items.length === 0) {
    return (
      <div className="pointer-events-auto max-w-[13rem] rounded-2xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[10px] text-stone-500 backdrop-blur-md">
        Legend unavailable.
      </div>
    );
  }

  return (
    <div className="pointer-events-auto max-w-[12.5rem] rounded-2xl border border-white/[0.06] bg-white/[0.05] px-2.5 py-2 text-stone-200 shadow-[0_6px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
      <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-stone-500">
        {metricTitle(selectedMetric)}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={`${item.label}-${item.color}`}
            className="flex items-start gap-2 text-[10px] leading-tight"
          >
            <span
              className="mt-0.5 h-2.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-white/10"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="text-stone-300/95">{formatLegendLabel(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
