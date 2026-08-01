# FIMS Cloud Ver.2.6.0

## Old FIMS User Guide Section 1.4.2

- Added a dedicated individual FMU Timber Volume dialog.
- Requires selection of an FMU row.
- Shows FMU, Forest Zone, Vegetation Type, current Timber Volume, and individual-update status.
- Accepts a revised Timber Volume and requests confirmation.
- Calls `PUT /api/timber-volume/fmu`.
- Recalculates the selected FMU through the backend.
- Sets and preserves the individual FMU protection flag.
- Reloads FMUs and Province Summary after the update.
- Retains all Ver.2.5 Zone update functions.
