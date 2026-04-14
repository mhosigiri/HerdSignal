export type SeparationStatus = "idle" | "ready" | "processing" | "complete" | "error";

export interface GeneratedAnnotation {
  annotation_id: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  peak_amplitude: number;
  confidence: number;
}

export interface SeparationJob {
  fileName: string;
  status: SeparationStatus;
  progress: number;
  originalUrl?: string;
  processedUrl?: string;
  originalSpectrogramUrl?: string;
  processedSpectrogramUrl?: string;
  annotations?: GeneratedAnnotation[];
  annotationCsv?: string;
  device?: string;
  model?: string;
  note?: string;
  separationRunId?: string | null;
  downloadToken?: string | null;
  archiveFileName?: string | null;
  archiveReady?: boolean;
  archiveError?: string | null;
}
