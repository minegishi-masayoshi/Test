# FIMS Cloud Ver.2.1.0

## Concession module

- Enabled the Main > Concession menu.
- Loads `fims:concessionarea` from GeoServer WFS.
- Filters Concession records by the currently selected Province code.
- Reuses the FMU panel to display Concession attributes.
- Displays the following columns: Name, Area, Purchase, Expiry, Type, Status, Scale, Province, Remarks, Remarks 2 and Plan ID.
- Switches the Province Map from the FMU layer to the Concession WMS layer.
- Applies a Province CQL filter (`PROVINCE=<code>`) to the Concession WMS layer.
- Switching back to Province restores the FMU table and FMU map layer.

## Data assumptions

GeoServer layer: `fims:concessionarea`

Province relationship field: `PROVINCE`

Source GeoPackage fields:

- `NAME`
- `AREA`
- `PURCHASE`
- `EXP`
- `CONSTYPE`
- `STATUS`
- `SCALE`
- `PROVINCE`
- `REMARKS`
- `REMARKS2`
- `PLAN_ID`
