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
      <div style={{ padding: "0.75rem 1rem" }}>
        <p
          style={{
            fontSize: "0.5625rem",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          Country audio
        </p>
        {loading ? (
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)" }}>Loading…</p>
        ) : error ? (
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)" }}>{error}</p>
        ) : !audio || !audioUrl ? (
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.22)" }}>No audio available</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <button
              type="button"
              onClick={togglePlayback}
              disabled={!canPlay}
              style={{
                flexShrink: 0,
                fontSize: "0.6875rem",
                fontWeight: 500,
                color: playing ? "rgba(210,162,79,0.9)" : "rgba(255,255,255,0.75)",
                background: playing ? "rgba(210,162,79,0.1)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${playing ? "rgba(210,162,79,0.25)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "9999px",
                padding: "0.3rem 0.75rem",
                cursor: canPlay ? "pointer" : "not-allowed",
                opacity: canPlay ? 1 : 0.35,
                transition: "all 0.15s ease",
              }}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <p
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.6875rem",
                color: "rgba(255,255,255,0.45)",
              }}
              title={audio.title}
            >
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
    <div
      className="pointer-events-auto"
      style={{
        position: "absolute",
        bottom: "1.25rem",
        right: "1.25rem",
        zIndex: 500,
        width: "17rem",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        color: "rgba(255,255,255,0.9)",
      }}
    >
      {/* Country name header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.875rem 1rem 0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            {detail.displayName ?? detail.country}
          </p>
          <p
            style={{
              fontSize: "0.5625rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {detail.isoCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            flexShrink: 0,
            fontSize: "0.625rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "9999px",
            padding: "0.25rem 0.625rem",
            cursor: "pointer",
            transition: "color 0.15s, background 0.15s",
            fontFamily: "var(--font-mono), monospace",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
          }}
        >
          ✕
        </button>
      </div>

      {/* Metric value */}
      {selectedMetric === null ? (
        <div style={{ padding: "0.75rem 1rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.28)",
              lineHeight: 1.5,
            }}
          >
            Select a metric from the left panel to see data for this country.
          </p>
        </div>
      ) : (
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p
            style={{
              fontSize: "0.5625rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(210,162,79,0.6)",
              marginBottom: "0.375rem",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {metricHeading(selectedMetric)}
          </p>
          <p
            style={{
              fontSize: "1.375rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1,
            }}
          >
            {valueLabel}
          </p>
        </div>
      )}

      {/* Audio block */}
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
