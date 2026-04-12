"use client";

import { useEffect, useRef } from "react";

export function SpectrogramView({
  label,
  intensity,
  imageUrl,
}: {
  label: string;
  intensity: number;
  imageUrl?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (imageUrl) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#0e1a13");
    background.addColorStop(1, "#203727");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    for (let x = 0; x < width; x += 6) {
      const value =
        Math.abs(Math.sin((x / width) * Math.PI * 3)) * intensity +
        Math.abs(Math.cos((x / width) * Math.PI * 10)) * 0.18;
      const barHeight = Math.max(12, value * height);
      const gradient = context.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, "#d2a24f");
      gradient.addColorStop(1, "#f7efe1");
      context.fillStyle = gradient;
      context.fillRect(x, height - barHeight, 4, barHeight);
    }
  }, [imageUrl, intensity]);

  return (
    <div className="rounded-[1.75rem] border border-stone-900/10 bg-[#112217] p-4 shadow-[0_12px_40px_rgba(8,18,14,0.25)]">
      <div className="mb-3 flex items-center justify-between text-sm text-stone-200">
        <span>{label}</span>
        <span className="text-stone-400">{imageUrl ? "Generated spectrogram" : "Preview spectrogram"}</span>
      </div>
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="h-56 w-full rounded-2xl object-cover" />
      ) : (
        <canvas ref={canvasRef} width={520} height={220} className="h-56 w-full rounded-2xl" />
      )}
    </div>
  );
}
