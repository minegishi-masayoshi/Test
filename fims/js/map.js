/**
 * ============================================================
 * FIMS Cloud Ver.2.0
 * Map Module
 * ============================================================
 *
 * File:
 *   js/map.js
 *
 * Responsibilities:
 *   - Initialize the Leaflet map
 *   - Display GeoServer WMS layers
 *   - Display Province and FMU GeoJSON features
 *   - Highlight selected Province and FMU
 *   - Zoom to Province, FMU and Papua New Guinea extents
 *   - Handle map clicks and coordinate display
 *   - Build the compact layer-control list
 *
 * This module does not:
 *   - Load Province or FMU records from GeoServer
 *   - Render Province/FMU HTML tables
 *   - Calculate summaries
 *
 * Data loading is handled by data.js.
 * Application state is coordinated by app.js.
 * ============================================================
 */

import {
  CONFIG,
  getLayerConfig,
  getQualifiedLayerName,
  getWmsUrl
} from "./config.js";

import {
  recordsToFeatureCollection
} from "./data.js";

/* ============================================================
 * 1. Constants
 * ============================================================
 */

const MAP_ENTITY = Object.freeze({
  PROVINCE: "province",
  FMU: "fmu"
});

const DEFAULT_COORDINATE_TEXT = "Lat: — / Lon: —";

const DEFAULT_CALLBACK = () => {};

/* ============================================================
 * 2. FimsMap class
 * ============================================================
 */

export class FimsMap {
  /**
   * Creates the FIMS Leaflet map.
   *
   * @param {object} [options]
   * @param {string} [options.elementId]
   * @param {object} [options.config]
   * @param {Function} [options.onCoordinate]
   * @param {Function} [options.onStatus]
   * @param {Function} [options.onProvinceSelect]
   * @param {Function} [options.onFmuSelect]
   * @param {Function} [options.onError]
   */
  constructor(options = {}) {
    const {
      elementId =
        CONFIG.provinceScreen.elements.mapContainer ||
        CONFIG.map.containerId ||
        "map",

      config = CONFIG,

      onCoordinate = DEFAULT_CALLBACK,
      onStatus = DEFAULT_CALLBACK,
      onProvinceSelect = DEFAULT_CALLBACK,
      onFmuSelect = DEFAULT_CALLBACK,
      onError = DEFAULT_CALLBACK
    } = options;

    this.config = config;
    this.elementId = elementId;

    this.callbacks = {
      onCoordinate:
        typeof onCoordinate === "function"
          ? onCoordinate
          : DEFAULT_CALLBACK,

      onStatus:
        typeof onStatus === "function"
          ? onStatus
          : DEFAULT_CALLBACK,

      onProvinceSelect:
        typeof onProvinceSelect === "function"
          ? onProvinceSelect
          : DEFAULT_CALLBACK,

      onFmuSelect:
        typeof onFmuSelect === "function"
          ? onFmuSelect
          : DEFAULT_CALLBACK,

      onError:
        typeof onError === "function"
          ? onError
          : DEFAULT_CALLBACK
    };

    this.map = null;

    /*
     * Base-map layers.
     */
    this.baseLayers = new Map();

    /*
     * GeoServer WMS overlay layers.
     */
    this.wmsLayers = new Map();

    /*
     * Client-side GeoJSON layers.
     */
    this.provinceGeoJsonLayer = null;
    this.fmuGeoJsonLayer = null;

    /*
     * Record storage.
     */
    this.provinces = [];
    this.fmus = [];

    /*
     * Leaflet layer lookup by normalized record ID.
     */
    this.provinceFeatureLayers = new Map();
    this.fmuFeatureLayers = new Map();

    /*
     * Current selections.
     */
    this.selectedProvince = null;
    this.selectedFmu = null;

    /*
     * Map state.
     */
    this.activeBaseMapKey = null;
    this.initialized = false;
    this.destroyed = false;

    /*
     * Event/observer references.
     */
    this.resizeObserver = null;
    this.windowResizeHandler = null;
    this.windowLoadHandler = null;

    this.initialize();
  }

  /* ==========================================================
   * 3. Initialization
   * ==========================================================
   */

  /**
   * Initializes the Leaflet map.
   */
  initialize() {
    try {
      this.assertLeafletAvailable();

      const mapElement = document.getElementById(
        this.elementId
      );

      if (!mapElement) {
        throw new MapInitializationError(
          `Map element '#${this.elementId}' was not found.`
        );
      }

      /*
       * Prevent Leaflet's:
       * "Map container is already initialized"
       * error when the application is reloaded dynamically.
       */
      if (mapElement._leaflet_id) {
        mapElement._leaflet_id = null;
      }

      this.map = L.map(this.elementId, {
        center: this.config.map.center,
        zoom: this.config.map.zoom,
        minZoom: this.config.map.minZoom,
        maxZoom: this.config.map.maxZoom,

        zoomControl:
          this.config.map.controls?.zoom !== false,

        attributionControl:
          this.config.map.controls?.attribution !== false,

        preferCanvas: true
      });

      this.initializeBaseMaps();
      this.initializeGeoJsonLayers();
      this.initializeDefaultWmsLayers();
      this.initializeControls();
      this.bindMapEvents();
      this.observeMapSize();

      this.initialized = true;

      /*
       * PNG bounds provide a more reliable initial view than
       * center/zoom on different screen sizes.
       */
      window.setTimeout(() => {
        if (!this.destroyed) {
          this.zoomToPng({
            notify: false,
            animate: false
          });
        }
      }, 50);

      this.setMapLoading(false);
      this.setMapError(null);

      this.emitStatus("Map initialized.");
    } catch (error) {
      this.handleError(
        "The map could not be initialized.",
        error
      );
    }
  }

  /**
   * Verifies that Leaflet has loaded.
   */
  assertLeafletAvailable() {
    if (
      typeof window === "undefined" ||
      typeof window.L === "undefined"
    ) {
      throw new MapInitializationError(
        "Leaflet is not available. Check the Leaflet script in index.html."
      );
    }
  }

  /**
   * Initializes configured base maps.
   */
  initializeBaseMaps() {
    const baseMapDefinitions =
      this.config.map.baseMaps ?? {};

    for (
      const [configurationKey, definition]
      of Object.entries(baseMapDefinitions)
    ) {
      if (!definition?.enabled) {
        continue;
      }

      const key =
        definition.key ||
        configurationKey;

      let layer = null;

      if (definition.url) {
        layer = L.tileLayer(definition.url, {
          attribution:
            definition.attribution ?? "",

          subdomains:
            definition.subdomains ?? "abc",

          minZoom:
            definition.minZoom ?? 0,

          maxZoom:
            definition.maxZoom ??
            this.config.map.maxZoom,

          crossOrigin: true
        });
      } else {
        /*
         * "No Base Map" is represented as an empty LayerGroup.
         */
        layer = L.layerGroup();
      }

      this.baseLayers.set(key, {
        key,
        definition,
        layer
      });

      if (
        definition.default ||
        this.activeBaseMapKey === null
      ) {
        this.activeBaseMapKey = key;
      }
    }

    const defaultBaseMap =
      this.baseLayers.get(this.activeBaseMapKey);

    if (defaultBaseMap?.layer) {
      defaultBaseMap.layer.addTo(this.map);
    }
  }

  /**
   * Creates empty Province and FMU GeoJSON layer groups.
   */
  initializeGeoJsonLayers() {
    this.provinceGeoJsonLayer = L.geoJSON(
      {
        type: "FeatureCollection",
        features: []
      },
      this.getProvinceGeoJsonOptions()
    ).addTo(this.map);

    this.fmuGeoJsonLayer = L.geoJSON(
      {
        type: "FeatureCollection",
        features: []
      },
      this.getFmuGeoJsonOptions()
    );

    /*
     * Province is visible initially.
     * FMUs are shown only after a Province is selected.
     */
    this.bringOperationalLayersToFront();
  }

  /**
   * Creates and displays configured default WMS layers.
   */
  initializeDefaultWmsLayers() {
    const defaultLayerKeys =
      this.config.map.defaultVisibleLayers ?? [];

    for (const layerKey of defaultLayerKeys) {
      /*
       * Province GeoJSON is the primary interactive Province
       * representation. A WMS Province layer is still useful
       * when client-side geometry is unavailable.
       */
      this.setWmsLayerVisible(layerKey, true, {
        notify: false
      });
    }
  }

  /**
   * Initializes scale control.
   */
  initializeControls() {
    if (this.config.map.controls?.scale !== false) {
      L.control.scale({
        metric: true,
        imperial: false,
        position: "bottomleft"
      }).addTo(this.map);
    }
  }

  /* ==========================================================
   * 4. Map events and sizing
   * ==========================================================
   */

  /**
   * Registers general Leaflet events.
   */
  bindMapEvents() {
    this.map.on("mousemove", (event) => {
      const lat = event.latlng?.lat;
      const lng = event.latlng?.lng;

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        this.callbacks.onCoordinate(
          `Lat: ${lat.toFixed(5)} / Lon: ${lng.toFixed(5)}`
        );
      }
    });

    this.map.on("mouseout", () => {
      this.callbacks.onCoordinate(
        DEFAULT_COORDINATE_TEXT
      );
    });

    this.map.on("click", () => {
      /*
       * Feature clicks stop propagation, so this represents a
       * click on an empty portion of the map.
       */
      this.closePopup();
    });

    this.map.on("layeradd", () => {
      this.bringOperationalLayersToFront();
    });

    this.map.on("baselayerchange", (event) => {
      this.activeBaseMapKey =
        this.findBaseMapKeyByLayer(event.layer);
    });
  }

  /**
   * Keeps the Leaflet viewport synchronized with its container.
   */
  observeMapSize() {
    const mapElement = document.getElementById(
      this.elementId
    );

    if (!mapElement) {
      return;
    }

    const refreshMapSize = () => {
      if (
        !this.map ||
        this.destroyed
      ) {
        return;
      }

      window.requestAnimationFrame(() => {
        if (
          !this.map ||
          this.destroyed
        ) {
          return;
        }

        this.map.invalidateSize({
          animate: false,
          pan: false
        });
      });
    };

    this.windowLoadHandler = refreshMapSize;
    this.windowResizeHandler = refreshMapSize;

    window.addEventListener(
      "load",
      this.windowLoadHandler
    );

    window.addEventListener(
      "resize",
      this.windowResizeHandler
    );

    if ("ResizeObserver" in window) {
      this.resizeObserver =
        new ResizeObserver(refreshMapSize);

      this.resizeObserver.observe(mapElement);
    }

    window.setTimeout(refreshMapSize, 100);
    window.setTimeout(refreshMapSize, 400);
    window.setTimeout(refreshMapSize, 1000);
  }

  /**
   * Forces Leaflet to recalculate the map viewport.
   */
  refreshSize() {
    if (!this.map || this.destroyed) {
      return;
    }

    this.map.invalidateSize({
      animate: false,
      pan: false
    });
  }

  /* ==========================================================
   * 5. Province display
   * ==========================================================
   */

  /**
   * Displays all loaded Province records as GeoJSON.
   *
   * @param {object[]} provinces
   */
  setProvinceData(provinces) {
    this.provinces =
      Array.isArray(provinces)
        ? [...provinces]
        : [];

    this.provinceFeatureLayers.clear();

    if (!this.provinceGeoJsonLayer) {
      return;
    }

    this.provinceGeoJsonLayer.clearLayers();

    const featureCollection =
      recordsToFeatureCollection(this.provinces);

    if (featureCollection.features.length > 0) {
      this.provinceGeoJsonLayer.addData(
        featureCollection
      );
    }

    if (
      !this.map.hasLayer(
        this.provinceGeoJsonLayer
      )
    ) {
      this.provinceGeoJsonLayer.addTo(this.map);
    }

    /*
     * Reapply selection after layer recreation.
     */
    if (this.selectedProvince) {
      this.applyProvinceSelectionStyle(
        this.selectedProvince
      );
    }

    this.bringOperationalLayersToFront();
  }

  /**
   * Selects and highlights a Province.
   *
   * @param {object|null} province
   * @param {object} [options]
   * @param {boolean} [options.zoom=true]
   * @param {boolean} [options.openPopup=false]
   * @param {boolean} [options.notify=true]
   */
  selectProvince(province, options = {}) {
    const {
      zoom = true,
      openPopup = false,
      notify = true
    } = options;

    this.selectedProvince =
      province ?? null;

    this.selectedFmu = null;

    this.resetProvinceStyles();
    this.resetFmuStyles();

    if (!province) {
      this.clearFmuData();

      if (notify) {
        this.emitStatus(
          "Province selection cleared."
        );
      }

      return;
    }

    this.applyProvinceSelectionStyle(
      province
    );

    const featureLayer =
      this.getProvinceFeatureLayer(province);

    if (featureLayer) {
      if (zoom) {
        this.fitLayerBounds(
          featureLayer,
          this.config.province.selection
        );
      }

      if (openPopup) {
        featureLayer.openPopup();
      }
    } else if (zoom) {
      /*
       * Geometry may be absent when fallback Province records
       * are being used.
       */
      this.emitStatus(
        `Selected Province: ${province.name}. ` +
        "No client-side Province geometry is available."
      );
    }

    this.updateMapSubtitle(
      province.name || "Province"
    );

    if (notify) {
      this.emitStatus(
        `Province selected: ${province.name}`
      );
    }
  }

  /**
   * Returns Leaflet GeoJSON styling for Province features.
   */
  getProvinceGeoJsonOptions() {
    return {
      style: () =>
        this.cloneStyle(
          this.config.map.styles.province
        ),

      onEachFeature: (feature, layer) => {
        const record =
          this.findRecordForFeature(
            feature,
            this.provinces
          );

        if (record) {
          this.provinceFeatureLayers.set(
            this.normalizeRecordKey(record.id),
            layer
          );
        }

        layer.bindTooltip(
          this.buildProvinceTooltip(record),
          {
            sticky: true,
            direction: "auto",
            opacity: 0.94
          }
        );

        layer.bindPopup(
          this.buildProvincePopup(record),
          {
            maxWidth: 320
          }
        );

        layer.on({
          click: (event) => {
            L.DomEvent.stopPropagation(event);

            if (!record) {
              return;
            }

            this.callbacks.onProvinceSelect(
              record,
              {
                source: "map",
                originalEvent: event
              }
            );
          },

          mouseover: () => {
            if (
              !record ||
              this.isSelectedProvince(record)
            ) {
              return;
            }

            layer.setStyle({
              weight:
                Math.max(
                  2.5,
                  Number(
                    this.config.map.styles
                      .province.weight
                  ) + 1
                ),

              fillOpacity:
                Math.min(
                  0.45,
                  Number(
                    this.config.map.styles
                      .province.fillOpacity
                  ) + 0.12
                )
            });
          },

          mouseout: () => {
            if (
              !record ||
              this.isSelectedProvince(record)
            ) {
              return;
            }

            layer.setStyle(
              this.cloneStyle(
                this.config.map.styles.province
              )
            );
          }
        });
      }
    };
  }

  /**
   * Applies Province selection styling.
   */
  applyProvinceSelectionStyle(province) {
    const layer =
      this.getProvinceFeatureLayer(province);

    if (!layer) {
      return;
    }

    layer.setStyle(
      this.cloneStyle(
        this.config.map.styles.selectedProvince
      )
    );

    if (typeof layer.bringToFront === "function") {
      layer.bringToFront();
    }
  }

  /**
   * Restores default Province styling.
   */
  resetProvinceStyles() {
    if (!this.provinceGeoJsonLayer) {
      return;
    }

    this.provinceGeoJsonLayer.eachLayer(
      (layer) => {
        if (
          typeof layer.setStyle === "function"
        ) {
          layer.setStyle(
            this.cloneStyle(
              this.config.map.styles.province
            )
          );
        }
      }
    );
  }

  /* ==========================================================
   * 6. FMU display
   * ==========================================================
   */

  /**
   * Displays FMUs for the selected Province.
   *
   * @param {object[]} fmus
   * @param {object} [options]
   * @param {boolean} [options.fit=false]
   */
  setFmuData(fmus, options = {}) {
    const {
      fit = false
    } = options;

    this.fmus =
      Array.isArray(fmus)
        ? [...fmus]
        : [];

    this.selectedFmu = null;
    this.fmuFeatureLayers.clear();

    if (!this.fmuGeoJsonLayer) {
      return;
    }

    this.fmuGeoJsonLayer.clearLayers();

    const featureCollection =
      recordsToFeatureCollection(this.fmus);

    if (featureCollection.features.length > 0) {
      this.fmuGeoJsonLayer.addData(
        featureCollection
      );
    }

    if (
      this.fmus.length > 0 &&
      featureCollection.features.length > 0
    ) {
      if (
        !this.map.hasLayer(
          this.fmuGeoJsonLayer
        )
      ) {
        this.fmuGeoJsonLayer.addTo(this.map);
      }

      if (fit) {
        this.fitLayerBounds(
          this.fmuGeoJsonLayer,
          this.config.fmu.selection
        );
      }
    } else {
      /*
       * Remove an empty FMU layer to avoid intercepting map
       * interactions.
       */
      if (
        this.map.hasLayer(
          this.fmuGeoJsonLayer
        )
      ) {
        this.map.removeLayer(
          this.fmuGeoJsonLayer
        );
      }
    }

    this.bringOperationalLayersToFront();
  }

  /**
   * Removes all current FMUs from the map.
   */
  clearFmuData() {
    this.fmus = [];
    this.selectedFmu = null;
    this.fmuFeatureLayers.clear();

    if (this.fmuGeoJsonLayer) {
      this.fmuGeoJsonLayer.clearLayers();

      if (
        this.map?.hasLayer(
          this.fmuGeoJsonLayer
        )
      ) {
        this.map.removeLayer(
          this.fmuGeoJsonLayer
        );
      }
    }
  }

  /**
   * Selects and highlights an FMU.
   *
   * @param {object|null} fmu
   * @param {object} [options]
   * @param {boolean} [options.zoom=true]
   * @param {boolean} [options.openPopup=true]
   * @param {boolean} [options.notify=true]
   */
  selectFmu(fmu, options = {}) {
    const {
      zoom = true,
      openPopup = true,
      notify = true
    } = options;

    this.selectedFmu =
      fmu ?? null;

    this.resetFmuStyles();

    if (!fmu) {
      if (notify) {
        this.emitStatus(
          "FMU selection cleared."
        );
      }

      return;
    }

    this.applyFmuSelectionStyle(fmu);

    const featureLayer =
      this.getFmuFeatureLayer(fmu);

    if (featureLayer) {
      if (zoom) {
        this.fitLayerBounds(
          featureLayer,
          this.config.fmu.selection
        );
      }

      if (openPopup) {
        featureLayer.openPopup();
      }
    } else if (zoom) {
      this.emitStatus(
        `Selected FMU: ${fmu.name}. ` +
        "No client-side FMU geometry is available."
      );
    }

    if (notify) {
      this.emitStatus(
        `FMU selected: ${fmu.name || fmu.code}`
      );
    }
  }

  /**
   * Returns Leaflet GeoJSON styling and events for FMUs.
   */
  getFmuGeoJsonOptions() {
    return {
      style: () =>
        this.cloneStyle(
          this.config.map.styles.fmu
        ),

      onEachFeature: (feature, layer) => {
        const record =
          this.findRecordForFeature(
            feature,
            this.fmus
          );

        if (record) {
          this.fmuFeatureLayers.set(
            this.normalizeRecordKey(record.id),
            layer
          );
        }

        layer.bindTooltip(
          this.buildFmuTooltip(record),
          {
            sticky: true,
            direction: "auto",
            opacity: 0.94
          }
        );

        layer.bindPopup(
          this.buildFmuPopup(record),
          {
            maxWidth: 360
          }
        );

        layer.on({
          click: (event) => {
            L.DomEvent.stopPropagation(event);

            if (!record) {
              return;
            }

            this.callbacks.onFmuSelect(
              record,
              {
                source: "map",
                originalEvent: event
              }
            );
          },

          mouseover: () => {
            if (
              !record ||
              this.isSelectedFmu(record)
            ) {
              return;
            }

            layer.setStyle({
              weight:
                Math.max(
                  2.5,
                  Number(
                    this.config.map.styles
                      .fmu.weight
                  ) + 1
                ),

              fillOpacity:
                Math.min(
                  0.52,
                  Number(
                    this.config.map.styles
                      .fmu.fillOpacity
                  ) + 0.15
                )
            });
          },

          mouseout: () => {
            if (
              !record ||
              this.isSelectedFmu(record)
            ) {
              return;
            }

            layer.setStyle(
              this.cloneStyle(
                this.config.map.styles.fmu
              )
            );
          }
        });
      }
    };
  }

  /**
   * Applies selected FMU styling.
   */
  applyFmuSelectionStyle(fmu) {
    const layer =
      this.getFmuFeatureLayer(fmu);

    if (!layer) {
      return;
    }

    layer.setStyle(
      this.cloneStyle(
        this.config.map.styles.selectedFmu
      )
    );

    if (typeof layer.bringToFront === "function") {
      layer.bringToFront();
    }
  }

  /**
   * Restores default FMU styling.
   */
  resetFmuStyles() {
    if (!this.fmuGeoJsonLayer) {
      return;
    }

    this.fmuGeoJsonLayer.eachLayer(
      (layer) => {
        if (
          typeof layer.setStyle === "function"
        ) {
          layer.setStyle(
            this.cloneStyle(
              this.config.map.styles.fmu
            )
          );
        }
      }
    );
  }

  /* ==========================================================
   * 7. WMS layers
   * ==========================================================
   */

  /**
   * Creates a configured GeoServer WMS layer.
   *
   * @param {string} layerKey
   * @returns {L.TileLayer.WMS|null}
   */
  createWmsLayer(layerKey) {
    if (!this.map || this.destroyed) {
      return null;
    }

    const definition =
      getLayerConfig(layerKey);

    if (
      !definition ||
      definition.enabled === false
    ) {
      return null;
    }

    const qualifiedName =
      getQualifiedLayerName(definition);

    if (!qualifiedName) {
      return null;
    }

    const wmsUrl =
      getWmsUrl();

    if (!wmsUrl) {
      return null;
    }

    const layer = L.tileLayer.wms(
      wmsUrl,
      {
        layers: qualifiedName,
        format:
          this.config.geoserver.services.wms
            .format,

        transparent:
          this.config.geoserver.services.wms
            .transparent,

        version:
          this.config.geoserver.services.wms
            .version,

        tiled:
          this.config.geoserver.services.wms
            .tiled,

        opacity:
          definition.opacity ?? 1,

        pane:
          this.getOrCreateWmsPane(
            layerKey,
            definition.zIndex
          ),

        attribution:
          "PNG Forest Authority FIMS"
      }
    );

    layer.on("tileerror", (event) => {
      this.handleWmsTileError(
        layerKey,
        event
      );
    });

    return layer;
  }

  /**
   * Shows or hides a configured WMS layer.
   *
   * @param {string} layerKey
   * @param {boolean} visible
   * @param {object} [options]
   * @param {boolean} [options.notify=true]
   * @returns {boolean}
   */
  setWmsLayerVisible(
    layerKey,
    visible,
    options = {}
  ) {
    const {
      notify = true
    } = options;

    if (!this.map) {
      return false;
    }

    const definition =
      getLayerConfig(layerKey);

    if (!definition) {
      if (notify) {
        this.emitStatus(
          `Unknown map layer: ${layerKey}`
        );
      }

      return false;
    }

    let layer =
      this.wmsLayers.get(layerKey);

    if (visible && !layer) {
      layer = this.createWmsLayer(
        layerKey
      );

      if (!layer) {
        if (notify) {
          this.emitStatus(
            `Layer '${definition.label}' is not available.`
          );
        }

        return false;
      }

      this.wmsLayers.set(
        layerKey,
        layer
      );
    }

    if (
      visible &&
      layer &&
      !this.map.hasLayer(layer)
    ) {
      layer.addTo(this.map);

      if (notify) {
        this.emitStatus(
          `${definition.label} displayed.`
        );
      }
    }

    if (
      !visible &&
      layer &&
      this.map.hasLayer(layer)
    ) {
      this.map.removeLayer(layer);

      if (notify) {
        this.emitStatus(
          `${definition.label} hidden.`
        );
      }
    }

    this.syncLayerControlState(
      layerKey,
      visible
    );

    this.bringOperationalLayersToFront();

    return true;
  }

  /**
   * Forces a WMS layer to request fresh tiles after a database update.
   *
   * @param {string} layerKey
   * @returns {boolean}
   */
  refreshWmsLayer(layerKey) {
    let layer = this.wmsLayers.get(layerKey);

    if (!layer) {
      layer = this.createWmsLayer(layerKey);

      if (!layer) {
        return false;
      }

      this.wmsLayers.set(layerKey, layer);
    }

    if (typeof layer.setParams === "function") {
      layer.setParams(
        {
          _fimsRefresh: Date.now()
        },
        false
      );
    }

    if (typeof layer.redraw === "function") {
      layer.redraw();
    }

    return true;
  }

  /**
   * Applies a CQL filter to an existing or future WMS layer.
   *
   * @param {string} layerKey
   * @param {string|null} cqlFilter
   * @returns {boolean}
   */
  setWmsLayerFilter(
    layerKey,
    cqlFilter
  ) {
    if (!this.map || this.destroyed) {
      return false;
    }

    let layer =
      this.wmsLayers.get(layerKey);

    if (!layer) {
      layer = this.createWmsLayer(layerKey);

      if (!layer) {
        return false;
      }

      this.wmsLayers.set(layerKey, layer);
    }

    if (
      typeof layer.setParams === "function"
    ) {
      layer.setParams(
        {
          CQL_FILTER:
            cqlFilter || "INCLUDE"
        },
        false
      );

      if (
        typeof layer.redraw === "function"
      ) {
        layer.redraw();
      }
    }

    return true;
  }

  /**
   * Compatibility alias for previous map.js.
   */
  setLayerVisible(
    layerKey,
    visible,
    options = {}
  ) {
    return this.setWmsLayerVisible(
      layerKey,
      visible,
      options
    );
  }

  /**
   * Returns whether a WMS layer is currently visible.
   */
  isWmsLayerVisible(layerKey) {
    const layer =
      this.wmsLayers.get(layerKey);

    return Boolean(
      layer &&
      this.map?.hasLayer(layer)
    );
  }

  /**
   * Hides all WMS overlays.
   */
  clearWmsOverlays(options = {}) {
    const {
      notify = true
    } = options;

    for (
      const [layerKey, layer]
      of this.wmsLayers.entries()
    ) {
      if (
        layer &&
        this.map.hasLayer(layer)
      ) {
        this.map.removeLayer(layer);
      }

      this.syncLayerControlState(
        layerKey,
        false
      );
    }

    if (notify) {
      this.emitStatus(
        "All WMS overlays cleared."
      );
    }
  }

  /**
   * Compatibility alias for previous map.js.
   */
  clearOverlays() {
    this.clearWmsOverlays();
  }

  /**
   * Creates a Leaflet pane for one WMS layer.
   */
  getOrCreateWmsPane(
    layerKey,
    zIndex = 250
  ) {
    const paneName =
      `fims-wms-${layerKey}`;

    let pane =
      this.map.getPane(paneName);

    if (!pane) {
      pane =
        this.map.createPane(paneName);

      pane.style.zIndex =
        String(
          Number.isFinite(Number(zIndex))
            ? Number(zIndex)
            : 250
        );

      pane.style.pointerEvents = "none";
    }

    return paneName;
  }

  /* ==========================================================
   * 8. Compact layer controls
   * ==========================================================
   */

  /**
   * Builds the compact layer controls in index.html.
   *
   * @param {string|null} [containerId]
   */
  renderLayerControls(
    containerId =
      this.config.provinceScreen.elements
        .layerList ||
      "layer-list"
  ) {
    const container =
      document.getElementById(
        containerId
      );

    if (!container) {
      return;
    }

    container.replaceChildren();

    for (
      const layerKey
      of this.config.map.layerOrder ?? []
    ) {
      const definition =
        getLayerConfig(layerKey);

      if (
        !definition ||
        definition.enabled === false
      ) {
        continue;
      }

      const label =
        document.createElement("label");

      label.className =
        "compact-layer-option";

      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.dataset.layerKey =
        layerKey;

      checkbox.checked =
        this.isWmsLayerVisible(layerKey);

      checkbox.addEventListener(
        "change",
        () => {
          this.setWmsLayerVisible(
            layerKey,
            checkbox.checked
          );
        }
      );

      const text =
        document.createElement("span");

      text.textContent =
        definition.label;

      label.append(
        checkbox,
        text
      );

      container.appendChild(label);
    }
  }

  /**
   * Synchronizes a layer-control checkbox.
   */
  syncLayerControlState(
    layerKey,
    visible
  ) {
    const checkbox =
      document.querySelector(
        `input[data-layer-key="${this.escapeSelector(
          layerKey
        )}"]`
      );

    if (checkbox) {
      checkbox.checked =
        Boolean(visible);
    }
  }

  /* ==========================================================
   * 9. Extent and selection
   * ==========================================================
   */

  /**
   * Fits the map to a Concession GeoJSON geometry.
   *
   * @param {object|null} concession
   * @returns {boolean}
   */
  zoomToConcession(concession) {
    const geometry =
      concession?.geometry ??
      concession?.raw?.geometry ??
      concession?.properties?.geometry ??
      null;

    if (!geometry || typeof L === "undefined") {
      return false;
    }

    try {
      const layer = L.geoJSON({
        type: "Feature",
        properties: {},
        geometry
      });

      const fitted = this.fitLayerBounds(
        layer,
        this.config.concession?.selection ??
        this.config.province?.selection ??
        {}
      );

      if (fitted) {
        this.updateMapSubtitle(
          concession?.name || "Concession"
        );
      }

      return fitted;
    } catch (error) {
      this.emitError(
        "Concession extent could not be displayed.",
        error
      );
      return false;
    }
  }

  /**
   * Returns to the configured Papua New Guinea extent.
   *
   * @param {object} [options]
   * @param {boolean} [options.notify=true]
   * @param {boolean} [options.animate=true]
   */
  zoomToPng(options = {}) {
    const {
      notify = true,
      animate = true
    } = options;

    if (!this.map) {
      return;
    }

    this.refreshSize();

    const bounds =
      this.createLatLngBounds(
        this.config.map.pngBounds
      );

    if (!bounds?.isValid()) {
      this.map.setView(
        this.config.map.center,
        this.config.map.zoom,
        {
          animate
        }
      );
    } else {
      this.map.fitBounds(bounds, {
        padding:
          this.config.map.fitBoundsPadding,

        animate
      });
    }

    this.updateMapSubtitle(
      "Papua New Guinea"
    );

    if (notify) {
      this.emitStatus(
        "Map returned to Papua New Guinea extent."
      );
    }
  }

  /**
   * Clears map feature selections.
   *
   * @param {object} [options]
   * @param {boolean} [options.clearProvince=false]
   * @param {boolean} [options.clearFmus=false]
   * @param {boolean} [options.zoomToPng=false]
   * @param {boolean} [options.notify=true]
   */
  clearSelection(options = {}) {
    const {
      clearProvince = false,
      clearFmus = false,
      zoomToPng = false,
      notify = true
    } = options;

    this.selectedFmu = null;
    this.resetFmuStyles();

    if (clearProvince) {
      this.selectedProvince = null;
      this.resetProvinceStyles();
    }

    if (clearFmus) {
      this.clearFmuData();
    }

    this.closePopup();

    if (zoomToPng) {
      this.zoomToPng({
        notify: false
      });
    }

    if (notify) {
      this.emitStatus(
        "Map selection cleared."
      );
    }
  }

  /**
   * Fits the map to a Leaflet feature or group.
   */
  fitLayerBounds(
    layer,
    selectionConfiguration = {}
  ) {
    if (
      !layer ||
      typeof layer.getBounds !== "function"
    ) {
      return false;
    }

    const bounds =
      layer.getBounds();

    if (!bounds?.isValid()) {
      return false;
    }

    this.refreshSize();

    this.map.fitBounds(bounds, {
      padding:
        selectionConfiguration
          .fitBoundsPadding ??
        this.config.map.fitBoundsPadding,

      maxZoom:
        selectionConfiguration.maximumZoom ??
        this.config.map.maxZoom,

      animate: true
    });

    return true;
  }

  /* ==========================================================
   * 10. Popup and tooltip content
   * ==========================================================
   */

  /**
   * Creates Province tooltip content.
   */
  buildProvinceTooltip(province) {
    if (!province) {
      return "Province";
    }

    const code =
      this.displayValue(
        province.code
      );

    const name =
      this.escapeHtml(
        province.name || "Province"
      );

    return (
      `<strong>${name}</strong>` +
      (
        code !== "—"
          ? `<br>Code: ${this.escapeHtml(code)}`
          : ""
      )
    );
  }

  /**
   * Creates Province popup content.
   */
  buildProvincePopup(province) {
    if (!province) {
      return (
        '<div class="map-popup">' +
        "<strong>Province</strong>" +
        "</div>"
      );
    }

    return (
      '<div class="map-popup">' +
        `<strong>${this.escapeHtml(
          province.name || "Province"
        )}</strong>` +
        '<table class="map-popup-table">' +
          this.popupRow(
            "Province Code",
            province.code
          ) +
          this.popupRow(
            "Province Area",
            this.formatArea(province.area)
          ) +
        "</table>" +
      "</div>"
    );
  }

  /**
   * Creates FMU tooltip content.
   */
  buildFmuTooltip(fmu) {
    if (!fmu) {
      return "FMU";
    }

    const heading =
      fmu.name ||
      fmu.code ||
      "FMU";

    const zone =
      this.displayValue(fmu.zone);

    return (
      `<strong>${this.escapeHtml(
        heading
      )}</strong>` +
      (
        zone !== "—"
          ? `<br>Zone: ${this.escapeHtml(zone)}`
          : ""
      )
    );
  }

  /**
   * Creates FMU popup content.
   */
  buildFmuPopup(fmu) {
    if (!fmu) {
      return (
        '<div class="map-popup">' +
        "<strong>FMU</strong>" +
        "</div>"
      );
    }

    return (
      '<div class="map-popup">' +
        `<strong>${this.escapeHtml(
          fmu.name ||
          fmu.code ||
          "FMU"
        )}</strong>` +
        '<table class="map-popup-table">' +
          this.popupRow(
            "FMU Code",
            fmu.code
          ) +
          this.popupRow(
            "Province",
            fmu.provinceName
          ) +
          this.popupRow(
            "Zone",
            fmu.zone
          ) +
          this.popupRow(
            "Vegetation Type",
            fmu.vegetationType
          ) +
          this.popupRow(
            "Area",
            this.formatArea(fmu.area)
          ) +
          this.popupRow(
            "Timber Volume",
            this.formatVolume(
              fmu.timberVolume
            )
          ) +
        "</table>" +
      "</div>"
    );
  }

  /**
   * Creates one safe popup table row.
   */
  popupRow(label, value) {
    return (
      "<tr>" +
        `<th>${this.escapeHtml(label)}</th>` +
        `<td>${this.escapeHtml(
          this.displayValue(value)
        )}</td>` +
      "</tr>"
    );
  }

  /* ==========================================================
   * 11. Record and feature lookup
   * ==========================================================
   */

  /**
   * Resolves a normalized record from a GeoJSON feature.
   */
  findRecordForFeature(
    feature,
    records
  ) {
    if (
      !feature ||
      !Array.isArray(records)
    ) {
      return null;
    }

    const properties =
      feature.properties ?? {};

    const normalizedId =
      properties.__normalizedId;

    const normalizedCode =
      properties.__normalizedCode;

    const featureId =
      feature.id;

    return (
      records.find(
        (record) =>
          this.valuesEqual(
            record.id,
            normalizedId
          )
      ) ||
      records.find(
        (record) =>
          this.valuesEqual(
            record.code,
            normalizedCode
          )
      ) ||
      records.find(
        (record) =>
          this.valuesEqual(
            record.featureId,
            featureId
          )
      ) ||
      null
    );
  }

  /**
   * Returns the Leaflet layer for a Province record.
   */
  getProvinceFeatureLayer(province) {
    if (!province) {
      return null;
    }

    return (
      this.provinceFeatureLayers.get(
        this.normalizeRecordKey(
          province.id
        )
      ) ||
      this.findFeatureLayerByRecord(
        this.provinceGeoJsonLayer,
        province
      )
    );
  }

  /**
   * Returns the Leaflet layer for an FMU record.
   */
  getFmuFeatureLayer(fmu) {
    if (!fmu) {
      return null;
    }

    return (
      this.fmuFeatureLayers.get(
        this.normalizeRecordKey(
          fmu.id
        )
      ) ||
      this.findFeatureLayerByRecord(
        this.fmuGeoJsonLayer,
        fmu
      )
    );
  }

  /**
   * Searches a GeoJSON layer group for a record.
   */
  findFeatureLayerByRecord(
    group,
    record
  ) {
    if (
      !group ||
      !record
    ) {
      return null;
    }

    let result = null;

    group.eachLayer((layer) => {
      if (result) {
        return;
      }

      const feature =
        layer.feature;

      const normalizedId =
        feature?.properties
          ?.__normalizedId;

      const normalizedCode =
        feature?.properties
          ?.__normalizedCode;

      if (
        this.valuesEqual(
          record.id,
          normalizedId
        ) ||
        this.valuesEqual(
          record.code,
          normalizedCode
        )
      ) {
        result = layer;
      }
    });

    return result;
  }

  /**
   * Checks whether a Province is selected.
   */
  isSelectedProvince(province) {
    return Boolean(
      this.selectedProvince &&
      province &&
      (
        this.valuesEqual(
          this.selectedProvince.id,
          province.id
        ) ||
        this.valuesEqual(
          this.selectedProvince.code,
          province.code
        )
      )
    );
  }

  /**
   * Checks whether an FMU is selected.
   */
  isSelectedFmu(fmu) {
    return Boolean(
      this.selectedFmu &&
      fmu &&
      (
        this.valuesEqual(
          this.selectedFmu.id,
          fmu.id
        ) ||
        this.valuesEqual(
          this.selectedFmu.code,
          fmu.code
        )
      )
    );
  }

  /* ==========================================================
   * 12. Base maps
   * ==========================================================
   */

  /**
   * Selects a configured base map.
   *
   * @param {string} key
   * @returns {boolean}
   */
  setBaseMap(key) {
    const requested =
      this.baseLayers.get(key);

    if (!requested) {
      return false;
    }

    for (
      const { layer }
      of this.baseLayers.values()
    ) {
      if (
        layer &&
        this.map.hasLayer(layer)
      ) {
        this.map.removeLayer(layer);
      }
    }

    requested.layer.addTo(this.map);
    this.activeBaseMapKey = key;

    this.bringOperationalLayersToFront();

    return true;
  }

  /**
   * Finds a base-map key from its Leaflet layer.
   */
  findBaseMapKeyByLayer(layer) {
    for (
      const [key, item]
      of this.baseLayers.entries()
    ) {
      if (item.layer === layer) {
        return key;
      }
    }

    return null;
  }

  /* ==========================================================
   * 13. Visual state
   * ==========================================================
   */

  /**
   * Shows or hides the map loading overlay.
   */
  setMapLoading(
    loading,
    message = "Loading map…"
  ) {
    const elementId =
      this.config.provinceScreen.elements
        .mapLoading ||
      "map-loading";

    const element =
      document.getElementById(
        elementId
      );

    if (!element) {
      return;
    }

    element.textContent = message;
    element.hidden =
      !Boolean(loading);
  }

  /**
   * Displays or clears the map error overlay.
   */
  setMapError(message) {
    const elementId =
      this.config.provinceScreen.elements
        .mapError ||
      "map-error";

    const element =
      document.getElementById(
        elementId
      );

    if (!element) {
      return;
    }

    if (!message) {
      element.hidden = true;
      element.textContent =
        "The map could not be displayed.";
      return;
    }

    element.textContent =
      String(message);

    element.hidden = false;
  }

  /**
   * Updates the map panel subtitle.
   */
  updateMapSubtitle(text) {
    const element =
      document.getElementById(
        "map-subtitle"
      );

    if (element) {
      element.textContent =
        text || "Papua New Guinea";
    }
  }

  /**
   * Brings interactive Province/FMU vectors above WMS layers.
   */
  bringOperationalLayersToFront() {
    if (
      this.provinceGeoJsonLayer &&
      this.map?.hasLayer(
        this.provinceGeoJsonLayer
      )
    ) {
      this.provinceGeoJsonLayer
        .bringToFront();
    }

    if (
      this.fmuGeoJsonLayer &&
      this.map?.hasLayer(
        this.fmuGeoJsonLayer
      )
    ) {
      this.fmuGeoJsonLayer
        .bringToFront();
    }
  }

  /**
   * Closes the current Leaflet popup.
   */
  closePopup() {
    if (this.map) {
      this.map.closePopup();
    }
  }

  /* ==========================================================
   * 14. Formatting and utility methods
   * ==========================================================
   */

  cloneStyle(style) {
    return {
      ...(style ?? {})
    };
  }

  createLatLngBounds(bounds) {
    if (
      !Array.isArray(bounds) ||
      bounds.length !== 2
    ) {
      return null;
    }

    try {
      return L.latLngBounds(
        bounds
      );
    } catch {
      return null;
    }
  }

  displayValue(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return (
        this.config.data?.emptyValue ||
        "—"
      );
    }

    return String(value);
  }

  formatArea(value) {
    const number =
      this.toNullableNumber(value);

    if (number === null) {
      return "—";
    }

    return (
      this.formatNumber(number, 2) +
      " ha"
    );
  }

  formatVolume(value) {
    const number =
      this.toNullableNumber(value);

    if (number === null) {
      return "—";
    }

    return (
      this.formatNumber(number, 2) +
      " m³"
    );
  }

  formatNumber(
    value,
    maximumFractionDigits = 2
  ) {
    const number =
      this.toNullableNumber(value);

    if (number === null) {
      return "—";
    }

    return new Intl.NumberFormat(
      this.config.data?.numberFormat
        ?.locale ||
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits
      }
    ).format(number);
  }

  toNullableNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? value
        : null;
    }

    const number =
      Number(
        String(value)
          .trim()
          .replace(/,/g, "")
      );

    return Number.isFinite(number)
      ? number
      : null;
  }

  normalizeRecordKey(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .trim()
      .toLocaleLowerCase("en");
  }

  valuesEqual(left, right) {
    if (
      left === null ||
      left === undefined ||
      right === null ||
      right === undefined
    ) {
      return false;
    }

    const leftNumber =
      this.toNullableNumber(left);

    const rightNumber =
      this.toNullableNumber(right);

    if (
      leftNumber !== null &&
      rightNumber !== null
    ) {
      return leftNumber === rightNumber;
    }

    return (
      this.normalizeRecordKey(left) ===
      this.normalizeRecordKey(right)
    );
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  escapeSelector(value) {
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.escape === "function"
    ) {
      return CSS.escape(
        String(value)
      );
    }

    return String(value)
      .replace(
        /["\\]/g,
        "\\$&"
      );
  }

  emitStatus(message) {
    this.callbacks.onStatus(
      String(message)
    );
  }

  /**
   * Handles WMS tile failures without terminating the map.
   */
  handleWmsTileError(
    layerKey,
    event
  ) {
    const definition =
      getLayerConfig(layerKey);

    if (
      this.config.debug?.enabled
    ) {
      console.warn(
        `[FIMS map] WMS tile error: ${layerKey}`,
        event
      );
    }

    this.callbacks.onError(
      new WmsLayerError(
        `WMS layer '${definition?.label || layerKey}' could not be loaded.`
      ),
      {
        layerKey,
        event
      }
    );
  }

  /**
   * Handles serious map errors.
   */
  handleError(message, error) {
    console.error(
      `[FIMS map] ${message}`,
      error
    );

    this.setMapLoading(false);
    this.setMapError(message);

    this.callbacks.onError(
      error,
      {
        message
      }
    );

    this.emitStatus(message);
  }

  /* ==========================================================
   * 15. Public state
   * ==========================================================
   */

  /**
   * Returns a safe snapshot of map state.
   */
  getState() {
    return {
      initialized:
        this.initialized,

      destroyed:
        this.destroyed,

      selectedProvince:
        this.selectedProvince,

      selectedFmu:
        this.selectedFmu,

      provinceCount:
        this.provinces.length,

      fmuCount:
        this.fmus.length,

      activeBaseMapKey:
        this.activeBaseMapKey,

      visibleWmsLayers:
        [...this.wmsLayers.keys()].filter(
          (key) =>
            this.isWmsLayerVisible(key)
        )
    };
  }

  /**
   * Returns the underlying Leaflet map when required.
   */
  getLeafletMap() {
    return this.map;
  }

  /* ==========================================================
   * 16. Cleanup
   * ==========================================================
   */

  /**
   * Destroys the map and releases observers/events.
   */
  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.windowResizeHandler) {
      window.removeEventListener(
        "resize",
        this.windowResizeHandler
      );
    }

    if (this.windowLoadHandler) {
      window.removeEventListener(
        "load",
        this.windowLoadHandler
      );
    }

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }

    this.baseLayers.clear();
    this.wmsLayers.clear();
    this.provinceFeatureLayers.clear();
    this.fmuFeatureLayers.clear();

    this.provinces = [];
    this.fmus = [];

    this.provinceGeoJsonLayer = null;
    this.fmuGeoJsonLayer = null;

    this.selectedProvince = null;
    this.selectedFmu = null;

    this.initialized = false;
  }
}

/* ============================================================
 * 17. Factory function
 * ============================================================
 */

/**
 * Creates a FimsMap instance.
 *
 * app.js may use either:
 *
 *   new FimsMap({...})
 *
 * or:
 *
 *   createFimsMap({...})
 *
 * @param {object} options
 * @returns {FimsMap}
 */
export function createFimsMap(options = {}) {
  return new FimsMap(options);
}

/* ============================================================
 * 18. Error classes
 * ============================================================
 */

export class MapInitializationError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "MapInitializationError";
  }
}

export class WmsLayerError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "WmsLayerError";
  }
}
