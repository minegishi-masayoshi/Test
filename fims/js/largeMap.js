/**
 * FIMS Cloud Ver.3.6.3 - Nationwide Constraint Analysis
 */

import { CONFIG } from "./config.js";
import * as DataModule from "./data.js";
import { FimsMap } from "./map.js";
import { initializeImport } from "./import.js";

const params =
  new URLSearchParams(
    window.location.search
  );

const requestedProvince =
  params.get("province");

const requestedProvinceName =
  params.get("provinceName");


const dom = {
  province:
    document.getElementById(
      "largeMapProvince"
    ),

  layers:
    document.getElementById(
      "largeMapLayerList"
    ),

  message:
    document.getElementById(
      "largeMapMessage"
    ),

  status:
    document.getElementById(
      "largeMapStatus"
    ),

  coordinate:
    document.getElementById(
      "largeMapCoordinate"
    ),

  pngExtent:
    document.getElementById(
      "pngExtentButton"
    ),

  close:
    document.getElementById(
      "closeLargeMapButton"
    ),

  reviewImported:
    document.getElementById(
      "reviewImportedButton"
    ),

  fmuCalculation:
    document.getElementById(
      "fmuCalculationButton"
    ),

  reviewResults:
    document.getElementById(
      "reviewResultsButton"
    ),

  reviewModal:
    document.getElementById(
      "reviewModal"
    ),

  closeReviewDialog:
    document.getElementById(
      "closeReviewDialogButton"
    ),

  refreshImportedLayer:
    document.getElementById(
      "refreshImportedLayerButton"
    ),

  continueCalculate:
    document.getElementById(
      "continueCalculateButton"
    ),

  reviewTargetLayer:
    document.getElementById(
      "reviewTargetLayer"
    ),

  reviewImportedCount:
    document.getElementById(
      "reviewImportedCount"
    ),

  reviewSkippedCount:
    document.getElementById(
      "reviewSkippedCount"
    ),

  reviewGeometryType:
    document.getElementById(
      "reviewGeometryType"
    ),

  reviewSrid:
    document.getElementById(
      "reviewSrid"
    ),

  reviewWmsLayer:
    document.getElementById(
      "reviewWmsLayer"
    ),

  reviewPublishStatus:
    document.getElementById(
      "reviewPublishStatus"
    ),

  reviewReloadStatus:
    document.getElementById(
      "reviewReloadStatus"
    ),

  reviewStatusBanner:
    document.getElementById(
      "reviewStatusBanner"
    ),

  calculationModal:
    document.getElementById("calculationModal"),
  closeCalculationDialog:
    document.getElementById("closeCalculationDialogButton"),
  executeCalculation:
    document.getElementById("executeCalculationButton"),
  refreshCalculationResults:
    document.getElementById("refreshCalculationResultsButton"),
  calculationProgress:
    document.getElementById("calculationProgress"),
  calculationStatusBanner:
    document.getElementById("calculationStatusBanner"),
  calculationProvince:
    document.getElementById("calculationProvince"),
  calculationFmuCount:
    document.getElementById("calculationFmuCount"),
  resultExtremeSlope:
    document.getElementById("resultExtremeSlope"),
  resultExtremeAltitude:
    document.getElementById("resultExtremeAltitude"),
  resultExtremeKarst:
    document.getElementById("resultExtremeKarst"),
  resultExtremeInundation:
    document.getElementById("resultExtremeInundation"),
  resultExtremeMangrove:
    document.getElementById("resultExtremeMangrove"),
  resultSeriousSlopeRelief:
    document.getElementById("resultSeriousSlopeRelief"),
  resultSeriousInundation:
    document.getElementById("resultSeriousInundation"),
  resultExtremeTotal:
    document.getElementById("resultExtremeTotal"),
  resultSeriousTotal:
    document.getElementById("resultSeriousTotal"),
  resultCalculatedAt:
    document.getElementById("resultCalculatedAt"),
  calculationScopeInputs:
    Array.from(document.querySelectorAll(
      'input[name="calculationScope"]'
    )),
  calculationScopeNote:
    document.getElementById("calculationScopeNote"),
  applyCalculationResults:
    document.getElementById("applyCalculationResultsButton")
};

const state = {
  lastImportedLayerKey: null,
  lastImportResult: null,
  calculationScope: "province",
  lastCalculationResult: null,
  lastImportTarget: null,
  selectedProvince: null,
  layerInputs: new Map()
};

function setStatus(message) {
  dom.status.textContent = message;
  dom.message.textContent = message;
  dom.message.hidden = false;

  window.clearTimeout(
    setStatus.timer
  );

  setStatus.timer =
    window.setTimeout(
      () => {
        dom.message.hidden = true;
      },
      3500
    );
}

function setWorkflowStep(step) {
  document
    .querySelectorAll(
      "[data-workflow-step]"
    )
    .forEach(
      (element) => {
        const current =
          Number(
            element.dataset
              .workflowStep
          );

        element.classList.toggle(
          "is-active",
          current === step
        );

        element.classList.toggle(
          "is-complete",
          current < step
        );
      }
    );
}

function getProvinceId(record) {
  return (
    record?.provinceCode ??
    record?.province ??
    record?.code ??
    record?.id ??
    ""
  );
}

function getProvinceName(record) {
  return (
    record?.provinceName ??
    record?.name ??
    record?.label ??
    `Province ${getProvinceId(record)}`
  );
}


const layerGroups = [
  {
    title: "Administrative",
    keys: [
      "province",
      "district"
    ]
  },
  {
    title: "Forest Management",
    keys: [
      "fmu",
      "concession",
      "protectedArea",
      "planArea",
      "forestBaseMap"
    ]
  },
  {
    title: "Logging / Land Use",
    keys: [
      "loggedNotLandUseCurrent",
      "loggedLandUseCurrent",
      "landUseNotLoggedCurrent"
    ]
  },
  {
    title: "Forest Constraints",
    keys: [
      "extremeSlope",
      "extremeAltitude",
      "extremeKarst",
      "extremeInundation",
      "extremeMangrove",
      "seriousSlopeRelief",
      "seriousInundation"
    ]
  }
];

function buildLayerControls(mapManager) {
  dom.layers.replaceChildren();
  state.layerInputs.clear();

  for (const group of layerGroups) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "large-map-layer-group";

    const heading =
      document.createElement("h3");

    heading.textContent =
      group.title;

    section.append(heading);

    for (const key of group.keys) {
      const definition =
        CONFIG.layers?.[key];

      if (!definition?.enabled) {
        continue;
      }

      const label =
        document.createElement(
          "label"
        );

      const input =
        document.createElement(
          "input"
        );

      input.type = "checkbox";
      input.checked =
        key === "province";

      input.addEventListener(
        "change",
        () => {
          mapManager
            .setWmsLayerVisible(
              key,
              input.checked,
              {
                notify: false
              }
            );

          setStatus(
            `${definition.label} ` +
            `${input.checked ? "displayed" : "hidden"}.`
          );
        }
      );

      state.layerInputs.set(
        key,
        input
      );

      label.append(
        input,
        document.createTextNode(
          definition.label
        )
      );

      section.append(label);
    }

    dom.layers.append(section);
  }
}

function displayImportedLayer(
  mapManager,
  layerKey
) {
  if (!layerKey) {
    return;
  }

  const input =
    state.layerInputs.get(
      layerKey
    );

  if (input) {
    input.checked = true;
  }

  mapManager.refreshWmsLayer(
    layerKey
  );

  mapManager.setWmsLayerVisible(
    layerKey,
    true,
    {
      notify: false
    }
  );

  setStatus(
    "Imported layer refreshed in Large Map."
  );
}


function setText(element, value) {
  if (element) {
    element.textContent =
      value ?? "—";
  }
}

function populateReviewDialog() {
  const result =
    state.lastImportResult;

  const target =
    state.lastImportTarget;

  if (!result || !target) {
    return false;
  }

  setText(
    dom.reviewTargetLayer,
    target.label
  );

  setText(
    dom.reviewImportedCount,
    Number.isFinite(
      Number(result.imported_count)
    )
      ? Number(
          result.imported_count
        ).toLocaleString()
      : "—"
  );

  setText(
    dom.reviewSkippedCount,
    Number.isFinite(
      Number(result.skipped_count)
    )
      ? Number(
          result.skipped_count
        ).toLocaleString()
      : "—"
  );

  setText(
    dom.reviewGeometryType,
    result.geometry_type ||
      "MULTIPOLYGON"
  );

  setText(
    dom.reviewSrid,
    result.srid
      ? `EPSG:${result.srid}`
      : "—"
  );

  setText(
    dom.reviewWmsLayer,
    result.geoserver?.wms_layer ||
      `fims:${result.target}`
  );

  const publishAction =
    result.geoserver
      ?.publish_action;

  setText(
    dom.reviewPublishStatus,
    publishAction ===
      "published"
      ? "Published automatically"
      : publishAction ===
        "already_published"
        ? "Existing layer updated"
        : "Completed"
  );

  setText(
    dom.reviewReloadStatus,
    result.geoserver
      ?.catalog_reloaded
      ? "Completed"
      : "Not confirmed"
  );

  if (dom.reviewStatusBanner) {
    dom.reviewStatusBanner.textContent =
      `${target.label}: ` +
      `${result.imported_count ?? 0} features imported successfully.`;
  }

  return true;
}

function openReviewDialog(
  mapManager
) {
  if (!populateReviewDialog()) {
    setStatus(
      "Import a dataset first."
    );
    return;
  }

  displayImportedLayer(
    mapManager,
    state.lastImportedLayerKey
  );

  setWorkflowStep(2);
  dom.reviewModal.hidden = false;
}

function closeReviewDialog() {
  dom.reviewModal.hidden = true;
}


function getSelectedProvinceCode() {
  return (
    state.selectedProvince?.provinceCode ??
    state.selectedProvince?.province ??
    state.selectedProvince?.code ??
    state.selectedProvince?.id ??
    requestedProvince ??
    null
  );
}

function constraintUrl(endpointTemplate) {
  const base =
    CONFIG.constraintAnalysis.apiBaseUrl.replace(/\/$/, "");

  if (!endpointTemplate.includes("{province}")) {
    return base + endpointTemplate;
  }

  const province = getSelectedProvinceCode();
  if (!province) {
    throw new Error("Select a Province before calculation.");
  }

  return (
    base +
    endpointTemplate.replace(
      "{province}",
      encodeURIComponent(String(province))
    )
  );
}

function formatArea(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString("en-US", {
        maximumFractionDigits: 2
      })} ha`
    : "—";
}

function renderCalculationResult(payload) {
  const summary = payload?.summary ?? payload ?? {};
  const allScope =
    payload?.scope === "all" ||
    summary?.scope === "all";

  setText(
    dom.calculationProvince,
    allScope
      ? "All Provinces"
      : (
          state.selectedProvince
            ? `${getSelectedProvinceCode()} ${getProvinceName(state.selectedProvince)}`
            : String(getSelectedProvinceCode() ?? "—")
        )
  );

  setText(
    dom.calculationFmuCount,
    summary.fmu_count ??
    payload?.updated_fmu_count ??
    "—"
  );
  setText(dom.resultExtremeSlope, formatArea(summary.extreme_slope_ha));
  setText(dom.resultExtremeAltitude, formatArea(summary.extreme_altitude_ha));
  setText(dom.resultExtremeKarst, formatArea(summary.extreme_karst_ha));
  setText(dom.resultExtremeInundation, formatArea(summary.extreme_inundation_ha));
  setText(dom.resultExtremeMangrove, formatArea(summary.extreme_mangrove_ha));
  setText(dom.resultSeriousSlopeRelief, formatArea(summary.serious_sloperelief_ha));
  setText(dom.resultSeriousInundation, formatArea(summary.serious_inundation_ha));
  setText(dom.resultExtremeTotal, formatArea(summary.extreme_total_ha));
  setText(dom.resultSeriousTotal, formatArea(summary.serious_total_ha));
  setText(
    dom.resultCalculatedAt,
    summary.calculated_at
      ? new Date(summary.calculated_at).toLocaleString()
      : "—"
  );

  state.lastCalculationResult = payload;
  dom.applyCalculationResults.disabled =
    !summary.calculated_at;
}

async function requestConstraint(endpointTemplate, method = "GET") {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    CONFIG.constraintAnalysis.timeoutMs ?? 1800000
  );

  try {
    const response = await fetch(
      constraintUrl(endpointTemplate),
      {
        method,
        cache: "no-store",
        signal: controller.signal
      }
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail || `HTTP ${response.status}`);
    }
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

async function refreshConstraintResults() {
  const endpoint =
    state.calculationScope === "all"
      ? CONFIG.constraintAnalysis.endpoints.allSummary
      : CONFIG.constraintAnalysis.endpoints.provinceSummary;

  const payload = await requestConstraint(endpoint);
  renderCalculationResult(payload);
  return payload;
}

function updateCalculationScopeUi() {
  const allScope =
    state.calculationScope === "all";

  setText(
    dom.calculationProvince,
    allScope
      ? "All Provinces"
      : (
          state.selectedProvince
            ? `${getSelectedProvinceCode()} ${getProvinceName(state.selectedProvince)}`
            : "—"
        )
  );

  dom.calculationScopeNote.textContent =
    allScope
      ? "All Province codes in the FMU table will be calculated sequentially. Each Province is committed separately."
      : "Only the currently selected Province will be recalculated.";
}

function openCalculationDialog() {
  if (
    state.calculationScope === "province" &&
    !getSelectedProvinceCode()
  ) {
    setStatus("Select a Province before Calculate.");
    return;
  }

  updateCalculationScopeUi();
  dom.calculationStatusBanner.textContent =
    state.calculationScope === "all"
      ? "Ready to calculate all Provinces."
      : "Ready to calculate the selected Province.";
  dom.calculationModal.hidden = false;
}

function closeCalculationDialog() {
  dom.calculationModal.hidden = true;
}


function notifySummaryRefreshAndClose() {
  const payload = state.lastCalculationResult;
  const detail = {
    type: "fims:constraint-calculation-complete",
    scope: state.calculationScope,
    province: getSelectedProvinceCode(),
    calculationVersion:
      payload?.calculation_version ??
      CONFIG.constraintAnalysis.calculationVersion,
    calculatedAt:
      payload?.summary?.calculated_at ??
      new Date().toISOString()
  };

  try {
    localStorage.setItem(
      "fimsConstraintCalculationUpdated",
      JSON.stringify(detail)
    );
  } catch (error) {
    console.warn(
      "Constraint refresh notification could not be stored.",
      error
    );
  }

  if (
    window.opener &&
    !window.opener.closed
  ) {
    window.opener.postMessage(
      detail,
      window.location.origin
    );
  }

  closeCalculationDialog();
  window.close();
}

async function initialize() {
  const mapManager =
    new FimsMap({
      elementId: "largeMap",
      config: CONFIG,

      onCoordinate: (value) => {
        dom.coordinate.textContent =
          value;
      },

      onStatus: (value) => {
        dom.status.textContent =
          value;
      },

      onError: (message) => {
        setStatus(message);
      }
    });

  buildLayerControls(
    mapManager
  );

  setWorkflowStep(1);

  dom.pngExtent.addEventListener(
    "click",
    () => mapManager.zoomToPng(
      {
        notify: false
      }
    )
  );

  dom.close.addEventListener(
    "click",
    () => window.close()
  );

  dom.reviewImported
    .addEventListener(
      "click",
      () => {
        openReviewDialog(
          mapManager
        );
      }
    );

  dom.closeReviewDialog
    .addEventListener(
      "click",
      closeReviewDialog
    );

  dom.reviewModal
    .querySelectorAll(
      "[data-review-close]"
    )
    .forEach(
      (element) => {
        element.addEventListener(
          "click",
          closeReviewDialog
        );
      }
    );

  dom.refreshImportedLayer
    .addEventListener(
      "click",
      () => {
        displayImportedLayer(
          mapManager,
          state.lastImportedLayerKey
        );

        populateReviewDialog();

        setStatus(
          "Latest GeoServer WMS layer refreshed."
        );
      }
    );

  dom.continueCalculate
    .addEventListener(
      "click",
      () => {
        closeReviewDialog();
        setWorkflowStep(3);
        dom.fmuCalculation.disabled =
          false;

        setStatus(
          "Imported layer review completed. Continue with Calculate."
        );
      }
    );

  dom.fmuCalculation
    .addEventListener(
      "click",
      openCalculationDialog
    );

  dom.closeCalculationDialog
    .addEventListener(
      "click",
      closeCalculationDialog
    );

  dom.calculationModal
    .querySelectorAll("[data-calculation-close]")
    .forEach((element) => {
      element.addEventListener(
        "click",
        closeCalculationDialog
      );
    });

  dom.calculationScopeInputs
    .forEach((input) => {
      input.addEventListener(
        "change",
        () => {
          state.calculationScope =
            input.checked
              ? input.value
              : state.calculationScope;
          state.lastCalculationResult = null;
          dom.applyCalculationResults.disabled = true;
          updateCalculationScopeUi();
        }
      );
    });

  dom.executeCalculation
    .addEventListener(
      "click",
      async () => {
        const allScope =
          state.calculationScope === "all";

        const confirmation =
          allScope
            ? "Calculate Forest Constraints for all Provinces? Existing FMU calculation values for the whole country will be updated."
            : "Calculate Forest Constraints for the selected Province? Existing FMU calculation values will be updated.";

        if (!window.confirm(confirmation)) {
          return;
        }

        dom.executeCalculation.disabled = true;
        dom.refreshCalculationResults.disabled = true;
        dom.applyCalculationResults.disabled = true;
        dom.calculationProgress.hidden = false;
        dom.calculationStatusBanner.textContent =
          allScope
            ? "Nationwide calculation is running. This may take several minutes. Do not close this window."
            : "Calculation is running. Do not close this window.";

        try {
          const endpoint =
            allScope
              ? CONFIG.constraintAnalysis.endpoints.calculateAll
              : CONFIG.constraintAnalysis.endpoints.calculateProvince;

          const payload = await requestConstraint(
            endpoint,
            "POST"
          );

          renderCalculationResult(payload);

          if (allScope) {
            dom.calculationStatusBanner.textContent =
              `Nationwide calculation completed: ` +
              `${payload.successful_province_count}/${payload.processed_province_count} Provinces succeeded; ` +
              `${payload.updated_fmu_count} FMUs updated` +
              (
                payload.failed_province_count
                  ? `; ${payload.failed_province_count} Province(s) failed.`
                  : "."
              );
          } else {
            dom.calculationStatusBanner.textContent =
              `Calculation completed: ${payload.updated_fmu_count} FMUs updated.`;
          }

          dom.reviewResults.disabled = false;
          setWorkflowStep(4);
          setStatus(
            allScope
              ? "Nationwide Forest Constraint calculation completed."
              : "Forest Constraint calculation completed."
          );
        } catch (error) {
          dom.calculationStatusBanner.textContent =
            `Calculation failed: ${error.message}`;
          setStatus(`Calculation failed: ${error.message}`);
        } finally {
          dom.executeCalculation.disabled = false;
          dom.refreshCalculationResults.disabled = false;
          dom.calculationProgress.hidden = true;
        }
      }
    );

  dom.refreshCalculationResults
    .addEventListener(
      "click",
      async () => {
        try {
          await refreshConstraintResults();
          dom.calculationStatusBanner.textContent =
            "Latest calculation results loaded.";
        } catch (error) {
          dom.calculationStatusBanner.textContent =
            `Results could not be loaded: ${error.message}`;
        }
      }
    );

  dom.applyCalculationResults
    .addEventListener(
      "click",
      notifySummaryRefreshAndClose
    );

  dom.reviewResults
    .addEventListener(
      "click",
      async () => {
        openCalculationDialog();
        try {
          await refreshConstraintResults();
        } catch (error) {
          dom.calculationStatusBanner.textContent =
            `Results could not be loaded: ${error.message}`;
        }
        mapManager.refreshWmsLayer(
          "fmu"
        );

        mapManager.refreshWmsLayer(
          "concession"
        );

        mapManager.setWmsLayerVisible(
          "fmu",
          true,
          {
            notify: false
          }
        );

        setWorkflowStep(4);

        setStatus(
          "FMU and Concession layers refreshed."
        );
      }
    );

  initializeImport(
    async (result, target) => {
      state.lastImportedLayerKey =
        target.mapLayerKey;

      state.lastImportResult =
        result;

      state.lastImportTarget =
        target;

      dom.reviewImported.disabled =
        false;

      dom.fmuCalculation.disabled =
        true;

      setWorkflowStep(2);

      displayImportedLayer(
        mapManager,
        target.mapLayerKey
      );

      populateReviewDialog();

      setStatus(
        "Import completed. Select Review to confirm the imported layer."
      );
    }
  );

  try {
    const provinceResult =
      await DataModule.loadProvinces();

    const provinces =
      provinceResult.records ??
      [];

    mapManager.setProvinceData(
      provinces
    );

    let selectedProvince = null;

    if (requestedProvince) {
      selectedProvince =
        provinces.find(
          (record) =>
            String(
              getProvinceId(record)
            ) ===
            String(
              requestedProvince
            )
        ) ?? null;
    }

    if (selectedProvince) {
      state.selectedProvince =
        selectedProvince;

      dom.province.textContent =
        (
          `${getProvinceId(selectedProvince)} ` +
          `${getProvinceName(selectedProvince)}`
        );

      mapManager.selectProvince(
        selectedProvince,
        {
          zoom: true,
          openPopup: false,
          notify: false
        }
      );

      setStatus(
        `Large Map ready for ${getProvinceName(selectedProvince)}.`
      );
    } else {
      dom.province.textContent =
        requestedProvinceName ||
        "All Provinces";

      setStatus(
        "Large Map ready. Start with Import Data or select a layer."
      );
    }
  } catch (error) {
    console.error(error);

    setStatus(
      "Large Map opened, but Province vector data could not be loaded. WMS layers remain available."
    );
  }

  window.addEventListener(
    "beforeunload",
    () => mapManager.destroy?.(),
    {
      once: true
    }
  );
}

initialize();
