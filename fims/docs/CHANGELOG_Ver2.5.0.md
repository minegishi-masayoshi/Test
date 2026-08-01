# FIMS Cloud Ver.2.5.0

## Timber Volume API integration

- Connected the GitHub Pages frontend to the OCI FastAPI endpoint.
- Loads Province Timber Volume records from PostgreSQL.
- Retains the bundled CSV as read-only fallback data.
- Sends Zone changes to `PUT /api/timber-volumes/zone`.
- Displays API connection status.
- Reports recalculated and protected FMU counts.
- Connects individual FMU updates to `PUT /api/timber-volume/fmu`.
- Refreshes FMU and Summary displays after updates.
- Updated the application version to Ver.2.5.0.
