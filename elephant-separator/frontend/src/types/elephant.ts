export type ElephantSpecies =
  | "african-savanna"
  | "african-forest"
  | "asian";

export interface SummaryMetric {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "warning" | "critical" | "neutral";
}

export interface PopulationPoint {
  year: number;
  estimate: number;
}

export interface ThreatDatum {
  name: string;
  incidents: number;
  color: string;
}

export interface HabitatDatum {
  year: number;
  protectedArea: number;
  fragmentedArea: number;
}

export interface AudioAsset {
  id: string;
  title: string;
  location: string;
  durationSeconds: number;
  status: "raw" | "isolated";
  href?: string;
}

