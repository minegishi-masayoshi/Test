# Implementation notes

## Recommended development sequence

1. Confirm GeoServer WMS endpoint and actual workspace/layer names.
2. Display Province, Concession, FMU and Forest Base Map layers.
3. Add GeoJSON/WFS identify and attribute-display functions.
4. Connect Summary counts to the FIMS API/PostGIS.
5. Implement Forest Resources, Logging, Analysis and Reports screens.
6. Add authentication and role-based access control after the UI and GIS flow are stable.

## Separation of responsibilities

- GitHub Pages: user interface and navigation
- GeoNode: dataset and metadata management
- GeoServer: WMS/WFS/WMTS services
- Python API: analysis, import and report processing
- PostgreSQL/PostGIS: operational and spatial data
