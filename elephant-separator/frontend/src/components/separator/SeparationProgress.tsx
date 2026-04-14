"use client";

import { ElephantFactTicker } from "./ElephantFactTicker";

type SeparationStatus = "idle" | "ready" | "processing" | "complete" | "error";

interface SeparationProgressProps {
  progress: number;
  status?: SeparationStatus;
}

export function SeparationProgress({ progress, status = "processing" }: SeparationProgressProps) {
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

      {/* Elephant fact ticker — visible only while NMF separation is running */}
      {status === "processing" && <ElephantFactTicker />}
    </div>
  );
}
