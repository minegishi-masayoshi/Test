# FIMS Cloud Ver.2.4.0

## Timber Volume Phase 1

- Added `js/timberVolume.js`.
- Added the legacy-style Province Zone / Vegetation Type Timber Volume editor.
- Migrated 780 records from `ctrl_TimberVolume_NEW` into a static CSV for
  GitHub Pages display.
- Supports filtering, editing Current Vol/ha and Comments, and saving browser
  drafts with `localStorage`.
- Added a secured API adapter boundary:
  `PUT {apiBaseUrl}/timber-volumes/zone`.
- PostgreSQL updates remain disabled until `CONFIG.timberVolume.apiBaseUrl`
  is configured.
- Added `js/reportEngine.js` as the shared report-engine module boundary.
- Existing Province, Concession, FMU, Summary, map and report-catalog behavior
  is retained.
