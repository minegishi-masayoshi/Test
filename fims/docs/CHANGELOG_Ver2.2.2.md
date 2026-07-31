# FIMS Cloud Ver.2.2.2

## Concession–FMU spatial selection fix

- Fixed the zero-length closing segment handling in the point-on-segment test.
- GeoJSON rings repeat the first vertex as the last vertex. The previous test treated this zero-length segment as containing every point.
- As a result, every FMU in the selected Province was assigned to every Concession.
- Concession selection now evaluates each FMU representative point against the actual selected Concession polygon.
- Summary uses the same filtered FMU collection shown in the table.
