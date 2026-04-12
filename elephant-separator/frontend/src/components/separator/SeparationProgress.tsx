"use client";

export function SeparationProgress({ progress }: { progress: number }) {
  return (
    <div style={{ paddingTop: "0.5rem" }}>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "0.5rem" }}
      >
        <span className="t-eyebrow">Processing</span>
        <span className="t-mono">{Math.round(progress)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
