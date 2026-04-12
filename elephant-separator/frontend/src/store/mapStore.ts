"use client";

import { create } from "zustand";

import type { ElephantSpecies } from "@/types/elephant";
import type { MapLayerState } from "@/types/map";

interface MapStore {
  activeLayers: MapLayerState;
  selectedYear: number;
  selectedSpecies: ElephantSpecies;
  threatFilter: string[];
  toggleLayer: (layer: keyof MapLayerState) => void;
  setSelectedYear: (year: number) => void;
  setSelectedSpecies: (species: ElephantSpecies) => void;
  toggleThreatFilter: (threat: string) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  activeLayers: {
    population: true,
    threats: true,
    migration: true,
    habitats: false,
    audio: true,
  },
  selectedYear: 2024,
  selectedSpecies: "african-savanna",
  threatFilter: ["Poaching", "Habitat loss", "Conflict"],
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),
  setSelectedYear: (selectedYear) => set({ selectedYear }),
  setSelectedSpecies: (selectedSpecies) => set({ selectedSpecies }),
  toggleThreatFilter: (threat) =>
    set((state) => ({
      threatFilter: state.threatFilter.includes(threat)
        ? state.threatFilter.filter((item) => item !== threat)
        : [...state.threatFilter, threat],
    })),
}));

