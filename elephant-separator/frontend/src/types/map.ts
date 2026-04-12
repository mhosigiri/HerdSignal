import type { ElephantSpecies } from "@/types/elephant";

export interface MapLayerState {
  population: boolean;
  threats: boolean;
  migration: boolean;
  habitats: boolean;
  audio: boolean;
}

export interface MapFilters {
  year: number;
  species: ElephantSpecies;
  threatFilter: string[];
}

export interface CoordinatePoint {
  longitude: number;
  latitude: number;
}

export interface HeatmapPoint extends CoordinatePoint {
  intensity: number;
  label: string;
}

export interface ThreatIncident extends CoordinatePoint {
  id: string;
  category: string;
  severity: number;
  title: string;
}

export interface MigrationRoute {
  id: string;
  label: string;
  coordinates: CoordinatePoint[];
}

export interface HabitatZone {
  id: string;
  label: string;
  coordinates: CoordinatePoint[];
}

export interface AudioMarker extends CoordinatePoint {
  id: string;
  title: string;
  quality: "raw" | "separated";
}

export interface MapDataset {
  heatmap: HeatmapPoint[];
  threats: ThreatIncident[];
  migration: MigrationRoute[];
  habitats: HabitatZone[];
  audio: AudioMarker[];
}

