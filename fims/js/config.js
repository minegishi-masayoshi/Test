export const CONFIG = Object.freeze({
  appName: "FIMS Cloud",
  version: "Ver.1.0",
  environment: "MVP environment",

  urls: {
    portal: "../index.html",
    fips: "../fips/index.html",
    fipsSurveys: "../fips/surveys.html",
    lanmap: "../lanmap/index.html"
  },

  geoserver: {
    /*
     * 開発中は、Windows側でSSHトンネルを起動した状態で使用します。
     *
     * ssh -N -i "秘密鍵のパス" \
     *   -L 18080:127.0.0.1:8080 \
     *   ubuntu@140.245.124.203
     *
     * GitHub PagesはHTTPSで配信されるため、ブラウザによっては
     * HTTPのlocalhost WMSがMixed Contentとして遮断される場合があります。
     */
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
