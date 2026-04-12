"use client";

import { create } from "zustand";

import type { SeparationStatus } from "@/types/audio";

interface AudioStore {
  fileName: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  progress: number;
  status: SeparationStatus;
  note: string;
  setUpload: (payload: { fileName: string; originalUrl: string }) => void;
  setProcessing: (progress: number) => void;
  setComplete: (processedUrl: string, note: string) => void;
  setError: (note: string) => void;
  reset: () => void;
}

const initialState = {
  fileName: null,
  originalUrl: null,
  processedUrl: null,
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
      progress: 0,
      status: "ready",
      note: "Local preview ready. Start the separator to simulate the first pass.",
    }),
  setProcessing: (progress) =>
    set({
      progress,
      status: "processing",
      note: "Running baseline preprocessing, STFT, and NMF separation.",
    }),
  setComplete: (processedUrl, note) =>
    set({
      processedUrl,
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

