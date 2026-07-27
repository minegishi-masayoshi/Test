window.FIMS_CONFIG = {
  appName: "FIMS Cloud",
  portalUrl: "../index.html",
  fipsUrl: "../fips/index.html",
  lanmapUrl: "../lanmap/index.html",

  // Set the OCI GeoServer WMS endpoint when it is available.
  // Example: "https://example.com/geoserver/fims/wms"
  geoserverWmsUrl: "",
  workspace: "fims",

  // Replace these names with the actual GeoServer layer names.
  layers: {
    province: "province",
    concession: "concession",
    fmu: "fmu",
    forestBaseMap: "fbm",
    protectedArea: "protected_area",
    loggingArea: "logged_over"
  },

  map: {
    center: [-6.5, 145.0],
    zoom: 6,
    minZoom: 4,
    maxZoom: 18
  }
};
