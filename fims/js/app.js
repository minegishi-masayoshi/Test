{ key: "district", label: "Districts", name: "districts" },

import { CONFIG } from "./config.js";
import { renderMenu } from "./menu.js";
import { renderSummary } from "./summary.js";
import { FimsMap } from "./map.js";

const $ = (selector) => document.querySelector(selector);
let fimsMap;

function setStatus(message) {
  $("#statusText").textContent = message;
}

function setCoordinate(message) {
  $("#coordinateText").textContent = message;
}

function setView(title, subtitle) {
  $("#viewTitle").textContent = title;
  $("#viewSubtitle").textContent = subtitle;
}

function renderLayerList() {
  const container = $("#layerList");
  container.replaceChildren();
  CONFIG.layers.forEach((layer) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.layer = layer.key;
    checkbox.addEventListener("change", () => fimsMap.setLayerVisible(layer.key, checkbox.checked));
    label.append(checkbox, document.createTextNode(` ${layer.label}`));
    container.appendChild(label);
  });
}

function activateSummaryLayer(key) {
  const checkbox = document.querySelector(`input[data-layer="${key}"]`);
  if (checkbox) {
    checkbox.checked = true;
    fimsMap.setLayerVisible(key, true);
  }
  const definitions = {
    concession: ["Forest Resources", "Concession areas"],
    fmu: ["Forest Resources", "Forest management units"],
    forestBaseMap: ["Forest Resources", "Forest Base Map"],
    protectedArea: ["Analysis", "Protected-area constraints"],
    loggingArea: ["Logging", "Logging areas"]
  };
  setView(...(definitions[key] || ["Map Explorer", "FIMS spatial information"]));
  fimsMap.zoomToPng();
}

function initializeUi() {
  $("#versionText").textContent = `${CONFIG.appName} ${CONFIG.version}`;
  renderMenu($("#mainMenu"), (item) => {
    setView(item.title, item.subtitle);
    setStatus(`${item.label} selected`);
  });
  renderLayerList();
  renderSummary($("#summaryGrid"), CONFIG.urls, activateSummaryLayer);
  $("#homeExtentButton").addEventListener("click", () => fimsMap.zoomToPng());
  $("#clearLayersButton").addEventListener("click", () => {
    fimsMap.clearOverlays();
    document.querySelectorAll("input[data-layer]").forEach((checkbox) => { checkbox.checked = false; });
  });
  const connected = Boolean(CONFIG.geoserver.wmsUrl);
  $("#summaryStatus").textContent = connected ? "GeoServer configured" : "Prototype data";
  $("#layerHint").hidden = connected;
}

function start() {
  try {
    fimsMap = new FimsMap({
      elementId: "map",
      config: CONFIG,
      onCoordinate: setCoordinate,
      onStatus: setStatus
    });

    initializeUi();

    // Districtを初期表示
    fimsMap.setLayerVisible("district", true);
    document.querySelector('input[data-layer="district"]').checked = true;

    setStatus("FIMS Cloud ready");
  } catch (error) {
    console.error(error);
    setStatus("FIMS Cloud failed to start. Check the browser console.");
  }
}

document.addEventListener("DOMContentLoaded", start);
