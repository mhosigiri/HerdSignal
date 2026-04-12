"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Pull call-type tag from filenames like "…__sel_1__rumble.png" */
function extractCallType(url: string): string | null {
  const m = url.match(/__([a-z]+)\.(png|jpg|webp)$/i);
  return m ? m[1] : null;
}

/** Rough frequency axis ticks for elephant infrasound + audible range */
const FREQ_TICKS = [
  { label: "200 Hz", pct: 0 },
  { label: "100 Hz", pct: 25 },
  { label: "40 Hz",  pct: 55 },
  { label: "10 Hz",  pct: 78 },
  { label: "0 Hz",   pct: 100 },
];

const TIME_TICKS = [0, 25, 50, 75, 100];

/* ─── Canvas placeholder when no image is available ─────────────────────── */
function PlaceholderCanvas({
  intensity,
  width,
  height,
}: {
  intensity: number;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    /* Background */
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);

    /* Horizontal frequency grid */
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += height / 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    /* Vertical time grid */
    for (let x = 0; x < width; x += width / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    /* Frequency bars */
    for (let x = 0; x < width; x += 4) {
      const v =
        Math.abs(Math.sin((x / width) * Math.PI * 4 + 0.3)) * intensity * 0.7 +
        Math.abs(Math.cos((x / width) * Math.PI * 12)) * intensity * 0.25 +
        Math.random() * 0.05;
      const barH = Math.max(6, v * height * 0.75);

      const grad = ctx.createLinearGradient(0, height, 0, height - barH);
      grad.addColorStop(0,   "rgba(210,162,79,0.9)");
      grad.addColorStop(0.3, "rgba(157,185,122,0.6)");
      grad.addColorStop(0.7, "rgba(93,139,99,0.3)");
      grad.addColorStop(1,   "rgba(93,139,99,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, height - barH, 2, barH);
    }

    /* Faint scanline overlay */
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, y, width, 1);
    }
  }, [intensity, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function SpectrogramView({
  label,
  intensity,
  imageUrl,
  active = false,
}: {
  label: string;
  intensity: number;
  imageUrl?: string | null;
  active?: boolean;
}) {
  const callType = imageUrl ? extractCallType(imageUrl) : null;
  const [hovered, setHovered] = useState(false);
  const [cursorX, setCursorX] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorX(((e.clientX - rect.left) / rect.width) * 100);
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setCursorX(null);
  };

  const isLive = !!imageUrl && active;
  const glowColor = isLive
    ? "rgba(210,162,79,0.18)"
    : "rgba(93,139,99,0.12)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* ── Header row ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "0.875rem",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--c-400)",
              marginBottom: "0.25rem",
            }}
          >
            {imageUrl ? "generated" : "preview"}
          </p>
          <p
            style={{
              fontSize: "0.9375rem",
              fontWeight: 500,
              color: "var(--c-100)",
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </p>
        </div>

        {/* Status + call type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {callType && (
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: isLive ? "var(--c-gold)" : "var(--c-400)",
                background: isLive
                  ? "rgba(210,162,79,0.1)"
                  : "rgba(255,255,255,0.05)",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: `1px solid ${isLive ? "rgba(210,162,79,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {callType}
            </span>
          )}
          {/* Live indicator dot */}
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: imageUrl
                ? isLive ? "var(--c-gold)" : "var(--c-green-bright)"
                : "var(--c-mute)",
              boxShadow: imageUrl
                ? isLive
                  ? "0 0 8px 2px rgba(210,162,79,0.5)"
                  : "0 0 8px 2px rgba(93,139,99,0.4)"
                : "none",
            }}
          />
        </div>
      </div>

      {/* ── Instrument frame ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "0",
          position: "relative",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Y-axis — frequency labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: "0.625rem",
            paddingBottom: "1.5rem",   /* aligns with x-axis row */
            flexShrink: 0,
            width: "3.25rem",
          }}
        >
          {FREQ_TICKS.map((tick) => (
            <span
              key={tick.label}
              style={{
                fontSize: "0.5625rem",
                color: "rgba(255,255,255,0.22)",
                fontFamily: "var(--font-mono), monospace",
                textAlign: "right",
                lineHeight: 1,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Main image area + X-axis */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* The spectrogram frame itself */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "2 / 1",   /* matches 1800×900 native ratio */
              background: "#050505",
              overflow: "hidden",
              borderRadius: "0.5rem",
              /* Outer glow that pulses when active */
              boxShadow: hovered || isLive
                ? `0 0 0 1px rgba(255,255,255,0.07), 0 0 40px 8px ${glowColor}`
                : "0 0 0 1px rgba(255,255,255,0.05)",
              transition: "box-shadow 0.35s ease",
            }}
          >
            {/* Image or placeholder */}
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={label}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "fill", display: "block" }}
                priority={false}
              />
            ) : (
              <PlaceholderCanvas intensity={intensity} width={900} height={450} />
            )}

            {/* Scanline overlay — always on top */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 3px)",
                pointerEvents: "none",
                mixBlendMode: "multiply",
              }}
            />

            {/* Grid overlay — horizontal frequency lines */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(to bottom, transparent 24%, rgba(255,255,255,0.03) 25%, transparent 25.5%, transparent 49%, rgba(255,255,255,0.03) 50%, transparent 50.5%, transparent 74%, rgba(255,255,255,0.03) 75%, transparent 75.5%)",
                pointerEvents: "none",
              }}
            />

            {/* Vertical cursor line on hover */}
            {hovered && cursorX !== null && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${cursorX}%`,
                  width: "1px",
                  background: "rgba(210,162,79,0.55)",
                  boxShadow: "0 0 6px 1px rgba(210,162,79,0.3)",
                  pointerEvents: "none",
                  transition: "left 0.04s linear",
                }}
              />
            )}

            {/* Corner chip — top-left */}
            <div
              style={{
                position: "absolute",
                top: "0.5rem",
                left: "0.5rem",
                fontSize: "0.5rem",
                fontFamily: "var(--font-mono), monospace",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.25)",
                pointerEvents: "none",
              }}
            >
              FREQ →
            </div>

            {/* Corner chip — top-right */}
            <div
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                fontSize: "0.5rem",
                fontFamily: "var(--font-mono), monospace",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.25)",
                pointerEvents: "none",
              }}
            >
              TIME →
            </div>
          </div>

          {/* X-axis — time ticks */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.375rem",
              paddingLeft: "0.125rem",
              paddingRight: "0.125rem",
            }}
          >
            {TIME_TICKS.map((pct) => (
              <span
                key={pct}
                style={{
                  fontSize: "0.5625rem",
                  color: "rgba(255,255,255,0.22)",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {pct === 0 ? "0 s" : pct === 100 ? "end" : `${pct}%`}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer metadata ─────────────────────────────────────── */}
      {imageUrl && (
        <div
          style={{
            marginTop: "0.625rem",
            paddingLeft: "3.25rem",   /* indent to align under image */
            display: "flex",
            gap: "1.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.5625rem",
              fontFamily: "var(--font-mono), monospace",
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            NMF · 1800 × 900
          </span>
          <span
            style={{
              fontSize: "0.5625rem",
              fontFamily: "var(--font-mono), monospace",
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
            }}
          >
            infrasound · 0–250 Hz
          </span>
        </div>
      )}
    </div>
  );
}
