/** Active choropleth layer; must match `heatmapData` metric keys. */
export type HeatmapMetric =
  | "population"
  | "elephantType"
  | "lifeExpectancy"
  | "poachingRate"
  | "conservationStatus"
  | "populationTrend";

/** Species / category label for country-level elephant metrics. */
export type ElephantType =
  | "AfricanSavanna"
  | "AfricanForest"
  | "Asian"
  | "Mixed"
  | "Unknown";

/** Values passed into color/format helpers for any metric column. */
export type HeatmapMetricValue = number | ElephantType | null | undefined;

/** IUCN Red List status codes. */
export type IucnStatusCode = "CR" | "EN" | "VU" | "NT" | "LC" | "DD" | "EW" | "EX" | "Unknown";

/** Population trend direction values. */
export type TrendDirection = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

/** Country-level metric row; join to GeoJSON via `isoCode` / `geometryRef`. */
export type MapCountryMetric = {
  country: string;
  isoCode: string;
  /** Optional centroid for labels or point fallback. */
  coordinates?: [number, number];
  /** Join key aligned with GeoJSON feature properties when present. */
  geometryRef?: string;
  population?: number;
  elephantType?: ElephantType;
  lifeExpectancy?: number;
  poachingRate?: number;
  conservationStatus?: IucnStatusCode;
  populationTrend?: TrendDirection;
  populationTrendLabel?: string;
};

/** Expected shape of GeoJSON feature `properties` for country boundaries (Natural Earth). */
export type CountryFeatureProperties = {
  name?: string;
  admin?: string;
  iso_a3?: string;
  adm0_a3?: string;
  /** Synthetic join key from legacy demo data (not present on real Natural Earth). */
  isoCode?: string;
  aliases?: string[];
  geometryRef?: string;
};

/** Selected country for insight UI: metrics row plus optional map/UI metadata. */
export type SelectedCountryDetail = MapCountryMetric & {
  /** GeoJSON feature id for highlight/sync when available. */
  featureId?: string | number;
  /** Override display name from feature properties if needed. */
  displayName?: string;
};

export type HeatmapLegendItem = {
  label: string;
  color: string;
  min?: number;
  max?: number;
  value?: number;
};

export type HeatmapToggleOption = {
  label: string;
  metric: HeatmapMetric;
};

/**
 * Normalized row for map playback — sourced from `public.audio_recordings`
 * (filename like `Benin.mp3`, `storage_path`, `storage_bucket`).
 */
export type CountryAudioRecord = {
  id: string;
  country: string;
  isoCode: string;
  title: string;
  /** Bucket-relative path used for Storage URL resolution. */
  audioPath: string;
  /** Supabase Storage bucket (e.g. `countries-audio`). */
  storageBucket: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

/** Optional hook/UI state for country audio loading lifecycle. */
export type CountryAudioState =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "unavailable";
