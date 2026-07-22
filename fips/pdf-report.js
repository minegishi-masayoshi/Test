/* =========================================================
   FIPS PDF Report Generator
   pdf-report.js - Complete Replacement Version

   Page 1:
   - Report header
   - Assessment Summary
   - (A) Stocking per hectare
   - (B) Basal area per hectare
   - (C) Gross volume per hectare

   Page 2:
   - Report header
   - (D) Major species summary
========================================================= */


/* =========================================================
   Constants
========================================================= */

const PDF_BUTTON_ID =
  "printReportBtn";


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

  headerFill: [
    226,
    232,
    240
  ],

  lightFill: [
    248,
    250,
    252
  ],

  totalFill: [
    219,
    234,
    254
  ],

  border: [
    100,
    116,
    139
  ],

  darkText: [
    17,
    24,
    39
  ],

  mutedText: [
    100,
    116,
    139
  ],

  white: [
    255,
    255,
    255
  ]
};


/* =========================================================
   Utilities
========================================================= */

function getElement(
  elementId
) {
  return document.getElementById(
    elementId
  );
}


function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
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
    normalizePdfText(
      value ||
      "FIPS_Report"
    );

  const safeName =
    normalized
      .replace(
        /[\\/:*?"<>|]/g,
        "_"
      )
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(
        /^_+|_+$/g,
        ""
      );

  return (
    safeName ||
    "FIPS_Report"
  );
}


function formatDateForFileName(
  date = new Date()
) {
  const year =
    String(date.getFullYear());

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  const hour =
    String(
      date.getHours()
    ).padStart(2, "0");

  const minute =
    String(
      date.getMinutes()
    ).padStart(2, "0");

  return (
    `${year}${month}${day}` +
    `_${hour}${minute}`
  );
}


function isLoadingText(value) {
  const text =
    cleanText(value)
      .toLowerCase();

  return (
    text.includes("loading") ||
    text.includes("preparing") ||
    text.includes(
      "failed to load"
    )
  );
}


/* =========================================================
   Library Validation
========================================================= */

function getJsPdfConstructor() {
  return (
    window.jspdf?.jsPDF ||
    null
  );
}


function librariesAvailable() {
  const JsPDF =
    getJsPdfConstructor();

  return Boolean(
    JsPDF &&
    JsPDF.API?.autoTable
  );
}


/* =========================================================
   DOM Data Extraction
========================================================= */

function extractReportTitle() {
  return normalizePdfText(
    getElement(
      "reportTitle"
    )?.textContent ||
    "FIPS Assessment Summary Report"
  );
}


function extractReportMeta() {
  const metaContainer =
    getElement("reportMeta");

  if (!metaContainer) {
    return [];
  }

  return Array.from(
    metaContainer.querySelectorAll(
      "div"
    )
  )
    .map((rowElement) => {
      const strongElement =
        rowElement.querySelector(
          "strong"
        );

      const spanElement =
        rowElement.querySelector(
          "span"
        );

      return {
        label:
          normalizePdfText(
            strongElement
              ?.textContent ||
            ""
          ),

        value:
          normalizePdfText(
            spanElement
              ?.textContent ||
            ""
          )
      };
    })
    .filter(
      (row) =>
        row.label ||
        row.value
    );
}


function extractHtmlTable(
  tableId
) {
  const table =
    getElement(tableId);

  if (!table) {
    return {
      head: [],
      body: []
    };
  }

  const head =
    Array.from(
      table.querySelectorAll(
        "thead tr"
      )
    ).map((row) =>
      Array.from(
        row.querySelectorAll(
          "th, td"
        )
      ).map((cell) =>
        normalizePdfText(
          cell.textContent
        )
      )
    );

  const body =
    Array.from(
      table.querySelectorAll(
        "tbody tr"
      )
    )
      .map((row) =>
        Array.from(
          row.querySelectorAll(
            "th, td"
          )
        ).map((cell) =>
          normalizePdfText(
            cell.textContent
          )
        )
      )
      .filter((row) => {
        const combined =
          row
            .join(" ")
            .toLowerCase();

        return (
          row.length > 1 &&
          !combined.includes(
            "loading"
          ) &&
          !combined.includes(
            "no assessment"
          ) &&
          !combined.includes(
            "no major species"
          ) &&
          !combined.includes(
            "failed to load"
          )
        );
      });

  return {
    head,
    body
  };
}


function extractAllReportData() {
  return {
    title:
      extractReportTitle(),

    meta:
      extractReportMeta(),

    stocking:
      extractHtmlTable(
        "stockingAssessmentTable"
      ),

    basalArea:
      extractHtmlTable(
        "basalAreaAssessmentTable"
      ),

    volume:
      extractHtmlTable(
        "volumeAssessmentTable"
      ),

    majorSpecies:
      extractHtmlTable(
        "majorSpeciesTable"
      )
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
    "majorSpeciesTable"
  ];

  const allElementsExist =
    requiredElementIds.every(
      (elementId) =>
        Boolean(
          getElement(elementId)
        )
    );

  if (!allElementsExist) {
    return false;
  }

  const requiredBodyIds = [
    "stockingAssessmentBody",
    "basalAreaAssessmentBody",
    "volumeAssessmentBody",
    "majorSpeciesBody"
  ];

  const stillLoading =
    requiredBodyIds.some(
      (elementId) => {
        const element =
          getElement(elementId);

        return (
          !element ||
          isLoadingText(
            element.textContent
          )
        );
      }
    );

  return !stillLoading;
}


/* =========================================================
   Button State
========================================================= */

function setPdfButtonState({
  enabled,
  label
}) {
  const button =
    getElement(
      PDF_BUTTON_ID
    );

  if (!button) {
    return;
  }

  button.disabled =
    !enabled;

  button.textContent =
    label;
}


function refreshPdfButtonState() {
  if (!librariesAvailable()) {
    setPdfButtonState({
      enabled: false,
      label:
        "PDF Library Error"
    });

    return;
  }

  if (reportDataReady()) {
    setPdfButtonState({
      enabled: true,
      label:
        "Export PDF Report"
    });

    return;
  }

  setPdfButtonState({
    enabled: false,
    label:
      "Preparing PDF..."
  });
}


/* =========================================================
   PDF Drawing Utilities
========================================================= */

function setTextColor(
  doc,
  color = COLORS.darkText
) {
  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );
}


function setDrawColor(
  doc,
  color = COLORS.border
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );
}


function drawSectionTitle(
  doc,
  title,
  y
) {
  setTextColor(
    doc,
    COLORS.darkGreen
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(12);

  doc.text(
    normalizePdfText(title),
    PDF_PAGE.marginLeft,
    y
  );

  setDrawColor(
    doc,
    [203, 213, 225]
  );

  doc.setLineWidth(0.25);

  doc.line(
    PDF_PAGE.marginLeft,
    y + 2,
    PDF_PAGE.width -
      PDF_PAGE.marginRight,
    y + 2
  );

  return y + 7;
}


function drawReportHeader(
  doc,
  reportData
) {
  let y =
    PDF_PAGE.marginTop;

  setTextColor(
    doc,
    COLORS.darkGreen
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(16);

  const titleLines =
    doc.splitTextToSize(
      reportData.title,
      PDF_CONTENT_WIDTH
    );

  doc.text(
    titleLines,
    PDF_PAGE.marginLeft,
    y
  );

  y +=
    titleLines.length * 6 +
    2;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8.5);

  setTextColor(
    doc,
    COLORS.darkText
  );

  reportData.meta.forEach(
    (item) => {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        normalizePdfText(
          item.label
        ),
        PDF_PAGE.marginLeft,
        y
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        normalizePdfText(
          item.value
        ) || "-",
        PDF_PAGE.marginLeft + 32,
        y
      );

      y += 4.3;
    }
  );

  setDrawColor(
    doc,
    COLORS.green
  );

  doc.setLineWidth(0.45);

  doc.line(
    PDF_PAGE.marginLeft,
    y + 1,
    PDF_PAGE.width -
      PDF_PAGE.marginRight,
    y + 1
  );

  return y + 7;
}


/* =========================================================
   AutoTable
========================================================= */

function getCommonTableStyles() {
  return {
    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.7,
      lineWidth: 0.15,
      lineColor:
        COLORS.border,
      textColor:
        COLORS.darkText,
      overflow: "linebreak",
      valign: "middle"
    },

    headStyles: {
      fillColor:
        COLORS.headerFill,
      textColor:
        COLORS.darkText,
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.15,
      lineColor:
        COLORS.border
    },

    bodyStyles: {
      fillColor:
        COLORS.white
    },

    alternateRowStyles: {
      fillColor:
        COLORS.lightFill
    },

    margin: {
      left:
        PDF_PAGE.marginLeft,

      right:
        PDF_PAGE.marginRight
    }
  };
}


function drawAssessmentTable(
  doc,
  title,
  tableData,
  startY
) {
  setTextColor(
    doc,
    COLORS.darkText
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    normalizePdfText(title),
    PDF_PAGE.marginLeft,
    startY
  );

  const tableStartY =
    startY + 3;

  doc.autoTable({
    ...getCommonTableStyles(),

    startY:
      tableStartY,

    head:
      tableData.head,

    body:
      tableData.body,

    tableWidth:
      PDF_CONTENT_WIDTH,

    columnStyles: {
      0: {
        cellWidth: 42,
        halign: "left"
      },

      1: {
        halign: "right"
      },

      2: {
        halign: "right"
      },

      3: {
        halign: "right"
      },

      4: {
        halign: "right"
      }
    },

    didParseCell(data) {
      const rowData =
        data.row?.raw;

      const firstCell =
        Array.isArray(rowData)
          ? normalizePdfText(
              rowData[0]
            )
          : "";

      if (
        data.section ===
          "body" &&
        firstCell.toUpperCase() ===
          "TOTAL"
      ) {
        data.cell.styles
          .fillColor =
            COLORS.totalFill;

        data.cell.styles
          .fontStyle =
            "bold";
      }
    }
  });

  return (
    doc.lastAutoTable
      ?.finalY ||
    tableStartY
  ) + 6;
}


function drawMajorSpeciesTable(
  doc,
  tableData,
  startY
) {
  doc.autoTable({
    ...getCommonTableStyles(),

    startY,

    head:
      tableData.head,

    body:
      tableData.body,

    tableWidth:
      PDF_CONTENT_WIDTH,

    styles: {
      ...getCommonTableStyles()
        .styles,

      fontSize: 7.2,
      cellPadding: 1.7
    },

    headStyles: {
      ...getCommonTableStyles()
        .headStyles,

      fontSize: 7
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
    doc.lastAutoTable
      ?.finalY ||
    startY
  ) + 5;
}


/* =========================================================
   Footer
========================================================= */

function addPageFooters(doc) {
  const pageCount =
    doc.getNumberOfPages();

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber);

    setDrawColor(
      doc,
      [203, 213, 225]
    );

    doc.setLineWidth(0.2);

    doc.line(
      PDF_PAGE.marginLeft,

      PDF_PAGE.height -
        PDF_PAGE.marginBottom +
        2,

      PDF_PAGE.width -
        PDF_PAGE.marginRight,

      PDF_PAGE.height -
        PDF_PAGE.marginBottom +
        2
    );

    setTextColor(
      doc,
      COLORS.mutedText
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.text(
      "Generated from FIPS Cloud",

      PDF_PAGE.marginLeft,

      PDF_PAGE.height - 5
    );

    doc.text(
      `Page ${pageNumber} of ${pageCount}`,

      PDF_PAGE.width -
        PDF_PAGE.marginRight,

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

  const reportData =
    extractAllReportData();

  const JsPDF =
    getJsPdfConstructor();

  const doc =
    new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true
    });

  doc.setProperties({
    title:
      reportData.title,

    subject:
      "FIPS Assessment Summary Report",

    author:
      "FIPS Cloud",

    creator:
      "FIPS Cloud jsPDF Generator"
  });


  /* =====================================================
     Page 1
  ===================================================== */

  let y =
    drawReportHeader(
      doc,
      reportData
    );

  y =
    drawSectionTitle(
      doc,
      "Assessment Summary",
      y
    );

  y =
    drawAssessmentTable(
      doc,
      "(A) Stocking per hectare",
      reportData.stocking,
      y
    );

  y =
    drawAssessmentTable(
      doc,
      "(B) Basal area per hectare",
      reportData.basalArea,
      y
    );

  drawAssessmentTable(
    doc,
    "(C) Gross volume per hectare",
    reportData.volume,
    y
  );


  /* =====================================================
     Page 2
  ===================================================== */

  doc.addPage();

  let page2Y =
    drawReportHeader(
      doc,
      reportData
    );

  page2Y =
    drawSectionTitle(
      doc,
      "(D) Major species summary",
      page2Y
    );

  drawMajorSpeciesTable(
    doc,
    reportData.majorSpecies,
    page2Y
  );


  /* =====================================================
     Footer and Save
  ===================================================== */

  addPageFooters(doc);

  const surveyName =
    reportData.meta.find(
      (item) =>
        normalizePdfText(
          item.label
        )
          .toLowerCase()
          .includes(
            "survey name"
          )
    )?.value ||
    reportData.title;

  const fileName =
    `FIPS_${sanitizeFileName(
      surveyName
    )}_${formatDateForFileName()}.pdf`;

  doc.save(fileName);
}


/* =========================================================
   Button Event
========================================================= */

async function handlePdfButtonClick(
  event
) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const button =
    getElement(
      PDF_BUTTON_ID
    );

  if (!button) {
    return;
  }

  const originalLabel =
    button.textContent;

  try {
    button.disabled = true;

    button.textContent =
      "Generating PDF...";

    await generateFipsPdf();

    button.textContent =
      "PDF Generated";

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
  const button =
    getElement(
      PDF_BUTTON_ID
    );

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
  const observer =
    new MutationObserver(() => {
      refreshPdfButtonState();

      if (reportDataReady()) {
        observer.disconnect();
      }
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
      characterData: true
    }
  );

  window.setTimeout(() => {
    observer.disconnect();

    refreshPdfButtonState();
  }, 30000);
}


function initializePdfReport() {
  console.log(
    "jsPDF available:",
    Boolean(
      getJsPdfConstructor()
    )
  );

  console.log(
    "AutoTable available:",
    Boolean(
      getJsPdfConstructor()
        ?.API?.autoTable
    )
  );

  if (!librariesAvailable()) {
    console.error(
      "PDF libraries could not be loaded."
    );

    setPdfButtonState({
      enabled: false,
      label:
        "PDF Library Error"
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

  console.log(
    "FIPS PDF generator initialized."
  );
}


/* =========================================================
   Start
========================================================= */

if (
  document.readyState ===
  "loading"
) {
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
