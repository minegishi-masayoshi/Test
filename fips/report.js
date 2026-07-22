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
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function safeText(
  value,
  fallback = "-"
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return escapeHtml(fallback);
  }

  return escapeHtml(value);
}


function toNumber(
  value,
  fallback = 0
) {
  const converted =
    Number(value);

  return Number.isFinite(converted)
    ? converted
    : fallback;
}


function formatAssessmentNumber(value) {
  return toNumber(value).toFixed(3);
}


function formatPercentage(value) {
  return toNumber(value).toFixed(2);
}


function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return safeText(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  );
}


function formatDateTime(
  value = null
) {
  const date = value
    ? new Date(value)
    : new Date();

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-GB",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}


/* =========================================================
   Survey ID
========================================================= */

function getSurveyId() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const querySurveyId =
    parameters.get("survey_id") ||
    parameters.get("survey");

  const storedSurveyId =
    localStorage.getItem(
      "currentSurveyId"
    );

  const candidate =
    querySurveyId ||
    storedSurveyId;

  const surveyId =
    Number(candidate);

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
    } =
      await supabaseClient.auth.getSession();

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
    document.getElementById(
      elementId
    );

  if (!body) {
    return;
  }

  body.innerHTML = `
    <tr>
      <td
        colspan="${colspan}"
        class="message-cell"
      >
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}


function setLoadingState() {
  const reportMeta =
    document.getElementById(
      "reportMeta"
    );

  if (reportMeta) {
    reportMeta.textContent =
      "Loading survey information...";
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
    "majorSpeciesBody",
    6,
    "Loading major species summary..."
  );
}


/* =========================================================
   Supabase Data Loading
========================================================= */

async function loadSurvey(
  surveyId
) {
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
      number_of_blocks
    `)
    .eq("id", surveyId)
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "loadSurvey:",
      error
    );

    throw new Error(
      "Failed to load survey information."
    );
  }

  return data;
}


async function loadAssessmentSummary(
  surveyId
) {
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


async function loadMajorSpeciesSummary(
  surveyId
) {
  const {
    data,
    error
  } = await supabaseClient.rpc(
    "get_major_species_summary",
    {
      p_survey_id: surveyId
    }
  );

  if (error) {
    console.error(
      "loadMajorSpeciesSummary:",
      error
    );

    throw new Error(
      "Failed to load major species summary."
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}


/* =========================================================
   Report Header
========================================================= */

function renderReportHeader(
  survey
) {
  const reportTitle =
    document.getElementById(
      "reportTitle"
    );

  const reportMeta =
    document.getElementById(
      "reportMeta"
    );

  const surveyName =
    survey.survey_name ||
    "Survey";

  if (reportTitle) {
    reportTitle.textContent =
      `FIPS Assessment Summary Report - ${surveyName}`;
  }

  if (reportMeta) {
    reportMeta.innerHTML = `
      <div>
        <strong>Survey Name:</strong>
        <span>
          ${safeText(
            survey.survey_name
          )}
        </span>
      </div>

      <div>
        <strong>Survey Number:</strong>
        <span>
          ${safeText(
            survey.survey_number
          )}
        </span>
      </div>

      <div>
        <strong>Survey Date:</strong>
        <span>
          ${safeText(
            formatDate(
              survey.survey_date
            )
          )}
        </span>
      </div>

      <div>
        <strong>Province:</strong>
        <span>
          ${safeText(
            survey.province
          )}
        </span>
      </div>

      <div>
        <strong>Number of Blocks:</strong>
        <span>
          ${safeText(
            survey.number_of_blocks ?? 0,
            "0"
          )}
        </span>
      </div>

      <div>
        <strong>Exported At:</strong>
        <span>
          ${safeText(
            formatDateTime()
          )}
        </span>
      </div>
    `;
  }
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


function calculateAssessmentTotals(
  rows
) {
  const totals = {
    quality_code: 999,
    quality_class: "TOTAL"
  };

  Object
    .values(ASSESSMENT_FIELDS)
    .flat()
    .forEach(
      (fieldName) => {
        totals[fieldName] = 0;
      }
    );

  rows.forEach((row) => {
    Object
      .values(ASSESSMENT_FIELDS)
      .flat()
      .forEach(
        (fieldName) => {
          totals[fieldName] +=
            toNumber(
              row[fieldName]
            );
        }
      );
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
        row.quality_class ===
        "TOTAL";

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
                : safeText(
                    row.quality_class
                  )
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


function renderAssessmentSummary(
  rows
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
            <td
              colspan="5"
              class="message-cell"
            >
              No assessment summary data found.
            </td>
          </tr>
        `;
      }
    });

    return;
  }

  const orderedRows = [
    ...rows
  ].sort(
    (first, second) =>
      toNumber(
        first.quality_code
      ) -
      toNumber(
        second.quality_code
      )
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
   Major Species Summary
========================================================= */

function renderMajorSpeciesSummary(
  rows
) {
  const majorSpeciesBody =
    document.getElementById(
      "majorSpeciesBody"
    );

  if (!majorSpeciesBody) {
    return;
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    setTableMessage(
      "majorSpeciesBody",
      6,
      "No major species summary data found."
    );

    return;
  }

  majorSpeciesBody.innerHTML =
    rows
      .map(
        (row) => `
          <tr>

            <td>
              ${safeText(
                row.species_name,
                "Unknown species"
              )}
            </td>

            <td>
              ${safeText(
                row.species_code
              )}
            </td>

            <td>
              ${formatAssessmentNumber(
                row.volume_10_19
              )}
            </td>

            <td>
              ${formatAssessmentNumber(
                row.volume_20_49
              )}
            </td>

            <td>
              ${formatAssessmentNumber(
                row.volume_50_plus
              )}
            </td>

            <td>
              ${formatPercentage(
                row.percentage_of_total
              )}
            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   Error Rendering
========================================================= */

function renderAssessmentError(
  message
) {
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


function renderMajorSpeciesError(
  message
) {
  setTableMessage(
    "majorSpeciesBody",
    6,
    message ||
    "Failed to load major species summary."
  );
}


/* =========================================================
   Buttons
========================================================= */

function attachButtonEvents() {
  const backButton =
    document.getElementById(
      "backToResultBtn"
    );

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

  const surveyId =
    getSurveyId();

  if (!surveyId) {
    window.alert(
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
      surveyResult,
      assessmentResult,
      majorSpeciesResult
    ] =
      await Promise.allSettled([
        loadSurvey(surveyId),
        loadAssessmentSummary(
          surveyId
        ),
        loadMajorSpeciesSummary(
          surveyId
        )
      ]);

    if (
      surveyResult.status ===
      "rejected"
    ) {
      throw surveyResult.reason;
    }

    renderReportHeader(
      surveyResult.value
    );

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
        assessmentResult
          .reason
          ?.message
      );
    }

    if (
      majorSpeciesResult.status ===
      "fulfilled"
    ) {
      renderMajorSpeciesSummary(
        majorSpeciesResult.value
      );

    } else {
      console.error(
        "Major Species Summary:",
        majorSpeciesResult.reason
      );

      renderMajorSpeciesError(
        majorSpeciesResult
          .reason
          ?.message
      );
    }

    attachButtonEvents();

  } catch (error) {
    console.error(
      "Report initialization failed:",
      error
    );

    window.alert(
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
