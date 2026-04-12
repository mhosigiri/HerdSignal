"use client";

import type { HeatmapMetric, HeatmapToggleOption } from "@/lib/map/types";

const DEFAULT_OPTIONS: HeatmapToggleOption[] = [
  { label: "Population", metric: "population" },
  { label: "Elephant type", metric: "elephantType" },
  { label: "Life expectancy", metric: "lifeExpectancy" },
  { label: "Poaching rate", metric: "poachingRate" },
];

const METRICS: HeatmapMetric[] = [
  "population",
  "elephantType",
  "lifeExpectancy",
  "poachingRate",
];

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
  if (current !== null && next === current) {
    onMetricChange(null);
    return;
  }
  onMetricChange(next);
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
  const list = Array.isArray(options) ? options : [];
  const valid = list.filter(
    (o) =>
      o &&
      typeof o.label === "string" &&
      o.label.trim() !== "" &&
      isValidMetric(o.metric),
  );
  if (valid.length === 0) return null;

  const active = isValidMetric(selectedMetric) ? selectedMetric : null;

  return (
    <div className="pointer-events-auto inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.06] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      {valid.map((opt) => {
        const selected = active !== null && opt.metric === active;
        return (
          <button
            key={opt.metric}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              handleMetricClick(opt.metric, active, onMetricChange)
            }
            className={`rounded-[1.1rem] px-2.5 py-1.5 text-[11px] font-medium leading-none tracking-wide transition-colors duration-200 ease-out ${
              selected
                ? "bg-white/[0.18] text-stone-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                : "text-stone-400 hover:bg-white/[0.06] hover:text-stone-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
