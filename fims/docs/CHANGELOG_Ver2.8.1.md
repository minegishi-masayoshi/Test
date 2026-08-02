# FIMS Cloud Ver.2.8.1

## Large Map initial extent fix

- Added `srsName=EPSG:4326` to GeoServer WFS GetFeature requests.
- Province and FMU GeoJSON are now returned in longitude/latitude coordinates for Leaflet.
- Fixed Large Map opening outside Papua New Guinea when a Province is selected.
- Preserved the display-only Large Map MVP behavior.
