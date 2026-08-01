# FIMS Cloud Ver.2.7.0

## Save Browser Draft removal

- Removed the **Save Browser Draft** button from the Zone Timber Volume dialog.
- Removed the `saveTimberVolumeDraftButton` DOM dependency.
- Removed `localStorage` and the Timber Volume storage key.
- Removed draft loading, persistence, and manual-save methods.
- Replaced persistent draft state with in-memory unsaved changes.
- Unapplied edits are discarded when the dialog/page is closed or reloaded.
- Preserved direct PostgreSQL updates through **Update Zone Volumes**.
- Preserved Zone recalculation and individually updated FMU protection.
- Preserved User Guide Section 1.4.2 individual FMU updates.
