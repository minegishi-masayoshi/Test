/**
 * FIMS Cloud report engine.
 * Ver.3.8.1: first production-style PDF output using the same approach as FIPS:
 * jsPDF + jsPDF-AutoTable, generated in the browser with fixed A4 coordinates.
 */
export const REPORT_ENGINE_VERSION = "3.8.1";

const SUPPORTED_REPORT_ID = "province-constraint";

export class ReportEngine {
  constructor(options = {}) {
    this.onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    this.boundHandler = (event) => this.handleReportEvent(event);
    document.addEventListener("fims:report", this.boundHandler);
  }

  destroy() {
    document.removeEventListener("fims:report", this.boundHandler);
  }

  async handleReportEvent(event) {
    const context = event?.detail || {};
    const action = context.action;

    try {
      if (action === "preview") {
        this.preview(context);
      } else if (action === "pdf") {
        await this.exportPdf(context);
      }
    } catch (error) {
      console.error("[FIMS report]", error);
      this.onStatus(`Report output failed: ${error.message}`);
      window.alert(`Report output failed.\n\n${error.message}`);
    }
  }

  isSupported(context) {
    return context?.report?.id === SUPPORTED_REPORT_ID;
  }

  preview(context) {
    if (!this.isSupported(context)) {
      this.renderUnsupportedPreview(context);
      return context;
    }

    const model = this.buildModel(context);
    const host = document.getElementById("reportPreview");
    if (!host) return context;

    host.innerHTML = `
      <div class="fims-report-preview-card">
        <div class="fims-report-preview-title">PNG Forest Authority</div>
        <div class="fims-report-preview-subtitle">Province Constraint Concession / Unallocated</div>
        <div class="fims-report-preview-meta">
          <span><strong>Province:</strong> ${this.escapeHtml(model.provinceName)}</span>
          <span><strong>FMUs:</strong> ${model.fmuCount.toLocaleString("en-US")}</span>
        </div>
        <div class="fims-report-preview-grid">
          ${model.kpis.map((item) => `
            <div class="fims-report-preview-kpi">
              <span>${this.escapeHtml(item.label)}</span>
              <strong>${this.escapeHtml(item.formatted)}</strong>
            </div>`).join("")}
        </div>
        <p class="fims-report-preview-note">
          A4 PDF includes an executive summary, small Province map, comparison chart,
          and legacy-compatible detailed tables.
        </p>
      </div>`;

    this.onStatus(`Preview ready: ${model.title} for ${model.provinceName}.`);
    return context;
  }

  renderUnsupportedPreview(context) {
    const host = document.getElementById("reportPreview");
    if (host) {
      host.innerHTML = `<div class="empty-message">PDF implementation is currently available for <strong>Province Constraint</strong>.</div>`;
    }
    this.onStatus(`PDF output is not yet implemented for ${context?.report?.title || "this report"}.`);
  }

  async exportPdf(context) {
    if (!this.isSupported(context)) {
      throw new Error("Select 'Province Constraint'. This is the first implemented PDF report.");
    }

    const jsPDFClass = window.jspdf?.jsPDF;
    if (!jsPDFClass) {
      throw new Error("jsPDF was not loaded. Check that the pinned unpkg library is reachable and not blocked by CSP or the browser cache.");
    }

    if (typeof jsPDFClass.API?.autoTable !== "function") {
      throw new Error("jsPDF-AutoTable was not loaded. Check the pinned unpkg library and reload the page without cache.");
    }

    const model = this.buildModel(context);
    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    this.drawPageOne(doc, model);
    this.drawLegacyDetails(doc, model);
    this.addPageNumbers(doc, model);

    const safeProvince = model.provinceName.replace(/[^A-Za-z0-9_-]+/g, "_");
    doc.save(`FIMS_Province_Constraint_${safeProvince}_${this.dateStamp()}.pdf`);
    this.onStatus(`PDF exported: ${model.title} for ${model.provinceName}.`);
    return context;
  }

  buildModel(context) {
    const summary = context.summary || {};
    const values = summary.values || {};
    const metadata = summary.metadata || {};
    const rows = Array.isArray(summary.rows) ? summary.rows : [];
    const province = context.province || {};
    const fmus = Array.isArray(context.fmus) ? context.fmus : [];

    const provinceName = this.firstText(
      metadata.provinceName,
      province.name,
      province.provinceName,
      province.properties?.name,
      province.properties?.descrip,
      values.zoneName,
      "Selected Province"
    );

    const valueByLabel = new Map(rows.map((row) => [String(row.label || "").toLowerCase(), row]));
    const pick = (...keys) => {
      for (const key of keys) {
        if (values[key] !== undefined && values[key] !== null) return this.number(values[key]);
        const row = valueByLabel.get(String(key).toLowerCase());
        if (row) return this.number(row.value ?? row.rawValue);
      }
      return 0;
    };

    const metrics = {
      area: pick("area", "Area(ha)", "vegArea"),
      protected: pick("protected", "Protected", "protectedArea"),
      extSlope: pick("extSlope", "Ext Slope", "extremeSlope"),
      extAltitude: pick("extAltitude", "Ext Altitude", "extremeAltitude"),
      extKarst: pick("extKarst", "Ext Karst", "extremeKarst"),
      extInundation: pick("extInundation", "Ext Inundation", "extremeInundation"),
      extMangrove: pick("extMangrove", "Ext Mangrove", "extremeMangrove"),
      serSlope: pick("serSlope", "Ser Slope", "seriousSlopeRelief"),
      serInundation: pick("serInundation", "Ser Inundation", "seriousInundation"),
      grossArea75: pick("grossForestArea75", "Gross Forest Area '75", "grossForestArea"),
      adjustedArea75: pick("adjustedForestArea75", "Adjusted Forest Area '75", "adjustedForestArea"),
      grossVolume75: pick("grossForestVolume75", "Gross Forest Volume '75", "grossForestVolume"),
      loggedLandUse: pick("loggedLandUse", "Logged Land Use", "loggedLandUseTotal"),
      revisedGrossArea: pick("revisedGrossForestArea", "Revised Gross Forest Area", "revGrossForestArea"),
      revisedAdjustedArea: pick("revAdjustedForestArea", "Rev Adj Forest Area", "revisedAdjustedForestArea"),
      revisedGrossVolume: pick("revGrossForestVol", "Rev Gross Forest Vol", "revisedGrossForestVolume")
    };

    const generatedAt = new Date();
    const calculationDate = this.firstText(metadata.calculatedAt, metadata.calculationDate, metadata.updatedAt, "—");

    return {
      title: "Province Constraint Concession / Unallocated",
      legacyReport: "rpt_Province_Constraint",
      pageSize: "A4",
      provinceName,
      provinceCode: this.firstText(metadata.provinceCode, province.code, province.id, values.zone, "—"),
      fmuCount: this.number(metadata.fmuCount ?? summary.count ?? fmus.length),
      calculationDate,
      generatedAt,
      calculationVersion: this.firstText(metadata.calculationVersion, "3.7.0"),
      metrics,
      kpis: [
        this.metric("Gross Forest Area '75", metrics.grossArea75, "ha"),
        this.metric("Revised Gross Forest Area", metrics.revisedGrossArea, "ha"),
        this.metric("Gross Forest Volume '75", metrics.grossVolume75, "m³"),
        this.metric("Revised Gross Forest Volume", metrics.revisedGrossVolume, "m³")
      ],
      geometry: this.extractGeometry(province),
      rows,
      fmus
    };
  }

  drawPageOne(doc, model) {
    const W = 210;
    doc.setFillColor(23, 92, 54);
    doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PNG FOREST AUTHORITY", 14, 10);
    doc.setFontSize(10.5);
    doc.text("Province Constraint Concession / Unallocated", 14, 17);

    doc.setTextColor(35, 35, 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Province: ${model.provinceName}`, 14, 31);
    doc.text(`Province code: ${model.provinceCode}`, 14, 36);
    doc.text(`FMUs: ${model.fmuCount.toLocaleString("en-US")}`, 75, 36);
    doc.text(`Generated: ${this.formatDateTime(model.generatedAt)}`, 120, 31);
    doc.text(`Calculated: ${model.calculationDate}`, 120, 36);

    this.sectionTitle(doc, "Executive Summary", 14, 44, 182);
    const cardY = 50;
    const cardW = 42.5;
    model.kpis.forEach((item, i) => this.drawKpi(doc, 14 + i * 45.5, cardY, cardW, 23, item));

    this.sectionTitle(doc, "Province Location", 14, 81, 86);
    this.drawSmallMap(doc, model.geometry, 14, 87, 86, 59, model.provinceName);

    this.sectionTitle(doc, "Original / Revised Comparison", 106, 81, 90);
    this.drawComparisonChart(doc, model, 106, 87, 90, 59);

    this.sectionTitle(doc, "Constraint Summary", 14, 153, 182);
    const constraintRows = [
      ["Protected Area", this.area(model.metrics.protected)],
      ["Extreme Slope", this.area(model.metrics.extSlope)],
      ["Extreme Altitude", this.area(model.metrics.extAltitude)],
      ["Extreme Karst", this.area(model.metrics.extKarst)],
      ["Extreme Inundation", this.area(model.metrics.extInundation)],
      ["Extreme Mangrove", this.area(model.metrics.extMangrove)],
      ["Serious Slope Relief", this.area(model.metrics.serSlope)],
      ["Serious Inundation", this.area(model.metrics.serInundation)]
    ];

    doc.autoTable({
      startY: 159,
      margin: { left: 14, right: 14 },
      head: [["Constraint", "Area (ha)", "Constraint", "Area (ha)"]],
      body: [
        [...constraintRows[0], ...constraintRows[4]],
        [...constraintRows[1], ...constraintRows[5]],
        [...constraintRows[2], ...constraintRows[6]],
        [...constraintRows[3], ...constraintRows[7]]
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2, lineColor: [185, 199, 190] },
      headStyles: { fillColor: [35, 105, 64], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } }
    });

    const y = doc.lastAutoTable.finalY + 7;
    this.sectionTitle(doc, "Forest Area and Volume", 14, y, 182);
    doc.autoTable({
      startY: y + 6,
      margin: { left: 14, right: 14 },
      body: [
        ["Gross Forest Area '75", this.area(model.metrics.grossArea75), "Revised Gross Forest Area", this.area(model.metrics.revisedGrossArea)],
        ["Adjusted Forest Area '75", this.area(model.metrics.adjustedArea75), "Rev Adjusted Forest Area", this.area(model.metrics.revisedAdjustedArea)],
        ["Gross Forest Volume '75", this.volume(model.metrics.grossVolume75), "Rev Gross Forest Volume", this.volume(model.metrics.revisedGrossVolume)],
        ["Logged / Land Use", this.area(model.metrics.loggedLandUse), "Protected Area", this.area(model.metrics.protected)]
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.1, lineColor: [185, 199, 190] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 3: { halign: "right", fontStyle: "bold" } }
    });
  }

  drawLegacyDetails(doc, model) {
    doc.addPage("a4", "portrait");
    this.pageHeader(doc, model, "Legacy-Compatible Detail");

    doc.setFontSize(8.5);
    doc.setTextColor(55, 55, 55);
    doc.text("The following fields reproduce the principal information used by the old FIMS Province Constraint report.", 14, 34);

    const m = model.metrics;
    const body = [
      ["Vegetation / gross area", this.area(m.area)],
      ["Protected area", this.area(m.protected)],
      ["Gross Forest Area '75", this.area(m.grossArea75)],
      ["Adjusted Forest Area '75", this.area(m.adjustedArea75)],
      ["Gross Forest Volume '75", this.volume(m.grossVolume75)],
      ["Logged / Land Use – Current", this.area(m.loggedLandUse)],
      ["Revised Gross Forest Area", this.area(m.revisedGrossArea)],
      ["Revised Adjusted Forest Area", this.area(m.revisedAdjustedArea)],
      ["Revised Gross Forest Volume", this.volume(m.revisedGrossVolume)]
    ];

    doc.autoTable({
      startY: 40,
      margin: { left: 14, right: 14 },
      head: [["Legacy item", "Province total"]],
      body,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.4, lineColor: [180, 195, 185] },
      headStyles: { fillColor: [35, 105, 64], textColor: 255 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } }
    });

    const y = doc.lastAutoTable.finalY + 8;
    this.sectionTitle(doc, "Constraint Components", 14, y, 182);
    doc.autoTable({
      startY: y + 6,
      margin: { left: 14, right: 14 },
      head: [["Class", "Component", "Area (ha)"]],
      body: [
        ["Extreme", "Slope", this.numberText(m.extSlope)],
        ["Extreme", "Altitude", this.numberText(m.extAltitude)],
        ["Extreme", "Karst", this.numberText(m.extKarst)],
        ["Extreme", "Inundation", this.numberText(m.extInundation)],
        ["Extreme", "Mangrove", this.numberText(m.extMangrove)],
        ["Serious", "Slope Relief", this.numberText(m.serSlope)],
        ["Serious", "Inundation", this.numberText(m.serInundation)]
      ],
      theme: "striped",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [35, 105, 64], textColor: 255 },
      columnStyles: { 2: { halign: "right" } }
    });

    const noteY = Math.min(275, doc.lastAutoTable.finalY + 10);
    doc.setDrawColor(170, 185, 175);
    doc.setFillColor(245, 248, 246);
    doc.roundedRect(14, noteY, 182, 15, 1.5, 1.5, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text("Source: FIMS Cloud PostGIS / FastAPI calculation results. Page size follows the old FIMS User Guide: A4.", 18, noteY + 6);
    doc.text(`Legacy reference: ${model.legacyReport}. Calculation version: ${model.calculationVersion}.`, 18, noteY + 11);
  }

  drawKpi(doc, x, y, w, h, item) {
    doc.setFillColor(244, 249, 246);
    doc.setDrawColor(155, 185, 165);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
    doc.setTextColor(45, 75, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(doc.splitTextToSize(item.label, w - 6), x + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.text(item.formatted, x + 3, y + 18, { maxWidth: w - 6 });
  }

  drawComparisonChart(doc, model, x, y, w, h) {
    doc.setDrawColor(190, 202, 194);
    doc.setFillColor(250, 251, 250);
    doc.rect(x, y, w, h, "FD");
    const data = [
      { label: "Area", original: model.metrics.grossArea75, revised: model.metrics.revisedGrossArea },
      { label: "Adjusted", original: model.metrics.adjustedArea75, revised: model.metrics.revisedAdjustedArea },
      { label: "Volume", original: model.metrics.grossVolume75, revised: model.metrics.revisedGrossVolume }
    ];
    const max = Math.max(1, ...data.flatMap((d) => [d.original, d.revised]));
    const chartX = x + 25;
    const chartW = w - 31;
    data.forEach((d, i) => {
      const rowY = y + 11 + i * 15;
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(d.label, x + 3, rowY + 3);
      doc.setFillColor(174, 196, 181);
      doc.rect(chartX, rowY, chartW * d.original / max, 4, "F");
      doc.setFillColor(35, 105, 64);
      doc.rect(chartX, rowY + 5, chartW * d.revised / max, 4, "F");
    });
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Original", x + 4, y + h - 6);
    doc.setFillColor(174, 196, 181); doc.rect(x + 17, y + h - 9, 7, 3, "F");
    doc.text("Revised", x + 30, y + h - 6);
    doc.setFillColor(35, 105, 64); doc.rect(x + 43, y + h - 9, 7, 3, "F");
  }

  drawSmallMap(doc, geometry, x, y, w, h, label) {
    doc.setFillColor(241, 246, 243);
    doc.setDrawColor(185, 200, 190);
    doc.rect(x, y, w, h, "FD");

    const rings = this.geometryRings(geometry);
    if (!rings.length) {
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 103);
      doc.text("Province geometry unavailable", x + w / 2, y + h / 2, { align: "center" });
      return;
    }

    const points = rings.flat();
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const sx = (w - 10) / Math.max(maxX - minX, 1e-9);
    const sy = (h - 12) / Math.max(maxY - minY, 1e-9);
    const scale = Math.min(sx, sy);
    const ox = x + (w - (maxX - minX) * scale) / 2;
    const oy = y + (h - (maxY - minY) * scale) / 2;

    doc.setDrawColor(26, 104, 59);
    doc.setFillColor(209, 226, 215);
    rings.forEach((ring) => {
      const mapped = ring.map(([px, py]) => [ox + (px - minX) * scale, oy + (maxY - py) * scale]);
      if (mapped.length > 2) {
        const lines = mapped.slice(1).map((p, i) => [p[0] - mapped[i][0], p[1] - mapped[i][1]]);
        doc.lines(lines, mapped[0][0], mapped[0][1], [1, 1], "FD", true);
      }
    });
    doc.setFontSize(7);
    doc.setTextColor(45, 70, 52);
    doc.text(label, x + 3, y + h - 3);
  }

  pageHeader(doc, model, subtitle) {
    doc.setFillColor(23, 92, 54);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PNG FOREST AUTHORITY", 14, 10);
    doc.setFontSize(9.5);
    doc.text(`${model.title} — ${subtitle}`, 14, 17);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Province: ${model.provinceName}`, 14, 29);
    doc.text(`Calculated: ${model.calculationDate}`, 120, 29);
  }

  addPageNumbers(doc, model) {
    const count = doc.getNumberOfPages();
    for (let page = 1; page <= count; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(190, 200, 193);
      doc.line(14, 288, 196, 288);
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      doc.text(`FIMS Cloud ${REPORT_ENGINE_VERSION} | ${model.provinceName}`, 14, 293);
      doc.text(`Page ${page} of ${count}`, 196, 293, { align: "right" });
    }
  }

  sectionTitle(doc, text, x, y, w) {
    doc.setFillColor(225, 237, 229);
    doc.setDrawColor(165, 190, 173);
    doc.rect(x, y, w, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 83, 49);
    doc.text(text, x + 2, y + 4.2);
  }

  extractGeometry(province) {
    return province?.geometry || province?.feature?.geometry || province?.geojson?.geometry || null;
  }

  geometryRings(geometry) {
    if (!geometry || !Array.isArray(geometry.coordinates)) return [];
    if (geometry.type === "Polygon") return geometry.coordinates.filter(Array.isArray);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.flat().filter(Array.isArray);
    return [];
  }

  metric(label, value, unit) {
    return { label, value, unit, formatted: `${this.numberText(value)} ${unit}` };
  }
  area(value) { return `${this.numberText(value)} ha`; }
  volume(value) { return `${this.numberText(value)} m³`; }
  numberText(value) { return this.number(value).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  firstText(...values) { for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value); return "—"; }
  formatDateTime(value) { return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value); }
  dateStamp() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; }
  escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
}
