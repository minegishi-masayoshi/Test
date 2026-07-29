import { CONFIG } from "./config.js";
import { renderMenu } from "./menu.js";
import { FimsMap } from "./map.js";
import {
  PROVINCES,
  CONCESSIONS,
  SUMMARY_BASE,
  PROVINCE_REPORTS,
  CONCESSION_REPORTS,
  createFmus,
  createConcessionFmus
} from "./data.js";

const $ = (selector) => document.querySelector(selector);

let fimsMap;
let activeMode = "province";
let selectedProvince = null;
let selectedConcession = null;
let selectedFmu = null;

function setStatus(message) {
  $("#statusText").textContent = message;
}

function setCoordinate(message) {
  $("#coordinateText").textContent = message;
}

function getSelectedUnit() {
  return activeMode === "province" ? selectedProvince : selectedConcession;
}

function getUnitCollection() {
  return activeMode === "province" ? PROVINCES : CONCESSIONS;
}

function getUnitName(unit) {
  return unit?.name || "";
}

function renderLayerList() {
  const container = $("#layerList");
  container.replaceChildren();

  CONFIG.layers.slice(0, 5).forEach((layer) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.dataset.layer = layer.key;
    checkbox.addEventListener("change", () => {
      fimsMap.setLayerVisible(layer.key, checkbox.checked);
    });

    label.append(checkbox, document.createTextNode(layer.label));
    container.appendChild(label);
  });
}

function configureUnitPanel() {
  const isProvince = activeMode === "province";

  $("#unitListTitle").textContent = isProvince ? "Provinces" : "Concessions";
  $("#unitSearchLabel").textContent = isProvince ? "Search provinces" : "Search concessions";
  $("#unitSearch").placeholder = isProvince ? "Search province" : "Search concession";
  $("#unitList").setAttribute("aria-label", isProvince ? "Province list" : "Concession list");

  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.mode === activeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function renderUnits(filter = "") {
  const query = filter.trim().toLowerCase();
  const selectedUnit = getSelectedUnit();

  const items = getUnitCollection().filter((item) => {
    const searchable = activeMode === "province"
      ? `${item.code} ${item.name}`
      : `${item.planId} ${item.name} ${item.provinceName} ${item.type}`;
    return searchable.toLowerCase().includes(query);
  });

  const list = $("#unitList");
  list.replaceChildren();

  items.forEach((item) => {
    const itemKey = activeMode === "province" ? item.code : item.planId;
    const selectedKey = activeMode === "province"
      ? selectedUnit?.code
      : selectedUnit?.planId;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-item";

    if (itemKey === selectedKey) {
      button.classList.add("active");
    }

    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", itemKey === selectedKey ? "true" : "false");

    if (activeMode === "province") {
      button.innerHTML =
        `<span class="list-code">${item.code}</span>` +
        `<span class="list-name">${item.name}</span>`;
    } else {
      button.innerHTML =
        `<span class="list-code">${item.planId}</span>` +
        `<span class="list-name" title="${item.name}">${item.name}</span>`;
    }

    button.addEventListener("click", () => selectUnit(item));
    list.appendChild(button);
  });

  $("#unitCount").textContent = items.length;
}

function selectUnit(unit) {
  selectedFmu = null;

  if (activeMode === "province") {
    selectedProvince = unit;
    $("#selectedUnitLabel").textContent = unit.name;
    $("#mapSubtitle").textContent = `${unit.name} Province`;
    ensureLayerChecked("province");
    fimsMap.setLayerVisible("province", true);
    setStatus(`${unit.name} Province selected`);
  } else {
    selectedConcession = unit;
    $("#selectedUnitLabel").textContent =
      `${unit.name} · PLAN_ID ${unit.planId} · ${unit.type}`;
    $("#mapSubtitle").textContent =
      `${unit.name} (${unit.provinceName})`;
    ensureLayerChecked("concession");
    fimsMap.setLayerVisible("concession", true);
    setStatus(`${unit.name} concession selected (PLAN_ID ${unit.planId})`);
  }

  renderUnits($("#unitSearch").value);
  renderFmus();
  renderSummary();
  renderReports();
  fimsMap.zoomToPng();
}

function renderFmus() {
  const body = $("#fmuTableBody");
  body.replaceChildren();

  const unit = getSelectedUnit();

  if (!unit) {
    const unitLabel = activeMode === "province" ? "province" : "concession";
    body.innerHTML =
      `<tr class="empty-row"><td colspan="4">Select a ${unitLabel} to display FMUs.</td></tr>`;
    $("#fmuCount").textContent = "0";
    return;
  }

  const rows = activeMode === "province"
    ? createFmus(unit)
    : createConcessionFmus(unit);

  $("#fmuCount").textContent = rows.length;

  rows.forEach((fmu) => {
    const tr = document.createElement("tr");

    if (selectedFmu?.id === fmu.id) {
      tr.classList.add("selected");
    }

    tr.innerHTML =
      `<td>${fmu.id}</td>` +
      `<td>${fmu.zone}</td>` +
      `<td>${fmu.timber}</td>` +
      `<td>${fmu.vegArea.toLocaleString()}</td>`;

    tr.addEventListener("click", () => {
      selectedFmu = fmu;
      renderFmus();
      setStatus(`FMU ${fmu.id}, Zone ${fmu.zone} selected`);
    });

    body.appendChild(tr);
  });
}

function renderSummary() {
  const unit = getSelectedUnit();
  const container = $("#summaryTable");
  container.replaceChildren();

  let scope = "National";
  let factor = 1;

  if (activeMode === "province" && selectedProvince) {
    scope = selectedProvince.name;
    factor = 0.45 + selectedProvince.code / 45;
  }

  if (activeMode === "concession" && selectedConcession) {
    scope = selectedConcession.name;
    factor = Math.max(0.004, selectedConcession.area / 7_470_600);
  }

  $("#summaryScope").textContent =
    activeMode === "province"
      ? `${scope} totals`
      : `${scope} concession totals`;

  SUMMARY_BASE.forEach(([label, value], index) => {
    let display = value;

    if (unit && index < 11) {
      const number = Number(value.replace(/[^0-9.]/g, ""));
      const unitText = value.replace(/[0-9,.\s]/g, "").trim();
      display = `${Math.round(number * factor).toLocaleString()} ${unitText}`.trim();
    }

    if (activeMode === "concession" && selectedConcession) {
      if (label === "Available Forest Area") {
        display = `${selectedConcession.area.toLocaleString()} ha`;
      }
      if (label === "Last Update") {
        display = "29 Jul 2026";
      }
    }

    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML =
      `<span class="summary-label">${label}</span>` +
      `<span class="summary-value">${display}</span>`;
    container.appendChild(row);
  });
}

function renderReports() {
  const reports = activeMode === "province"
    ? PROVINCE_REPORTS
    : CONCESSION_REPORTS;

  const container = $("#reportList");
  container.replaceChildren();

  reports.forEach(([title, description], index) => {
    const label = document.createElement("label");
    label.className = "report-option";
    label.innerHTML =
      `<input type="radio" name="report" value="${index}" ${index === 0 ? "checked" : ""}>` +
      `<span><strong>${title}</strong><small>${description}</small></span>`;
    container.appendChild(label);
  });
}

function ensureLayerChecked(key) {
  const checkbox = document.querySelector(`input[data-layer="${key}"]`);
  if (checkbox) {
    checkbox.checked = true;
  }
}

function setMode(mode, options = {}) {
  if (!["province", "concession"].includes(mode)) {
    return;
  }

  activeMode = mode;
  selectedFmu = null;
  $("#unitSearch").value = "";

  configureUnitPanel();
  renderUnits();
  renderFmus();
  renderSummary();
  renderReports();

  if (mode === "province") {
    fimsMap.setLayerVisible("concession", false);
    const concessionCheckbox = document.querySelector('input[data-layer="concession"]');
    if (concessionCheckbox) concessionCheckbox.checked = false;

    ensureLayerChecked("province");
    fimsMap.setLayerVisible("province", true);

    if (!selectedProvince && options.selectDefault !== false) {
      selectUnit(PROVINCES.find((item) => item.name === "West Sepik") || PROVINCES[0]);
      return;
    }

    if (selectedProvince) {
      selectUnit(selectedProvince);
      return;
    }

    $("#selectedUnitLabel").textContent = "Select a province";
    $("#mapSubtitle").textContent = "Papua New Guinea";
  } else {
    ensureLayerChecked("concession");
    fimsMap.setLayerVisible("concession", true);

    if (!selectedConcession && options.selectDefault !== false) {
      selectUnit(
        CONCESSIONS.find((item) => item.provinceName === selectedProvince?.name) ||
        CONCESSIONS[0]
      );
      return;
    }

    if (selectedConcession) {
      selectUnit(selectedConcession);
      return;
    }

    $("#selectedUnitLabel").textContent = "Select a concession";
    $("#mapSubtitle").textContent = "Papua New Guinea concessions";
  }

  setStatus(`${mode === "province" ? "Province" : "Concession"} mode selected`);
}

function handleMenu(item) {
  const routes = {
    assessment: CONFIG.urls.fips,
    admin: "./views/administration.html",
    exit: CONFIG.urls.portal
  };

  if (routes[item.id]) {
    window.location.href = routes[item.id];
    return;
  }

  if (item.id === "largeMap") {
    fimsMap.zoomToPng();
    document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (item.id === "province") {
    setMode("province");
    return;
  }

  if (item.id === "concession") {
    setMode("concession");
    return;
  }

  if (item.id === "proposed") {
    setMode("concession");
    setStatus("Proposed Concession filtering is reserved for the next data/API update");
  }
}

function initializeUi() {
  $("#versionText").textContent = CONFIG.version;

  renderMenu($("#mainMenu"), handleMenu);
  renderLayerList();
  configureUnitPanel();
  renderUnits();
  renderFmus();
  renderSummary();
  renderReports();

  $("#unitSearch").addEventListener("input", (event) => {
    renderUnits(event.target.value);
  });

  $("#homeExtentButton").addEventListener("click", () => {
    fimsMap.zoomToPng();
  });

  $("#clearLayersButton").addEventListener("click", () => {
    fimsMap.clearOverlays();
    document
      .querySelectorAll("input[data-layer]")
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
    });
  });

  $("#updateZoneButton").addEventListener("click", () => {
    setStatus(
      selectedFmu
        ? `Zone ${selectedFmu.zone}: update function reserved for backend API`
        : "Select an FMU first"
    );
  });

  $("#updateFmuButton").addEventListener("click", () => {
    setStatus(
      selectedFmu
        ? `FMU ${selectedFmu.id}: update function reserved for backend API`
        : "Select an FMU first"
    );
  });

  const reportAction = (action) => {
    const reports = activeMode === "province"
      ? PROVINCE_REPORTS
      : CONCESSION_REPORTS;
    const checked = document.querySelector('input[name="report"]:checked');
    const title = checked ? reports[Number(checked.value)][0] : "report";
    const unit = getSelectedUnit();

    if (!unit) {
      setStatus(`Select a ${activeMode} before running a report`);
      return;
    }

    setStatus(
      `${action}: ${title} for ${getUnitName(unit)} ` +
      "(backend/report engine connection pending)"
    );
  };

  $("#previewReportButton").addEventListener("click", () => {
    reportAction("Preview");
  });

  $("#exportReportButton").addEventListener("click", () => {
    reportAction("Export");
  });

  $("#summaryStatus").textContent = CONFIG.geoserver.wmsUrl
    ? "GeoServer configured"
    : "Prototype data";
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

    fimsMap.setLayerVisible("district", true);
    ensureLayerChecked("district");

    setMode("province");
    setStatus("FIMS Cloud ready");
  } catch (error) {
    console.error(error);
    setStatus("FIMS Cloud failed to start. Check the browser console.");
  }
}

document.addEventListener("DOMContentLoaded", start);
