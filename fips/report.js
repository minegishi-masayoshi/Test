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
   General Utilities
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

  if (!Number.isFinite(converted)) {
    return fallback;
  }

  return converted;
}


function formatNumber(value, digits = 4) {
  return toNumber(value, 0).toFixed(digits);
}


function formatAssessmentNumber(value) {
  return toNumber(value, 0).toFixed(3);
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
   Survey ID Resolution
========================================================= */

function getSurveyId() {
  const urlParameters =
    new URLSearchParams(window.location.search);

  const urlSurveyId =
    urlParameters.get("survey_id") ||
    urlParameters.get("survey");

  const storedSurveyId =
    localStorage.getItem("currentSurveyId");

  const candidate =
    urlSurveyId || storedSurveyId;

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
   Loading State
========================================================= */

function setLoadingState() {
  const reportMeta =
    document.getElementById("reportMeta");

  const summaryCards =
    document.getElementById("summaryCards");

  const surveyInfoBody =
    document.getElementById("surveyInfoBody");

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

  const plotResultsBody =
    document.getElementById("plotResultsBody");

  const speciesSummaryBody =
    document.getElementById(
      "speciesSummaryBody"
    );

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
        <td colspan="2">
          Loading survey information...
        </td>
      </tr>
    `;
  }

  if (stockingBody) {
    stockingBody.innerHTML = `
      <tr>
        <td colspan="5">
          Loading stocking assessment...
        </td>
      </tr>
    `;
  }

  if (basalAreaBody) {
    basalAreaBody.innerHTML = `
      <tr>
        <td colspan="5">
          Loading basal area assessment...
        </td>
      </tr>
    `;
  }

  if (volumeBody) {
    volumeBody.innerHTML = `
      <tr>
        <td colspan="5">
          Loading volume assessment...
        </td>
      </tr>
    `;
  }

  if (plotResultsBody) {
    plotResultsBody.innerHTML = `
      <tr>
        <td colspan="4">
          Loading plot results...
        </td>
      </tr>
    `;
  }

  if (speciesSummaryBody) {
    speciesSummaryBody.innerHTML = `
      <tr>
        <td colspan="7">
          Loading species summary...
        </td>
      </tr>
    `;
  }
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
    console.error(
      "loadSurvey error:",
      error
    );

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
      "loadSurveySummary error:",
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
      "loadPlotResults error:",
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
      "loadSpeciesSummary error:",
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
      "loadAssessmentSummary error:",
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
        ${safeText(survey.survey_name)}
      </div>

      <div>
        <strong>Survey Number:</strong>
        ${safeText(survey.survey_number)}
      </div>

      <div>
        <strong>Survey Date:</strong>
        ${safeText(
          formatDate(survey.survey_date)
        )}
      </div>

      <div>
        <strong>Province:</strong>
        ${safeText(survey.province)}
      </div>

      <div>
        <strong>Exported At:</strong>
        ${safeText(formatDateTime())}
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
      <div class="label">
        Total Plots
      </div>

      <div class="value">
        ${safeText(
          summary.total_plots ?? 0,
          "0"
        )}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">
        Total Trees
      </div>

      <div class="value">
        ${safeText(
          summary.total_trees ?? 0,
          "0"
        )}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">
        Total Basal Area (m²)
      </div>

      <div class="value">
        ${formatNumber(
          summary.total_basal_area_m2,
          4
        )}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">
        Total Volume (m³)
      </div>

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
    [
      "Survey Type",
      survey.survey_type
    ],
    [
      "Vegetation",
      survey.vegetation
    ],
    [
      "Number of Blocks",
      survey.number_of_blocks
    ],
    [
      "Gross Area (ha)",
      survey.gross_area_ha
    ],
    [
      "Adjusted Net Forest Area",
      survey.adjusted_net_forest_area
    ],
    [
      "Slope Min",
      survey.slope_min
    ],
    [
      "Slope Max",
      survey.slope_max
    ],
    [
      "Elevation Min",
      survey.elevation_min
    ],
    [
      "Elevation Max",
      survey.elevation_max
    ],
    [
      "Plan ID",
      survey.plan_id
    ]
  ];

  surveyInfoBody.innerHTML = rows
    .map(
      ([label, value]) => `
        <tr>
          <td>
            <strong>
              ${escapeHtml(label)}
            </strong>
          </td>

          <td>
            ${safeText(value)}
          </td>
        </tr>
      `
    )
    .join("");
}


/* =========================================================
   Assessment Summary Totals
========================================================= */

function calculateAssessmentTotals(rows) {
  const total = {
    quality_class: "TOTAL",

    stocking_10_19: 0,
    stocking_20_49: 0,
    stocking_50_plus: 0,
    stocking_10_plus: 0,

    basal_area_10_19: 0,
    basal_area_20_49: 0,
    basal_area_50_plus: 0,
    basal_area_10_plus: 0,

    volume_10_19: 0,
    volume_20_49: 0,
    volume_50_plus: 0,
    volume_10_plus: 0
  };

  rows.forEach((row) => {
    total.stocking_10_19 +=
      toNumber(row.stocking_10_19);

    total.stocking_20_49 +=
      toNumber(row.stocking_20_49);

    total.stocking_50_plus +=
      toNumber(row.stocking_50_plus);

    total.stocking_10_plus +=
      toNumber(row.stocking_10_plus);

    total.basal_area_10_19 +=
      toNumber(row.basal_area_10_19);

    total.basal_area_20_49 +=
      toNumber(row.basal_area_20_49);

    total.basal_area_50_plus +=
      toNumber(row.basal_area_50_plus);

    total.basal_area_10_plus +=
      toNumber(row.basal_area_10_plus);

    total.volume_10_19 +=
      toNumber(row.volume_10_19);

    total.volume_20_49 +=
      toNumber(row.volume_20_49);

    total.volume_50_plus +=
      toNumber(row.volume_50_plus);

    total.volume_10_plus +=
      toNumber(row.volume_10_plus);
  });

  return total;
}


/* =========================================================
   Assessment Table Rendering
========================================================= */

function createAssessmentRows(
  assessmentRows,
  fieldNames
) {
  const total =
    calculateAssessmentTotals(
      assessmentRows
    );

  const displayRows = [
    ...assessmentRows,
    total
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
          <td>
            ${
              isTotal
                ? "<strong>TOTAL</strong>"
                : safeText(
                    row.quality_class
                  )
            }
          </td>

          <td>
            ${
              isTotal
                ? `<strong>${formatAssessmentNumber(
                    row[fieldNames[0]]
                  )}</strong>`
                : formatAssessmentNumber(
                    row[fieldNames[0]]
                  )
            }
          </td>

          <td>
            ${
              isTotal
                ? `<strong>${formatAssessmentNumber(
                    row[fieldNames[1]]
                  )}</strong>`
                : formatAssessmentNumber(
                    row[fieldNames[1]]
                  )
            }
          </td>

          <td>
            ${
              isTotal
                ? `<strong>${formatAssessmentNumber(
                    row[fieldNames[2]]
                  )}</strong>`
                : formatAssessmentNumber(
                    row[fieldNames[2]]
                  )
            }
          </td>

          <td>
            ${
              isTotal
                ? `<strong>${formatAssessmentNumber(
                    row[fieldNames[3]]
                  )}</strong>`
                : formatAssessmentNumber(
                    row[fieldNames[3]]
                  )
            }
          </td>
        </tr>
      `;
    })
    .join("");
}


function renderAssessmentSummary(
  assessmentRows
) {
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
    !Array.isArray(assessmentRows) ||
    assessmentRows.length === 0
  ) {
    const emptyRow = `
      <tr>
        <td colspan="5">
          No assessment summary data found.
        </td>
      </tr>
    `;

    if (stockingBody) {
      stockingBody.innerHTML = emptyRow;
    }

    if (basalAreaBody) {
      basalAreaBody.innerHTML = emptyRow;
    }

    if (volumeBody) {
      volumeBody.innerHTML = emptyRow;
    }

    return;
  }

  const orderedRows = [...assessmentRows]
    .sort(
      (first, second) =>
        toNumber(first.quality_code) -
        toNumber(second.quality_code)
    );

  if (stockingBody) {
    stockingBody.innerHTML =
      createAssessmentRows(
        orderedRows,
        [
          "stocking_10_19",
          "stocking_20_49",
          "stocking_50_plus",
          "stocking_10_plus"
        ]
      );
  }

  if (basalAreaBody) {
    basalAreaBody.innerHTML =
      createAssessmentRows(
        orderedRows,
        [
          "basal_area_10_19",
          "basal_area_20_49",
          "basal_area_50_plus",
          "basal_area_10_plus"
        ]
      );
  }

  if (volumeBody) {
    volumeBody.innerHTML =
      createAssessmentRows(
        orderedRows,
        [
          "volume_10_19",
          "volume_20_49",
          "volume_50_plus",
          "volume_10_plus"
        ]
      );
  }
}


/* =========================================================
   Plot Results
========================================================= */

function renderPlotResults(plotRows) {
  const plotResultsBody =
    document.getElementById(
      "plotResultsBody"
    );

  if (!plotResultsBody) {
    return;
  }

  if (
    !Array.isArray(plotRows) ||
    plotRows.length === 0
  ) {
    plotResultsBody.innerHTML = `
      <tr>
        <td colspan="4">
          No plot results found.
        </td>
      </tr>
    `;

    return;
  }

  plotResultsBody.innerHTML = plotRows
    .map(
      (row) => `
        <tr>
          <td>
            ${safeText(row.plot_no)}
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
   Species Summary
========================================================= */

function renderSpeciesSummary(speciesRows) {
  const speciesSummaryBody =
    document.getElementById(
      "speciesSummaryBody"
    );

  if (!speciesSummaryBody) {
    return;
  }

  if (
    !Array.isArray(speciesRows) ||
    speciesRows.length === 0
  ) {
    speciesSummaryBody.innerHTML = `
      <tr>
        <td colspan="7">
          No species summary data found.
        </td>
      </tr>
    `;

    return;
  }

  speciesSummaryBody.innerHTML =
    speciesRows
      .map(
        (row) => `
          <tr>
            <td>
              ${safeText(
                row.species_code
              )}
            </td>

            <td>
              ${safeText(
                row.species_name,
                "Unknown species"
              )}
            </td>

            <td>
              ${safeText(
                row.trade_name
              )}
            </td>

            <td>
              ${safeText(
                row.common_name
              )}
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
   Cross-check Totals
========================================================= */

function validateReportTotals(
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
        sum +
        toNumber(row.tree_count),
      0
    );

  const speciesBasalTotal =
    speciesRows.reduce(
      (sum, row) =>
        sum +
        toNumber(row.basal_area_m2),
      0
    );

  const speciesVolumeTotal =
    speciesRows.reduce(
      (sum, row) =>
        sum +
        toNumber(row.volume_m3),
      0
    );

  const surveyTreeTotal =
    toNumber(
      surveySummary.total_trees
    );

  const surveyBasalTotal =
    toNumber(
      surveySummary.total_basal_area_m2
    );

  const surveyVolumeTotal =
    toNumber(
      surveySummary.total_volume_m3
    );

  const tolerance = 0.00001;

  if (
    speciesTreeTotal !==
      surveyTreeTotal ||
    Math.abs(
      speciesBasalTotal -
      surveyBasalTotal
    ) > tolerance ||
    Math.abs(
      speciesVolumeTotal -
      surveyVolumeTotal
    ) > tolerance
  ) {
    console.warn(
      "Report totals mismatch.",
      {
        surveySummary: {
          treeTotal:
            surveyTreeTotal,
          basalAreaTotal:
            surveyBasalTotal,
          volumeTotal:
            surveyVolumeTotal
        },

        speciesSummary: {
          treeTotal:
            speciesTreeTotal,
          basalAreaTotal:
            speciesBasalTotal,
          volumeTotal:
            speciesVolumeTotal
        }
      }
    );
  }
}


/* =========================================================
   Error Rendering
========================================================= */

function renderAssessmentError(message) {
  const elementIds = [
    "stockingAssessmentBody",
    "basalAreaAssessmentBody",
    "volumeAssessmentBody"
  ];

  elementIds.forEach((elementId) => {
    const element =
      document.getElementById(elementId);

    if (element) {
      element.innerHTML = `
        <tr>
          <td colspan="5">
            ${safeText(
              message,
              "Failed to load assessment summary."
            )}
          </td>
        </tr>
      `;
    }
  });
}


function renderSpeciesError(message) {
  const speciesSummaryBody =
    document.getElementById(
      "speciesSummaryBody"
    );

  if (!speciesSummaryBody) {
    return;
  }

  speciesSummaryBody.innerHTML = `
    <tr>
      <td colspan="7">
        ${safeText(
          message,
          "Failed to load species summary."
        )}
      </td>
    </tr>
  `;
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
      () => {
        window.print();
      }
    );
  }

  if (backButton) {
    backButton.addEventListener(
      "click",
      () => {
        redirectToResult();
      }
    );
  }
}


/* =========================================================
   Main Initialization
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
    /*
     * These datasets are required for
     * the main report.
     */
    const [
      survey,
      surveySummary,
      plotResults
    ] = await Promise.all([
      loadSurvey(surveyId),
      loadSurveySummary(surveyId),
      loadPlotResults(surveyId)
    ]);

    renderReportHeader(survey);

    renderExecutiveSummary(
      surveySummary
    );

    renderSurveyInformation(survey);

    renderPlotResults(plotResults);

    /*
     * Assessment Summary is loaded
     * independently.
     */
    try {
      const assessmentRows =
        await loadAssessmentSummary(
          surveyId
        );

      renderAssessmentSummary(
        assessmentRows
      );

    } catch (assessmentError) {
      console.error(
        "Assessment Summary error:",
        assessmentError
      );

      renderAssessmentError(
        assessmentError.message
      );
    }

    /*
     * Species Summary is loaded
     * independently.
     */
    try {
      const speciesRows =
        await loadSpeciesSummary(
          surveyId
        );

      renderSpeciesSummary(
        speciesRows
      );

      validateReportTotals(
        surveySummary,
        speciesRows
      );

    } catch (speciesError) {
      console.error(
        "Species Summary error:",
        speciesError
      );

      renderSpeciesError(
        speciesError.message
      );
    }

    attachButtonEvents();

  } catch (error) {
    console.error(
      "Report initialization failed:",
      error
    );

    alert(
      error.message ||
      "Failed to generate the report."
    );

    redirectToResult();
  }
}


/* =========================================================
   Start Application
========================================================= */

initializeReport();
