import type {
  AudioAsset,
  HabitatDatum,
  PopulationPoint,
  SummaryMetric,
  ThreatDatum,
} from "@/types/elephant";
import type { MapDataset } from "@/types/map";

export const summaryMetrics: SummaryMetric[] = [
  {
    label: "Protected range tracked",
    value: "41 corridors",
    change: "+7 this quarter",
    tone: "positive",
  },
  {
    label: "High-risk incidents",
    value: "128",
    change: "-11 against baseline",
    tone: "warning",
  },
  {
    label: "Audio surveys indexed",
    value: "212 calls",
    change: "44 field recordings",
    tone: "neutral",
  },
  {
    label: "Habitat loss velocity",
    value: "3.4%",
    change: "annual pressure",
    tone: "critical",
  },
];

export const populationTrend: PopulationPoint[] = [
  { year: 2018, estimate: 420000 },
  { year: 2019, estimate: 409500 },
  { year: 2020, estimate: 401000 },
  { year: 2021, estimate: 394500 },
  { year: 2022, estimate: 389000 },
  { year: 2023, estimate: 396000 },
  { year: 2024, estimate: 402500 },
];

export const threatBreakdown: ThreatDatum[] = [
  { name: "Poaching", incidents: 54, color: "#b94f35" },
  { name: "Habitat loss", incidents: 33, color: "#d29d48" },
  { name: "Conflict", incidents: 24, color: "#dd7452" },
  { name: "Drought", incidents: 17, color: "#8f7b57" },
];

export const habitatCoverage: HabitatDatum[] = [
  { year: 2019, protectedArea: 63, fragmentedArea: 18 },
  { year: 2020, protectedArea: 64, fragmentedArea: 19 },
  { year: 2021, protectedArea: 66, fragmentedArea: 21 },
  { year: 2022, protectedArea: 67, fragmentedArea: 23 },
  { year: 2023, protectedArea: 68, fragmentedArea: 24 },
  { year: 2024, protectedArea: 70, fragmentedArea: 26 },
];

export const audioAssets: AudioAsset[] = [
  {
    id: "amboseli-001",
    title: "Amboseli Vehicle Corridor",
    location: "Kenya",
    durationSeconds: 36,
    status: "raw",
  },
  {
    id: "garamba-014",
    title: "Garamba Generator Overlap",
    location: "DRC",
    durationSeconds: 52,
    status: "isolated",
  },
  {
    id: "serengeti-007",
    title: "Serengeti Airplane Pass",
    location: "Tanzania",
    durationSeconds: 41,
    status: "raw",
  },
];

export const mapDataset: MapDataset = {
  heatmap: [
    { longitude: 37.9, latitude: -2.65, intensity: 0.92, label: "Amboseli core range" },
    { longitude: 34.85, latitude: -2.35, intensity: 0.74, label: "Serengeti south edge" },
    { longitude: 29.25, latitude: 0.55, intensity: 0.61, label: "Virunga corridor" },
    { longitude: 23.45, latitude: -1.25, intensity: 0.47, label: "Congo forest acoustic survey" },
  ],
  threats: [
    {
      id: "threat-1",
      category: "Poaching",
      severity: 5,
      title: "Cross-border ivory route",
      longitude: 30.2,
      latitude: -1.9,
    },
    {
      id: "threat-2",
      category: "Habitat loss",
      severity: 4,
      title: "Agricultural encroachment",
      longitude: 36.78,
      latitude: -1.55,
    },
    {
      id: "threat-3",
      category: "Conflict",
      severity: 3,
      title: "Village crop-raiding hotspot",
      longitude: 35.35,
      latitude: -3.4,
    },
  ],
  migration: [
    {
      id: "route-1",
      label: "Amboseli seasonal corridor",
      coordinates: [
        { longitude: 37.6, latitude: -2.8 },
        { longitude: 37.9, latitude: -2.65 },
        { longitude: 38.2, latitude: -2.35 },
      ],
    },
    {
      id: "route-2",
      label: "Serengeti western link",
      coordinates: [
        { longitude: 34.2, latitude: -2.0 },
        { longitude: 34.5, latitude: -2.3 },
        { longitude: 34.9, latitude: -2.6 },
      ],
    },
  ],
  habitats: [
    {
      id: "habitat-1",
      label: "Protected wet-season habitat",
      coordinates: [
        { longitude: 37.55, latitude: -2.95 },
        { longitude: 38.18, latitude: -2.9 },
        { longitude: 38.28, latitude: -2.35 },
        { longitude: 37.65, latitude: -2.3 },
      ],
    },
  ],
  audio: [
    {
      id: "audio-1",
      title: "Separator candidate",
      quality: "raw",
      longitude: 37.83,
      latitude: -2.62,
    },
    {
      id: "audio-2",
      title: "Clean rumble reference",
      quality: "separated",
      longitude: 34.71,
      latitude: -2.41,
    },
  ],
};

