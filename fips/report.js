import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./config.js";


/* =========================================================
   Supabase Client
========================================================= */

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   Navigation
========================================================= */

function redirectToLogin() {
  window.location.replace("./index.html");
}

function redirectToSurveyList() {
  window.location.href = "./surveys.html";
}

function redirectToResult() {
  window.location.href = "./result.html";
}


/* =========================================================
   Basic Utilities
========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function safeText(value, fallback = "-") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return escapeHtml(fallback);
  }

  return escapeHtml(value);
}


function toNumber(value, fallback = 0) {
  const converted = Number(value);

  return Number.isFinite(converted)
    ? converted
    : fallback;
}


function formatNumber(value, digits = 4) {
  return toNumber(value).toFixed(digits);
}


function formatAssessmentNumber(value) {
  return toNumber(value).toFixed(3);
}


function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}


function formatDateTime(value = null) {
  const date = value
    ? new Date(value)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}


/* =========================================================
   Survey ID
========================================================= */

function getSurveyId() {
  const parameters =
    new URLSearchParams(window.location.search);

  const querySurveyId =
    parameters.get("survey_id") ||
    parameters.get("survey");

  const storedSurveyId =
    localStorage.getItem("currentSurveyId");

  const candidate =
    querySurveyId || storedSurveyId;

  const surveyId = Number(candidate);

  if (
    !candidate ||
    !Number.isInteger(surveyId) ||
    surveyId <= 0
  ) {
    return null;
  }

  return surveyId;
}


/* =========================================================
   Authentication
========================================================= */

async function checkAuthentication() {
  try {
    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (
      error ||
      !data ||
      !data.session
    ) {
      redirectToLogin();
      return null;
    }

    return data.session;

  } catch (error) {
    console.error(
      "Authentication check failed:",
      error
    );

    redirectToLogin();
    return null;
  }
}


/* =========================================================
   Loading Display
========================================================= */

function setTableMessage(
  elementId,
  colspan,
  message
) {
  const body =
    document.getElementById(elementId);

  if (!body) {
    return;
  }

  body.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="message-cell">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}


function setLoadingState() {
  const reportMeta =
    document.getElementById("reportMeta");

  const summaryCards =
    document.getElementById("summaryCards");

  const surveyInfoBody =
    document.getElementById("surveyInfoBody");

  if (reportMeta) {
    reportMeta.textContent =
      "Loading survey information...";
  }

  if (summaryCards) {
    summaryCards.innerHTML = `
      <div class="summary-card">
        <div class="label">Loading</div>
        <div class="value">-</div>
      </div>
    `;
  }

  if (surveyInfoBody) {
    surveyInfoBody.innerHTML = `
      <tr>
        <td colspan="2" class="message-cell">
          Loading survey information...
        </td>
      </tr>
    `;
  }

  setTableMessage(
    "stockingAssessmentBody",
    5,
    "Loading stocking assessment..."
  );

  setTableMessage(
    "basalAreaAssessmentBody",
    5,
    "Loading basal area assessment..."
  );

  setTableMessage(
    "volumeAssessmentBody",
    5,
    "Loading volume assessment..."
  );

  setTableMessage(
    "plotResultsBody",
    4,
    "Loading plot results..."
  );

  setTableMessage(
    "speciesSummaryBody",
    7,
    "Loading species summary..."
  );
}


/* =========================================================
   Supabase Data Loading
========================================================= */

async function loadSurvey(surveyId) {
  const {
    data,
    error
  } = await supabaseClient
    .from("fips_surveys")
    .select(`
      id,
      survey_number,
      survey_name,
      survey_date,
      province,
      survey_type,
      vegetation,
      number_of_blocks,
      gross_area_ha,
      adjusted_net_forest_area,
      slope_min,
      slope_max,
      elevation_min,
      elevation_max,
      plan_id
    `)
    .eq("id", surveyId)
    .single();

  if (error || !data) {
    console.error("loadSurvey:", error);

    throw new Error(
      "Failed to load survey information."
    );
  }

  return data;
}


async function loadSurveySummary(surveyId) {
  const {
    data,
    error
  } = await supabaseClient
    .from("fips_survey_results")
    .select(`
      survey_id,
      total_plots,
      total_trees,
      total_basal_area_m2,
      total_volume_m3,
      calculated_at
    `)
    .eq("survey_id", surveyId)
    .order(
      "calculated_at",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "loadSurveySummary:",
      error
    );

    throw new Error(
      "Failed to load survey summary."
    );
  }

  if (!data) {
    throw new Error(
      "No processed survey summary was found."
    );
  }

  return data;
}


async function loadPlotResults(surveyId) {
  const {
    data,
    error
  } = await supabaseClient
    .from("fips_plot_results")
    .select(`
      plot_no,
      tree_count,
      basal_area_m2,
      volume_m3
    `)
    .eq("survey_id", surveyId)
    .order(
      "plot_no",
      { ascending: true }
    );

  if (error) {
    console.error(
      "loadPlotResults:",
      error
    );

    throw new Error(
      "Failed to load plot results."
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}


async function loadSpeciesSummary(surveyId) {
  const {
    data,
    error
  } = await supabaseClient.rpc(
    "get_species_summary",
    {
      p_survey_id: surveyId
    }
  );

  if (error) {
    console.error(
      "loadSpeciesSummary:",
      error
    );

    throw new Error(
      "Failed to load species summary."
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}


async function loadAssessmentSummary(surveyId) {
  const {
    data,
    error
  } = await supabaseClient.rpc(
    "get_assessment_summary_page1",
    {
      p_survey_id: surveyId
    }
  );

  if (error) {
    console.error(
      "loadAssessmentSummary:",
      error
    );

    throw new Error(
      "Failed to load assessment summary."
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}


/* =========================================================
   Report Header
========================================================= */

function renderReportHeader(survey) {
  const reportTitle =
    document.getElementById("reportTitle");

  const reportMeta =
    document.getElementById("reportMeta");

  const surveyName =
    survey.survey_name || "Survey";

  if (reportTitle) {
    reportTitle.textContent =
      `FIPS Survey Summary Report - ${surveyName}`;
  }

  if (reportMeta) {
    reportMeta.innerHTML = `
      <div>
        <strong>Survey Name:</strong>
        <span>${safeText(survey.survey_name)}</span>
      </div>

      <div>
        <strong>Survey Number:</strong>
        <span>${safeText(survey.survey_number)}</span>
      </div>

      <div>
        <strong>Survey Date:</strong>
        <span>${safeText(formatDate(survey.survey_date))}</span>
      </div>

      <div>
        <strong>Province:</strong>
        <span>${safeText(survey.province)}</span>
      </div>

      <div>
        <strong>Exported At:</strong>
        <span>${safeText(formatDateTime())}</span>
      </div>
    `;
  }
}


/* =========================================================
   Executive Summary
========================================================= */

function renderExecutiveSummary(summary) {
  const summaryCards =
    document.getElementById("summaryCards");

  if (!summaryCards) {
    return;
  }

  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="label">Total Plots</div>
      <div class="value">
        ${safeText(summary.total_plots ?? 0, "0")}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">Total Trees</div>
      <div class="value">
        ${safeText(summary.total_trees ?? 0, "0")}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">Total Basal Area (m²)</div>
      <div class="value">
        ${formatNumber(
          summary.total_basal_area_m2,
          4
        )}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">Total Volume (m³)</div>
      <div class="value">
        ${formatNumber(
          summary.total_volume_m3,
          4
        )}
      </div>
    </div>
  `;
}


/* =========================================================
   Survey Information
========================================================= */

function renderSurveyInformation(survey) {
  const surveyInfoBody =
    document.getElementById("surveyInfoBody");

  if (!surveyInfoBody) {
    return;
  }

  const rows = [
    ["Survey Type", survey.survey_type],
    ["Vegetation", survey.vegetation],
    ["Number of Blocks", survey.number_of_blocks],
    ["Gross Area (ha)", survey.gross_area_ha],
    [
      "Adjusted Net Forest Area",
      survey.adjusted_net_forest_area
    ],
    ["Slope Min", survey.slope_min],
    ["Slope Max", survey.slope_max],
    ["Elevation Min", survey.elevation_min],
    ["Elevation Max", survey.elevation_max],
    ["Plan ID", survey.plan_id]
  ];

  surveyInfoBody.innerHTML = rows
    .map(
      ([label, value]) => `
        <tr>
          <th scope="row">
            ${escapeHtml(label)}
          </th>

          <td>
            ${safeText(value)}
          </td>
        </tr>
      `
    )
    .join("");
}


/* =========================================================
   Assessment Summary
========================================================= */

const ASSESSMENT_FIELDS = {
  stocking: [
    "stocking_10_19",
    "stocking_20_49",
    "stocking_50_plus",
    "stocking_10_plus"
  ],

  basalArea: [
    "basal_area_10_19",
    "basal_area_20_49",
    "basal_area_50_plus",
    "basal_area_10_plus"
  ],

  volume: [
    "volume_10_19",
    "volume_20_49",
    "volume_50_plus",
    "volume_10_plus"
  ]
};


function calculateAssessmentTotals(rows) {
  const totals = {
    quality_code: 999,
    quality_class: "TOTAL"
  };

  Object.values(ASSESSMENT_FIELDS)
    .flat()
    .forEach((fieldName) => {
      totals[fieldName] = 0;
    });

  rows.forEach((row) => {
    Object.values(ASSESSMENT_FIELDS)
      .flat()
      .forEach((fieldName) => {
        totals[fieldName] +=
          toNumber(row[fieldName]);
      });
  });

  return totals;
}


function buildAssessmentTableRows(
  assessmentRows,
  fieldNames
) {
  const totalRow =
    calculateAssessmentTotals(
      assessmentRows
    );

  const displayRows = [
    ...assessmentRows,
    totalRow
  ];

  return displayRows
    .map((row) => {
      const isTotal =
        row.quality_class === "TOTAL";

      return `
        <tr class="${
          isTotal
            ? "assessment-total-row"
            : ""
        }">
          <th scope="row">
            ${
              isTotal
                ? "TOTAL"
                : safeText(row.quality_class)
            }
          </th>

          ${fieldNames
            .map(
              (fieldName) => `
                <td>
                  ${formatAssessmentNumber(
                    row[fieldName]
                  )}
                </td>
              `
            )
            .join("")}
        </tr>
      `;
    })
    .join("");
}


function renderAssessmentSummary(rows) {
  const stockingBody =
    document.getElementById(
      "stockingAssessmentBody"
    );

  const basalAreaBody =
    document.getElementById(
      "basalAreaAssessmentBody"
    );

  const volumeBody =
    document.getElementById(
      "volumeAssessmentBody"
    );

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    [
      stockingBody,
      basalAreaBody,
      volumeBody
    ].forEach((body) => {
      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="5" class="message-cell">
              No assessment summary data found.
            </td>
          </tr>
        `;
      }
    });

    return;
  }

  const orderedRows = [...rows]
    .sort(
      (first, second) =>
        toNumber(first.quality_code) -
        toNumber(second.quality_code)
    );

  if (stockingBody) {
    stockingBody.innerHTML =
      buildAssessmentTableRows(
        orderedRows,
        ASSESSMENT_FIELDS.stocking
      );
  }

  if (basalAreaBody) {
    basalAreaBody.innerHTML =
      buildAssessmentTableRows(
        orderedRows,
        ASSESSMENT_FIELDS.basalArea
      );
  }

  if (volumeBody) {
    volumeBody.innerHTML =
      buildAssessmentTableRows(
        orderedRows,
        ASSESSMENT_FIELDS.volume
      );
  }
}


/* =========================================================
   Plot Results
========================================================= */

function renderPlotResults(rows) {
  const plotResultsBody =
    document.getElementById(
      "plotResultsBody"
    );

  if (!plotResultsBody) {
    return;
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    setTableMessage(
      "plotResultsBody",
      4,
      "No plot results found."
    );

    return;
  }

  plotResultsBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${safeText(row.plot_no)}</td>

          <td>
            ${safeText(
              row.tree_count ?? 0,
              "0"
            )}
          </td>

          <td>
            ${formatNumber(
              row.basal_area_m2,
              4
            )}
          </td>

          <td>
            ${formatNumber(
              row.volume_m3,
              4
            )}
          </td>
        </tr>
      `
    )
    .join("");
}


/* =========================================================
   Species Summary
========================================================= */

function renderSpeciesSummary(rows) {
  const speciesSummaryBody =
    document.getElementById(
      "speciesSummaryBody"
    );

  if (!speciesSummaryBody) {
    return;
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    setTableMessage(
      "speciesSummaryBody",
      7,
      "No species summary data found."
    );

    return;
  }

  speciesSummaryBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            ${safeText(row.species_code)}
          </td>

          <td>
            ${safeText(
              row.species_name,
              "Unknown species"
            )}
          </td>

          <td>
            ${safeText(row.trade_name)}
          </td>

          <td>
            ${safeText(row.common_name)}
          </td>

          <td>
            ${safeText(
              row.tree_count ?? 0,
              "0"
            )}
          </td>

          <td>
            ${formatNumber(
              row.basal_area_m2,
              4
            )}
          </td>

          <td>
            ${formatNumber(
              row.volume_m3,
              4
            )}
          </td>
        </tr>
      `
    )
    .join("");
}


/* =========================================================
   Validation
========================================================= */

function validateSpeciesTotals(
  surveySummary,
  speciesRows
) {
  if (
    !surveySummary ||
    !Array.isArray(speciesRows)
  ) {
    return;
  }

  const speciesTreeTotal =
    speciesRows.reduce(
      (sum, row) =>
        sum + toNumber(row.tree_count),
      0
    );

  const speciesBasalAreaTotal =
    speciesRows.reduce(
      (sum, row) =>
        sum + toNumber(row.basal_area_m2),
      0
    );

  const speciesVolumeTotal =
    speciesRows.reduce(
      (sum, row) =>
        sum + toNumber(row.volume_m3),
      0
    );

  const tolerance = 0.0001;

  const mismatch =
    speciesTreeTotal !==
      toNumber(surveySummary.total_trees) ||

    Math.abs(
      speciesBasalAreaTotal -
      toNumber(
        surveySummary.total_basal_area_m2
      )
    ) > tolerance ||

    Math.abs(
      speciesVolumeTotal -
      toNumber(
        surveySummary.total_volume_m3
      )
    ) > tolerance;

  if (mismatch) {
    console.warn(
      "Species totals do not match survey totals.",
      {
        surveySummary,
        speciesTreeTotal,
        speciesBasalAreaTotal,
        speciesVolumeTotal
      }
    );
  }
}


/* =========================================================
   Error Rendering
========================================================= */

function renderAssessmentError(message) {
  [
    "stockingAssessmentBody",
    "basalAreaAssessmentBody",
    "volumeAssessmentBody"
  ].forEach((elementId) => {
    setTableMessage(
      elementId,
      5,
      message ||
      "Failed to load assessment summary."
    );
  });
}


function renderSpeciesError(message) {
  setTableMessage(
    "speciesSummaryBody",
    7,
    message ||
    "Failed to load species summary."
  );
}


/* =========================================================
   Buttons
========================================================= */

function attachButtonEvents() {
  const printButton =
    document.getElementById(
      "printReportBtn"
    );

  const backButton =
    document.getElementById(
      "backToResultBtn"
    );

  if (printButton) {
    printButton.addEventListener(
      "click",
      () => window.print()
    );
  }

  if (backButton) {
    backButton.addEventListener(
      "click",
      redirectToResult
    );
  }
}


/* =========================================================
   Initialization
========================================================= */

async function initializeReport() {
  const session =
    await checkAuthentication();

  if (!session) {
    return;
  }

  setLoadingState();

  const surveyId = getSurveyId();

  if (!surveyId) {
    alert(
      "No valid survey has been selected."
    );

    redirectToSurveyList();
    return;
  }

  localStorage.setItem(
    "currentSurveyId",
    String(surveyId)
  );

  try {
    const [
      survey,
      surveySummary,
      plotResults,
      assessmentResult,
      speciesResult
    ] = await Promise.allSettled([
      loadSurvey(surveyId),
      loadSurveySummary(surveyId),
      loadPlotResults(surveyId),
      loadAssessmentSummary(surveyId),
      loadSpeciesSummary(surveyId)
    ]);

    if (
      survey.status === "rejected"
    ) {
      throw survey.reason;
    }

    if (
      surveySummary.status === "rejected"
    ) {
      throw surveySummary.reason;
    }

    renderReportHeader(survey.value);

    renderExecutiveSummary(
      surveySummary.value
    );

    renderSurveyInformation(
      survey.value
    );

    if (plotResults.status === "fulfilled") {
      renderPlotResults(plotResults.value);
    } else {
      setTableMessage(
        "plotResultsBody",
        4,
        plotResults.reason?.message ||
        "Failed to load plot results."
      );
    }

    if (
      assessmentResult.status ===
      "fulfilled"
    ) {
      renderAssessmentSummary(
        assessmentResult.value
      );
    } else {
      console.error(
        "Assessment Summary:",
        assessmentResult.reason
      );

      renderAssessmentError(
        assessmentResult.reason?.message
      );
    }

    if (
      speciesResult.status ===
      "fulfilled"
    ) {
      renderSpeciesSummary(
        speciesResult.value
      );

      validateSpeciesTotals(
        surveySummary.value,
        speciesResult.value
      );
    } else {
      console.error(
        "Species Summary:",
        speciesResult.reason
      );

      renderSpeciesError(
        speciesResult.reason?.message
      );
    }

    attachButtonEvents();

  } catch (error) {
    console.error(
      "Report initialization failed:",
      error
    );

    alert(
      error?.message ||
      "Failed to generate the report."
    );

    redirectToResult();
  }
}


/* =========================================================
   Start
========================================================= */

initializeReport();
