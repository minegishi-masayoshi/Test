export const CONFIG = Object.freeze({
  appName: "FIMS Cloud",
  version: "Ver.1.1",
  environment: "MVP environment",

  urls: {
    portal: "../index.html",
    fips: "../fips/index.html",
    fipsSurveys: "../fips/surveys.html",
    lanmap: "../lanmap/index.html"
  },

  geoserver: {
    /*
     * GeoServer (OCI)
     *
     * WMS : Map display
     * WFS : FMU / Concession attribute retrieval
     *
     * GitHub Pages is served over HTTPS, therefore GeoServer is also
     * accessed through the HTTPS reverse proxy.
     */

    baseUrl: "https://140-245-124-203.sslip.io/geoserver",

    wmsUrl: "https://140-245-124-203.sslip.io/geoserver/fims/wms",

    wfsUrl: "https://140-245-124-203.sslip.io/geoserver/fims/ows",

    workspace: "fims",

    wmsVersion: "1.1.1",

    wfsVersion: "2.0.0",

    // Backward compatibility
    version: "1.1.1"
  },

  /*
   * Data source definitions
   */
  dataSources: {

    province: {
      mode: "province",
      unitLayer: "prov",
      objectLayer: "fmu",
      objectLabel: "FMUs",
      provinceField: "province",
      sortField: "fmu",
      source: "wfs"
    },

    concession: {
      mode: "concession",
      unitLayer: "prov",
      objectLayer: "concessionarea",
      objectLabel: "Concessions",
      provinceField: "province",
      sortField: null,
      source: "wfs"
    },

    proposedConcession: {
      mode: "proposed-concession",
      unitLayer: "prov",
      objectLayer: null,
      objectLabel: "Proposed Concessions",
      provinceField: "province",
      sortField: null,
      source: "dummy"
    }

  },

  /*
   * Object table
   *
   * At this stage ALL FMU attributes will be displayed.
   * After PNGFA review the display fields will be reduced.
   */
  table: {
    showAllAttributes: true,
    includeGeometry: false,
    emptyValue: "—"
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
      name: "prov"
    },
    {
      key: "concession",
      label: "Concessions",
      name: "concessionarea"
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
