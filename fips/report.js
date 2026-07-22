import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./config.js";


/* =========================================================
   Supabase Client
========================================================= */

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   Navigation / Error Handling
========================================================= */

function redirectToPortal() {
  window.location.replace("./index.html");
}

function showGenericError(message) {
  alert(message);
}


/* =========================================================
   Security / Formatting Utilities
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

function formatNumber(value, digits = 4) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return Number(0).toFixed(digits);
  }

  return numberValue.toFixed(digits);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-CA");
}

function formatDateTime(value) {
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
   Authentication
========================================================= */

async function checkLogin() {
  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (
      error ||
      !data ||
      !data.session
    ) {
      redirectToPortal();
      return null;
    }

    return data.session;

  } catch (_error) {
    redirectToPortal();
    return null;
  }
}


/* =========================================================
   Loading State
========================================================= */

function showReportLoadingState() {
  const reportMeta =
    document.getElementById("reportMeta");

  const summaryCards =
    document.getElementById("summaryCards");

  const surveyInfoBody =
    document.getElementById("surveyInfoBody");

  const plotResultsBody =
    document.getElementById("plotResultsBody");

  const speciesSummaryBody =
    document.getElementById("speciesSummaryBody");

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
   Data Loading
========================================================= */

async function loadSurvey(surveyId) {
  const { data, error } = await supabase
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
    .eq("id", Number(surveyId))
    .single();

  if (error || !data) {
    console.error(
      "loadSurvey error:",
      error
    );

    throw new Error(
      "Failed to load survey."
    );
  }

  return data;
}

async function loadSummary(surveyId) {
  const { data, error } = await supabase
    .from("fips_survey_results")
    .select(`
      survey_id,
      total_plots,
      total_trees,
      total_basal_area_m2,
      total_volume_m3,
      calculated_at
    `)
    .eq(
      "survey_id",
      Number(surveyId)
    )
    .order(
      "calculated_at",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "loadSummary error:",
      error
    );

    throw new Error(
      "Failed to load survey summary."
    );
  }

  if (!data) {
    throw new Error(
      "No processed summary found."
    );
  }

  return data;
}

async function loadPlotResults(surveyId) {
  const { data, error } = await supabase
    .from("fips_plot_results")
    .select(`
      plot_no,
      tree_count,
      basal_area_m2,
      volume_m3
    `)
    .eq(
      "survey_id",
      Number(surveyId)
    )
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

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      "No plot results found."
    );
  }

  return data;
}

async function loadSpeciesSummary(surveyId) {
  const { data, error } = await supabase
    .rpc(
      "get_species_summary",
      {
        p_survey_id: Number(surveyId)
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

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}


/* =========================================================
   Report Header
========================================================= */

function setReportTitle(survey) {
  const titleElement =
    document.getElementById("reportTitle");

  if (!titleElement) {
    return;
  }

  const surveyName =
    survey &&
    survey.survey_name
      ? String(survey.survey_name)
      : "Survey";

  titleElement.textContent =
    `FIPS Survey Summary Report - ${surveyName}`;
}

function renderMeta(survey) {
  const reportMeta =
    document.getElementById("reportMeta");

  if (!reportMeta) {
    return;
  }

  const exportedAt =
    formatDateTime(
      new Date().toISOString()
    );

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
      ${safeText(exportedAt)}
    </div>
  `;
}


/* =========================================================
   Executive Summary
========================================================= */

function renderSummary(summary) {
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
          summary.total_basal_area_m2
        )}
      </div>
    </div>

    <div class="summary-card">
      <div class="label">
        Total Volume (m³)
      </div>

      <div class="value">
        ${formatNumber(
          summary.total_volume_m3
        )}
      </div>
    </div>
  `;
}


/* =========================================================
   Survey Information
========================================================= */

function renderSurveyInfo(survey) {
  const surveyInfoBody =
    document.getElementById("surveyInfoBody");

  if (!surveyInfoBody) {
    return;
  }

  const infoRows = [
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

  surveyInfoBody.innerHTML =
    infoRows
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
   Plot Results
========================================================= */

function renderPlotResults(plotResults) {
  const plotResultsBody =
    document.getElementById(
      "plotResultsBody"
    );

  if (!plotResultsBody) {
    return;
  }

  if (
    !Array.isArray(plotResults) ||
    plotResults.length === 0
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

  plotResultsBody.innerHTML =
    plotResults
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
                row.basal_area_m2
              )}
            </td>

            <td>
              ${formatNumber(
                row.volume_m3
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

function renderSpeciesSummary(
  speciesSummary
) {
  const speciesSummaryBody =
    document.getElementById(
      "speciesSummaryBody"
    );

  if (!speciesSummaryBody) {
    return;
  }

  if (
    !Array.isArray(speciesSummary) ||
    speciesSummary.length === 0
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
    speciesSummary
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
                row.basal_area_m2
              )}
            </td>

            <td>
              ${formatNumber(
                row.volume_m3
              )}
            </td>
          </tr>
        `
      )
      .join("");
}


/* =========================================================
   Validation of Report Totals
========================================================= */

function validateSpeciesTotals(
  summary,
  speciesSummary
) {
  if (
    !summary ||
    !Array.isArray(speciesSummary)
  ) {
    return;
  }

  const speciesTreeTotal =
    speciesSummary.reduce(
      (total, row) =>
        total +
        Number(row.tree_count || 0),
      0
    );

  const speciesBasalAreaTotal =
    speciesSummary.reduce(
      (total, row) =>
        total +
        Number(row.basal_area_m2 || 0),
      0
    );

  const speciesVolumeTotal =
    speciesSummary.reduce(
      (total, row) =>
        total +
        Number(row.volume_m3 || 0),
      0
    );

  const surveyTreeTotal =
    Number(summary.total_trees || 0);

  const surveyBasalAreaTotal =
    Number(
      summary.total_basal_area_m2 || 0
    );

  const surveyVolumeTotal =
    Number(
      summary.total_volume_m3 || 0
    );

  const tolerance = 0.00001;

  if (
    speciesTreeTotal !== surveyTreeTotal ||
    Math.abs(
      speciesBasalAreaTotal -
      surveyBasalAreaTotal
    ) > tolerance ||
    Math.abs(
      speciesVolumeTotal -
      surveyVolumeTotal
    ) > tolerance
  ) {
    console.warn(
      "Species summary totals do not match survey totals.",
      {
        survey: {
          trees: surveyTreeTotal,
          basalArea:
            surveyBasalAreaTotal,
          volume:
            surveyVolumeTotal
        },
        species: {
          trees: speciesTreeTotal,
          basalArea:
            speciesBasalAreaTotal,
          volume:
            speciesVolumeTotal
        }
      }
    );
  }
}


/* =========================================================
   Buttons
========================================================= */

function attachActions() {
  const printReportBtn =
    document.getElementById(
      "printReportBtn"
    );

  const backToResultBtn =
    document.getElementById(
      "backToResultBtn"
    );

  if (printReportBtn) {
    printReportBtn.addEventListener(
      "click",
      () => {
        window.print();
      }
    );
  }

  if (backToResultBtn) {
    backToResultBtn.addEventListener(
      "click",
      () => {
        window.location.href =
          "./result.html";
      }
    );
  }
}


/* =========================================================
   Species Error Display
========================================================= */

function renderSpeciesLoadError(
  message
) {
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
   Report Initialization
========================================================= */

async function initReport() {
  const session = await checkLogin();

  if (!session) {
    return;
  }

  showReportLoadingState();

  const storedSurveyId =
    localStorage.getItem(
      "currentSurveyId"
    );

  const surveyId =
    Number(storedSurveyId);

  if (
    !storedSurveyId ||
    !Number.isInteger(surveyId) ||
    surveyId <= 0
  ) {
    showGenericError(
      "No valid current survey selected."
    );

    window.location.href =
      "./surveys.html";

    return;
  }

  try {
    /*
     * Survey、Survey Summary、Plot Resultsは
     * 帳票表示に必須。
     */
    const [
      survey,
      summary,
      plotResults
    ] = await Promise.all([
      loadSurvey(surveyId),
      loadSummary(surveyId),
      loadPlotResults(surveyId)
    ]);

    /*
     * Species Summaryの取得に失敗しても、
     * Survey帳票全体は表示する。
     */
    let speciesSummary = [];

    try {
      speciesSummary =
        await loadSpeciesSummary(
          surveyId
        );

    } catch (speciesError) {
      console.error(
        "Species Summary could not be loaded:",
        speciesError
      );

      renderSpeciesLoadError(
        speciesError &&
        speciesError.message
          ? speciesError.message
          : "Failed to load species summary."
      );
    }

    setReportTitle(survey);
    renderMeta(survey);
    renderSummary(summary);
    renderSurveyInfo(survey);
    renderPlotResults(plotResults);

    if (
      Array.isArray(speciesSummary) &&
      speciesSummary.length > 0
    ) {
      renderSpeciesSummary(
        speciesSummary
      );

      validateSpeciesTotals(
        summary,
        speciesSummary
      );
    }

    attachActions();

  } catch (error) {
    console.error(
      "Report initialization error:",
      error
    );

    const message =
      error &&
      error.message
        ? error.message
        : "Failed to generate report.";

    showGenericError(message);

    if (
      message ===
      "Failed to load survey."
    ) {
      window.location.href =
        "./surveys.html";

      return;
    }

    window.location.href =
      "./result.html";
  }
}


/* =========================================================
   Start
========================================================= */

await initReport();
