"use client";

import { create } from "zustand";

import type { GeneratedAnnotation, SeparationStatus } from "@/types/audio";

interface AudioStore {
  fileName: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  originalSpectrogramUrl: string | null;
  processedSpectrogramUrl: string | null;
  annotations: GeneratedAnnotation[];
  annotationCsv: string | null;
  model: string | null;
  device: string | null;
  progress: number;
  status: SeparationStatus;
  note: string;
  setUpload: (payload: { fileName: string; originalUrl: string }) => void;
  setProcessing: (progress: number) => void;
  setComplete: (payload: {
    processedUrl: string;
    originalSpectrogramUrl: string | null;
    processedSpectrogramUrl: string | null;
    annotations: GeneratedAnnotation[];
    annotationCsv: string | null;
    model: string | null;
    device: string | null;
    note: string;
  }) => void;
  setError: (note: string) => void;
  reset: () => void;
}

const initialState = {
  fileName: null,
  originalUrl: null,
  processedUrl: null,
  originalSpectrogramUrl: null,
  processedSpectrogramUrl: null,
  annotations: [],
  annotationCsv: null,
  model: null,
  device: null,
  progress: 0,
  status: "idle" as SeparationStatus,
  note: "Upload a field recording to begin.",
};

export const useAudioStore = create<AudioStore>((set) => ({
  ...initialState,
  setUpload: ({ fileName, originalUrl }) =>
    set({
      fileName,
      originalUrl,
      processedUrl: null,
      originalSpectrogramUrl: null,
      processedSpectrogramUrl: null,
      annotations: [],
      annotationCsv: null,
      model: null,
      device: null,
      progress: 0,
      status: "ready",
      note: "Local preview ready. Start the separator to run the local NMF baseline.",
    }),
  setProcessing: (progress) =>
    set({
      progress,
      status: "processing",
      note: "Running local NMF separation, spectrogram generation, and call annotation.",
    }),
  setComplete: ({
    processedUrl,
    originalSpectrogramUrl,
    processedSpectrogramUrl,
    annotations,
    annotationCsv,
    model,
    device,
    note,
  }) =>
    set({
      processedUrl,
      originalSpectrogramUrl,
      processedSpectrogramUrl,
      annotations,
      annotationCsv,
      model,
      device,
      progress: 100,
      status: "complete",
      note,
    }),
  setError: (note) =>
    set({
      status: "error",
      note,
    }),
  reset: () => set(initialState),
}));
