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


## Ver.2.3.2
Automatic zoom on Province, Concession and FMU selection is disabled.
