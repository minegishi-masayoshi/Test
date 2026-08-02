/**
 * FIMS Cloud Ver.3.5.1 - Large Map Hotfix
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
    )
};

const state = {
  lastImportedLayerKey: null,
  lastImportResult: null,
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
      () => {
        setStatus(
          "FMU Calculation is the next implementation phase."
        );
      }
    );

  dom.reviewResults
    .addEventListener(
      "click",
      () => {
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
