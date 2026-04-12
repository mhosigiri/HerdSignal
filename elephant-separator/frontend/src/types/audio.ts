export type SeparationStatus = "idle" | "ready" | "processing" | "complete" | "error";

export interface SeparationJob {
  fileName: string;
  status: SeparationStatus;
  progress: number;
  originalUrl?: string;
  processedUrl?: string;
  note?: string;
}

