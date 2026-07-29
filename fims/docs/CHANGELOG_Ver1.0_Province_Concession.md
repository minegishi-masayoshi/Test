# FIMS Cloud Ver.1.0 — Province / Concession switch revision

## Updated files

- `index.html`
- `css/main.css`
- `js/app.js`
- `js/data.js`
- `js/map.js`

## Main changes

- Province and Concession modes now switch the upper-left list.
- Province mode displays the province master and province FMUs.
- Concession mode displays PLAN_ID/concession names and concession FMUs.
- Summary and report lists change according to the selected mode.
- The Concessions GeoServer layer is enabled automatically in Concession mode.
- Leaflet map resizing was corrected using `ResizeObserver` and `invalidateSize()`.
- Prototype concession records are isolated in `js/data.js` for later replacement by PostGIS/API data.
