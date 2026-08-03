# FIMS Cloud Ver.3.8.8

## PDF stability fix

- Removed the premature `prepareAutoTable()` check from `reportEngine.js`.
- Added a local lightweight jsPDF table plugin under `fims/lib/`.
- Removed the external jsPDF-AutoTable dependency.
- Retained jsPDF-based browser PDF generation and the integrated Constraint Summary table.
- Updated application, report-engine and cache versions to 3.8.8.
- Updated visible version labels in `index.html`.

## Deployment

Replace the complete `fims` directory on GitHub Pages and perform a hard reload (`Ctrl+F5`).
