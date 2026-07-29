import { CONFIG } from "./config.js?v=1.0.2";
import { renderMenu } from "./menu.js?v=1.0.2";
import { FimsMap } from "./map.js?v=1.0.2";
import {
  PROVINCES,
  CONCESSIONS,
  SUMMARY_BASE,
  PROVINCE_REPORTS,
  CONCESSION_REPORTS,
  createFmus,
  createConcessionFmus
} from "./data.js?v=1.0.2";

const first = (...selectors) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
};

const all = (...selectors) => {
  const elements = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!elements.includes(element)) elements.push(element);
    });
  });
  return elements;
};

const ui = {
  version: () => first("#versionText"),
  status: () => first("#statusText"),
  coordinate: () => first("#coordinateText"),
  unitTitle: () => first("#unitListTitle", ".province-panel .panel-header h2"),
  unitCount: () => first("#unitCount", "#provinceCount"),
  unitSearchLabel: () => first("#unitSearchLabel", ".province-panel .search-box .sr-only"),
  unitSearch: () => first("#unitSearch", "#provinceSearch"),
  unitList: () => first("#unitList", "#provinceList"),
  selectedUnit: () => first("#selectedUnitLabel", "#selectedProvinceLabel"),
  fmuCount: () => first("#fmuCount"),
  fmuBody: () => first("#fmuTableBody"),
  mapSubtitle: () => first("#mapSubtitle"),
  layerList: () => first("#layerList"),
  mainMenu: () => first("#mainMenu"),
  summaryTable: () => first("#summaryTable"),
  summaryScope: () => first("#summaryScope"),
  summaryStatus: () => first("#summaryStatus"),
  reportList: () => first("#reportList")
};

let fimsMap;
let activeMode = "province";
let selectedProvince = null;
let selectedConcession = null;
let selectedFmu = null;

function safeText(element, value) {
  if (element) element.textContent = value;
}

function setStatus(message) {
  safeText(ui.status(), message);
}

function setCoordinate(message) {
  safeText(ui.coordinate(), message);
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
  const container = ui.layerList();
  if (!container) return;

  container.replaceChildren();

  CONFIG.layers.slice(0, 5).forEach((layer) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.dataset.layer = layer.key;
    checkbox.addEventListener("change", () => {
      fimsMap?.setLayerVisible(layer.key, checkbox.checked);
    });

    label.append(checkbox, document.createTextNode(layer.label));
    container.appendChild(label);
  });
}

function configureUnitPanel() {
  const isProvince = activeMode === "province";
  const title = ui.unitTitle();
  const searchLabel = ui.unitSearchLabel();
  const search = ui.unitSearch();
  const list = ui.unitList();

  safeText(title, isProvince ? "Provinces" : "Concessions");
  safeText(searchLabel, isProvince ? "Search provinces" : "Search concessions");

  if (search) {
    search.placeholder = isProvince ? "Search province" : "Search concession";
  }

  if (list) {
    list.setAttribute("aria-label", isProvince ? "Province list" : "Concession list");
  }

  all(".tab-button", "[data-mode]").forEach((button) => {
    if (!button.dataset.mode) return;
    const isActive = button.dataset.mode === activeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function renderUnits(filter = "") {
  const list = ui.unitList();
  if (!list) {
    throw new Error("Unit list container was not found. Expected #unitList or #provinceList.");
  }

  const query = String(filter || "").trim().toLowerCase();
  const selectedUnit = getSelectedUnit();

  const items = getUnitCollection().filter((item) => {
    const searchable = activeMode === "province"
      ? `${item.code} ${item.name}`
      : `${item.planId} ${item.name} ${item.provinceName} ${item.type}`;
    return searchable.toLowerCase().includes(query);
  });

  list.replaceChildren();

  items.forEach((item) => {
    const itemKey = activeMode === "province" ? item.code : item.planId;
    const selectedKey = activeMode === "province"
      ? selectedUnit?.code
      : selectedUnit?.planId;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-item";

    if (itemKey === selectedKey) button.classList.add("active");

    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", itemKey === selectedKey ? "true" : "false");

    const code = document.createElement("span");
    code.className = "list-code";
    code.textContent = String(itemKey);

    const name = document.createElement("span");
    name.className = "list-name";
    name.textContent = item.name;
    name.title = activeMode === "concession"
      ? `${item.name} / ${item.provinceName} / ${item.type}`
      : item.name;

    button.append(code, name);
    button.addEventListener("click", () => selectUnit(item));
    list.appendChild(button);
  });

  safeText(ui.unitCount(), String(items.length));
}

function selectUnit(unit) {
  selectedFmu = null;

  if (activeMode === "province") {
    selectedProvince = unit;
    safeText(ui.selectedUnit(), unit.name);
    safeText(ui.mapSubtitle(), `${unit.name} Province`);
    ensureLayerChecked("province");
    fimsMap?.setLayerVisible("province", true);
    setStatus(`${unit.name} Province selected`);
  } else {
    selectedConcession = unit;
    safeText(
      ui.selectedUnit(),
      `${unit.name} · PLAN_ID ${unit.planId} · ${unit.type}`
    );
    safeText(ui.mapSubtitle(), `${unit.name} (${unit.provinceName})`);
    ensureLayerChecked("concession");
    fimsMap?.setLayerVisible("concession", true);
    setStatus(`${unit.name} concession selected (PLAN_ID ${unit.planId})`);
  }

  renderUnits(ui.unitSearch()?.value || "");
  renderFmus();
  renderSummary();
  renderReports();
  fimsMap?.zoomToPng();
}

function renderFmus() {
  const body = ui.fmuBody();
  if (!body) return;

  body.replaceChildren();
  const unit = getSelectedUnit();

  if (!unit) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent =
      `Select a ${activeMode === "province" ? "province" : "concession"} to display FMUs.`;
    row.appendChild(cell);
    body.appendChild(row);
    safeText(ui.fmuCount(), "0");
    return;
  }

  const rows = activeMode === "province"
    ? createFmus(unit)
    : createConcessionFmus(unit);

  safeText(ui.fmuCount(), String(rows.length));

  rows.forEach((fmu) => {
    const tr = document.createElement("tr");
    if (selectedFmu?.id === fmu.id) tr.classList.add("selected");

    [fmu.id, fmu.zone, fmu.timber, fmu.vegArea.toLocaleString()].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    });

    tr.addEventListener("click", () => {
      selectedFmu = fmu;
      renderFmus();
      setStatus(`FMU ${fmu.id}, Zone ${fmu.zone} selected`);
    });

    body.appendChild(tr);
  });
}

function renderSummary() {
  const container = ui.summaryTable();
  if (!container) return;

  const unit = getSelectedUnit();
  container.replaceChildren();

  let scope = "National";
  let factor = 1;

  if (activeMode === "province" && selectedProvince) {
    scope = selectedProvince.name;
    factor = 0.45 + selectedProvince.code / 45;
  }

  if (activeMode === "concession" && selectedConcession) {
    scope = selectedConcession.name;
    factor = Math.max(0.004, selectedConcession.area / 7470600);
  }

  safeText(
    ui.summaryScope(),
    activeMode === "province" ? `${scope} totals` : `${scope} concession totals`
  );

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
      if (label === "Last Update") display = "29 Jul 2026";
    }

    const row = document.createElement("div");
    row.className = "summary-row";

    const labelElement = document.createElement("span");
    labelElement.className = "summary-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("span");
    valueElement.className = "summary-value";
    valueElement.textContent = display;

    row.append(labelElement, valueElement);
    container.appendChild(row);
  });
}

function renderReports() {
  const container = ui.reportList();
  if (!container) return;

  const reports = activeMode === "province"
    ? PROVINCE_REPORTS
    : CONCESSION_REPORTS;

  container.replaceChildren();

  reports.forEach(([title, description], index) => {
    const label = document.createElement("label");
    label.className = "report-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "report";
    radio.value = String(index);
    radio.checked = index === 0;

    const text = document.createElement("span");
    const strong = document.createElement("strong");
    const small = document.createElement("small");
    strong.textContent = title;
    small.textContent = description;
    text.append(strong, small);

    label.append(radio, text);
    container.appendChild(label);
  });
}

function ensureLayerChecked(key) {
  const checkbox = document.querySelector(`input[data-layer="${key}"]`);
  if (checkbox) checkbox.checked = true;
}

function setMode(mode, options = {}) {
  if (!["province", "concession"].includes(mode)) return;

  activeMode = mode;
  selectedFmu = null;

  const search = ui.unitSearch();
  if (search) search.value = "";

  configureUnitPanel();
  renderUnits();
  renderFmus();
  renderSummary();
  renderReports();

  if (mode === "province") {
    fimsMap?.setLayerVisible("concession", false);
    const concessionCheckbox =
      document.querySelector('input[data-layer="concession"]');
    if (concessionCheckbox) concessionCheckbox.checked = false;

    ensureLayerChecked("province");
    fimsMap?.setLayerVisible("province", true);

    selectUnit(
      selectedProvince ||
      PROVINCES.find((item) => item.name === "West Sepik") ||
      PROVINCES[0]
    );
  } else {
    ensureLayerChecked("concession");
    fimsMap?.setLayerVisible("concession", true);

    selectUnit(
      selectedConcession ||
      CONCESSIONS.find((item) => item.provinceName === selectedProvince?.name) ||
      CONCESSIONS[0]
    );
  }

  if (options.status !== false) {
    setStatus(`${mode === "province" ? "Province" : "Concession"} mode selected`);
  }
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
    fimsMap?.zoomToPng();
    document.querySelector(".map-panel")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (item.id === "province") setMode("province");
  if (item.id === "concession") setMode("concession");

  if (item.id === "proposed") {
    setMode("concession");
    setStatus("Proposed Concession filtering is reserved for the next data/API update");
  }
}

function bindButton(id, handler) {
  const button = document.getElementById(id);
  if (button) button.addEventListener("click", handler);
}

function initializeUi() {
  safeText(ui.version(), CONFIG.version);

  const menu = ui.mainMenu();
  if (menu) renderMenu(menu, handleMenu);

  renderLayerList();
  configureUnitPanel();
  renderUnits();
  renderFmus();
  renderSummary();
  renderReports();

  ui.unitSearch()?.addEventListener("input", (event) => {
    renderUnits(event.target.value);
  });

  bindButton("homeExtentButton", () => fimsMap?.zoomToPng());

  bindButton("clearLayersButton", () => {
    fimsMap?.clearOverlays();
    document.querySelectorAll("input[data-layer]").forEach((checkbox) => {
      checkbox.checked = false;
    });
  });

  all(".tab-button", "[data-mode]").forEach((button) => {
    if (!button.dataset.mode || button.dataset.fimsModeBound === "true") return;
    button.dataset.fimsModeBound = "true";
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  bindButton("updateZoneButton", () => {
    setStatus(
      selectedFmu
        ? `Zone ${selectedFmu.zone}: update function reserved for backend API`
        : "Select an FMU first"
    );
  });

  bindButton("updateFmuButton", () => {
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

  bindButton("previewReportButton", () => reportAction("Preview"));
  bindButton("exportReportButton", () => reportAction("Export"));

  safeText(
    ui.summaryStatus(),
    CONFIG.geoserver.wmsUrl ? "GeoServer configured" : "Prototype data"
  );
}

function start() {
  try {
    if (typeof L === "undefined") {
      throw new Error("Leaflet was not loaded.");
    }

    fimsMap = new FimsMap({
      elementId: "map",
      config: CONFIG,
      onCoordinate: setCoordinate,
      onStatus: setStatus
    });

    initializeUi();

    fimsMap.setLayerVisible("district", true);
    ensureLayerChecked("district");

    setMode("province", { status: false });
    setStatus("FIMS Cloud ready");
  } catch (error) {
    console.error("FIMS Cloud startup error:", error);
    setStatus(`FIMS Cloud failed to start: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", start);
