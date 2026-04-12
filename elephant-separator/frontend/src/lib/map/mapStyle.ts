/**
 * Basemap & camera — quiet charcoal surface so choropleth data reads first.
 * Carto Dark Matter: subdued roads/labels, low visual noise vs. default MapLibre demo tiles.
 */
export const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Initial camera [lng, lat]. */
export const MAP_CENTER: [number, number] = [22, 2];

export const MAP_ZOOM = 2;

export const MAP_BEARING = 0;

export const MAP_PITCH = 0;

/** @deprecated Prefer MAP_CENTER — kept for existing imports. */
export const MAP_INITIAL_CENTER = MAP_CENTER;

/** @deprecated Prefer MAP_ZOOM — kept for existing imports. */
export const MAP_INITIAL_ZOOM = MAP_ZOOM;
