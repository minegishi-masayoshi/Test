import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("FIPS connected to Supabase");

window.fipsApp = { supabase };

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

    console.log("payload", payload);

    const { error } = await supabase
      .from("fips_surveys")
      .insert([payload]);

    if (error) {
      console.error("Insert error:", error);
      alert(`Save failed: ${error.message}`);
      return;
    }

    localStorage.setItem("currentSurveyName", payload.survey_name);
    alert("Survey saved successfully.");
    window.location.href = "./kobo-import.html";
  });
}

/* =========================
   FIPS CSV IMPORT MODULE
   ========================= */

let parsedRows = [];
let validationErrors = [];

function parseCsv(text) {

  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

  if(lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map((line,index)=>{

    const values = line.split(",").map(v=>v.trim());

    const row={};

    headers.forEach((h,i)=>{
      row[h]=values[i] ?? "";
    });

    row.__rowNo = index+2;

    return row;

  });
}

function validateRows(rows){

  const errors=[];

  rows.forEach((row)=>{

    const plotNo = row.plot_no || row.plot || "";
    const treeNo = row.tree_no || row.tree || "";
    const speciesCode = row.species_code || row.species || "";
    const dbh = row.dbh_cm || row.dbh || "";
    const height = row.height_m || row.height || "";

    if(!plotNo){

      errors.push({
        row_no:row.__rowNo,
        plot_no:"",
        tree_no:treeNo,
        field_name:"Plot No",
        message:"Missing value"
      });

    }

    if(!treeNo){

      errors.push({
        row_no:row.__rowNo,
        plot_no:plotNo,
        tree_no:"",
        field_name:"Tree No",
        message:"Missing value"
      });

    }

    if(!speciesCode){

      errors.push({
        row_no:row.__rowNo,
        plot_no:plotNo,
        tree_no:treeNo,
        field_name:"Species Code",
        message:"Missing value"
      });

    }

    if(dbh && isNaN(Number(dbh))){

      errors.push({
        row_no:row.__rowNo,
        plot_no:plotNo,
        tree_no:treeNo,
        field_name:"DBH",
        message:"Invalid number"
      });

    }

    if(height && isNaN(Number(height))){

      errors.push({
        row_no:row.__rowNo,
        plot_no:plotNo,
        tree_no:treeNo,
        field_name:"Height",
        message:"Invalid number"
      });

    }

  });

  return errors;

}

const validateBtn = document.getElementById("validateBtn");
const fileUpload = document.getElementById("fileUpload");

if(validateBtn && fileUpload){

validateBtn.addEventListener("click", async()=>{

const file = fileUpload.files[0];

if(!file){

alert("Please select a CSV file.");

return;

}

const text = await file.text();

parsedRows = parseCsv(text);

validationErrors = validateRows(parsedRows);

const totalEl = document.getElementById("totalRecords");
const mappedEl = document.getElementById("mappedFields");

if(totalEl)
totalEl.textContent = String(parsedRows.length);

if(mappedEl)
mappedEl.textContent = parsedRows.length>0
? "Basic fields detected"
: "-";

localStorage.setItem(
"fipsParsedRows",
JSON.stringify(parsedRows)
);

localStorage.setItem(
"fipsValidationErrors",
JSON.stringify(validationErrors)
);

window.location.href="./validation.html";

});

}

/* =========================
   CSV SUMMARY ON FILE SELECT
   ========================= */

const csvInput = document.getElementById("fileUpload");

if (csvInput) {

csvInput.addEventListener("change", async () => {

if (csvInput.files.length === 0) return;

const file = csvInput.files[0];

const text = await file.text();

const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

if (lines.length === 0) return;

const headers = lines[0].split(",").map(h => h.trim());

const recordCount = lines.length - 1;

const totalEl = document.getElementById("totalRecords");
const mappedEl = document.getElementById("mappedFields");

if (totalEl) {
totalEl.textContent = recordCount;
}

const expectedFields = [
"plot_no",
"tree_no",
"species_code",
"dbh_cm",
"height_m"
];

const matched = expectedFields.filter(f => headers.includes(f));

if (mappedEl) {

if (matched.length === expectedFields.length) {

mappedEl.textContent = "All required fields detected";

} else {

mappedEl.textContent =
"Detected: " + matched.join(", ");

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

  if (totalEl) totalEl.textContent = rows.length;
  if (errorCountEl) errorCountEl.textContent = errors.length;

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

    errors.forEach(err => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${err.row_no ?? ""}</td>
        <td>${err.plot_no ?? ""}</td>
        <td>${err.tree_no ?? ""}</td>
        <td>${err.field_name ?? ""}</td>
        <td>${err.message ?? ""}</td>
      `;

      validationTableBody.appendChild(tr);

    });

  }

}
