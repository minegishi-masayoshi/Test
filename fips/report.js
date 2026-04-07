import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function redirectToPortal() {
  window.location.replace("../index.html");
}

function showGenericError(message) {
  alert(message);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function checkLogin() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      redirectToPortal();
      return null;
    }

    return data.session;
  } catch (_e) {
    redirectToPortal();
    return null;
  }
}

function formatNumber(value, digits = 4) {
  return Number(value || 0).toFixed(digits);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleDateString("en-CA");
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();

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

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return escapeHtml(value);
}

function renderMeta(survey) {
  const reportMeta = document.getElementById("reportMeta");
  if (!reportMeta) return;

  const exportedAt = formatDateTime(new Date().toISOString());

  reportMeta.innerHTML = `
    <div><strong>Survey Name:</strong> ${safeText(survey.survey_name)}</div>
    <div><strong>Survey Number:</strong> ${safeText(survey.survey_number)}</div>
    <div><strong>Survey Date:</strong> ${safeText(formatDate(survey.survey_date))}</div>
    <div><strong>Province:</strong> ${safeText(survey.province)}</div>
    <div><strong>Exported At:</strong> ${safeText(exportedAt)}</div>
  `;
}

function renderSummary(summary) {
  const summaryCards = document.getElementById("summaryCards");
  if (!summaryCards) return;

  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="label">Total Plots</div>
      <div class="value">${safeText(summary.total_plots ?? 0, "0")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Trees</div>
      <div class="value">${safeText(summary.total_trees ?? 0, "0")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Basal Area (m²)</div>
      <div class="value">${formatNumber(summary.total_basal_area_m2)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Volume (m³)</div>
      <div class="value">${formatNumber(summary.total_volume_m3)}</div>
    </div>
  `;
}

function renderSurveyInfo(survey) {
  const surveyInfoBody = document.getElementById("surveyInfoBody");
  if (!surveyInfoBody) return;

  const infoRows = [
    ["Survey Type", survey.survey_type ?? "-"],
    ["Vegetation", survey.vegetation ?? "-"],
    ["Number of Blocks", survey.number_of_blocks ?? "-"],
    ["Gross Area (ha)", survey.gross_area_ha ?? "-"],
    ["Adjusted Net Forest Area", survey.adjusted_net_forest_area ?? "-"],
    ["Slope Min", survey.slope_min ?? "-"],
    ["Slope Max", survey.slope_max ?? "-"],
    ["Elevation Min", survey.elevation_min ?? "-"],
    ["Elevation Max", survey.elevation_max ?? "-"],
    ["Plan ID", survey.plan_id ?? "-"]
  ];

  surveyInfoBody.innerHTML = infoRows
    .map(
      ([label, value]) => `
        <tr>
          <td><strong>${escapeHtml(label)}</strong></td>
          <td>${safeText(value)}</td>
        </tr>
      `
    )
    .join("");
}

function renderPlotResults(plotResults) {
  const plotResultsBody = document.getElementById("plotResultsBody");
  if (!plotResultsBody) return;

  plotResultsBody.innerHTML = plotResults
    .map(
      (row) => `
        <tr>
          <td>${safeText(row.plot_no)}</td>
          <td>${safeText(row.tree_count ?? 0, "0")}</td>
          <td>${formatNumber(row.basal_area_m2)}</td>
          <td>${formatNumber(row.volume_m3)}</td>
        </tr>
      `
    )
    .join("");
}

function setReportTitle(survey) {
  const titleEl = document.getElementById("reportTitle");
  if (!titleEl) return;

  const surveyName = survey?.survey_name ? String(survey.survey_name) : "Survey";
  titleEl.textContent = `FIPS Survey Summary Report - ${surveyName}`;
}

function attachActions() {
  const printReportBtn = document.getElementById("printReportBtn");
  const backToResultBtn = document.getElementById("backToResultBtn");

  if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
      window.print();
    });
  }

  if (backToResultBtn) {
    backToResultBtn.addEventListener("click", () => {
      window.location.href = "./result.html";
    });
  }
}

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
    throw new Error("Failed to load survey.");
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
    .eq("survey_id", Number(surveyId))
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No processed summary found.");
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
    .eq("survey_id", Number(surveyId))
    .order("plot_no", { ascending: true });

  if (error || !data || data.length === 0) {
    throw new Error("No plot results found.");
  }

  return data;
}

async function initReport() {
  const session = await checkLogin();
  if (!session) return;

  const surveyId = localStorage.getItem("currentSurveyId");

  if (!surveyId) {
    showGenericError("No current survey selected.");
    window.location.href = "./surveys.html";
    return;
  }

  try {
    const survey = await loadSurvey(surveyId);
    const summary = await loadSummary(surveyId);
    const plotResults = await loadPlotResults(surveyId);

    setReportTitle(survey);
    renderMeta(survey);
    renderSummary(summary);
    renderSurveyInfo(survey);
    renderPlotResults(plotResults);
    attachActions();
  } catch (error) {
    const message =
      error && error.message ? error.message : "Failed to generate report.";

    showGenericError(message);

    if (message === "Failed to load survey.") {
      window.location.href = "./surveys.html";
      return;
    }

    window.location.href = "./result.html";
  }
}

await initReport();