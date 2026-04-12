"use client";

export function SeparationProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-500">
        <span>Processing</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#27452d,#d2a24f)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

