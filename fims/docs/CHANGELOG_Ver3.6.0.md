# FIMS Cloud Ver.3.6.0

## Forest Constraint Analysis Engine

- Added Province-level Calculate API backed by FMU-level PostGIS analysis.
- Reproduces the old FIMS calculation method:
  - individual FMU/constraint intersections;
  - union of five Extreme layers;
  - union of two Serious layers;
  - duplicate overlap areas counted once;
  - area in hectares;
  - Extreme/Serious proportion = union area / vegetation area × 100.
- Updates legacy-compatible columns in `public.fmu`.
- Saves the latest versioned snapshot in `public.constraint_result`.
- Added Calculate and Results dialog to Large Map.
- Connected Province Summary constraint fields to the recalculated FMU columns.
- Added deployment script that mounts the new FastAPI router safely.
