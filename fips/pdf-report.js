/* =========================================================
   FIPS PDF Report Generator
   Modern cloud layout with legacy FIPS information
========================================================= */

const PDF_BUTTON_ID = "printReportBtn";

const PDF_PAGE = {
  width: 210,
  height: 297,
  marginLeft: 14,
  marginRight: 14,
  marginTop: 12,
  marginBottom: 12
};

const PDF_CONTENT_WIDTH =
  PDF_PAGE.width -
  PDF_PAGE.marginLeft -
  PDF_PAGE.marginRight;

const COLORS = {
  darkGreen: [20, 83, 45],
  green: [22, 101, 52],
  headerFill: [226, 232, 240],
  labelFill: [241, 245, 249],
  lightFill: [248, 250, 252],
  totalFill: [219, 234, 254],
  border: [100, 116, 139],
  darkText: [17, 24, 39],
  mutedText: [100, 116, 139],
  white: [255, 255, 255]
};


/* =========================================================
   Utilities
========================================================= */

function getElement(elementId) {
  return document.getElementById(elementId);
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfText(value) {
  return cleanText(value)
    .replace(/[–—]/g, "-")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/㎡/g, "m2")
    .replace(/㎥/g, "m3");
}

function sanitizeFileName(value) {
  const normalized =
    normalizePdfText(value || "FIPS_Report");

  return (
    normalized
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") ||
    "FIPS_Report"
  );
}

function formatDateForFileName(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}_${hour}${minute}`;
}

function isLoadingText(value) {
  const text = cleanText(value).toLowerCase();

  return (
    text.includes("loading") ||
    text.includes("preparing") ||
    text.includes("failed to load")
  );
}


/* =========================================================
   Library Validation
========================================================= */

function getJsPdfConstructor() {
  return window.jspdf?.jsPDF || null;
}

function librariesAvailable() {
  const JsPDF = getJsPdfConstructor();

  return Boolean(
    JsPDF &&
    JsPDF.API?.autoTable
  );
}


/* =========================================================
   DOM Extraction
========================================================= */

function extractReportMeta() {
  const metaContainer = getElement("reportMeta");

  if (!metaContainer) {
    return [];
  }

  return Array.from(
    metaContainer.querySelectorAll("div")
  )
    .map((rowElement) => ({
      label: normalizePdfText(
        rowElement.querySelector("strong")?.textContent || ""
      ),
      value: normalizePdfText(
        rowElement.querySelector("span")?.textContent || ""
      )
    }))
    .filter((row) => row.label || row.value);
}

function extractLegacyInformation() {
  return [
    [
      "Gross Area (ha)",
      normalizePdfText(
        getElement("grossAreaValue")?.textContent || "-"
      ),
      "Date of Survey",
      normalizePdfText(
        getElement("surveyDateValue")?.textContent || "-"
      )
    ],
    [
      "Net Area (ha)",
      normalizePdfText(
        getElement("netAreaValue")?.textContent || "-"
      ),
      "File Reference",
      normalizePdfText(
        getElement("fileReferenceValue")?.textContent || "-"
      )
    ],
    [
      "Sample Area (ha), stems 50 cm+",
      normalizePdfText(
        getElement("sampleArea50Value")?.textContent || "-"
      ),
      "Number of Plots",
      normalizePdfText(
        getElement("numberOfPlotsValue")?.textContent || "-"
      )
    ],
    [
      "Sample Area (ha), stems 20-49 cm",
      normalizePdfText(
        getElement("sampleArea20Value")?.textContent || "-"
      ),
      "Sampling Intensity",
      normalizePdfText(
        getElement("samplingIntensityValue")?.textContent || "-"
      )
    ]
  ];
}

function extractHtmlTable(tableId) {
  const table = getElement(tableId);

  if (!table) {
    return {
      head: [],
      body: []
    };
  }

  const head = Array.from(
    table.querySelectorAll("thead tr")
  ).map((row) =>
    Array.from(
      row.querySelectorAll("th, td")
    ).map((cell) =>
      normalizePdfText(cell.textContent)
    )
  );

  const body = Array.from(
    table.querySelectorAll("tbody tr")
  )
    .map((row) =>
      Array.from(
        row.querySelectorAll("th, td")
      ).map((cell) =>
        normalizePdfText(cell.textContent)
      )
    )
    .filter((row) => {
      const combined = row.join(" ").toLowerCase();

      return (
        row.length > 1 &&
        !combined.includes("loading") &&
        !combined.includes("no assessment") &&
        !combined.includes("no major species") &&
        !combined.includes("failed to load")
      );
    });

  return {
    head,
    body
  };
}

function extractAllReportData() {
  return {
    title: "ASSESSMENT SUMMARY - ALL BLOCKS",
    subtitle: "FIPS Survey Assessment Report",
    version: "FIPS Cloud version 1.0",
    meta: extractReportMeta(),
    legacyInformation: extractLegacyInformation(),
    stocking: extractHtmlTable("stockingAssessmentTable"),
    basalArea: extractHtmlTable("basalAreaAssessmentTable"),
    volume: extractHtmlTable("volumeAssessmentTable"),
    majorSpecies: extractHtmlTable("majorSpeciesTable")
  };
}


/* =========================================================
   Data Readiness
========================================================= */

function reportDataReady() {
  if (!librariesAvailable()) {
    return false;
  }

  const requiredElementIds = [
    "reportTitle",
    "stockingAssessmentTable",
    "basalAreaAssessmentTable",
    "volumeAssessmentTable",
    "majorSpeciesTable",
    "grossAreaValue",
    "numberOfPlotsValue"
  ];

  if (
    !requiredElementIds.every(
      (elementId) => Boolean(getElement(elementId))
    )
  ) {
    return false;
  }

  const requiredBodyIds = [
    "stockingAssessmentBody",
    "basalAreaAssessmentBody",
    "volumeAssessmentBody",
    "majorSpeciesBody"
  ];

  return !requiredBodyIds.some((elementId) => {
    const element = getElement(elementId);

    return (
      !element ||
      isLoadingText(element.textContent)
    );
  });
}


/* =========================================================
   Button State
========================================================= */

function setPdfButtonState({ enabled, label }) {
  const button = getElement(PDF_BUTTON_ID);

  if (!button) {
    return;
  }

  button.disabled = !enabled;
  button.textContent = label;
}

function refreshPdfButtonState() {
  if (!librariesAvailable()) {
    setPdfButtonState({
      enabled: false,
      label: "PDF Library Error"
    });
    return;
  }

  if (reportDataReady()) {
    setPdfButtonState({
      enabled: true,
      label: "Export PDF Report"
    });
    return;
  }

  setPdfButtonState({
    enabled: false,
    label: "Preparing PDF..."
  });
}


/* =========================================================
   PDF Drawing Utilities
========================================================= */

function setTextColor(doc, color = COLORS.darkText) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDrawColor(doc, color = COLORS.border) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function drawReportHeader(
  doc,
  reportData,
  pageNumber
) {
  let y = PDF_PAGE.marginTop;

  setTextColor(doc, COLORS.darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);

  doc.text(
    reportData.title,
    PDF_PAGE.marginLeft,
    y
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTextColor(doc, COLORS.mutedText);

  doc.text(
    reportData.subtitle,
    PDF_PAGE.marginLeft,
    y + 4.5
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, COLORS.darkText);

  doc.text(
    reportData.version,
    PDF_PAGE.width - PDF_PAGE.marginRight,
    y,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.text(
    `Page No. ${pageNumber}`,
    PDF_PAGE.width - PDF_PAGE.marginRight,
    y + 4.5,
    { align: "right" }
  );

  y += 10;

  const leftMeta = reportData.meta.filter((_, index) => index % 2 === 0);
  const rightMeta = reportData.meta.filter((_, index) => index % 2 === 1);

  const maxRows = Math.max(leftMeta.length, rightMeta.length);

  doc.setFontSize(8);

  for (let index = 0; index < maxRows; index += 1) {
    const left = leftMeta[index];
    const right = rightMeta[index];

    if (left) {
      doc.setFont("helvetica", "bold");
      doc.text(
        left.label,
        PDF_PAGE.marginLeft,
        y
      );

      doc.setFont("helvetica", "normal");
      doc.text(
        left.value || "-",
        PDF_PAGE.marginLeft + 29,
        y
      );
    }

    if (right) {
      const rightX = 111;

      doc.setFont("helvetica", "bold");
      doc.text(
        right.label,
        rightX,
        y
      );

      doc.setFont("helvetica", "normal");
      doc.text(
        right.value || "-",
        rightX + 30,
        y
      );
    }

    y += 4.2;
  }

  setDrawColor(doc, COLORS.green);
  doc.setLineWidth(0.45);

  doc.line(
    PDF_PAGE.marginLeft,
    y + 1,
    PDF_PAGE.width - PDF_PAGE.marginRight,
    y + 1
  );

  return y + 5;
}

function drawSectionTitle(doc, title, y) {
  setTextColor(doc, COLORS.darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text(
    normalizePdfText(title),
    PDF_PAGE.marginLeft,
    y
  );

  setDrawColor(doc, [203, 213, 225]);
  doc.setLineWidth(0.25);

  doc.line(
    PDF_PAGE.marginLeft,
    y + 2,
    PDF_PAGE.width - PDF_PAGE.marginRight,
    y + 2
  );

  return y + 6;
}


/* =========================================================
   PDF Tables
========================================================= */

function getCommonTableStyles() {
  return {
    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 1.45,
      lineWidth: 0.15,
      lineColor: COLORS.border,
      textColor: COLORS.darkText,
      overflow: "linebreak",
      valign: "middle"
    },

    headStyles: {
      fillColor: COLORS.headerFill,
      textColor: COLORS.darkText,
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.15,
      lineColor: COLORS.border
    },

    bodyStyles: {
      fillColor: COLORS.white
    },

    alternateRowStyles: {
      fillColor: COLORS.lightFill
    },

    margin: {
      left: PDF_PAGE.marginLeft,
      right: PDF_PAGE.marginRight
    }
  };
}

function drawLegacyInformationTable(
  doc,
  rows,
  startY
) {
  doc.autoTable({
    ...getCommonTableStyles(),
    startY,
    body: rows,
    showHead: "never",
    tableWidth: PDF_CONTENT_WIDTH,

    styles: {
      ...getCommonTableStyles().styles,
      fontSize: 7.1,
      cellPadding: 1.6
    },

    columnStyles: {
      0: {
        cellWidth: 56,
        fillColor: COLORS.labelFill,
        fontStyle: "bold"
      },
      1: {
        cellWidth: 35,
        halign: "right"
      },
      2: {
        cellWidth: 56,
        fillColor: COLORS.labelFill,
        fontStyle: "bold"
      },
      3: {
        cellWidth: 35,
        halign: "right"
      }
    }
  });

  return (
    doc.lastAutoTable?.finalY ||
    startY
  ) + 5;
}

function drawAssessmentTable(
  doc,
  title,
  tableData,
  startY
) {
  setTextColor(doc, COLORS.darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  doc.text(
    normalizePdfText(title),
    PDF_PAGE.marginLeft,
    startY
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setTextColor(doc, COLORS.mutedText);

  doc.text(
    "Diameter Class",
    PDF_PAGE.marginLeft + PDF_CONTENT_WIDTH / 2,
    startY + 3.5,
    { align: "center" }
  );

  const tableStartY = startY + 5;

  doc.autoTable({
    ...getCommonTableStyles(),
    startY: tableStartY,
    head: tableData.head,
    body: tableData.body,
    tableWidth: PDF_CONTENT_WIDTH,

    columnStyles: {
      0: {
        cellWidth: 42,
        halign: "left"
      },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" }
    },

    didParseCell(data) {
      const rowData = data.row?.raw;

      const firstCell =
        Array.isArray(rowData)
          ? normalizePdfText(rowData[0])
          : "";

      if (
        data.section === "body" &&
        firstCell.toUpperCase() === "TOTAL"
      ) {
        data.cell.styles.fillColor = COLORS.totalFill;
        data.cell.styles.fontStyle = "bold";
      }
    }
  });

  return (
    doc.lastAutoTable?.finalY ||
    tableStartY
  ) + 5;
}

function drawMajorSpeciesTable(
  doc,
  tableData,
  startY
) {
  doc.autoTable({
    ...getCommonTableStyles(),
    startY,
    head: tableData.head,
    body: tableData.body,
    tableWidth: PDF_CONTENT_WIDTH,

    styles: {
      ...getCommonTableStyles().styles,
      fontSize: 7.1,
      cellPadding: 1.55
    },

    headStyles: {
      ...getCommonTableStyles().headStyles,
      fontSize: 6.9
    },

    columnStyles: {
      0: {
        cellWidth: 54,
        halign: "left"
      },
      1: {
        cellWidth: 18,
        halign: "center"
      },
      2: {
        cellWidth: 25,
        halign: "right"
      },
      3: {
        cellWidth: 25,
        halign: "right"
      },
      4: {
        cellWidth: 25,
        halign: "right"
      },
      5: {
        cellWidth: 35,
        halign: "right"
      }
    }
  });

  return (
    doc.lastAutoTable?.finalY ||
    startY
  ) + 5;
}


/* =========================================================
   Footer
========================================================= */

function addPageFooters(doc) {
  const pageCount = doc.getNumberOfPages();

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber);

    setDrawColor(doc, [203, 213, 225]);
    doc.setLineWidth(0.2);

    doc.line(
      PDF_PAGE.marginLeft,
      PDF_PAGE.height - PDF_PAGE.marginBottom + 2,
      PDF_PAGE.width - PDF_PAGE.marginRight,
      PDF_PAGE.height - PDF_PAGE.marginBottom + 2
    );

    setTextColor(doc, COLORS.mutedText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text(
      "Generated from FIPS Cloud",
      PDF_PAGE.marginLeft,
      PDF_PAGE.height - 5
    );

    doc.text(
      `Page ${pageNumber} of ${pageCount}`,
      PDF_PAGE.width - PDF_PAGE.marginRight,
      PDF_PAGE.height - 5,
      {
        align: "right"
      }
    );
  }
}


/* =========================================================
   Main PDF Generator
========================================================= */

async function generateFipsPdf() {
  if (!librariesAvailable()) {
    throw new Error(
      "jsPDF or AutoTable is not available."
    );
  }

  if (!reportDataReady()) {
    throw new Error(
      "The report data has not finished loading."
    );
  }

  const reportData = extractAllReportData();
  const JsPDF = getJsPdfConstructor();

  const doc = new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true
  });

  doc.setProperties({
    title: reportData.title,
    subject: "FIPS Assessment Summary - All Blocks",
    author: "FIPS Cloud",
    creator: "FIPS Cloud jsPDF Generator"
  });


  /* Page 1 */

  let y = drawReportHeader(doc, reportData, 1);

  y = drawSectionTitle(
    doc,
    "Survey Information",
    y
  );

  y = drawLegacyInformationTable(
    doc,
    reportData.legacyInformation,
    y
  );

  y = drawSectionTitle(
    doc,
    "Assessment Summary",
    y
  );

  y = drawAssessmentTable(
    doc,
    "(A) Stocking per hectare",
    reportData.stocking,
    y
  );

  y = drawAssessmentTable(
    doc,
    "(B) Basal area per hectare (m2/ha)",
    reportData.basalArea,
    y
  );

  y = drawAssessmentTable(
    doc,
    "(C) Gross volume per hectare (m3/ha)",
    reportData.volume,
    y
  );

  setTextColor(doc, COLORS.mutedText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);

  doc.text(
    "NB. If Quality Class figures do not add up to TOTAL, quality-code records may be incomplete.",
    PDF_PAGE.marginLeft,
    Math.min(y, PDF_PAGE.height - 18)
  );


  /* Page 2 */

  doc.addPage();

  let page2Y = drawReportHeader(doc, reportData, 2);

  page2Y = drawSectionTitle(
    doc,
    "(D) Major species summary",
    page2Y
  );

  setTextColor(doc, COLORS.mutedText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);

  const description =
    "List of major species in sawlog size classes, in order of volume representation in the assessment.";

  const descriptionLines = doc.splitTextToSize(
    description,
    PDF_CONTENT_WIDTH
  );

  doc.text(
    descriptionLines,
    PDF_PAGE.marginLeft,
    page2Y
  );

  page2Y += descriptionLines.length * 3.5 + 2;

  drawMajorSpeciesTable(
    doc,
    reportData.majorSpecies,
    page2Y
  );

  addPageFooters(doc);

  const surveyName =
    reportData.meta.find(
      (item) =>
        item.label.toLowerCase().includes("survey name")
    )?.value ||
    "Survey";

  const fileName =
    `FIPS_${sanitizeFileName(
      surveyName
    )}_${formatDateForFileName()}.pdf`;

  doc.save(fileName);
}


/* =========================================================
   Button Event
========================================================= */

async function handlePdfButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const button = getElement(PDF_BUTTON_ID);

  if (!button) {
    return;
  }

  const originalLabel = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Generating PDF...";

    await generateFipsPdf();

    button.textContent = "PDF Generated";

    window.setTimeout(() => {
      refreshPdfButtonState();
    }, 1200);

  } catch (error) {
    console.error(
      "PDF generation failed:",
      error
    );

    button.disabled = false;
    button.textContent =
      originalLabel ||
      "Export PDF Report";

    window.alert(
      error?.message ||
      "Failed to generate the PDF report."
    );
  }
}


/* =========================================================
   Initialization
========================================================= */

function attachPdfButtonHandler() {
  const button = getElement(PDF_BUTTON_ID);

  if (!button) {
    return false;
  }

  button.addEventListener(
    "click",
    handlePdfButtonClick,
    true
  );

  return true;
}

function observeReportLoading() {
  const observer = new MutationObserver(() => {
    refreshPdfButtonState();

    if (reportDataReady()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.setTimeout(() => {
    observer.disconnect();
    refreshPdfButtonState();
  }, 30000);
}

function initializePdfReport() {
  if (!librariesAvailable()) {
    console.error(
      "PDF libraries could not be loaded."
    );

    setPdfButtonState({
      enabled: false,
      label: "PDF Library Error"
    });

    return;
  }

  if (!attachPdfButtonHandler()) {
    console.error(
      "PDF export button was not found."
    );
    return;
  }

  refreshPdfButtonState();
  observeReportLoading();
}


/* =========================================================
   Start
========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializePdfReport,
    {
      once: true
    }
  );
} else {
  initializePdfReport();
}
