/**
 * ============================================================
 * FIMS Cloud Ver.2.0
 * Application Configuration
 * ============================================================
 *
 * File:
 *   js/config.js
 *
 * Phase 1 implementation target:
 *   Old FIMS Main Screen - "(2) Province"
 *
 * Main processing flow:
 *   1. Load Province features from GeoServer WFS
 *   2. Display Province list
 *   3. Select a Province
 *   4. Load or filter FMUs belonging to the selected Province
 *   5. Display FMU list
 *   6. Display Province / FMU summary
 *   7. Display the selected Province on the map
 *   8. Preview, export and print reports
 *
 * Notes:
 *   - This file contains configuration only.
 *   - No DOM operations should be performed in this file.
 *   - No network requests should be performed in this file.
 *   - The GeoServer layer and attribute names must be verified
 *     after the migrated PostGIS data are published.
 * ============================================================
 */

const CONFIG = {
  /*
   * ==========================================================
   * 1. Application
   * ==========================================================
   */
  app: {
    id: "fims-cloud",
    name: "FIMS Cloud",
    fullName: "Forest Information and Mapping System",
    organization: "PNG Forest Authority",
    version: "Ver.2.0",
    build: "2.0.0",
    environment: "MVP",
    language: "en",
    defaultModule: "province",
    pageTitle: "FIMS Cloud - Province Selection",

    copyright: {
      owner: "PNG Forest Authority",
      startYear: 2026
    }
  },

  /*
   * ==========================================================
   * 2. Application URLs
   * ==========================================================
   */
  urls: {
    /*
     * Main portal
     */
    portal: "../index.html",

    /*
     * FIMS Cloud
     */
    fimsHome: "./index.html",

    /*
     * FIPS Cloud
     */
    fips: "../fips/index.html",
    fipsSurveys: "../fips/surveys.html",

    /*
     * LANMAP
     */
    lanmap: "../lanmap/index.html",

    /*
     * Internal FIMS pages
     */
    administration: "./views/administration.html",
    reports: "./views/reports.html",
    help: "./views/help.html"
  },

  /*
   * ==========================================================
   * 3. GeoServer
   * ==========================================================
   */
  geoserver: {
    enabled: true,

    /*
     * GeoServer reverse-proxy URL on OCI.
     *
     * GitHub Pages is served through HTTPS, so GeoServer must
     * also be accessed through HTTPS to avoid mixed-content
     * errors.
     */
    baseUrl: "https://140-245-124-203.sslip.io/geoserver",

    workspace: "fims",

    services: {
      wms: {
        enabled: true,
        url: "https://140-245-124-203.sslip.io/geoserver/fims/wms",
        version: "1.1.1",
        format: "image/png",
        transparent: true,
        tiled: true,

        /*
         * Use EPSG:3857 for Leaflet WMS display.
         */
        crs: "EPSG:3857"
      },

      wfs: {
        enabled: true,
        url: "https://140-245-124-203.sslip.io/geoserver/fims/ows",
        version: "2.0.0",
        outputFormat: "application/json",

        /*
         * GeoServer also commonly accepts:
         *   application/json
         *   json
         */
        alternateOutputFormats: [
          "application/json",
          "json"
        ],

        requestMethod: "GET"
      }
    },

    request: {
      timeoutMs: 30000,
      cache: "no-store",
      credentials: "omit",
      retryCount: 1,
      retryDelayMs: 1000
    },

    /*
     * Compatibility properties.
     *
     * These properties allow a smoother transition from
     * Ver.1.x while app.js, data.js and map.js are replaced.
     */
    wmsUrl: "https://140-245-124-203.sslip.io/geoserver/fims/wms",
    wfsUrl: "https://140-245-124-203.sslip.io/geoserver/fims/ows",
    wmsVersion: "1.1.1",
    wfsVersion: "2.0.0",
    version: "1.1.1"
  },

  /*
   * ==========================================================
   * 4. Main modules
   * ==========================================================
   *
   * These correspond to the function-selection buttons shown
   * on the old FIMS main screen.
   */
  modules: {
    province: {
      key: "province",
      label: "Province",
      enabled: true,
      implemented: true,
      initial: true,
      type: "internal"
    },

    concession: {
      key: "concession",
      label: "Concession",
      enabled: false,
      implemented: false,
      initial: false,
      type: "internal"
    },

    proposedConcession: {
      key: "proposed-concession",
      label: "Proposed Concession",
      enabled: false,
      implemented: false,
      initial: false,
      type: "internal"
    },

    largeMap: {
      key: "large-map",
      label: "Large Map",
      enabled: false,
      implemented: false,
      initial: false,
      type: "internal"
    },

    assessmentByFips: {
      key: "assessment-by-fips",
      label: "Assessment by FIPS",
      enabled: true,
      implemented: true,
      initial: false,
      type: "external",
      url: "../fips/index.html"
    },

    administration: {
      key: "administration",
      label: "ADMIN",
      enabled: false,
      implemented: false,
      initial: false,
      type: "internal",
      url: "./views/administration.html"
    },

    exit: {
      key: "exit",
      label: "EXIT",
      enabled: true,
      implemented: true,
      initial: false,
      type: "navigation",
      url: "../index.html"
    }
  },

  /*
   * ==========================================================
   * 5. Province Selection screen
   * ==========================================================
   *
   * Old FIMS screen correspondence:
   *
   *   No.1  Province list
   *   No.2  Province button
   *   No.9  Selected Province title
   *   No.10 FMU list
   *   No.11 Update Timber Volumes for Zone
   *   No.12 Update Timber Volume for FMU
   *   No.13 New Volume input
   *   No.14 Update button
   *   No.15 Province / FMU summary
   *   No.16 Province map
   *   No.17 Reports
   *   No.18 Print
   *   No.19 Preview / Export
   *   No.20 Report list / report area
   */
  provinceScreen: {
    key: "province",
    title: "Province Selection",
    enabled: true,

    /*
     * DOM element IDs used by the Ver.2 HTML and JavaScript.
     *
     * index.html will be rebuilt to use these IDs.
     */
    elements: {
      appRoot: "fims-app",

      /*
       * Header
       */
      pageTitle: "page-title",
      applicationVersion: "application-version",
      applicationStatus: "application-status",

      /*
       * Province panel
       */
      provincePanel: "province-panel",
      provinceSearch: "province-search",
      provinceTable: "province-table",
      provinceTableBody: "province-table-body",
      provinceEmptyMessage: "province-empty-message",
      provinceCount: "province-count",

      /*
       * Main-function buttons
       */
      moduleMenu: "module-menu",
      provinceButton: "module-province",
      concessionButton: "module-concession",
      proposedConcessionButton: "module-proposed-concession",
      largeMapButton: "module-large-map",
      assessmentButton: "module-assessment",
      administrationButton: "module-administration",
      exitButton: "module-exit",

      /*
       * Selected Province / FMU panel
       */
      selectedProvinceName: "selected-province-name",
      selectedProvinceCode: "selected-province-code",
      fmuPanel: "fmu-panel",
      fmuSearch: "fmu-search",
      fmuTable: "fmu-table",
      fmuTableHead: "fmu-table-head",
      fmuTableBody: "fmu-table-body",
      fmuEmptyMessage: "fmu-empty-message",
      fmuCount: "fmu-count",

      /*
       * Timber Volume controls
       */
      timberVolumePanel: "timber-volume-panel",
      updateZoneButton: "update-zone-volume",
      updateFmuButton: "update-fmu-volume",
      newVolumeInput: "new-volume-input",
      applyVolumeButton: "apply-volume-update",

      /*
       * Summary
       */
      summaryPanel: "province-summary-panel",
      summaryContainer: "province-summary",
      summaryEmptyMessage: "summary-empty-message",

      /*
       * Map
       */
      mapPanel: "province-map-panel",
      mapContainer: "map",
      mapLoading: "map-loading",
      mapError: "map-error",

      /*
       * Reports
       */
      reportsPanel: "reports-panel",
      reportList: "report-list",
      reportPreview: "report-preview",
      reportEmptyMessage: "report-empty-message",
      reportPrintButton: "report-print",
      reportPreviewButton: "report-preview-button",
      reportExportButton: "report-export",

      /*
       * Dialogs and notification area
       */
      notificationArea: "notification-area",
      loadingOverlay: "loading-overlay",
      errorDialog: "error-dialog"
    },

    /*
     * Initial screen state
     */
    initialState: {
      selectedProvinceId: null,
      selectedProvinceCode: null,
      selectedProvinceName: null,
      selectedFmuId: null,
      selectedReportKey: "province-fmu-list",
      provinceSearchText: "",
      fmuSearchText: ""
    },

    /*
     * Screen behavior
     */
    behavior: {
      selectFirstProvinceAutomatically: false,
      clearFmuSelectionWhenProvinceChanges: true,
      zoomMapWhenProvinceChanges: true,
      zoomMapWhenFmuChanges: true,
      showProvinceCode: true,
      showFmuCount: true,
      showDisabledModules: true
    }
  },

  /*
   * ==========================================================
   * 6. Province data definition
   * ==========================================================
   */
  province: {
    enabled: true,

    layer: {
      key: "province",
      workspace: "fims",

      /*
       * Current expected GeoServer layer:
       *   fims:prov
       */
      name: "prov",
      title: "Provinces",
      geometryField: "geom",
      geometryType: "polygon"
    },

    /*
     * Candidate field names.
     *
     * data.js will inspect the WFS properties and use the first
     * existing candidate. This is necessary because the final
     * PostGIS attribute names have not yet been fixed.
     */
    fields: {
      id: [
        "province_id",
        "provinceid",
        "prov_id",
        "provid",
        "prov_code",
        "provcode",
        "code",
        "objectid",
        "object_id",
        "gid",
        "id"
      ],

      code: [
        "province_code",
        "provincecode",
        "prov_code",
        "provcode",
        "code",
        "province_id",
        "prov_id"
      ],

      name: [
        "province",
        "province_name",
        "provincename",
        "prov_name",
        "provname",
        "name"
      ],

      area: [
        "area_ha",
        "area",
        "shape_area",
        "shapearea",
        "st_area"
      ]
    },

    list: {
      sortField: "code",
      secondarySortField: "name",
      sortDirection: "asc",
      searchable: true,
      maximumRecords: 100,
      columns: [
        {
          key: "code",
          label: "Code",
          visible: true
        },
        {
          key: "name",
          label: "Provinces",
          visible: true
        }
      ]
    },

    selection: {
      zoomToFeature: true,
      fitBoundsPadding: [30, 30],
      maximumZoom: 10
    }
  },

  /*
   * ==========================================================
   * 7. FMU data definition
   * ==========================================================
   */
  fmu: {
    enabled: true,

    layer: {
      key: "fmu",
      workspace: "fims",

      /*
       * Current expected GeoServer layer:
       *   fims:fmu
       */
      name: "fmu",
      title: "FMUs",
      geometryField: "geom",
      geometryType: "polygon"
    },

    fields: {
      id: [
        "fmu_id",
        "fmuid",
        "fmu_no",
        "fmuno",
        "fmu_number",
        "fmunumber",
        "fmu",
        "objectid",
        "object_id",
        "gid",
        "id"
      ],

      code: [
        "fmu_code",
        "fmucode",
        "fmu_no",
        "fmuno",
        "fmu_number",
        "fmunumber",
        "fmu"
      ],

      name: [
        "fmu_name",
        "fmuname",
        "name",
        "fmu"
      ],

      provinceId: [
        "province_id",
        "provinceid",
        "prov_id",
        "provid"
      ],

      provinceCode: [
        "province",
        "province_code",
        "provincecode",
        "prov_code",
        "provcode"
      ],

      provinceName: [
        "province",
        "province_name",
        "provincename",
        "prov_name",
        "provname"
      ],

      zone: [
        "zone",
        "zone_no",
        "zoneno",
        "zone_number",
        "zonenumber",
        "zone_id",
        "zoneid"
      ],

      vegetationType: [
        "vegtype",
        "veg_type",
        "vegetation_type",
        "vegetationtype",
        "forest_type",
        "foresttype"
      ],

      timberVolume: [
        "timbervolume",
        "timber_volume",
        "timber_vol",
        "timbervol",
        "gross_forest_volume",
        "grossforestvolume",
        "volume_m3",
        "volume"
      ],

      area: [
        "area_ha",
        "fmu_area_ha",
        "fmu_area",
        "area",
        "shape_area",
        "shapearea"
      ],

      vegetationArea: [
        "vegarea",
        "veg_area",
        "vegetation_area",
        "vegetationarea",
        "gross_forest_area",
        "grossforestarea",
        "forest_area",
        "forestarea"
      ],

      protectedArea: [
        "protected_area",
        "protectedarea",
        "protected"
      ],

      adjustedForestArea: [
        "adjusted_forest_area",
        "adjustedforestarea",
        "rev_adj_forest_area",
        "revadjforestarea"
      ],

      adjustedForestVolume: [
        "adjusted_forest_volume",
        "adjustedforestvolume",
        "rev_gross_forest_vol",
        "revgrossforestvol"
      ]
    },

    /*
     * Relation between Province and FMU.
     *
     * Phase 1 uses attribute matching.
     *
     * Priority:
     *   1. Province ID
     *   2. Province code
     *   3. Province name
     *
     * A spatial-intersection relation may be added after the
     * final PostGIS schema is confirmed.
     */
    relation: {
      method: "attribute",
      fallbackMethod: "client-side",
      caseSensitive: false,
      trimValues: true,

      matchingPriority: [
        "provinceId",
        "provinceCode",
        "provinceName"
      ]
    },

    list: {
      sortField: "code",
      secondarySortField: "name",
      sortDirection: "asc",
      maximumRecords: 5000,
      searchable: true,

      /*
       * Phase 1 displays a controlled set of columns.
       *
       * Additional attributes can be shown after checking the
       * migrated FMU table.
       */
      columns: [
        {
          key: "code",
          label: "FMU",
          visible: true,
          sortable: true
        },
        {
          key: "name",
          label: "FMU Name",
          visible: true,
          sortable: true
        },
        {
          key: "zone",
          label: "Zone",
          visible: true,
          sortable: true
        },
        {
          key: "vegetationType",
          label: "Vegetation Type",
          visible: false,
          sortable: true
        },
        {
          key: "area",
          label: "Area (ha)",
          visible: true,
          sortable: true,
          format: "number",
          decimalPlaces: 2
        },
        {
          key: "timberVolume",
          label: "Timber Volume (m³)",
          visible: true,
          sortable: true,
          format: "number",
          decimalPlaces: 2
        }
      ],

      selectable: true,
      showAllAttributes: false,
      includeGeometry: false,
      emptyValue: "—"
    },

    selection: {
      zoomToFeature: true,
      fitBoundsPadding: [30, 30],
      maximumZoom: 13
    }
  },

  /*
   * ==========================================================
   * 8. Province / FMU summary
   * ==========================================================
   *
   * These fields correspond conceptually to the summary area
   * displayed at No.15 of the old FIMS screen.
   *
   * The actual values displayed depend on the available FMU
   * attributes after migration.
   */
  summary: {
    enabled: true,
    scope: "selected-province",

    sections: [
      {
        key: "province",
        label: "Province",
        fields: [
          {
            key: "provinceCode",
            label: "Province Code",
            source: "province",
            field: "code",
            aggregation: "value",
            format: "text"
          },
          {
            key: "provinceName",
            label: "Province Name",
            source: "province",
            field: "name",
            aggregation: "value",
            format: "text"
          },
          {
            key: "provinceArea",
            label: "Province Area",
            source: "province",
            field: "area",
            aggregation: "value",
            format: "number",
            unit: "ha",
            decimalPlaces: 2
          }
        ]
      },

      {
        key: "fmu",
        label: "FMU Summary",
        fields: [
          {
            key: "fmuCount",
            label: "Number of FMUs",
            source: "fmu",
            aggregation: "count",
            format: "integer"
          },
          {
            key: "totalFmuArea",
            label: "Total FMU Area",
            source: "fmu",
            field: "area",
            aggregation: "sum",
            format: "number",
            unit: "ha",
            decimalPlaces: 2
          },
          {
            key: "totalVegetationArea",
            label: "Gross Forest Area",
            source: "fmu",
            field: "vegetationArea",
            aggregation: "sum",
            format: "number",
            unit: "ha",
            decimalPlaces: 2
          },
          {
            key: "totalProtectedArea",
            label: "Protected Area",
            source: "fmu",
            field: "protectedArea",
            aggregation: "sum",
            format: "number",
            unit: "ha",
            decimalPlaces: 2
          },
          {
            key: "totalTimberVolume",
            label: "Gross Forest Volume",
            source: "fmu",
            field: "timberVolume",
            aggregation: "sum",
            format: "number",
            unit: "m³",
            decimalPlaces: 2
          },
          {
            key: "adjustedForestArea",
            label: "Revised Adjusted Forest Area",
            source: "fmu",
            field: "adjustedForestArea",
            aggregation: "sum",
            format: "number",
            unit: "ha",
            decimalPlaces: 2
          },
          {
            key: "adjustedForestVolume",
            label: "Revised Gross Forest Volume",
            source: "fmu",
            field: "adjustedForestVolume",
            aggregation: "sum",
            format: "number",
            unit: "m³",
            decimalPlaces: 2
          }
        ]
      }
    ],

    emptyValue: "—"
  },

  /*
   * ==========================================================
   * 9. Timber Volume update
   * ==========================================================
   *
   * The old FIMS screen has:
   *   - Update Timber Volumes for Zone
   *   - Update Timber Volume for FMU
   *   - New Volume
   *   - Update
   *
   * GitHub Pages is a static frontend and should not update
   * PostGIS directly. A secured server-side API is required.
   *
   * Therefore, the function is defined but disabled in the
   * first Province implementation.
   */
  timberVolume: {
    enabled: false,
    readOnly: true,

    modes: {
      zone: {
        key: "zone",
        label: "Update Timber Volumes for Zone",
        enabled: false,
        requiresSelectedProvince: true,
        requiresSelectedFmu: false
      },

      fmu: {
        key: "fmu",
        label: "Update Timber Volume for FMU",
        enabled: false,
        requiresSelectedProvince: true,
        requiresSelectedFmu: true
      }
    },

    input: {
      label: "New Vol.",
      minimum: 0,
      maximum: null,
      step: 0.01,
      decimalPlaces: 2,
      required: true
    },

    api: {
      enabled: false,
      baseUrl: "",

      endpoints: {
        updateFmu: "/api/fmus/{fmuId}/timber-volume",
        updateZone: "/api/provinces/{provinceId}/zones/{zone}/timber-volume"
      },

      method: "PATCH",
      contentType: "application/json",
      credentials: "include",
      timeoutMs: 30000
    }
  },

  /*
   * ==========================================================
   * 10. Reports
   * ==========================================================
   */
  reports: {
    enabled: true,
    scope: "selected-province",
    defaultReport: "province-fmu-list",

    definitions: [
      {
        key: "province-fmu-list",
        label: "FMU List by Province",
        description:
          "List of FMUs belonging to the selected Province.",
        enabled: true,
        preview: true,
        export: true,
        print: true,
        exportFormats: [
          "csv"
        ]
      },

      {
        key: "province-fmu-summary",
        label: "FMU Summary by Province",
        description:
          "Summary of FMU count, area and timber volume for the selected Province.",
        enabled: true,
        preview: true,
        export: true,
        print: true,
        exportFormats: [
          "csv"
        ]
      },

      {
        key: "province-timber-volume",
        label: "Timber Volume by Province",
        description:
          "Timber Volume summary for all FMUs in the selected Province.",
        enabled: true,
        preview: true,
        export: true,
        print: true,
        exportFormats: [
          "csv"
        ]
      }
    ],

    exportFormats: {
      csv: {
        key: "csv",
        label: "CSV",
        extension: ".csv",
        mimeType: "text/csv;charset=utf-8",
        enabled: true
      },

      xlsx: {
        key: "xlsx",
        label: "Excel",
        extension: ".xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        enabled: false
      },

      pdf: {
        key: "pdf",
        label: "PDF",
        extension: ".pdf",
        mimeType: "application/pdf",
        enabled: false
      }
    },

    print: {
      enabled: true,
      titlePrefix: "FIMS Cloud",
      openInNewWindow: false
    }
  },

  /*
   * ==========================================================
   * 11. Map
   * ==========================================================
   */
  map: {
    containerId: "map",

    /*
     * Papua New Guinea overview.
     */
    center: [
      -6.3,
      146.0
    ],

    zoom: 6,
    minZoom: 4,
    maxZoom: 18,

    pngBounds: [
      [
        -12.2,
        140.5
      ],
      [
        -0.5,
        156.5
      ]
    ],

    fitBoundsPadding: [
      20,
      20
    ],

    controls: {
      zoom: true,
      scale: true,
      layers: true,
      attribution: true
    },

    baseMaps: {
      openStreetMap: {
        key: "open-street-map",
        label: "OpenStreetMap",
        enabled: true,
        default: true,
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
        subdomains: "abc",
        minZoom: 0,
        maxZoom: 19
      },

      none: {
        key: "none",
        label: "No Base Map",
        enabled: true,
        default: false
      }
    },

    /*
     * Layer drawing order from bottom to top.
     */
    layerOrder: [
      "forestBaseMap",
      "district",
      "province",
      "concession",
      "fmu",
      "protectedArea",
      "loggingArea"
    ],

    defaultVisibleLayers: [
      "province"
    ],

    styles: {
      province: {
        color: "#1f4e79",
        weight: 2,
        opacity: 1,
        fillColor: "#d9e8f5",
        fillOpacity: 0.25
      },

      selectedProvince: {
        color: "#d97706",
        weight: 4,
        opacity: 1,
        fillColor: "#fbbf24",
        fillOpacity: 0.25
      },

      fmu: {
        color: "#166534",
        weight: 1.5,
        opacity: 1,
        fillColor: "#86efac",
        fillOpacity: 0.25
      },

      selectedFmu: {
        color: "#dc2626",
        weight: 4,
        opacity: 1,
        fillColor: "#f87171",
        fillOpacity: 0.35
      }
    }
  },

  /*
   * ==========================================================
   * 12. Published GIS layers
   * ==========================================================
   */
  layers: {
    district: {
      key: "district",
      label: "Districts",
      workspace: "fims",
      name: "districts",
      qualifiedName: "fims:districts",
      service: "wms",
      enabled: true,
      visible: false,
      queryable: false,
      opacity: 0.7,
      zIndex: 200
    },

    province: {
      key: "province",
      label: "Provinces",
      workspace: "fims",
      name: "prov",
      qualifiedName: "fims:prov",
      service: "wms-wfs",
      enabled: true,
      visible: true,
      queryable: true,
      opacity: 0.8,
      zIndex: 300
    },

    concession: {
      key: "concession",
      label: "Concessions",
      workspace: "fims",
      name: "concessionarea",
      qualifiedName: "fims:concessionarea",
      service: "wms-wfs",
      enabled: false,
      visible: false,
      queryable: true,
      opacity: 0.6,
      zIndex: 400
    },

    fmu: {
      key: "fmu",
      label: "FMUs",
      workspace: "fims",
      name: "fmu",
      qualifiedName: "fims:fmu",
      service: "wms-wfs",
      enabled: true,
      visible: false,
      queryable: true,
      opacity: 0.75,
      zIndex: 500
    },

    forestBaseMap: {
      key: "forestBaseMap",
      label: "Forest Base Map",
      workspace: "fims",
      name: "fbm",
      qualifiedName: "fims:fbm",
      service: "wms",
      enabled: true,
      visible: false,
      queryable: false,
      opacity: 0.8,
      zIndex: 100
    },

    protectedArea: {
      key: "protectedArea",
      label: "Protected Areas",
      workspace: "fims",
      name: "protected_area",
      qualifiedName: "fims:protected_area",
      service: "wms",
      enabled: false,
      visible: false,
      queryable: false,
      opacity: 0.65,
      zIndex: 600
    },

    loggingArea: {
      key: "loggingArea",
      label: "Logging Areas",
      workspace: "fims",
      name: "logged_over",
      qualifiedName: "fims:logged_over",
      service: "wms",
      enabled: false,
      visible: false,
      queryable: false,
      opacity: 0.65,
      zIndex: 700
    }
  },

  /*
   * ==========================================================
   * 13. Data-source definitions
   * ==========================================================
   *
   * This section replaces the older Ver.1.x dataSources while
   * retaining a similar structure for gradual migration.
   */
  dataSources: {
    province: {
      key: "province",
      mode: "province",
      source: "wfs",

      unitLayer: "prov",
      unitLayerKey: "province",

      objectLayer: "fmu",
      objectLayerKey: "fmu",

      unitLabel: "Provinces",
      objectLabel: "FMUs",

      relation: "attribute",
      provinceField: "province",
      sortField: "fmu"
    },

    concession: {
      key: "concession",
      mode: "concession",
      source: "wfs",

      unitLayer: "prov",
      unitLayerKey: "province",

      objectLayer: "concessionarea",
      objectLayerKey: "concession",

      unitLabel: "Provinces",
      objectLabel: "Concessions",

      relation: "attribute",
      provinceField: "province",
      sortField: null
    },

    proposedConcession: {
      key: "proposed-concession",
      mode: "proposed-concession",
      source: "local",

      unitLayer: "prov",
      unitLayerKey: "province",

      objectLayer: null,
      objectLayerKey: null,

      unitLabel: "Provinces",
      objectLabel: "Proposed Concessions",

      relation: null,
      provinceField: "province",
      sortField: null
    }
  },

  /*
   * ==========================================================
   * 14. Data handling
   * ==========================================================
   */
  data: {
    primarySource: "geoserver",

    fallback: {
      enabled: true,
      source: "local",
      showWarning: true
    },

    geometry: {
      includeInTables: false,
      includeInReports: false,
      includeInExports: false
    },

    matching: {
      caseSensitive: false,
      trimStrings: true,
      normalizeWhitespace: true,
      treatNumericStringsAsNumbers: true
    },

    emptyValue: "—",

    numberFormat: {
      locale: "en-US",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },

    dateFormat: {
      locale: "en-GB",
      options: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    }
  },

  /*
   * ==========================================================
   * 15. Table settings
   * ==========================================================
   *
   * Retained for backward compatibility and shared table logic.
   */
  table: {
    showAllAttributes: false,
    includeGeometry: false,
    emptyValue: "—",
    selectableRows: true,
    highlightSelectedRow: true,
    stickyHeader: true
  },

  /*
   * ==========================================================
   * 16. User-interface messages
   * ==========================================================
   */
  ui: {
    showDisabledModules: true,
    confirmBeforeLeaving: false,

    labels: {
      province: "Province",
      provinces: "Provinces",
      fmu: "FMU",
      fmus: "FMUs",
      code: "Code",
      reports: "Reports",
      print: "Print",
      preview: "Preview",
      export: "Export",
      update: "Update",
      newVolume: "New Vol."
    },

    messages: {
      starting:
        "Starting FIMS Cloud Ver.2.0…",

      ready:
        "FIMS Cloud Ver.2.0 is ready.",

      loadingProvinces:
        "Loading Province data from GeoServer…",

      loadingFmus:
        "Loading FMU data from GeoServer…",

      selectProvince:
        "Select a Province to display its FMUs.",

      provinceNotSelected:
        "Province: Not yet selected.",

      noProvinces:
        "No Province records were found.",

      noFmus:
        "No FMUs were found for the selected Province.",

      noReport:
        "Select a report to preview.",

      provinceLoadFailed:
        "Province data could not be loaded from GeoServer.",

      fmuLoadFailed:
        "FMU data could not be loaded from GeoServer.",

      geoserverUnavailable:
        "GeoServer is currently unavailable.",

      fallbackDataUsed:
        "GeoServer data could not be loaded. Local fallback data are being displayed.",

      timberVolumeDisabled:
        "Timber Volume update is not available in the current version.",

      timberVolumeApiRequired:
        "Timber Volume update requires an authenticated server-side API.",

      reportExported:
        "The report was exported successfully.",

      reportExportFailed:
        "The report could not be exported.",

      featureNotFound:
        "The selected feature could not be found.",

      unexpectedError:
        "An unexpected error occurred."
    }
  },

  /*
   * ==========================================================
   * 17. Debugging
   * ==========================================================
   */
  debug: {
    enabled: true,

    logConfiguration: false,
    logApplicationState: false,
    logNetworkRequests: true,
    logGeoServerResponses: false,
    logFieldResolution: true,
    logSummaryCalculations: false,

    showDetailedErrors: true
  }
};

/*
 * ============================================================
 * Configuration utility functions
 * ============================================================
 */

/**
 * Returns a layer configuration by its key.
 *
 * @param {string} layerKey
 * @returns {object|null}
 */
function getLayerConfig(layerKey) {
  if (!layerKey || !Object.prototype.hasOwnProperty.call(CONFIG.layers, layerKey)) {
    return null;
  }

  return CONFIG.layers[layerKey];
}

/**
 * Returns a qualified GeoServer layer name.
 *
 * Example:
 *   getQualifiedLayerName("province")
 *   -> "fims:prov"
 *
 * @param {string|object} layerOrKey
 * @returns {string}
 */
function getQualifiedLayerName(layerOrKey) {
  let layer = layerOrKey;

  if (typeof layerOrKey === "string") {
    layer = getLayerConfig(layerOrKey);
  }

  if (!layer || !layer.name) {
    return "";
  }

  if (layer.qualifiedName) {
    return layer.qualifiedName;
  }

  if (String(layer.name).includes(":")) {
    return layer.name;
  }

  const workspace =
    layer.workspace ||
    CONFIG.geoserver.workspace;

  return `${workspace}:${layer.name}`;
}

/**
 * Alias retained for map.js compatibility.
 *
 * @param {string} layerKey
 * @returns {string}
 */
function getWmsLayerName(layerKey) {
  return getQualifiedLayerName(layerKey);
}

/**
 * Alias retained for data.js compatibility.
 *
 * @param {string} layerKey
 * @returns {string}
 */
function getWfsTypeName(layerKey) {
  return getQualifiedLayerName(layerKey);
}

/**
 * Builds a GeoServer WFS GetFeature URL.
 *
 * @param {object} options
 * @param {string} [options.layerKey]
 * @param {string} [options.typeName]
 * @param {string} [options.cqlFilter]
 * @param {number} [options.count]
 * @param {string} [options.sortBy]
 * @param {boolean} [options.includeGeometry]
 * @param {string[]} [options.propertyNames]
 * @returns {string}
 */
function buildWfsGetFeatureUrl(options = {}) {
  const {
    layerKey = null,
    typeName = null,
    cqlFilter = null,
    count = null,
    sortBy = null,
    includeGeometry = true,
    propertyNames = null
  } = options;

  const resolvedTypeName =
    typeName ||
    getWfsTypeName(layerKey);

  if (!resolvedTypeName) {
    throw new Error(
      "A valid WFS layerKey or typeName is required."
    );
  }

  const parameters = new URLSearchParams({
    service: "WFS",
    version: CONFIG.geoserver.services.wfs.version,
    request: "GetFeature",
    typeNames: resolvedTypeName,
    outputFormat: CONFIG.geoserver.services.wfs.outputFormat
  });

  if (cqlFilter) {
    parameters.set("CQL_FILTER", cqlFilter);
  }

  if (Number.isFinite(count) && count > 0) {
    parameters.set("count", String(count));
  }

  if (sortBy) {
    parameters.set("sortBy", sortBy);
  }

  if (
    Array.isArray(propertyNames) &&
    propertyNames.length > 0
  ) {
    parameters.set(
      "propertyName",
      propertyNames.join(",")
    );
  } else if (!includeGeometry) {
    /*
     * WFS does not have one universal parameter that means
     * "all attributes except geometry".
     *
     * Therefore, data.js should pass explicit propertyNames
     * after DescribeFeatureType or field inspection where
     * necessary.
     */
  }

  return (
    `${CONFIG.geoserver.services.wfs.url}` +
    `?${parameters.toString()}`
  );
}

/**
 * Backward-compatible WFS URL builder.
 *
 * @param {object} parameters
 * @returns {string}
 */
function getWfsUrl(parameters = {}) {
  const searchParameters = new URLSearchParams({
    service: "WFS",
    version: CONFIG.geoserver.services.wfs.version,
    request: "GetFeature",
    outputFormat: CONFIG.geoserver.services.wfs.outputFormat,
    ...parameters
  });

  return (
    `${CONFIG.geoserver.services.wfs.url}` +
    `?${searchParameters.toString()}`
  );
}

/**
 * Returns the WMS endpoint.
 *
 * @returns {string}
 */
function getWmsUrl() {
  return CONFIG.geoserver.services.wms.url;
}

/**
 * Returns the first field candidate that exists in a property
 * object.
 *
 * Field-name comparison is case-insensitive.
 *
 * @param {object} properties
 * @param {string[]} candidates
 * @returns {string|null}
 */
function resolveFieldName(properties, candidates) {
  if (
    !properties ||
    typeof properties !== "object" ||
    !Array.isArray(candidates)
  ) {
    return null;
  }

  const actualFieldNames = Object.keys(properties);

  for (const candidate of candidates) {
    const exactMatch = actualFieldNames.find(
      (fieldName) => fieldName === candidate
    );

    if (exactMatch) {
      return exactMatch;
    }

    const caseInsensitiveMatch = actualFieldNames.find(
      (fieldName) =>
        fieldName.toLowerCase() ===
        String(candidate).toLowerCase()
    );

    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch;
    }
  }

  return null;
}

/**
 * Returns a normalized value from a feature property object
 * using candidate field names.
 *
 * @param {object} properties
 * @param {string[]} candidates
 * @param {*} fallbackValue
 * @returns {*}
 */
function getFieldValue(
  properties,
  candidates,
  fallbackValue = null
) {
  const fieldName =
    resolveFieldName(properties, candidates);

  if (!fieldName) {
    return fallbackValue;
  }

  const value = properties[fieldName];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallbackValue;
  }

  return value;
}

/**
 * Deep-freezes a configuration object.
 *
 * @param {*} value
 * @returns {*}
 */
function deepFreeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  Object.values(value).forEach((childValue) => {
    deepFreeze(childValue);
  });

  return value;
}

/*
 * The application treats CONFIG as immutable.
 */
deepFreeze(CONFIG);

export {
  CONFIG,
  getLayerConfig,
  getQualifiedLayerName,
  getWmsLayerName,
  getWfsTypeName,
  buildWfsGetFeatureUrl,
  getWfsUrl,
  getWmsUrl,
  resolveFieldName,
  getFieldValue
};
