# FIMS Cloud Ver.3.3.0

## Automatic GIS import pipeline

- Added `POST /api/imports/gpkg-auto`.
- Frontend now calls the automatic endpoint.
- GeoPackage is imported through a staging table.
- Geometry is repaired, reprojected to EPSG:20355 and converted to MultiPolygon.
- Add and Replace modes are supported.
- New PostGIS target tables are published automatically to GeoServer.
- Existing GeoServer layers are detected without duplicate publication.
- GeoServer catalog reload is performed after import.
- Large Map refreshes the corresponding WMS layer automatically.
- Import result now shows geometry type, SRID and GeoServer publication status.
