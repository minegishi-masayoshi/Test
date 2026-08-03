/*
 * FIMS Cloud lightweight jsPDF table plugin.
 * Provides the limited doc.autoTable(options) API required by FIMS reports.
 * Ver.3.8.8
 */
(function (global) {
  "use strict";

  const jsPDF = global.jspdf && global.jspdf.jsPDF;
  if (!jsPDF || !jsPDF.API) {
    console.error("[FIMS report] jsPDF must be loaded before the local table plugin.");
    return;
  }

  function valueAt(obj, key, fallback) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
  }

  function normalizeMargin(margin) {
    if (typeof margin === "number") return { top: margin, right: margin, bottom: margin, left: margin };
    const m = margin || {};
    return {
      top: valueAt(m, "top", 10),
      right: valueAt(m, "right", 10),
      bottom: valueAt(m, "bottom", 10),
      left: valueAt(m, "left", 10)
    };
  }

  function setFill(doc, color) {
    if (Array.isArray(color)) doc.setFillColor.apply(doc, color);
    else if (color !== undefined && color !== null) doc.setFillColor(color);
  }

  function setText(doc, color) {
    if (Array.isArray(color)) doc.setTextColor.apply(doc, color);
    else if (color !== undefined && color !== null) doc.setTextColor(color);
  }

  function setDraw(doc, color) {
    if (Array.isArray(color)) doc.setDrawColor.apply(doc, color);
    else if (color !== undefined && color !== null) doc.setDrawColor(color);
  }

  function toRows(rows) {
    return Array.isArray(rows) ? rows.map((r) => Array.isArray(r) ? r : Object.values(r || {})) : [];
  }

  jsPDF.API.autoTable = function (options) {
    const doc = this;
    const opts = options || {};
    const margin = normalizeMargin(opts.margin);
    const head = toRows(opts.head);
    const body = toRows(opts.body);
    const allRows = head.concat(body);
    const colCount = Math.max(1, ...allRows.map((r) => r.length));
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const defaultStyles = Object.assign({
      font: "helvetica",
      fontStyle: "normal",
      fontSize: 8,
      cellPadding: 1.5,
      minCellHeight: 0,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [30, 30, 30],
      fillColor: null,
      halign: "left"
    }, opts.styles || {});
    const headStyles = Object.assign({}, defaultStyles, opts.headStyles || {});
    const columnStyles = opts.columnStyles || {};

    let widths = [];
    let specified = 0;
    let unspecified = 0;
    for (let i = 0; i < colCount; i += 1) {
      const w = columnStyles[i] && Number(columnStyles[i].cellWidth);
      if (Number.isFinite(w) && w > 0) { widths[i] = w; specified += w; }
      else { widths[i] = null; unspecified += 1; }
    }
    const available = pageW - margin.left - margin.right;
    const autoW = unspecified ? Math.max((available - specified) / unspecified, 5) : 0;
    widths = widths.map((w) => w || autoW);

    let y = Number(opts.startY) || margin.top;

    function drawRow(row, section, rowIndex) {
      const base = section === "head" ? headStyles : defaultStyles;
      const padding = Number(base.cellPadding) || 0;
      const fontSize = Number(base.fontSize) || 8;
      doc.setFont(base.font || "helvetica", base.fontStyle || "normal");
      doc.setFontSize(fontSize);
      const wrapped = [];
      let rowH = Math.max(Number(base.minCellHeight) || 0, fontSize * 0.42 + padding * 2 + 1);
      for (let c = 0; c < colCount; c += 1) {
        const text = String(row[c] == null ? "" : row[c]);
        const lines = doc.splitTextToSize(text, Math.max(widths[c] - padding * 2, 1));
        wrapped[c] = lines;
        rowH = Math.max(rowH, lines.length * fontSize * 0.38 + padding * 2 + 1);
      }
      if (y + rowH > pageH - margin.bottom) {
        doc.addPage();
        y = margin.top;
      }

      let x = margin.left;
      for (let c = 0; c < colCount; c += 1) {
        const col = columnStyles[c] || {};
        const style = Object.assign({}, base, col);
        let fill = style.fillColor;
        if (section === "body" && opts.theme === "striped" && rowIndex % 2 === 1 && fill == null) fill = [246, 248, 246];
        if (section === "head" && fill == null) fill = [230, 235, 232];
        setDraw(doc, style.lineColor);
        doc.setLineWidth(Number(style.lineWidth) || 0.1);
        if (fill != null) {
          setFill(doc, fill);
          doc.rect(x, y, widths[c], rowH, "FD");
        } else {
          doc.rect(x, y, widths[c], rowH, "S");
        }
        setText(doc, style.textColor);
        doc.setFont(style.font || "helvetica", style.fontStyle || "normal");
        doc.setFontSize(Number(style.fontSize) || fontSize);
        const align = style.halign || "left";
        let tx = x + padding;
        if (align === "right") tx = x + widths[c] - padding;
        else if (align === "center") tx = x + widths[c] / 2;
        const ty = y + padding + (Number(style.fontSize) || fontSize) * 0.36 + 0.8;
        doc.text(wrapped[c], tx, ty, { align });

        if (typeof opts.didDrawCell === "function") {
          opts.didDrawCell({
            doc,
            section,
            row: { index: rowIndex, raw: row },
            column: { index: c },
            cell: { x, y, width: widths[c], height: rowH, raw: row[c] }
          });
        }
        x += widths[c];
      }
      y += rowH;
    }

    head.forEach((row, i) => drawRow(row, "head", i));
    body.forEach((row, i) => drawRow(row, "body", i));
    doc.lastAutoTable = { finalY: y };
    return doc;
  };
})(window);
