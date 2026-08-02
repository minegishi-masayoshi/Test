# FIMS Cloud Ver.3.0.0

## Large Map Administrator Workflow

- Reorganized Large Map around the administrator sequence:
  1. Import Data
  2. Review Imported Layer
  3. FMU Calculation
  4. Review Results
- Updated the Import UI for the deployed GDAL 3.4-compatible endpoint:
  `POST /api/imports/gpkg`.
- Target layer is selected explicitly; the file name does not determine the destination.
- Supports Add and Replace modes.
- Added Large Map layer controls for all six legacy FIMS import targets.
- Import completion refreshes and displays the corresponding WMS layer.
- First-time imports clearly state that the new PostGIS table must be published once in GeoServer.
- Added WMS cache-busting refresh support after database updates.

## Import targets

- Concession Area
- Logged Not Land Use - Current
- Logged Land Use - Current
- Land Use Not Logged - Current
- Protected Area
- Plan Area

## Current limitation

FMU Calculation remains a staged next-phase function. The workflow button is enabled after import for navigation clarity, but no calculation API is executed in this version.
