# FIMS Cloud Ver.2.0.1

## Corrections

- Removed the duplicated legacy four-column FMU table header from `index.html`.
- Expanded the initial FMU table empty row to span all 21 columns.
- Retained the 21-column FMU display implemented in `app.js`:
  FMU plus the 20 fields used by Province Summary.
- Removed the duplicated legacy row-generation block that caused the JavaScript syntax error.
- Updated application and cache-busting version strings to Ver.2.0.1.

## Deployment

Upload the contents of the `fims` directory to the existing GitHub repository `fims` directory, replacing files with the same names.
