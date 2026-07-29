export class FimsMap {
  constructor({ elementId, config, onCoordinate, onStatus }) {
    this.config = config;
    this.onCoordinate = onCoordinate;
    this.onStatus = onStatus;

    this.map = L.map(elementId, {
      center: config.map.center,
      zoom: config.map.zoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom,
      zoomControl: true
    });

    this.overlays = new Map();

    this.initializeBaseMap();
    this.bindMapEvents();
    this.observeMapSize(elementId);
  }

  initializeBaseMap() {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors"
    }).addTo(this.map);

    L.control.scale({
      metric: true,
      imperial: false
    }).addTo(this.map);
  }

  observeMapSize(elementId) {
    const mapElement = document.getElementById(elementId);

    if (!mapElement) {
      return;
    }

    const refreshMapSize = () => {
      window.requestAnimationFrame(() => {
        this.map.invalidateSize({
          animate: false,
          pan: false
        });
      });
    };

    window.addEventListener("load", refreshMapSize);
    window.addEventListener("resize", refreshMapSize);

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(refreshMapSize);
      this.resizeObserver.observe(mapElement);
    }

    window.setTimeout(refreshMapSize, 100);
    window.setTimeout(refreshMapSize, 500);
  }

  bindMapEvents() {
    this.map.on("mousemove", ({ latlng }) => {
      this.onCoordinate(
        `Lat: ${latlng.lat.toFixed(5)} / Lon: ${latlng.lng.toFixed(5)}`
      );
    });

    this.map.on("mouseout", () => {
      this.onCoordinate("Lat: — / Lon: —");
    });
  }

  getLayerDefinition(key) {
    return this.config.layers.find((layer) => layer.key === key) || null;
  }

  getQualifiedLayerName(layer) {
    if (!layer) return null;

    return layer.name.includes(":")
      ? layer.name
      : `${this.config.geoserver.workspace}:${layer.name}`;
  }

  createWmsLayer(key) {
    const layer = this.getLayerDefinition(key);
    const url = this.config.geoserver.wmsUrl;

    if (!url || !layer) return null;

    return L.tileLayer.wms(url, {
      layers: this.getQualifiedLayerName(layer),
      format: "image/png",
      transparent: true,
      version: this.config.geoserver.version,
      tiled: true,
      attribution: "PNGFA FIMS"
    });
  }

  setLayerVisible(key, visible) {
    let layer = this.overlays.get(key);

    if (!layer && visible) {
      layer = this.createWmsLayer(key);

      if (!layer) {
        this.onStatus(
          `Layer '${key}' is not connected. Configure js/config.js.`
        );
        return false;
      }

      this.overlays.set(key, layer);
    }

    if (visible && layer && !this.map.hasLayer(layer)) {
      layer.addTo(this.map);
      this.onStatus(
        `${this.getLayerDefinition(key)?.label || key} displayed`
      );
    } else if (!visible && layer && this.map.hasLayer(layer)) {
      this.map.removeLayer(layer);
      this.onStatus(
        `${this.getLayerDefinition(key)?.label || key} hidden`
      );
    }

    return true;
  }

  clearOverlays() {
    this.overlays.forEach((layer) => {
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });

    this.onStatus("All FIMS overlays cleared");
  }

  zoomToPng() {
    this.map.invalidateSize({
      animate: false,
      pan: false
    });

    this.map.fitBounds(this.config.map.pngBounds);

    this.onStatus("Map returned to Papua New Guinea extent");
  }
}
