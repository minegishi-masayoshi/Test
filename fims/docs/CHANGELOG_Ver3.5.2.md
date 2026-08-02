# FIMS Cloud Ver.3.5.2

## Concession hotfix

- Fixed the Concession button on `index.html`.
- The Province Selection screen no longer initializes Leaflet when the
  configured `#map` element is absent.
- Prevented `setWmsLayerFilter()` and `createWmsLayer()` from accessing
  `map.getPane()` when no Leaflet map exists.
- Province, FMU and Concession tables now operate independently of the
  separate Large Map screen.
- Forest Constraints import and Large Map functions from Ver.3.5.1 are retained.
