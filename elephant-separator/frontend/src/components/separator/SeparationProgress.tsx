"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { Overline } from "@/components/ui/Typography";

export function SeparationProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Overline>Processing</Overline>
        <Overline>{Math.round(progress)}%</Overline>
      </div>
      <ProgressBar value={progress} variant="primary" />
    </div>
  );
}
