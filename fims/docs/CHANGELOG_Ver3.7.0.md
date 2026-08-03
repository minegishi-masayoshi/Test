# FIMS Cloud Ver.3.7.0

## Forest-area management analysis

- Added Protected Area overlap calculation by FMU.
- Added the three Current logging/land-use overlap calculations by FMU.
- Stores component areas in legacy-compatible FMU columns: `to96`, `to960`, and `to961`.
- Calculates `area2` as Revised Gross Forest Area.
- Calculates `area3` as Revised Adjusted Forest Area.
- Calculates `forest_vol` as Revised Gross Forest Volume.
- Adds `protected_area` to the FMU table when absent.
- Adds `forest_area_result` for auditable calculation snapshots.
- Updates Province Summary aliases so the new values are displayed.

## Formulas

- Revised Gross Forest Area = Gross Forest Area 75 − three Current land-use overlap areas.
- Revised Adjusted Forest Area = Revised Gross Area × Disturbance Index/10 × Complex Percent/100.
- Revised Gross Forest Volume = Revised Adjusted Area × Timber Volume.
