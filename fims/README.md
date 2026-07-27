# FIMS Cloud MVP Ver.0.1

This folder contains the first GitHub Pages prototype for the FIMS Cloud top page.

## Files

- `index.html`: FIMS top page
- `style.css`: responsive layout and visual design
- `app.js`: Supabase session check, Leaflet map, menu, summary cards and WMS controls
- `config.js`: URLs, map settings and GeoServer layer names

## GeoServer connection

Edit `config.js` and set `geoserverWmsUrl`.

```javascript
geoserverWmsUrl: "https://YOUR-OCI-HOST/geoserver/fims/wms"
```

Then replace the layer names in `layers` with the actual GeoServer workspace/layer names.

## Current behavior

- Uses the same Supabase login session as the root portal.
- Redirects unauthenticated users to `../index.html`.
- Displays OpenStreetMap as the temporary base map.
- Summary cards are clickable.
- Summary counts are placeholders until database/API endpoints are connected.
- FIMS WMS layers become available after GeoServer configuration.
