"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCountryAudio } from "@/hooks/useCountryAudio";
import type {
  CountryAudioRecord,
  HeatmapMetric,
  SelectedCountryDetail,
} from "@/lib/map/types";

function getMetricValue(
  row: SelectedCountryDetail,
  metric: HeatmapMetric | null,
): unknown {
  if (metric === null) return undefined;
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

function metricHeading(metric: HeatmapMetric): string {
  switch (metric) {
    case "population":
      return "Population";
    case "elephantType":
      return "Elephant type";
    case "lifeExpectancy":
      return "Life expectancy";
    case "poachingRate":
      return "Poaching pressure";
    default:
      return "Metric";
  }
}

type Props = {
  detail: SelectedCountryDetail | null;
  selectedMetric: HeatmapMetric | null;
  onClose: () => void;
};

/** Isolated playback state; parent sets `key` so selection/url changes remount cleanly. */
function CountryAudioBlock(props: {
  loading: boolean;
  error: string | null;
  audio: CountryAudioRecord | null;
  audioUrl: string | null;
}) {
  const { loading, error, audio, audioUrl } = props;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    if (audioUrl) {
      el.src = audioUrl;
      el.load();
    } else {
      el.removeAttribute("src");
    }
    return () => {
      el.pause();
    };
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) {
      void el.play().catch(() => {
        setPlaying(false);
      });
    } else {
      el.pause();
    }
  }, [audioUrl]);

  const canPlay = Boolean(audioUrl && !loading && !error);

  return (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
          Country audio
        </p>
        {loading ? (
          <p className="mt-2 text-[12px] text-stone-400">Loading…</p>
        ) : error ? (
          <p className="mt-2 text-[12px] text-stone-400">{error}</p>
        ) : !audio || !audioUrl ? (
          <p className="mt-2 text-[12px] text-stone-500">No audio available</p>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={!canPlay}
              className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-stone-100 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <p className="min-w-0 truncate text-[12px] text-stone-300" title={audio.title}>
              {audio.title || "Recording"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function CountryInsightCard({
  detail,
  selectedMetric,
  onClose,
}: Props) {
  const isoCode = detail?.isoCode ?? null;
  const { audio, audioUrl, loading, error } = useCountryAudio(isoCode);

  if (!detail) return null;

  const v = getMetricValue(detail, selectedMetric);
  const valueLabel =
    v === null || v === undefined
      ? "N/A"
      : typeof v === "number"
        ? String(v)
        : String(v);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-[500] max-w-sm overflow-hidden rounded-2xl border border-white/[0.07] bg-[rgba(12,18,16,0.72)] px-4 py-3.5 text-stone-100 shadow-[0_12px_48px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug tracking-tight text-stone-50">
            {detail.displayName ?? detail.country}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-500">
            {detail.isoCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-stone-500 transition-colors hover:bg-white/[0.06] hover:text-stone-200"
        >
          Close
        </button>
      </div>

      {selectedMetric === null ? (
        <p className="mt-4 text-[12px] leading-relaxed text-stone-500">
          Select a metric above to see values for this country.
        </p>
      ) : (
        <div className="mt-4 rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
            {metricHeading(selectedMetric)}
          </p>
          <p className="mt-1 text-[15px] font-medium tabular-nums tracking-tight text-stone-100">
            {valueLabel}
          </p>
        </div>
      )}

      <CountryAudioBlock
        key={detail.isoCode}
        loading={loading}
        error={error}
        audio={audio}
        audioUrl={audioUrl}
      />
    </div>
  );
}
