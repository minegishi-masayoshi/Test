/**
 * Shared report engine entry point.
 *
 * Ver.2.4.0 establishes the module boundary only. Individual legacy report
 * layouts and PDF generation are implemented incrementally.
 */
export class ReportEngine {
  constructor(options = {}) {
    this.onStatus =
      typeof options.onStatus === "function"
        ? options.onStatus
        : () => {};
  }

  preview(reportContext) {
    this.onStatus(
      `Preview requested for ${reportContext?.report?.title ?? "report"}.`
    );

    return reportContext;
  }

  exportPdf(reportContext) {
    this.onStatus(
      `PDF export requested for ${reportContext?.report?.title ?? "report"}.`
    );

    return reportContext;
  }
}
