# FIMS Cloud Ver.2.3.1

## Export PDF button

- Added an `Export PDF` button to the Reports toolbar.
- Added the `pdf` report action to the application controller.
- Added `pdfReportButton` DOM resolution and click-event binding.
- Selecting `Export PDF` dispatches the existing `fims:report` custom event
  with `action: "pdf"` and the selected report, Province, FMUs and Summary.
- Actual PDF layout generation is intentionally deferred until each legacy
  report definition and data source are implemented.
- Existing Preview and Export CSV controls remain unchanged.
