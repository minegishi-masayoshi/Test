# FIMS Cloud Ver.3.4.0

## Review Imported Layer workflow

- Added a dedicated Review dialog after GeoPackage import.
- Review displays:
  - target layer
  - imported and skipped feature counts
  - geometry type
  - CRS
  - GeoServer WMS layer
  - publication status
  - catalog reload status
- Added `Refresh Imported Layer`.
- Added `Zoom to Province`.
- Added `Continue to Calculate`.
- Calculate remains disabled until the imported layer has been reviewed.
- Import completion now prompts the administrator to use Review.
