# Server deployment

This version adds a new endpoint:

```text
POST /api/imports/gpkg-auto
```

It does not overwrite the existing `/api/imports/gpkg` endpoint.

## Files

- `import_auto_api.py`
- `deploy_import_auto.sh`

## Upload to OCI

From Windows PowerShell:

```powershell
scp -i "C:\path\to\ssh-key.key" `
  ".\server\import_auto_api.py" `
  ".\server\deploy_import_auto.sh" `
  ubuntu@140.245.124.203:/home/ubuntu/
```

## Deploy on OCI

```bash
cd /home/ubuntu
chmod +x deploy_import_auto.sh
./deploy_import_auto.sh /home/ubuntu/import_auto_api.py
```

## What the endpoint automates

1. Uploads the selected GeoPackage.
2. Imports it through GDAL/ogr2ogr into a staging table.
3. Reprojects to EPSG:20355.
4. Repairs invalid geometry.
5. Converts polygon geometry to MultiPolygon.
6. Executes Add or Replace against the fixed FIMS target table.
7. Publishes a new GeoServer FeatureType when required.
8. Reloads the GeoServer catalog.
9. Returns the WMS layer name and import statistics.
10. Large Map refreshes and displays the imported WMS layer.

## Required environment variables

The module reuses the existing FIMS API database variables:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Optional:

```text
GEOSERVER_URL=http://127.0.0.1:8080/geoserver
GEOSERVER_USER=admin
GEOSERVER_PASSWORD=geoserver
GEOSERVER_WORKSPACE=fims
GEOSERVER_STORE=fims_postgis
```
