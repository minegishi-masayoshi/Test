/**
 * FIMS Cloud report engine.
 * Ver.3.9.1: local table plugin integration for stable GitHub Pages PDF output.
 * Uses the same browser-side jsPDF + jsPDF-AutoTable approach as FIPS.
 */
export const REPORT_ENGINE_VERSION = "3.9.1";

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

  async exportPdf(context) {
    if (!this.isSupported(context)) {
      throw new Error("Select 'Province Constraint'. This is the first implemented PDF report.");
    }

    const jsPDFClass = window.jspdf?.jsPDF;
    if (!jsPDFClass) throw new Error("jsPDF was not loaded.");

    const model = this.buildModel(context);
    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    this.drawCompactReport(doc, model);
    this.addFooter(doc, model);

    const safeProvince = model.provinceName.replace(/[^A-Za-z0-9_-]+/g, "_");
    doc.save(`FIMS_Province_Constraint_${safeProvince}_${this.dateStamp()}.pdf`);
    this.onStatus(`PDF exported: ${model.title} for ${model.provinceName}.`);
  }

  runAutoTable(doc, options) {
    if (typeof doc?.autoTable !== "function") {
      throw new Error("The local PDF table plugin was not loaded.");
    }
    doc.autoTable(options);
  }

  buildModel(context) {
    const summary = context.summary || {};
    const values = summary.values || {};
    const metadata = summary.metadata || {};
    const rows = Array.isArray(summary.rows) ? summary.rows : [];
    const province = context.province || {};
    const fmus = Array.isArray(context.fmus) ? context.fmus : [];
    const provinces = Array.isArray(context.provinces) ? context.provinces : [];

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
      geometry: this.extractGeometry(province),
      provinceGeometries: provinces.map((item) => ({
        name: this.firstText(item?.name, item?.provinceName, item?.properties?.name, item?.properties?.descrip, "Province"),
        code: this.firstText(item?.code, item?.id, item?.provinceCode, item?.properties?.province, ""),
        geometry: this.extractGeometry(item)
      })).filter((item) => item.geometry)
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

    // Spatial context and core forest metrics.
    const panelY = 36;
    const panelH = 65;
    this.sectionTitle(doc, "Province Location in Papua New Guinea", left, panelY, 89);
    this.drawPngLocationMap(doc, model, left, panelY + 5, 89, panelH - 5);

    this.sectionTitle(doc, "Forest Area and Volume", 104, panelY, 94);
    this.runAutoTable(doc, {
      startY: panelY + 5,
      margin: { left: 104, right: 12 },
      body: [
        ["Vegetation / Gross Area", this.area(model.metrics.area)],
        ["Gross Forest Area '75", this.area(model.metrics.grossArea75)],
        ["Adjusted Forest Area '75", this.area(model.metrics.adjustedArea75)],
        ["Gross Forest Volume '75", this.volume(model.metrics.grossVolume75)],
        ["Logged / Land Use — Current", this.area(model.metrics.loggedLandUse)],
        ["Revised Gross Forest Area", this.area(model.metrics.revisedGrossArea)],
        ["Rev Adjusted Forest Area", this.area(model.metrics.revisedAdjustedArea)],
        ["Rev Gross Forest Volume", this.volume(model.metrics.revisedGrossVolume)]
      ],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7.1,
        cellPadding: 1.45,
        lineColor: [184, 198, 189]
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 34, halign: "right", fontStyle: "bold" }
      }
    });

    // One integrated table provides exact values and relative visual comparison.
    const constraintY = 106;
    this.sectionTitle(doc, "Constraint Summary", left, constraintY, contentW);
    const constraintRows = this.constraintRows(model);
    const maxConstraint = Math.max(...constraintRows.map((row) => row.value), 1);

    this.runAutoTable(doc, {
      startY: constraintY + 5,
      margin: { left, right: 12 },
      head: [["Class", "Constraint", "Area (ha)", "Relative area"]],
      body: constraintRows.map((row) => [
        row.className,
        row.label,
        this.numberText(row.value),
        ""
      ]),
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 1.75,
        lineColor: [208, 216, 211],
        minCellHeight: 7
      },
      headStyles: {
        fillColor: [35, 105, 64],
        textColor: 255,
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 34, halign: "right" },
        3: { cellWidth: 72 }
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 3) return;
        const row = constraintRows[data.row.index];
        if (!row) return;

        const padding = 2;
        const trackX = data.cell.x + padding;
        const trackY = data.cell.y + data.cell.height / 2 - 1.4;
        const trackW = Math.max(data.cell.width - padding * 2, 1);
        const barW = trackW * this.number(row.value) / maxConstraint;

        doc.setFillColor(225, 233, 227);
        doc.roundedRect(trackX, trackY, trackW, 2.8, 1, 1, "F");
        if (barW > 0) {
          if (row.className === "Serious") {
            doc.setFillColor(184, 116, 45);
          } else if (row.className === "Protected") {
            doc.setFillColor(88, 126, 97);
          } else {
            doc.setFillColor(35, 105, 64);
          }
          doc.roundedRect(trackX, trackY, Math.max(barW, 0.8), 2.8, 1, 1, "F");
        }
      }
    });
  }

  constraintRows(model) {
    return [
      { className: "Serious", label: "Slope Relief", value: this.number(model.metrics.serSlope) },
      { className: "Serious", label: "Inundation", value: this.number(model.metrics.serInundation) },
      { className: "Protected", label: "Protected Area", value: this.number(model.metrics.protected) },
      { className: "Extreme", label: "Karst", value: this.number(model.metrics.extKarst) },
      { className: "Extreme", label: "Inundation", value: this.number(model.metrics.extInundation) },
      { className: "Extreme", label: "Slope", value: this.number(model.metrics.extSlope) },
      { className: "Extreme", label: "Altitude", value: this.number(model.metrics.extAltitude) },
      { className: "Extreme", label: "Mangrove", value: this.number(model.metrics.extMangrove) }
    ].sort((a, b) => b.value - a.value);
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

  drawPngLocationMap(doc, model, x, y, w, h) {
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(195, 205, 198);
    doc.rect(x, y, w, h, "FD");

    const records = model.provinceGeometries?.length
      ? model.provinceGeometries
      : [{ name: model.provinceName, code: model.provinceCode, geometry: model.geometry }];
    const drawable = records.map((item) => ({ ...item, polygons: this.geometryPolygons(item.geometry) })).filter((item) => item.polygons.length);
    if (!drawable.length) {
      doc.setFontSize(7);
      doc.setTextColor(95, 105, 99);
      doc.text("PNG Province geometry unavailable", x + w / 2, y + h / 2, { align: "center" });
      return;
    }

    const allPoints = drawable.flatMap((item) => item.polygons.flat(2));
    const xs = allPoints.map((p) => p[0]);
    const ys = allPoints.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const dx = Math.max(maxX - minX, 1e-9), dy = Math.max(maxY - minY, 1e-9);
    const scale = Math.min((w - 8) / dx, (h - 12) / dy);
    const ox = x + (w - dx * scale) / 2;
    const oy = y + 3 + ((h - 9) - dy * scale) / 2;
    const selectedCode = this.normalizeKey(model.provinceCode);
    const selectedName = this.normalizeKey(model.provinceName);

    for (const item of drawable) {
      const isSelected = (selectedCode && this.normalizeKey(item.code) === selectedCode) || this.normalizeKey(item.name) === selectedName;
      doc.setDrawColor(...(isSelected ? [215, 122, 32] : [105, 130, 113]));
      doc.setFillColor(...(isSelected ? [241, 178, 101] : [222, 232, 225]));
      doc.setLineWidth(isSelected ? 0.7 : 0.2);
      for (const polygon of item.polygons) {
        for (const ring of polygon) {
          if (!ring.length) continue;
          const mapped = ring.map(([px, py]) => [ox + (px - minX) * scale, oy + (maxY - py) * scale]);
          const [sx, sy] = mapped[0];
          const lines = mapped.slice(1).map(([px, py], i) => [px - mapped[i][0], py - mapped[i][1]]);
          doc.lines(lines, sx, sy, [1, 1], "FD", true);
        }
      }
    }
    doc.setLineWidth(0.2);
    doc.setFillColor(241, 178, 101);
    doc.rect(x + 3, y + h - 5.5, 4, 2.5, "F");
    doc.setTextColor(45, 75, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(`Selected: ${model.provinceName}`, x + 9, y + h - 3.2);
  }

  addFooter(doc) {
    doc.setDrawColor(190, 200, 193);
    doc.line(12, 287, 198, 287);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(75, 85, 79);
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
