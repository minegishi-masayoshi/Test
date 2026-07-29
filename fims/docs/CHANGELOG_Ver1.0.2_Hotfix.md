# FIMS Cloud Ver.1.0.2 Hotfix

## Cause addressed

GitHub Pages could serve a new `app.js` together with an older cached
`index.html`. The previous script expected only the new IDs
(`#unitList`, `#unitCount`, and so on), so initialization stopped before
prototype records were rendered.

## Corrections

- Supports both the new and previous HTML element IDs.
- Adds cache-busting query strings to CSS and JavaScript resources.
- Makes rendering functions null-safe.
- Displays the exact startup error in the status bar.
- Restores default West Sepik prototype data.
- Restores Province / Concession tab switching.
