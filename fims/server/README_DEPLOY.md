# FIMS Cloud Ver.3.5 server update

This server module extends the automatic GeoPackage import API to the seven
legacy forest-constraint layers.

## Added targets

- `extreme_slope`
- `extreme_altitude`
- `extreme_karst`
- `extreme_inundation`
- `extreme_mangrove`
- `serious_sloperelief`
- `serious_inundation`

All uploaded source layers are repaired, converted to MultiPolygon and
transformed to `EPSG:20355` before storage in PostGIS. Therefore both legacy
source CRS groups (`EPSG:4203` and `EPSG:20355`) are accepted when the
GeoPackage contains the correct source CRS.

## Deploy

Upload these files to `/home/ubuntu/`:

- `import_auto_api.py`
- `deploy_import_auto.sh`

Then run:

```bash
cd /home/ubuntu
chmod +x deploy_import_auto.sh
./deploy_import_auto.sh /home/ubuntu/import_auto_api.py
```
