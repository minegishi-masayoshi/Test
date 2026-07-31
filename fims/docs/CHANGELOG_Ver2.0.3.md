# FIMS Cloud Ver.2.0.3

## Province Summary aggregation fix

- Added the actual GeoServer FMU field aliases used by the migrated dataset.
- Province Summary now sums values from: `protected`, `ext_alt`, `ext_sl`, `ext_kst`, `ext_in`, `ext_man`, `ser_sl`, `ser_in`, `area_75`, `area_750`, `vol_75`, `to96`, `to960`, `to961`, and `forest_vol`.
- Retained compatibility aliases such as `current_`, `current0`, `current1`, and `current2`.
- Kept the legacy old-FIMS two-column Summary layout introduced in Ver.2.0.2.
- Updated browser cache-busting version references to 2.0.3.
