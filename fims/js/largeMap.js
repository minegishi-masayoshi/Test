/**
 * FIMS Cloud Ver.3.2 - Simple Large Map Workflow
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
    )
};

const state = {
  lastImportedLayerKey: null,
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
        if (
          !state.lastImportedLayerKey
        ) {
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

      dom.reviewImported.disabled =
        false;

      dom.fmuCalculation.disabled =
        false;

      setWorkflowStep(2);

      displayImportedLayer(
        mapManager,
        target.mapLayerKey
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
