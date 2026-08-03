/**
 * FIMS Cloud report engine.
 * Ver.3.8.2: Province Constraint PDF value-alignment and compact A4 layout.
 * Uses the same browser-side jsPDF + jsPDF-AutoTable approach as FIPS.
 */
export const REPORT_ENGINE_VERSION = "3.8.2";

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
    try {
      if (context.action === "preview") this.preview(context);
      if (context.action === "pdf") await this.exportPdf(context);
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
      const host = document.getElementById("reportPreview");
      if (host) host.innerHTML = '<div class="empty-message">PDF implementation is currently available for <strong>Province Constraint</strong>.</div>';
      return;
    }

    const model = this.buildModel(context);
    const host = document.getElementById("reportPreview");
    if (!host) return;

    host.innerHTML = `
      <div class="fims-report-preview-card">
        <div class="fims-report-preview-title">PNG Forest Authority</div>
        <div class="fims-report-preview-subtitle">Province Constraint Concession / Unallocated</div>
        <div class="fims-report-preview-meta">
          <span><strong>Province:</strong> ${this.escapeHtml(model.provinceName)}</span>
          <span><strong>FMUs:</strong> ${model.fmuCount.toLocaleString("en-US")}</span>
        </div>
        <div class="fims-report-preview-grid">
          ${model.kpis.map((item) => `<div class="fims-report-preview-kpi"><span>${this.escapeHtml(item.label)}</span><strong>${this.escapeHtml(item.formatted)}</strong></div>`).join("")}
        </div>
        <p class="fims-report-preview-note">Compact A4 one-page PDF. Values use the same normalized Summary object displayed on screen.</p>
      </div>`;

    this.onStatus(`Preview ready: ${model.title} for ${model.provinceName}.`);
  }

  async exportPdf(context) {
    if (!this.isSupported(context)) {
      throw new Error("Select 'Province Constraint'. This is the first implemented PDF report.");
    }

    const jsPDFClass = window.jspdf?.jsPDF;
    if (!jsPDFClass) throw new Error("jsPDF was not loaded.");
    if (typeof jsPDFClass.API?.autoTable !== "function") throw new Error("jsPDF-AutoTable was not loaded.");

    const model = this.buildModel(context);
    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    this.drawCompactReport(doc, model);
    this.addFooter(doc, model);

    const safeProvince = model.provinceName.replace(/[^A-Za-z0-9_-]+/g, "_");
    doc.save(`FIMS_Province_Constraint_${safeProvince}_${this.dateStamp()}.pdf`);
    this.onStatus(`PDF exported: ${model.title} for ${model.provinceName}.`);
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

    const normalizedRows = new Map();
    for (const row of rows) {
      for (const key of [row?.key, row?.label, row?.description]) {
        if (key) normalizedRows.set(this.normalizeKey(key), row);
      }
    }

    const pick = (...keys) => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          const n = this.numberOrNull(values[key]);
          if (n !== null) return n;
        }
        const row = normalizedRows.get(this.normalizeKey(key));
        if (row) {
          const n = this.numberOrNull(row.rawValue ?? row.value ?? row.formattedValue);
          if (n !== null) return n;
        }
      }
      return 0;
    };

    // Canonical keys below are the actual keys defined by summary.js.
    const metrics = {
      area: pick("vegArea", "Area(ha)", "Vegetation Area"),
      protected: pick("protectedArea", "Protected", "Protected Area"),
      extSlope: pick("extSlope", "Ext Slope", "Ext_Slope"),
      extAltitude: pick("extAltitude", "Ext Altitude", "Ext_Altitude"),
      extKarst: pick("extKarst", "Ext Karst", "Ext_Karst"),
      extInundation: pick("extInund", "Ext Inundation", "Ext_Inund"),
      extMangrove: pick("extMangrove", "Ext Mangrove", "Ext_Mangrove"),
      serSlope: pick("serSlopeRelief", "Ser Slope", "Ser_SlopeRelief"),
      serInundation: pick("serInund", "Ser Inundation", "Ser_Inund"),
      grossArea75: pick("grossFrstArea75", "Gross Forest Area '75", "Gross_Frst_Area_75"),
      adjustedArea75: pick("adjFrstArea75", "Adjusted Forest Area '75", "Adj_Frst_Area_75"),
      grossVolume75: pick("grossFrstVol75", "Gross Forest Volume '75", "Gross_Frst_Vol_75"),
      loggedLandUse: pick("loggedLUse", "Logged Land Use", "Logged_LUse"),
      revisedGrossArea: pick("revGrossFrstArea", "Revised Gross Forest Area", "Rev_Gross_Frst_Area"),
      revisedAdjustedArea: pick("revAdjFrstArea", "Rev Adj Forest Area", "Rev_Adj_Frst_Area"),
      revisedGrossVolume: pick("revGrossFrstVol", "Rev Gross Forest Vol", "Rev_Gross_Frst_Vol")
    };

    const generatedAt = new Date();
    const calculationDate = this.firstText(metadata.calculatedAt, metadata.calculationDate, metadata.updatedAt, "—");

    return {
      title: "Province Constraint Concession / Unallocated",
      legacyReport: "rpt_Province_Constraint",
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
      geometry: this.extractGeometry(province)
    };
  }

  drawCompactReport(doc, model) {
    const W = 210;
    const left = 12;
    const right = 198;
    const contentW = right - left;

    doc.setFillColor(23, 92, 54);
    doc.rect(0, 0, W, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PNG FOREST AUTHORITY", left, 8.5);
    doc.setFontSize(9.5);
    doc.text(model.title, left, 15);

    doc.setTextColor(35, 35, 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Province: ${model.provinceName} (${model.provinceCode})`, left, 26);
    doc.text(`FMUs: ${model.fmuCount.toLocaleString("en-US")}`, left, 31);
    doc.text(`Generated: ${this.formatDateTime(model.generatedAt)}`, 108, 26);
    doc.text(`Calculated: ${this.compactDate(model.calculationDate)}`, 108, 31);

    // KPI row: reduced height and tighter spacing.
    this.sectionTitle(doc, "Executive Summary", left, 36, contentW);
    const cardY = 41;
    const gap = 3;
    const cardW = (contentW - gap * 3) / 4;
    model.kpis.forEach((item, index) => this.drawKpi(doc, left + index * (cardW + gap), cardY, cardW, 17, item));

    // Map and comparison panels.
    const panelY = 63;
    const panelH = 43;
    this.sectionTitle(doc, "Province Location", left, panelY, 79);
    this.drawSmallMap(doc, model.geometry, left, panelY + 5, 79, panelH - 5, model.provinceName);
    this.sectionTitle(doc, "Original / Revised", 94, panelY, 104);
    this.drawComparisonChart(doc, model, 94, panelY + 5, 104, panelH - 5);

    // Forest values first: these are the main old-FIMS report totals.
    this.sectionTitle(doc, "Forest Area and Volume", left, 111, contentW);
    doc.autoTable({
      startY: 116,
      margin: { left, right: 12 },
      body: [
        ["Vegetation / Gross Area", this.area(model.metrics.area), "Protected Area", this.area(model.metrics.protected)],
        ["Gross Forest Area '75", this.area(model.metrics.grossArea75), "Revised Gross Forest Area", this.area(model.metrics.revisedGrossArea)],
        ["Adjusted Forest Area '75", this.area(model.metrics.adjustedArea75), "Rev Adjusted Forest Area", this.area(model.metrics.revisedAdjustedArea)],
        ["Gross Forest Volume '75", this.volume(model.metrics.grossVolume75), "Rev Gross Forest Volume", this.volume(model.metrics.revisedGrossVolume)],
        ["Logged / Land Use — Current", this.area(model.metrics.loggedLandUse), "Available after Land Use", this.area(model.metrics.revisedGrossArea)]
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 7.4, cellPadding: 1.75, lineColor: [184, 198, 189] },
      columnStyles: { 0: { cellWidth: 53 }, 1: { cellWidth: 35, halign: "right", fontStyle: "bold" }, 2: { cellWidth: 58 }, 3: { cellWidth: 40, halign: "right", fontStyle: "bold" } }
    });

    const constraintY = doc.lastAutoTable.finalY + 5;
    this.sectionTitle(doc, "Constraint Summary", left, constraintY, contentW);
    doc.autoTable({
      startY: constraintY + 5,
      margin: { left, right: 12 },
      head: [["Class", "Component", "Area (ha)", "Class", "Component", "Area (ha)"]],
      body: [
        ["Extreme", "Slope", this.numberText(model.metrics.extSlope), "Extreme", "Inundation", this.numberText(model.metrics.extInundation)],
        ["Extreme", "Altitude", this.numberText(model.metrics.extAltitude), "Extreme", "Mangrove", this.numberText(model.metrics.extMangrove)],
        ["Extreme", "Karst", this.numberText(model.metrics.extKarst), "Serious", "Slope Relief", this.numberText(model.metrics.serSlope)],
        ["Protected", "Protected Area", this.numberText(model.metrics.protected), "Serious", "Inundation", this.numberText(model.metrics.serInundation)]
      ],
      theme: "striped",
      styles: { font: "helvetica", fontSize: 7.2, cellPadding: 1.6, lineColor: [208, 216, 211] },
      headStyles: { fillColor: [35, 105, 64], textColor: 255, fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" }, 5: { halign: "right" } }
    });

    const notesY = doc.lastAutoTable.finalY + 5;
    doc.setFillColor(244, 248, 245);
    doc.setDrawColor(185, 199, 190);
    doc.roundedRect(left, notesY, contentW, 16, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.1);
    doc.setTextColor(45, 65, 52);
    doc.text(`Legacy reference: ${model.legacyReport} | Calculation version: ${model.calculationVersion}`, left + 4, notesY + 6);
    doc.setFont("helvetica", "normal");
    doc.text("Source: FIMS Cloud PostGIS / FastAPI results. Page size: A4. Values match the current Province Summary.", left + 4, notesY + 11.5);
  }

  drawKpi(doc, x, y, w, h, item) {
    doc.setFillColor(244, 248, 245);
    doc.setDrawColor(174, 197, 181);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
    doc.setTextColor(48, 70, 56);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const label = doc.splitTextToSize(item.label, w - 5);
    doc.text(label, x + 2.5, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.text(item.formatted, x + 2.5, y + h - 3.2);
  }

  sectionTitle(doc, title, x, y, w) {
    doc.setFillColor(225, 238, 229);
    doc.setDrawColor(176, 196, 182);
    doc.rect(x, y, w, 5, "FD");
    doc.setTextColor(33, 81, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.text(title, x + 2, y + 3.6);
  }

  drawComparisonChart(doc, model, x, y, w, h) {
    doc.setFillColor(250, 251, 250);
    doc.setDrawColor(195, 205, 198);
    doc.rect(x, y, w, h, "FD");

    const rows = [
      { label: "Area", original: model.metrics.grossArea75, revised: model.metrics.revisedGrossArea },
      { label: "Adjusted", original: model.metrics.adjustedArea75, revised: model.metrics.revisedAdjustedArea },
      { label: "Volume", original: model.metrics.grossVolume75, revised: model.metrics.revisedGrossVolume }
    ];
    const chartX = x + 25;
    const chartW = w - 31;
    rows.forEach((row, index) => {
      const yy = y + 7 + index * 10;
      const max = Math.max(row.original, row.revised, 1);
      const ow = chartW * row.original / max;
      const rw = chartW * row.revised / max;
      doc.setTextColor(65, 75, 69);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.4);
      doc.text(row.label, x + 3, yy + 2.5);
      doc.setFillColor(172, 204, 183);
      doc.rect(chartX, yy, ow, 3, "F");
      doc.setFillColor(35, 105, 64);
      doc.rect(chartX, yy + 4, rw, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.text(`${this.compactNumber(row.original)} / ${this.compactNumber(row.revised)}`, chartX, yy + 9.5);
    });
    doc.setFontSize(5.8);
    doc.setFillColor(172, 204, 183); doc.rect(x + 4, y + h - 5, 4, 2.5, "F");
    doc.setTextColor(60, 70, 64); doc.text("Original", x + 9, y + h - 2.8);
    doc.setFillColor(35, 105, 64); doc.rect(x + 29, y + h - 5, 4, 2.5, "F");
    doc.text("Revised", x + 34, y + h - 2.8);
  }

  drawSmallMap(doc, geometry, x, y, w, h, provinceName) {
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(195, 205, 198);
    doc.rect(x, y, w, h, "FD");
    const polygons = this.geometryPolygons(geometry);
    if (!polygons.length) {
      doc.setFontSize(7);
      doc.setTextColor(95, 105, 99);
      doc.text("Province geometry unavailable", x + w / 2, y + h / 2, { align: "center" });
    } else {
      const points = polygons.flat(2);
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const dx = Math.max(maxX - minX, 1e-9), dy = Math.max(maxY - minY, 1e-9);
      const scale = Math.min((w - 10) / dx, (h - 10) / dy);
      const ox = x + (w - dx * scale) / 2;
      const oy = y + (h - dy * scale) / 2;
      doc.setDrawColor(39, 117, 73);
      doc.setFillColor(217, 235, 223);
      for (const polygon of polygons) {
        for (const ring of polygon) {
          if (!ring.length) continue;
          const mapped = ring.map(([px, py]) => [ox + (px - minX) * scale, oy + (maxY - py) * scale]);
          const [sx, sy] = mapped[0];
          const lines = mapped.slice(1).map(([px, py], i) => [px - mapped[i][0], py - mapped[i][1]]);
          doc.lines(lines, sx, sy, [1, 1], "FD", true);
        }
      }
    }
    doc.setTextColor(45, 75, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(provinceName, x + 3, y + h - 2.5);
  }

  addFooter(doc, model) {
    doc.setDrawColor(190, 200, 193);
    doc.line(12, 287, 198, 287);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(75, 85, 79);
    doc.text(`FIMS Cloud 3.8.2 | ${model.provinceName}`, 12, 291.5);
    doc.text("Page 1 of 1", 198, 291.5, { align: "right" });
  }

  extractGeometry(province) {
    return province?.geometry || province?.feature?.geometry || province?.raw?.geometry || province?.raw?.feature?.geometry || null;
  }

  geometryPolygons(geometry) {
    if (!geometry || !Array.isArray(geometry.coordinates)) return [];
    if (geometry.type === "Polygon") return [geometry.coordinates];
    if (geometry.type === "MultiPolygon") return geometry.coordinates;
    return [];
  }

  metric(label, value, unit) {
    return { label, value, unit, formatted: unit === "m³" ? this.volume(value) : this.area(value) };
  }

  number(value) { return this.numberOrNull(value) ?? 0; }

  numberOrNull(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value === null || value === undefined || value === "") return null;
    const text = String(value).trim().replace(/,/g, "").replace(/[^0-9eE+\-.]/g, "");
    if (!text) return null;
    const result = Number(text);
    return Number.isFinite(result) ? result : null;
  }

  normalizeKey(value) { return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  area(value) { return `${this.numberText(value)} ha`; }
  volume(value) { return `${this.numberText(value)} m³`; }
  numberText(value) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(this.number(value)); }
  compactNumber(value) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(this.number(value)); }

  firstText(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim() !== "") return String(value).trim();
    }
    return "—";
  }

  formatDateTime(value) {
    return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value);
  }

  compactDate(value) {
    if (!value || value === "—") return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : this.formatDateTime(date);
  }

  dateStamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }
}

export function createReportEngine(options = {}) {
  return new ReportEngine(options);
}
