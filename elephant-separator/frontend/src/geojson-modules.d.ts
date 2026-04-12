declare module "*.geojson" {
  /** Natural Earth–style FeatureCollection; used as MapLibre GeoJSON source data. */
  const value: GeoJSON.FeatureCollection;
  export default value;
}
