# FIMS Cloud Ver.3.8.7

## PDF library integration fix

- Fixed the false `jsPDF-AutoTable was not loaded` error on GitHub Pages.
- Detects both plugin-patched `doc.autoTable()` and UMD global exports.
- Supports `applyPlugin`, `autoTable(doc, options)`, and default-function export forms.
- Keeps the integrated Constraint Summary table and PDF-only report action.
- Updated application and cache versions to 3.8.7.
