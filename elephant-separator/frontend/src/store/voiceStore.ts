"use client";

import { create } from "zustand";

interface VoiceStore {
  transcript: string;
  response: string;
  isListening: boolean;
  setTranscript: (value: string) => void;
  setResponse: (value: string) => void;
  setListening: (value: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  transcript: "Where are habitat pressures rising fastest this year?",
  response:
    "Voice mode is ready for service integration. It currently presents a local mock explanation layer while Supabase and the model endpoints are being wired.",
  isListening: false,
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  setListening: (isListening) => set({ isListening }),
}));

