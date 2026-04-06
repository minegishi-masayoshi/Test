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

function applyUserStatus(session) {
  const userStatus = document.getElementById("userStatus");
  if (!userStatus) return;
  userStatus.textContent = "Access granted";
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
      adjusted_net_forest_area: document.getElementById("adjustedNetForestArea").value
        ? Number(document.getElementById("adjustedNetForestArea").value)
        : null
    };

    if (!payload.survey_number || !payload.survey_name) {
      showGenericError("Please enter the required fields.");
      return;
    }

    const { error } = await supabase
      .from("fips_surveys")
      .insert([payload]);

    if (error) {
      showGenericError("Save failed.");
      return;
    }

    localStorage.setItem("currentSurveyName", payload.survey_name);
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
      mappedEl.textContent = parsedRows.length > 0 ? "Basic fields detected" : "-";
    }

    localStorage.setItem("fipsParsedRows", JSON.stringify(parsedRows));
    localStorage.setItem("fipsValidationErrors", JSON.stringify(validationErrors));

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
      messageEl.textContent = "Validation failed. Please review the errors below.";
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

async function getCurrentSurveyId() {
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

  return data[0].id;
}

function buildTreePayload(rows, surveyId) {
  return rows.map((row) => ({
    survey_id: surveyId,
    row_no: row.__rowNo ?? null,
    plot_no: row.plot_no || row.plot || null,
    tree_no: row.tree_no || row.tree || null,
    species_code: row.species_code || row.species || null,
    dbh_cm: row.dbh_cm && !isNaN(Number(row.dbh_cm)) ? Number(row.dbh_cm) : null,
    height_m: row.height_m && !isNaN(Number(row.height_m)) ? Number(row.height_m) : null,
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

  const payload = buildTreePayload(rows, surveyId);

  const { error } = await supabase
    .from("fips_tree_records")
    .insert(payload);

  if (error) {
    showGenericError("Import failed.");
    return false;
  }

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

const importFromValidationBtn = document.getElementById("importFromValidationBtn");
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
  surveyNameDisplay.textContent = localStorage.getItem("currentSurveyName") || "-";
}

if (runProcessingBtn) {
  runProcessingBtn.addEventListener("click", async () => {
    const surveyId = await getCurrentSurveyId();
    if (!surveyId) {
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (processingMessage) processingMessage.textContent = "Loading records...";
    if (processingStatusCell) processingStatusCell.textContent = "Running";

    const { data: treeRows, error: treeError } = await supabase
      .from("fips_tree_records")
      .select("*")
      .eq("survey_id", surveyId);

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

    if (processingMessage) processingMessage.textContent = "Calculating results...";

    const grouped = {};

    treeRows.forEach((row) => {
      const plotNo = row.plot_no || "UNKNOWN";

      if (!grouped[plotNo]) {
        grouped[plotNo] = {
          survey_id: surveyId,
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

    const resultsPayload = Object.values(grouped).map((r) => ({
      survey_id: r.survey_id,
      plot_no: r.plot_no,
      tree_count: r.tree_count,
      basal_area_m2: Number(r.basal_area_m2.toFixed(6)),
      volume_m3: Number(r.volume_m3.toFixed(6))
    }));

    const { error: deleteError } = await supabase
      .from("fips_results")
      .delete()
      .eq("survey_id", surveyId);

    if (deleteError) {
      showGenericError("Failed to clear old results.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    const { error: insertResultError } = await supabase
      .from("fips_results")
      .insert(resultsPayload);

    if (insertResultError) {
      showGenericError("Processing failed.");
      if (processingStatusCell) processingStatusCell.textContent = "Failed";
      return;
    }

    if (processingMessage) processingMessage.textContent = "Processing completed successfully.";
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

if (resultTableBody) {
  (async () => {
    const surveyId = await getCurrentSurveyId();
    const surveyName = localStorage.getItem("currentSurveyName");

    if (!surveyId || !surveyName) return;

    if (resultSurveyName) {
      resultSurveyName.textContent = surveyName;
    }

    const { data: resultsData, error: resultsError } = await supabase
      .from("fips_results")
      .select("*")
      .eq("survey_id", surveyId)
      .order("plot_no", { ascending: true });

    if (resultsError) {
      showGenericError("Failed to load results.");
      return;
    }

    if (!resultsData || resultsData.length === 0) {
      showGenericError("No results found.");
      return;
    }

    let totalPlots = 0;
    let totalTrees = 0;
    let totalBasal = 0;
    let totalVol = 0;

    resultsData.forEach((row) => {
      totalPlots += 1;
      totalTrees += Number(row.tree_count || 0);
      totalBasal += Number(row.basal_area_m2 || 0);
      totalVol += Number(row.volume_m3 || 0);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.plot_no ?? "")}</td>
        <td>${escapeHtml(row.tree_count ?? 0)}</td>
        <td>${Number(row.basal_area_m2 || 0).toFixed(4)}</td>
        <td>${Number(row.volume_m3 || 0).toFixed(4)}</td>
      `;
      resultTableBody.appendChild(tr);
    });

    if (resultPlotCount) resultPlotCount.textContent = String(totalPlots);
    if (resultTreeCount) resultTreeCount.textContent = String(totalTrees);
    if (resultBasalArea) resultBasalArea.textContent = totalBasal.toFixed(4);
    if (resultVolume) resultVolume.textContent = totalVol.toFixed(4);
  })();
}

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
