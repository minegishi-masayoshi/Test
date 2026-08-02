# FIMS Cloud Ver.1.0 — GitHub Pages package

This package is a static front-end prototype for the Papua New Guinea Forest Information Mapping System.

## Deployment

1. Upload all files and folders in this directory to the `fims/` directory of the GitHub Pages repository.
2. Keep the relative paths (`css/`, `js/`, `views/`) unchanged.
3. Confirm the GeoServer WMS URL and layer names in `js/config.js`.
4. Open `fims/index.html` through GitHub Pages.

## Current implementation

- Legacy-FIMS-inspired top-page layout
- Province list and FMU table
- Leaflet overview map and GeoServer WMS layers
- Navigation to Province, Concession, FIPS, LANMAP and Administration
- Summary values and report list
- Responsive layout

## Prototype limitations

Province/FMUs and summary values are demonstration data. Update, analysis, preview and export actions are placeholders until the OCI/PostGIS/Python API and reporting engine are connected.


## Province / Concession switch

Use the two buttons in the lower-left Navigation panel:

- **Province**: upper-left list shows provinces.
- **Concession**: upper-left list shows concessions by PLAN_ID.

The concession master in `js/data.js` is prototype data. Replace it with
PostGIS/API results when the backend is implemented.


## Ver.3.4.0
Automatic zoom on Province, Concession and FMU selection is disabled.


## Ver.3.4.0 Timber Volume API

The Timber Volume functions are connected to the OCI FastAPI service:

`https://140-245-124-203.sslip.io/api`

Zone updates use `PUT /timber-volumes/zone`. Individual FMU updates use
`PUT /timber-volume/fmu`. The bundled CSV remains available only as a
read-only fallback when the API cannot be reached.


## Ver.3.4.0 — Individual FMU Timber Volume

Select an FMU row, click **Update Timber Volume for FMU**, enter the revised
value, and confirm. FIMS Cloud calls the secured FastAPI endpoint, recalculates
the FMU, sets the individual-update protection flag, and refreshes the Province
FMU list and Summary.


## Ver.3.4.0 — Browser Draft removed

The **Save Browser Draft** function has been completely removed.

- No browser `localStorage` is used for Timber Volume edits.
- No draft button is displayed.
- Edits remain only in the open Zone update dialog.
- Closing or reloading the page discards unapplied edits.
- **Update Zone Volumes** writes changes directly to PostgreSQL through FastAPI.


## Ver.3.4.0 — Large Map MVP

- Removed the embedded Province Map panel from the main analysis screen.
- Added `large-map.html`, opened from **Large Map** in a separate browser window.
- Added Province, FMU, Concession, Forest Base Map, Protected Area, Logging Area and District layer controls.
- Passes the currently selected Province and FMU to the Large Map window.
- Added PNG extent and Close controls.
- Import and FMU Calculation are visible but disabled placeholders in this MVP.
- No GIS data editing or database update is performed by the Large Map MVP.
