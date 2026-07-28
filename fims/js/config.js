export const CONFIG = Object.freeze({
  appName: "FIMS Cloud",
  version: "Ver.1.2.1",
  environment: "MVP environment",

  urls: {
    portal: "../index.html",
    fips: "../fips/index.html",
    fipsSurveys: "../fips/surveys.html",
    lanmap: "../lanmap/index.html"
  },

  geoserver: {
    // HTTPS版 GeoServer
    wmsUrl: "https://140-245-124-203.sslip.io/geoserver/fims/wms",
    workspace: "fims",
    version: "1.1.1"
  },

  map: {
    center: [-6.5, 145.0],
    zoom: 6,
    minZoom: 4,
    maxZoom: 18,
    pngBounds: [
      [-12.2, 140.5],
      [-0.5, 156.5]
    ]
  },

  layers: [
    {
      key: "district",
      label: "Districts",
      name: "districts"
    },
    {
      key: "province",
      label: "Provinces",
      name: "province"
    },
    {
      key: "concession",
      label: "Concessions",
      name: "concession"
    },
    {
      key: "fmu",
      label: "FMUs",
      name: "fmu"
    },
    {
      key: "forestBaseMap",
      label: "Forest Base Map",
      name: "fbm"
    },
    {
      key: "protectedArea",
      label: "Protected Areas",
      name: "protected_area"
    },
    {
      key: "loggingArea",
      label: "Logging Areas",
      name: "logged_over"
    }
  ]
});