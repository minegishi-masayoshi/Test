import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.fipsApp = { supabase };

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

function applyUserStatus(_session) {
  const userStatus = document.getElementById("userStatus");
  if (!userStatus) return;
  userStatus.textContent = "Access granted";
}

function setCurrentSurvey(id, name) {
  if (id !== null && id !== undefined) {
    localStorage.setItem("currentSurveyId", String(id));
  }
  if (name) {
    localStorage.setItem("currentSurveyName", String(name));
  }
}

function clearParsedImportCache() {
  localStorage.removeItem("fipsParsedRows");
  localStorage.removeItem("fipsValidationErrors");
}

async function getCurrentSurveyId() {
  const storedSurveyId = localStorage.getItem("currentSurveyId");
  if (storedSurveyId) {
    return storedSurveyId;
  }

  const surveyName = localStorage.getItem("currentSurveyName");

  if (!surveyName) {
    showGenericError("No survey found.");
    return null;
  }

  const { data, error } = await supabase
    .from("fips_surveys")
    .select("id, survey_name")
    .eq("survey_name", surveyName)
    .order("id", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    showGenericError("Failed to find survey.");
    return null;
  }

  setCurrentSurvey(data[0].id, data[0].survey_name);
  return data[0].id;
}

const session = await checkLogin();
if (!session) {
  throw new Error("Unauthorized");
}
applyUserStatus(session);

/* =========================
   NEW SURVEY
   ========================= */

const newSurveyForm = document.getElementById("newSurveyForm");

if (newSurveyForm) {
  newSurveyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      survey_number: document.getElementById("surveyNumber").value.trim(),
      survey_name: document.getElementById("surveyName").value.trim(),
      survey_date: document.getElementById("surveyDate").value || null,
      province: document.getElementById("province").value.trim() || null,
      number_of_blocks: document.getElementById("numberOfBlocks").value
        ? Number(document.getElementById("numberOfBlocks").value)
        : null,
      gross_area_ha: document.getElementById("grossArea").value
        ? Number(document.getElementById("grossArea").value)
        : null,
      plan_id: document.getElementById("planId").value.trim() || null,
      survey_type: document.getElementById("surveyType").value || null,
      vegetation: document.getElementById("vegetation").value.trim() || null,
      slope_min: document.getElementById("slopeMin").value
        ? Number(document.getElementById("slopeMin").value)
        : null,
      slope_max: document.getElementById("slopeMax").value
        ? Number(document.getElementById("slopeMax").value)
        : null,
      elevation_min: document.getElementById("elevationMin").value
        ? Number(document.getElementById("elevationMin").value)
        : null,
      elevation_max: document.getElementById("elevationMax").value
        ? Number(document.getElementById("elevationMax").value)
        : null,
      adjusted_net_forest_area: document.getElementById("adjustedNetForestArea")
        .value
        ? Number(document.getElementById("adjustedNetForestArea").value)
        : null
    };

    if (!payload.survey_number || !payload.survey_name) {
      showGenericError("Please enter the required fields.");
      return;
    }

    const { data, error } = await supabase
      .from("fips_surveys")
      .insert([payload])
      .select("id, survey_name")
      .single();

    if (error || !data) {
      showGenericError("Save failed.");
      return;
    }

    setCurrentSurvey(data.id, data.survey_name);
    clearParsedImportCache();

    alert("Saved successfully.");
    window.location.href = "./kobo-import.html";
  });
}

/* =========================
   CSV PARSE / VALIDATION
   ========================= */

let parsedRows = [];
let validationErrors = [];

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};

    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });

    row.__rowNo = index + 2;
    return row;
  });
}

function validateRows(rows) {
  const errors = [];
  const seenKeys = new Set();

  rows.forEach((row) => {
    const plotNo = row.plot_no || row.plot || "";
    const treeNo = row.tree_no || row.tree || "";
    const speciesCode = row.species_code || row.species || "";
    const dbh = row.dbh_cm || row.dbh || "";
    const height = row.height_m || row.height || "";

    if (!plotNo) {
      errors.push({
        row_no: row.__rowNo,
        plot_no: "",
        tree_no: treeNo,
        field_name: "Plot No",
        message: "Missing value"
      });
    }

    if (!treeNo) {
      errors.push({
        row_no: row.__rowNo,
        plot_no: plotNo,
        tree_no: "",
        field_name: "Tree No",
        message: "Missing value"
      });
    }

    if (!speciesCode) {
      errors.push({
        row_no: row.__rowNo,
        plot_no: plotNo,
        tree_no: treeNo,
        field_name: "Species Code",
        message: "Missing value"
      });
    }

    if (dbh && isNaN(Number(dbh))) {
      errors.push({
        row_no: row.__rowNo,
        plot_no: plotNo,
        tree_no: treeNo,
        field_name: "DBH",
        message: "Invalid number"
      });
    }

    if (height && isNaN(Number(height))) {
      errors.push({
        row_no: row.__rowNo,
        plot_no: plotNo,
        tree_no: treeNo,
        field_name: "Height",
        message: "Invalid number"
      });
    }

    if (plotNo && treeNo) {
      const key = `${plotNo}__${treeNo}`;
      if (seenKeys.has(key)) {
        errors.push({
          row_no: row.__rowNo,
          plot_no: plotNo,
          tree_no: treeNo,
          field_name: "Plot + Tree",
          message: "Duplicate plot/tree combination"
        });
      } else {
        seenKeys.add(key);
      }
    }
  });

  return errors;
}

const validateBtn = document.getElementById("validateBtn");
const fileUpload = document.getElementById("fileUpload");

if (validateBtn && fileUpload) {
  validateBtn.addEventListener("click", async () => {
    const file = fileUpload.files[0];

    if (!file) {
      showGenericError("Please select a CSV file.");
      return;
    }

    const text = await file.text();
    parsedRows = parseCsv(text);
    validationErrors = validateRows(parsedRows);

    const totalEl = document.getElementById("totalRecords");
    const mappedEl = document.getElementById("mappedFields");

    if (totalEl) totalEl.textContent = String(parsedRows.length);
    if (mappedEl) {
      mappedEl.textContent =
        parsedRows.length > 0 ? "Basic fields detected" : "-";
    }

    localStorage.setItem("fipsParsedRows", JSON.stringify(parsedRows));
    localStorage.setItem(
      "fipsValidationErrors",
      JSON.stringify(validationErrors)
    );

    window.location.href = "./validation.html";
  });
}

/* =========================
   CSV SUMMARY
   ========================= */

const csvInput = document.getElementById("fileUpload");

if (csvInput) {
  csvInput.addEventListener("change", async () => {
    if (csvInput.files.length === 0) return;

    const file = csvInput.files[0];
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length === 0) return;

    const headers = lines[0].split(",").map((h) => h.trim());
    const recordCount = lines.length - 1;

    const totalEl = document.getElementById("totalRecords");
    const mappedEl = document.getElementById("mappedFields");

    if (totalEl) {
      totalEl.textContent = String(recordCount);
    }

    const expectedFields = [
      "plot_no",
      "tree_no",
      "species_code",
      "dbh_cm",
      "height_m"
    ];

    const matched = expectedFields.filter((f) => headers.includes(f));

    if (mappedEl) {
      if (matched.length === expectedFields.length) {
        mappedEl.textContent = "All required fields detected";
      } else {
        mappedEl.textContent = "Detected: " + matched.join(", ");
      }
    }
  });
}

/* =========================
   FILE PICKER UI
   ========================= */

const chooseFileBtn = document.getElementById("chooseFileBtn");
const backToSurveyBtn = document.getElementById("backToSurveyBtn");
const fileNameLabel = document.getElementById("fileName");
const importFileInput = document.getElementById("fileUpload");

if (chooseFileBtn && importFileInput) {
  chooseFileBtn.addEventListener("click", () => {
    importFileInput.click();
  });
}

if (backToSurveyBtn) {
  backToSurveyBtn.addEventListener("click", () => {
    window.location.href = "./new-survey.html";
  });
}

if (importFileInput && fileNameLabel) {
  importFileInput.addEventListener("change", () => {
    if (importFileInput.files.length === 0) {
      fileNameLabel.textContent = "No file selected";
      return;
    }

    const file = importFileInput.files[0];
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("File too large (max 5MB)");
      importFileInput.value = "";
      fileNameLabel.textContent = "No file selected";
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Invalid file type. Please upload CSV.");
      importFileInput.value = "";
      fileNameLabel.textContent = "No file selected";
      return;
    }

    fileNameLabel.textContent = file.name;
  });
}

/* =========================
   VALIDATION DASHBOARD
   ========================= */

const validationTableBody = document.getElementById("errorTableBody");

if (validationTableBody) {
  const rows = JSON.parse(localStorage.getItem("fipsParsedRows") || "[]");
  const errors = JSON.parse(localStorage.getItem("fipsValidationErrors") || "[]");

  const totalEl = document.getElementById("totalRecords");
  const errorCountEl = document.getElementById("errorCount");
  const messageEl = document.getElementById("validationMessage");
  const errorSection = document.getElementById("errorSection");

  if (totalEl) totalEl.textContent = String(rows.length);
  if (errorCountEl) errorCountEl.textContent = String(errors.length);

  if (errors.length === 0) {
    if (messageEl) {
      messageEl.textContent = "Validation passed. No errors found.";
      messageEl.className = "ok";
    }

    if (errorSection) {
      errorSection.classList.add("hidden");
    }
  } else {
    if (messageEl) {
      messageEl.textContent =
        "Validation failed. Please review the errors below.";
      messageEl.className = "error";
    }

    errors.forEach((err) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(err.row_no ?? "")}</td>
        <td>${escapeHtml(err.plot_no ?? "")}</td>
        <td>${escapeHtml(err.tree_no ?? "")}</td>
        <td>${escapeHtml(err.field_name ?? "")}</td>
        <td>${escapeHtml(err.message ?? "")}</td>
      `;
      validationTableBody.appendChild(tr);
    });
  }
}

/* =========================
   IMPORT TO DATABASE
   ========================= */

function buildTreePayload(rows, surveyId) {
  return rows.map((row) => ({
    survey_id: surveyId,
    row_no: row.__rowNo ?? null,
    plot_no: row.plot_no || row.plot || null,
    tree_no: row.tree_no || row.tree || null,
    species_code: row.species_code || row.species || null,
    dbh_cm:
      row.dbh_cm && !isNaN(Number(row.dbh_cm)) ? Number(row.dbh_cm) : null,
    height_m:
      row.height_m && !isNaN(Number(row.height_m)) ? Number(row.height_m) : null,
    raw_json: row
  }));
}

async function importParsedRowsToTreeRecords() {
  const surveyId = await getCurrentSurveyId();
  if (!surveyId) return false;

  const rows = JSON.parse(localStorage.getItem("fipsParsedRows") || "[]");
  if (rows.length === 0) {
    showGenericError("No parsed CSV data found.");
    return false;
  }

  const { error: deleteTreeError } = await supabase
    .from("fips_tree_records")
    .delete()
    .eq("survey_id", Number(surveyId));

  if (deleteTreeError) {
    showGenericError("Failed to clear old tree records.");
    return false;
  }

  const { error: deletePlotError } = await supabase
    .from("fips_plot_results")
    .delete()
    .eq("survey_id", Number(surveyId));

  if (deletePlotError) {
    showGenericError("Failed to clear old plot results.");
    return false;
  }

  const { error: deleteSurveyError } = await supabase
    .from("fips_survey_results")
    .delete()
    .eq("survey_id", Number(surveyId));

  if (deleteSurveyError) {
    showGenericError("Failed to clear old survey results.");
    return false;
  }

  const payload = buildTreePayload(rows, Number(surveyId));

  const { error } = await supabase.from("fips_tree_records").insert(payload);

  if (error) {
    showGenericError("Import failed.");
    return false;
  }

  localStorage.setItem("currentSurveyId", String(surveyId));
  return true;
}

const importBtn = document.getElementById("importBtn");
if (importBtn) {
  importBtn.addEventListener("click", async () => {
    const ok = await importParsedRowsToTreeRecords();
    if (!ok) return;

    alert("Import completed successfully.");
    window.location.href = "./status.html";
  });
}

const importFromValidationBtn = document.getElementById(
  "importFromValidationBtn"
);
if (importFromValidationBtn) {
  importFromValidationBtn.addEventListener("click", async () => {
    const ok = await importParsedRowsToTreeRecords();
    if (!ok) return;

    alert("Import completed successfully.");
    window.location.href = "./status.html";
  });
}

/* =========================
   PROCESSING ENGINE
   ========================= */

function calculateBasalArea(dbhCm) {
  return Math.PI * Math.pow(dbhCm / 200, 2);
}

function calculateVolume(dbhCm, heightM) {
  const basalArea = calculateBasalArea(dbhCm);
  const formFactor = 0.45;
  return basalArea * heightM * formFactor;
}

const surveyNameDisplay = document.getElementById("surveyNameDisplay");
const processingMessage = document.getElementById("processingMessage");
const processingStatusCell = document.getElementById("processingStatusCell");
const resultStatusCell = document.getElementById("resultStatusCell");
const runProcessingBtn = document.getElementById("runProcessingBtn");
const viewResultBtn = document.getElementById("viewResultBtn");

if (surveyNameDisplay) {
  surveyNameDisplay.textContent =
    localStorage.getItem("currentSurveyName") || "-";
}

if (runProcessingBtn) {
  runProcessingBtn.addEventListener("click", async () => {
    const surveyId = localStorage.getItem("currentSurveyId");
    const surveyName = localStorage.getItem("currentSurveyName");

    console.log("Run Processing surveyId =", surveyId);
    console.log("Run Processing surveyName =", surveyName);

    if (!surveyId) {
      showGenericError("No current survey selected.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (processingMessage) processingMessage.textContent = "Loading records...";
    if (processingStatusCell) processingStatusCell.textContent = "Running";

    const { data: treeRows, error: treeError } = await supabase
      .from("fips_tree_records")
      .select("*")
      .eq("survey_id", Number(surveyId));

    console.log("treeRows =", treeRows);
    console.log("treeError =", treeError);

    if (treeError) {
      showGenericError("Failed to load records.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (!treeRows || treeRows.length === 0) {
      showGenericError("No records found.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (processingMessage) {
      processingMessage.textContent = "Calculating results...";
    }

    const grouped = {};

    treeRows.forEach((row) => {
      const plotNo = row.plot_no || "UNKNOWN";

      if (!grouped[plotNo]) {
        grouped[plotNo] = {
          survey_id: Number(surveyId),
          plot_no: plotNo,
          tree_count: 0,
          basal_area_m2: 0,
          volume_m3: 0
        };
      }

      grouped[plotNo].tree_count += 1;

      if (row.dbh_cm && !isNaN(Number(row.dbh_cm))) {
        grouped[plotNo].basal_area_m2 += calculateBasalArea(Number(row.dbh_cm));
      }

      if (
        row.dbh_cm &&
        row.height_m &&
        !isNaN(Number(row.dbh_cm)) &&
        !isNaN(Number(row.height_m))
      ) {
        grouped[plotNo].volume_m3 += calculateVolume(
          Number(row.dbh_cm),
          Number(row.height_m)
        );
      }
    });

    const plotResultsPayload = Object.values(grouped).map((r) => ({
      survey_id: r.survey_id,
      plot_no: r.plot_no,
      tree_count: r.tree_count,
      basal_area_m2: Number(r.basal_area_m2.toFixed(6)),
      volume_m3: Number(r.volume_m3.toFixed(6))
    }));

    const totalPlots = plotResultsPayload.length;
    const totalTrees = plotResultsPayload.reduce(
      (sum, row) => sum + Number(row.tree_count || 0),
      0
    );
    const totalBasalArea = plotResultsPayload.reduce(
      (sum, row) => sum + Number(row.basal_area_m2 || 0),
      0
    );
    const totalVolume = plotResultsPayload.reduce(
      (sum, row) => sum + Number(row.volume_m3 || 0),
      0
    );

    const surveyResultsPayload = {
      survey_id: Number(surveyId),
      total_plots: totalPlots,
      total_trees: totalTrees,
      total_basal_area_m2: Number(totalBasalArea.toFixed(6)),
      total_volume_m3: Number(totalVolume.toFixed(6)),
      calculated_at: new Date().toISOString()
    };

    const { error: deletePlotError } = await supabase
      .from("fips_plot_results")
      .delete()
      .eq("survey_id", Number(surveyId));

    if (deletePlotError) {
      showGenericError("Failed to clear old plot results.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    const { error: insertPlotError } = await supabase
      .from("fips_plot_results")
      .insert(plotResultsPayload);

    if (insertPlotError) {
      showGenericError("Processing failed while saving plot results.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    const { error: deleteSurveyError } = await supabase
      .from("fips_survey_results")
      .delete()
      .eq("survey_id", Number(surveyId));

    if (deleteSurveyError) {
      showGenericError("Failed to clear old survey results.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    const { error: insertSurveyError } = await supabase
      .from("fips_survey_results")
      .insert([surveyResultsPayload]);

    if (insertSurveyError) {
      showGenericError("Processing failed while saving survey results.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (processingMessage) {
      processingMessage.textContent = "Processing completed successfully.";
    }
    if (processingStatusCell) processingStatusCell.textContent = "Completed";
    if (resultStatusCell) resultStatusCell.textContent = "Generated";

    alert("Processing completed successfully.");
  });
}

if (viewResultBtn) {
  viewResultBtn.addEventListener("click", () => {
    window.location.href = "./result.html";
  });
}

/* =========================
   RESULT VIEW
   ========================= */

const resultSurveyName = document.getElementById("resultSurveyName");
const resultPlotCount = document.getElementById("resultPlotCount");
const resultTreeCount = document.getElementById("resultTreeCount");
const resultBasalArea = document.getElementById("resultBasalArea");
const resultVolume = document.getElementById("resultVolume");
const resultTableBody = document.getElementById("resultTableBody");
const recentRecordsBody = document.getElementById("recentRecordsBody");
const reimportBtn = document.getElementById("reimportBtn");

if (reimportBtn) {
  reimportBtn.addEventListener("click", () => {
    window.location.href = "./kobo-import.html";
  });
}

if (resultTableBody) {
  (async () => {
    const surveyId = await getCurrentSurveyId();
    const surveyName = localStorage.getItem("currentSurveyName");

    if (!surveyId || !surveyName) return;

    if (resultSurveyName) {
      resultSurveyName.textContent = surveyName;
    }

    const { data: summaryData, error: summaryError } = await supabase
      .from("fips_survey_results")
      .select("*")
      .eq("survey_id", Number(surveyId))
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (summaryError) {
      showGenericError("Failed to load survey summary.");
      return;
    }

    const { data: plotResults, error: plotError } = await supabase
      .from("fips_plot_results")
      .select("*")
      .eq("survey_id", Number(surveyId))
      .order("plot_no", { ascending: true });

    if (plotError) {
      showGenericError("Failed to load plot results.");
      return;
    }

    if (!plotResults || plotResults.length === 0) {
      showGenericError("No results found.");
      return;
    }

    const summary =
      summaryData && summaryData.length > 0 ? summaryData[0] : null;

    if (summary) {
      if (resultPlotCount) {
        resultPlotCount.textContent = String(summary.total_plots ?? 0);
      }
      if (resultTreeCount) {
        resultTreeCount.textContent = String(summary.total_trees ?? 0);
      }
      if (resultBasalArea) {
        resultBasalArea.textContent = Number(
          summary.total_basal_area_m2 || 0
        ).toFixed(4);
      }
      if (resultVolume) {
        resultVolume.textContent = Number(
          summary.total_volume_m3 || 0
        ).toFixed(4);
      }
    } else {
      let totalPlots = 0;
      let totalTrees = 0;
      let totalBasal = 0;
      let totalVol = 0;

      plotResults.forEach((row) => {
        totalPlots += 1;
        totalTrees += Number(row.tree_count || 0);
        totalBasal += Number(row.basal_area_m2 || 0);
        totalVol += Number(row.volume_m3 || 0);
      });

      if (resultPlotCount) resultPlotCount.textContent = String(totalPlots);
      if (resultTreeCount) resultTreeCount.textContent = String(totalTrees);
      if (resultBasalArea) resultBasalArea.textContent = totalBasal.toFixed(4);
      if (resultVolume) resultVolume.textContent = totalVol.toFixed(4);
    }

    resultTableBody.innerHTML = "";

    plotResults.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.plot_no ?? "")}</td>
        <td>${escapeHtml(row.tree_count ?? 0)}</td>
        <td>${Number(row.basal_area_m2 || 0).toFixed(4)}</td>
        <td>${Number(row.volume_m3 || 0).toFixed(4)}</td>
      `;
      resultTableBody.appendChild(tr);
    });
  })();
}

/* =========================
   HOME RECENT SURVEYS
   ========================= */

if (recentRecordsBody) {
  (async () => {
    const { data, error } = await supabase
      .from("fips_surveys")
      .select("survey_number, survey_name")
      .order("id", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      recentRecordsBody.innerHTML = `
        <tr>
          <td colspan="2">No surveys to display.</td>
        </tr>
      `;
      return;
    }

    recentRecordsBody.innerHTML = "";

    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.survey_number ?? "")}</td>
        <td>${escapeHtml(row.survey_name ?? "")}</td>
      `;
      recentRecordsBody.appendChild(tr);
    });
  })();
}

/* =========================
   SURVEY LIST
   ========================= */

const surveyTableBody = document.getElementById("surveyTableBody");

if (surveyTableBody) {
  (async () => {
    const { data, error } = await supabase
      .from("fips_surveys")
      .select(`
        id,
        survey_number,
        survey_name,
        survey_date,
        fips_survey_results (
          total_plots,
          total_trees
        )
      `)
      .order("id", { ascending: false });

    if (error || !data) {
      surveyTableBody.innerHTML =
        `<tr><td colspan="6">Failed to load surveys.</td></tr>`;
      return;
    }

    surveyTableBody.innerHTML = "";

    data.forEach((row) => {
      const tr = document.createElement("tr");

      const plots = row.fips_survey_results?.[0]?.total_plots ?? "-";
      const trees = row.fips_survey_results?.[0]?.total_trees ?? "-";

      tr.innerHTML = `
        <td>${escapeHtml(row.survey_number)}</td>
        <td>${escapeHtml(row.survey_name)}</td>
        <td>${escapeHtml(row.survey_date ?? "-")}</td>
        <td>${plots}</td>
        <td>${trees}</td>
        <td>
          <button data-id="${row.id}" data-name="${escapeHtml(
            row.survey_name
          )}" class="openSurveyBtn">
            Open
          </button>
          <button data-id="${row.id}" data-name="${escapeHtml(
            row.survey_name
          )}" class="deleteSurveyBtn">
            Delete
          </button>
        </td>
      `;

      surveyTableBody.appendChild(tr);
    });
  })();
}

/* =========================
   SURVEY LIST ACTIONS
   ========================= */

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("openSurveyBtn")) {
    const surveyId = e.target.dataset.id;
    const surveyName = e.target.dataset.name;

    localStorage.setItem("currentSurveyId", surveyId);
    localStorage.setItem("currentSurveyName", surveyName);

    window.location.href = "./result.html";
  }

  if (e.target.classList.contains("deleteSurveyBtn")) {
    const surveyId = e.target.dataset.id;
    const surveyName = e.target.dataset.name;

    const ok = confirm(`Delete survey "${surveyName}"?`);
    if (!ok) return;

    const { error: treeError } = await supabase
      .from("fips_tree_records")
      .delete()
      .eq("survey_id", Number(surveyId));

    if (treeError) {
      showGenericError("Failed to delete tree records.");
      return;
    }

    const { error: plotError } = await supabase
      .from("fips_plot_results")
      .delete()
      .eq("survey_id", Number(surveyId));

    if (plotError) {
      showGenericError("Failed to delete plot results.");
      return;
    }

    const { error: summaryError } = await supabase
      .from("fips_survey_results")
      .delete()
      .eq("survey_id", Number(surveyId));

    if (summaryError) {
      showGenericError("Failed to delete survey summary.");
      return;
    }

    const { error: surveyError } = await supabase
      .from("fips_surveys")
      .delete()
      .eq("id", Number(surveyId));

    if (surveyError) {
      showGenericError("Failed to delete survey.");
      return;
    }

    if (localStorage.getItem("currentSurveyId") === String(surveyId)) {
      localStorage.removeItem("currentSurveyId");
      localStorage.removeItem("currentSurveyName");
    }

    alert("Survey deleted successfully.");
    window.location.reload();
  }
});

/* =========================
   BACK BUTTONS
   ========================= */

const backToImportBtn = document.getElementById("backToImportBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");
const backToStatusBtn = document.getElementById("backToStatusBtn");
const backToSurveyListBtn = document.getElementById("backToSurveyListBtn");
const backFromSurveyBtn = document.getElementById("backFromSurveyBtn");

if (backToImportBtn) {
  backToImportBtn.addEventListener("click", () => {
    window.location.href = "./kobo-import.html";
  });
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

if (backToStatusBtn) {
  backToStatusBtn.addEventListener("click", () => {
    window.location.href = "./status.html";
  });
}

if (backToSurveyListBtn) {
  backToSurveyListBtn.addEventListener("click", () => {
    window.location.href = "./surveys.html";
  });
}

if (backFromSurveyBtn) {
  backFromSurveyBtn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

const exportPdfReportBtn = document.getElementById("exportPdfReportBtn");

if (exportPdfReportBtn) {
  exportPdfReportBtn.addEventListener("click", () => {
    const surveyId = localStorage.getItem("currentSurveyId");
    if (!surveyId) {
      showGenericError("No current survey selected.");
      return;
    }

    window.location.href = "./report.html";
  });
}
