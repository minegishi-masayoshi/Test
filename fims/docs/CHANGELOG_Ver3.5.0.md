# FIMS Cloud Ver.3.5.0

## Forest Constraints Import

- Added seven legacy Calculate constraint layers:
  - Extreme Slope
  - Extreme Altitude
  - Extreme Karst
  - Extreme Inundation
  - Extreme Mangrove
  - Serious Slope Relief
  - Serious Inundation
- Added `Forest Constraints` to the Large Map layer panel.
- Added all seven layers to the GeoPackage Import target list.
- Added automatic PostGIS import and GeoServer publication for all seven layers.
- Source GeoPackages in EPSG:4203 or EPSG:20355 are transformed to EPSG:20355.
- Removed `Zoom to Province` from the Review dialog.
- Retained `Refresh Imported Layer` and `Continue to Calculate`.
