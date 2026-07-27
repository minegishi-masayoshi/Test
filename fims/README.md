# FIMS Cloud Ver.1.0.0

Production-oriented GitHub Pages structure for the FIMS Cloud top page.

## Structure

- `index.html`: application shell only
- `css/main.css`: common layout and responsive design
- `js/config.js`: environment, GeoServer and layer configuration
- `js/app.js`: application initialization and UI coordination
- `js/map.js`: Leaflet and GeoServer WMS integration
- `js/menu.js`: main-menu definitions and rendering
- `js/summary.js`: clickable Summary definitions and rendering
- `views/`: reserved for future functional screens
- `assets/`: reserved for PNGFA logo, icons and images
- `docs/`: implementation notes

## GeoServer setup

Edit `js/config.js`:

```javascript
geoserver: {
  wmsUrl: "https://YOUR-OCI-HOST/geoserver/fims/wms",
  workspace: "fims",
  version: "1.1.1"
}
```

Replace the layer `name` values with the actual GeoServer layer names.

## Current scope

- Authentication is disabled for the current MVP.
- OpenStreetMap is used as a temporary base map.
- FIMS overlays are loaded from GeoServer WMS when configured.
- Summary cards are clickable.
- Counts remain placeholders until a FIMS API is connected.
