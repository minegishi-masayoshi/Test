/**
 * ============================================================
 * FIMS Cloud Ver.2.0.1
 * Main Application Controller
 * ============================================================
 *
 * File:
 *   js/app.js
 *
 * Responsibilities:
 *   - Initialize FIMS Cloud
 *   - Connect config.js, data.js, map.js, menu.js and summary.js
 *   - Load Province data
 *   - Display the Province list
 *   - Select a Province
 *   - Load and display FMUs belonging to the Province
 *   - Select an FMU
 *   - Calculate Province-level FMU totals
 *   - Control map layers and map selection
 *   - Prepare report actions
 *   - Maintain status and coordinate displays
 *
 * Current Ver.2 implementation scope:
 *   1. Province
 *   2. FMU
 *   3. Province Summary
 *   4. Reports
 *
 * Deferred:
 *   - Concession module
 *   - Proposed Concession module
 *   - Administration module
 *   - Timber Volume update API
 *   - Final report/PDF engine
 * ============================================================
 */

import {
  CONFIG
} from "./config.js";

import * as DataModule
  from "./data.js";

import * as MapModule
  from "./map.js";

import {
  MenuManager,
  MENU_MODULE_ID
} from "./menu.js";

import {
  ProvinceSummaryManager
} from "./summary.js";

/* ============================================================
 * 1. Application constants
 * ============================================================
 */

export const APP_VERSION = "2.0.1";

export const APP_STATUS = Object.freeze({
  IDLE: "idle",
  INITIALIZING: "initializing",
  READY: "ready",
  LOADING: "loading",
  ERROR: "error",
  DESTROYED: "destroyed"
});

export const APP_VIEW = Object.freeze({
  PROVINCE: "province",
  CONCESSION: "concession",
  PROPOSED_CONCESSION:
    "proposedConcession",
  ADMINISTRATION: "administration"
});

export const REPORT_ACTION = Object.freeze({
  PREVIEW: "preview",
  EXPORT: "export"
});

const DEFAULT_EMPTY_VALUE =
  CONFIG.data?.emptyValue ||
  "—";

/* ============================================================
 * 2. DOM selector definitions
 * ============================================================
 */

/**
 * Multiple selectors are retained for compatibility with both
 * the original HTML and the Ver.2 HTML structure.
 */
const SELECTORS = Object.freeze({
  version: [
    "#versionText",
    "[data-app-version]"
  ],

  status: [
    "#statusText",
    "[data-app-status]"
  ],

  coordinate: [
    "#coordinateText",
    "[data-map-coordinate]"
  ],

  mainMenu: [
    "#mainMenu",
    "#main-menu",
    "[data-main-menu]"
  ],

  provincePanel: [
    "#provincePanel",
    ".province-panel",
    "[data-panel='province']"
  ],

  provinceTitle: [
    "#unitListTitle",
    "#provinceListTitle",
    ".province-panel .panel-header h2"
  ],

  provinceCount: [
    "#unitCount",
    "#provinceCount",
    "[data-province-count]"
  ],

  provinceSearch: [
    "#unitSearch",
    "#provinceSearch",
    "[data-province-search]"
  ],

  provinceSearchLabel: [
    "#unitSearchLabel",
    "#provinceSearchLabel",
    ".province-panel .search-box .sr-only"
  ],

  provinceList: [
    "#unitList",
    "#provinceList",
    "[data-province-list]"
  ],

  selectedProvince: [
    "#selectedUnitLabel",
    "#selectedProvinceLabel",
    "[data-selected-province]"
  ],

  fmuCount: [
    "#fmuCount",
    "[data-fmu-count]"
  ],

  fmuTableBody: [
    "#fmuTableBody",
    "#fmu-table-body",
    "[data-fmu-table-body]"
  ],

  mapContainer: [
    "#map",
    "#fimsMap",
    "[data-fims-map]"
  ],

  mapSubtitle: [
    "#mapSubtitle",
    "[data-map-subtitle]"
  ],

  layerList: [
    "#layerList",
    "#layer-list",
    "[data-layer-list]"
  ],

  summaryContainer: [
    "#province-summary",
    "#summaryTable",
    "#summary-table",
    "[data-province-summary]"
  ],

  summaryScope: [
    "#summaryScope",
    "[data-summary-scope]"
  ],

  summaryStatus: [
    "#summaryStatus",
    "[data-summary-status]"
  ],

  reportList: [
    "#reportList",
    "#report-list",
    "[data-report-list]"
  ],

  homeExtentButton: [
    "#homeExtentButton",
    "[data-action='home-extent']"
  ],

  clearLayersButton: [
    "#clearLayersButton",
    "[data-action='clear-layers']"
  ],

  updateZoneButton: [
    "#updateZoneButton",
    "[data-action='update-zone']"
  ],

  updateFmuButton: [
    "#updateFmuButton",
    "[data-action='update-fmu']"
  ],

  previewReportButton: [
    "#previewReportButton",
    "[data-action='preview-report']"
  ],

  exportReportButton: [
    "#exportReportButton",
    "[data-action='export-report']"
  ]
});

/* ============================================================
 * 3. DOM utility functions
 * ============================================================
 */

/**
 * Returns the first matching element.
 *
 * @param {...string|string[]} selectors
 * @returns {Element|null}
 */
function first(...selectors) {
  const flattened =
    selectors.flat();

  for (const selector of flattened) {
    if (
      typeof selector !== "string" ||
      !selector.trim()
    ) {
      continue;
    }

    const element =
      document.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

/**
 * Returns all unique matching elements.
 *
 * @param {...string|string[]} selectors
 * @returns {Element[]}
 */
function all(...selectors) {
  const flattened =
    selectors.flat();

  const result = [];
  const seen = new Set();

  for (const selector of flattened) {
    if (
      typeof selector !== "string" ||
      !selector.trim()
    ) {
      continue;
    }

    for (
      const element
      of document.querySelectorAll(selector)
    ) {
      if (seen.has(element)) {
        continue;
      }

      seen.add(element);
      result.push(element);
    }
  }

  return result;
}

/**
 * Safely changes textContent.
 *
 * @param {Element|null} element
 * @param {*} value
 */
function setText(element, value) {
  if (!element) {
    return;
  }

  element.textContent =
    value === null ||
    value === undefined
      ? ""
      : String(value);
}

/**
 * Returns normalized text for comparison.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
}

/**
 * Tests whether a value is non-empty.
 *
 * @param {*} value
 * @returns {boolean}
 */
function hasValue(value) {
  return !(
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

/**
 * Converts a value to an array.
 *
 * @param {*} value
 * @returns {Array}
 */
function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

/**
 * Escapes HTML-selector-sensitive content.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeSelector(value) {
  if (
    typeof CSS !== "undefined" &&
    typeof CSS.escape === "function"
  ) {
    return CSS.escape(
      String(value)
    );
  }

  return String(value)
    .replace(
      /["\\]/g,
      "\\$&"
    );
}

/* ============================================================
 * 4. ApplicationController
 * ============================================================
 */

export class ApplicationController {
  /**
   * @param {object} [options]
   * @param {object} [options.config]
   */
  constructor(options = {}) {
    this.config =
      options.config || CONFIG;

    this.status =
      APP_STATUS.IDLE;

    this.activeView =
      APP_VIEW.PROVINCE;

    this.provinces = [];
    this.fmus = [];

    this.filteredProvinces = [];

    this.selectedProvince = null;
    this.selectedFmu = null;

    this.selectedReportId = null;

    this.mapManager = null;
    this.menuManager = null;
    this.summaryManager = null;

    this.destroyed = false;
    this.initialized = false;

    this.dom = {};

    this.eventCleanupFunctions = [];

    this.startupErrors = [];
  }

  /* ==========================================================
   * 5. Application startup
   * ==========================================================
   */

  /**
   * Starts the FIMS Cloud application.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (
      this.destroyed ||
      this.initialized
    ) {
      return;
    }

    this.status =
      APP_STATUS.INITIALIZING;

    try {
      this.resolveDomElements();

      this.renderApplicationVersion();

      this.setStatus(
        "Initializing FIMS Cloud…"
      );

      await this.initializeMap();

      this.initializeMenu();

      this.initializeSummary();

      this.bindUiEvents();

      this.renderLayerControls();

      await this.loadProvinceData();

      this.renderReports();

      await this.selectInitialProvince();

      this.status =
        APP_STATUS.READY;

      this.initialized = true;

      this.setStatus(
        "FIMS Cloud ready."
      );

      this.setSummaryStatus(
        this.getGeoServerStatusText()
      );
    } catch (error) {
      this.status =
        APP_STATUS.ERROR;

      this.handleError(
        "FIMS Cloud failed to start.",
        error
      );
    }
  }

  /**
   * Resolves frequently used DOM elements.
   */
  resolveDomElements() {
    for (
      const [key, selectors]
      of Object.entries(SELECTORS)
    ) {
      this.dom[key] =
        first(selectors);
    }

    if (!this.dom.provinceList) {
      throw new ApplicationInitializationError(
        "Province list container was not found."
      );
    }

    if (!this.dom.fmuTableBody) {
      throw new ApplicationInitializationError(
        "FMU table body was not found."
      );
    }
  }

  /**
   * Displays application version.
   */
  renderApplicationVersion() {
    const version =
      this.config.version ||
      APP_VERSION;

    setText(
      this.dom.version,
      version
    );
  }

  /* ==========================================================
   * 6. Map initialization
   * ==========================================================
   */

  /**
   * Initializes map.js Ver.2.
   */
  async initializeMap() {
    const mapElementId =
      this.dom.mapContainer?.id ||
      this.config.provinceScreen
        ?.elements?.mapContainer ||
      "map";

    const mapOptions = {
      elementId: mapElementId,
      containerId: mapElementId,
      config: this.config,

      onCoordinate: (coordinate) => {
        this.setCoordinate(
          coordinate
        );
      },

      onStatus: (message) => {
        this.setStatus(message);
      },

      onProvinceSelect:
        async (province) => {
          await this.selectProvince(
            province,
            {
              source: "map"
            }
          );
        },

      onFmuSelect:
        (fmu) => {
          this.selectFmu(
            fmu,
            {
              source: "map"
            }
          );
        },

      onError: (error) => {
        this.handleError(
          "Map operation failed.",
          error,
          {
            fatal: false
          }
        );
      }
    };

    /*
     * Preferred Ver.2 factory.
     */
    if (
      typeof MapModule.createFimsMap ===
      "function"
    ) {
      this.mapManager =
        await MapModule.createFimsMap(
          mapOptions
        );

      return;
    }

    /*
     * Compatibility with alternative factory naming.
     */
    if (
      typeof MapModule.createMap ===
      "function"
    ) {
      this.mapManager =
        await MapModule.createMap(
          mapOptions
        );

      return;
    }

    /*
     * Compatibility with the previous FimsMap class.
     */
    if (
      typeof MapModule.FimsMap ===
      "function"
    ) {
      this.mapManager =
        new MapModule.FimsMap(
          mapOptions
        );

      if (
        typeof this.mapManager.initialize ===
        "function"
      ) {
        await this.mapManager.initialize();
      }

      return;
    }

    /*
     * Compatibility with a Ver.2 manager class.
     */
    if (
      typeof MapModule.FimsMapManager ===
      "function"
    ) {
      this.mapManager =
        new MapModule.FimsMapManager(
          mapOptions
        );

      if (
        typeof this.mapManager.initialize ===
        "function"
      ) {
        await this.mapManager.initialize();
      }

      return;
    }

    throw new ApplicationInitializationError(
      "A compatible map.js factory or class was not found."
    );
  }

  /* ==========================================================
   * 7. Menu initialization
   * ==========================================================
   */

  /**
   * Initializes menu.js Ver.2.
   */
  initializeMenu() {
    if (!this.dom.mainMenu) {
      this.startupErrors.push(
        "Main menu container was not found."
      );

      return;
    }

    this.menuManager =
      new MenuManager({
        container:
          this.dom.mainMenu,

        config:
          this.config,

        activeItemId:
          MENU_MODULE_ID.PROVINCE,

        onSelect:
          async (item, context) => {
            return await this.handleMenuSelection(
              item,
              context
            );
          },

        onLargeMap:
          () => {
            return this.openLargeMap();
          },

        onExit:
          () => {
            return this.exitApplication();
          },

        onStatus:
          (message) => {
            this.setStatus(message);
          },

        onError:
          (error) => {
            this.handleError(
              "Menu operation failed.",
              error,
              {
                fatal: false
              }
            );
          }
      });
  }

  /**
   * Handles menu module selection.
   *
   * @param {object} item
   * @returns {Promise<boolean>}
   */
  async handleMenuSelection(item) {
    switch (item.id) {
      case MENU_MODULE_ID.PROVINCE:
        this.activeView =
          APP_VIEW.PROVINCE;

        this.showProvinceView();

        return true;

      case MENU_MODULE_ID.CONCESSION:
        this.setStatus(
          "Concession module is reserved for a later implementation phase."
        );

        return false;

      case MENU_MODULE_ID.PROPOSED_CONCESSION:
        this.setStatus(
          "Proposed Concession module is reserved for a later implementation phase."
        );

        return false;

      case MENU_MODULE_ID.ADMINISTRATION:
        this.setStatus(
          "Administration module is reserved for a later implementation phase."
        );

        return false;

      default:
        return true;
    }
  }

  /**
   * Shows the Province screen.
   */
  showProvinceView() {
    this.activeView =
      APP_VIEW.PROVINCE;

    if (this.dom.provincePanel) {
      this.dom.provincePanel.hidden =
        false;
    }

    this.setStatus(
      "Province module selected."
    );
  }

  /* ==========================================================
   * 8. Summary initialization
   * ==========================================================
   */

  /**
   * Initializes summary.js Ver.2.
   */
  initializeSummary() {
    if (!this.dom.summaryContainer) {
      this.startupErrors.push(
        "Province Summary container was not found."
      );

      return;
    }

    this.summaryManager =
      new ProvinceSummaryManager({
        container:
          this.dom.summaryContainer,

        config:
          this.config,

        onStatus:
          (message) => {
            this.setSummaryStatus(
              message
            );
          },

        onError:
          (error) => {
            this.handleError(
              "Province Summary operation failed.",
              error,
              {
                fatal: false
              }
            );
          }
      });
  }

  /* ==========================================================
   * 9. Data loading
   * ==========================================================
   */

  /**
   * Loads Province data from data.js.
   *
   * Supported data.js APIs:
   *   - loadProvinces()
   *   - getProvinces()
   *   - fetchProvinces()
   *   - PROVINCES
   *
   * @returns {Promise<object[]>}
   */
  async loadProvinceData() {
    this.status =
      APP_STATUS.LOADING;

    this.setStatus(
      "Loading Provinces…"
    );

    let records = [];

    if (
      typeof DataModule.loadProvinces ===
      "function"
    ) {
      records =
        await DataModule.loadProvinces({
          config: this.config
        });
    } else if (
      typeof DataModule.getProvinces ===
      "function"
    ) {
      records =
        await DataModule.getProvinces({
          config: this.config
        });
    } else if (
      typeof DataModule.fetchProvinces ===
      "function"
    ) {
      records =
        await DataModule.fetchProvinces({
          config: this.config
        });
    } else if (
      Array.isArray(
        DataModule.PROVINCES
      )
    ) {
      records =
        DataModule.PROVINCES;
    }

    this.provinces =
      this.normalizeProvinceCollection(
        records
      );

    this.filteredProvinces =
      [...this.provinces];

    this.renderProvincePanelConfiguration();
    this.renderProvinceList();

    this.status =
      APP_STATUS.READY;

    if (
      this.provinces.length === 0
    ) {
      this.setStatus(
        "No Province records were returned."
      );
    }

    return this.provinces;
  }

  /**
   * Loads FMUs belonging to a Province.
   *
   * Supported data.js APIs:
   *   - loadFmusForProvince()
   *   - getFmusForProvince()
   *   - fetchFmusForProvince()
   *   - loadFmus()
   *   - createFmus()
   *   - FMUS
   *
   * @param {object} province
   * @returns {Promise<object[]>}
   */
  async loadFmusForProvince(province) {
    if (!province) {
      return [];
    }

    const provinceId =
      this.getProvinceId(province);

    const provinceCode =
      this.getProvinceCode(province);

    const provinceName =
      this.getProvinceName(province);

    const options = {
      province,
      provinceId,
      provinceCode,
      provinceName,
      config: this.config
    };

    let records = [];

    if (
      typeof DataModule.loadFmusForProvince ===
      "function"
    ) {
      records =
        await DataModule.loadFmusForProvince(
          province,
          options
        );
    } else if (
      typeof DataModule.getFmusForProvince ===
      "function"
    ) {
      records =
        await DataModule.getFmusForProvince(
          province,
          options
        );
    } else if (
      typeof DataModule.fetchFmusForProvince ===
      "function"
    ) {
      records =
        await DataModule.fetchFmusForProvince(
          province,
          options
        );
    } else if (
      typeof DataModule.loadFmus ===
      "function"
    ) {
      records =
        await DataModule.loadFmus(
          options
        );
    } else if (
      typeof DataModule.createFmus ===
      "function"
    ) {
      records =
        await DataModule.createFmus(
          province
        );
    } else if (
      Array.isArray(
        DataModule.FMUS
      )
    ) {
      records =
        this.filterFmusByProvince(
          DataModule.FMUS,
          province
        );
    }

    return this.normalizeFmuCollection(
      records,
      province
    );
  }

  /* ==========================================================
   * 10. Province normalization
   * ==========================================================
   */

  /**
   * Normalizes a Province collection.
   *
   * @param {*} records
   * @returns {object[]}
   */
  normalizeProvinceCollection(records) {
    const features =
      this.extractRecords(records);

    return features
  .map(
    (record, index) =>
      this.normalizeProvince(
        record,
        index
      )
  )
  .filter(Boolean)
  .sort(
    (left, right) =>
      Number(this.getProvinceCode(left)) -
      Number(this.getProvinceCode(right))
  );

  }

  /**
   * Normalizes one Province.
   *
   * @param {object} record
   * @param {number} index
   * @returns {object}
   */
  normalizeProvince(record, index) {
    if (!record) {
      return null;
    }

    if (
      typeof DataModule.normalizeProvince ===
      "function"
    ) {
      try {
        return DataModule.normalizeProvince(
          record,
          index
        );
      } catch {
        // Continue with local normalization.
      }
    }

    const properties =
      record.properties || {};

    const id =
      record.id ??
      properties.id ??
      properties.province_id ??
      properties.prov_id ??
      properties.objectid ??
      index + 1;

    const code =
      record.code ??
      record.provinceCode ??
      properties.province_code ??
      properties.prov_code ??
      properties.code ??
      properties.zone ??
      id;

    const name =
      record.name ??
      record.provinceName ??
      properties.province_name ??
      properties.prov_name ??
      properties.name ??
      properties.zone_name ??
      `Province ${code}`;

    return {
      ...properties,
      ...record,

      id,
      code,
      name:
        String(name).trim(),

      geometry:
        record.geometry ??
        properties.geometry ??
        null,

      properties,

      raw: record
    };
  }

  /* ==========================================================
   * 11. FMU normalization
   * ==========================================================
   */

  /**
   * Normalizes an FMU collection.
   *
   * @param {*} records
   * @param {object} province
   * @returns {object[]}
   */
  normalizeFmuCollection(
    records,
    province
  ) {
    const extracted =
      this.extractRecords(records);

    return extracted
      .map(
        (record, index) =>
          this.normalizeFmu(
            record,
            index,
            province
          )
      )
      .filter(Boolean)
      .sort(
        (left, right) =>
          this.getFmuSortValue(left)
            .localeCompare(
              this.getFmuSortValue(right),
              "en",
              {
                numeric: true,
                sensitivity: "base"
              }
            )
      );
  }

  /**
   * Normalizes one FMU.
   *
   * @param {object} record
   * @param {number} index
   * @param {object} province
   * @returns {object}
   */
  normalizeFmu(
    record,
    index,
    province
  ) {
    if (!record) {
      return null;
    }

    if (
      typeof DataModule.normalizeFmu ===
      "function"
    ) {
      try {
        return DataModule.normalizeFmu(
          record,
          {
            index,
            province
          }
        );
      } catch {
        // Continue with local normalization.
      }
    }

    const properties =
      record.properties || {};

    const id =
      record.id ??
      record.fmuId ??
      properties.fmu_id ??
      properties.fmuid ??
      properties.objectid ??
      index + 1;

    const zone =
      record.zone ??
      record.code ??
      properties.zone ??
      properties.zone_code ??
      properties.fmu_code ??
      properties.code ??
      id;

    const zoneName =
      record.zoneName ??
      record.name ??
      properties.zone_name ??
      properties.fmu_name ??
      properties.name ??
      `FMU ${zone}`;

    return {
      ...properties,
      ...record,

      id,
      zone,
      zoneName,

      name: zoneName,

      provinceId:
        record.provinceId ??
        properties.province_id ??
        properties.prov_id ??
        this.getProvinceId(province),

      provinceCode:
        record.provinceCode ??
        properties.province_code ??
        properties.prov_code ??
        this.getProvinceCode(province),

      provinceName:
        record.provinceName ??
        properties.province_name ??
        properties.prov_name ??
        this.getProvinceName(province),

      geometry:
        record.geometry ??
        properties.geometry ??
        null,

      properties,

      raw: record
    };
  }

  /**
   * Extracts records from arrays and GeoJSON structures.
   *
   * @param {*} data
   * @returns {object[]}
   */
  extractRecords(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (
      Array.isArray(data?.features)
    ) {
      return data.features;
    }

    if (
      Array.isArray(data?.records)
    ) {
      return data.records;
    }

    if (
      Array.isArray(data?.items)
    ) {
      return data.items;
    }

    if (
      Array.isArray(data?.data)
    ) {
      return data.data;
    }

    return [];
  }

  /* ==========================================================
   * 12. Province panel
   * ==========================================================
   */

  /**
   * Configures Province list labels.
   */
  renderProvincePanelConfiguration() {
    setText(
      this.dom.provinceTitle,
      "Provinces"
    );

    setText(
      this.dom.provinceSearchLabel,
      "Search Provinces"
    );

    if (this.dom.provinceSearch) {
      this.dom.provinceSearch.placeholder =
        "Search Province";

      this.dom.provinceSearch.setAttribute(
        "autocomplete",
        "off"
      );
    }

    if (this.dom.provinceList) {
      this.dom.provinceList.setAttribute(
        "aria-label",
        "Province list"
      );

      this.dom.provinceList.setAttribute(
        "role",
        "listbox"
      );
    }
  }

  /**
   * Filters Province list.
   *
   * @param {*} searchValue
   */
  filterProvinceList(searchValue) {
    const query =
      normalizeText(searchValue);

    if (!query) {
      this.filteredProvinces =
        [...this.provinces];
    } else {
      this.filteredProvinces =
        this.provinces.filter(
          (province) => {
            const searchable =
              normalizeText(
                [
                  this.getProvinceCode(
                    province
                  ),
                  this.getProvinceName(
                    province
                  )
                ].join(" ")
              );

            return searchable.includes(
              query
            );
          }
        );
    }

    this.renderProvinceList();
  }

  /**
   * Renders Province buttons.
   */
  renderProvinceList() {
    const container =
      this.dom.provinceList;

    if (!container) {
      return;
    }

    container.replaceChildren();

    for (
      const province
      of this.filteredProvinces
    ) {
      container.appendChild(
        this.createProvinceListItem(
          province
        )
      );
    }

    if (
      this.filteredProvinces.length === 0
    ) {
      const empty =
        document.createElement("div");

      empty.className =
        "empty-message";

      empty.textContent =
        "No matching Provinces.";

      container.appendChild(empty);
    }

    setText(
      this.dom.provinceCount,
      this.filteredProvinces.length
    );
  }

  /**
   * Creates one Province list button.
   *
   * @param {object} province
   * @returns {HTMLButtonElement}
   */
  createProvinceListItem(province) {
    const selected =
      this.isSameProvince(
        province,
        this.selectedProvince
      );

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "list-item province-list-item";

    button.dataset.provinceId =
      String(
        this.getProvinceId(
          province
        )
      );

    button.setAttribute(
      "role",
      "option"
    );

    button.setAttribute(
      "aria-selected",
      String(selected)
    );

    button.classList.toggle(
      "active",
      selected
    );

    const code =
      document.createElement("span");

    code.className =
      "list-code";

    code.textContent =
      this.getProvinceCode(
        province
      );

    const name =
      document.createElement("span");

    name.className =
      "list-name";

    name.textContent =
      this.getProvinceName(
        province
      );

    name.title =
      this.getProvinceName(
        province
      );

    button.append(
      code,
      name
    );

    button.addEventListener(
      "click",
      () => {
        this.selectProvince(
          province,
          {
            source: "list"
          }
        );
      }
    );

    return button;
  }

  /* ==========================================================
   * 13. Province selection
   * ==========================================================
   */

  /**
   * Selects the initial Province.
   */
  async selectInitialProvince() {
    if (
      this.provinces.length === 0
    ) {
      this.clearProvinceSelection();
      return;
    }

    const configuredCode =
      this.config.provinceScreen
        ?.defaultProvinceCode ??
      this.config.defaults
        ?.provinceCode;

    const configuredName =
      this.config.provinceScreen
        ?.defaultProvinceName ??
      this.config.defaults
        ?.provinceName;

    const initialProvince =
      this.provinces.find(
        (province) =>
          configuredCode &&
          normalizeText(
            this.getProvinceCode(
              province
            )
          ) ===
          normalizeText(
            configuredCode
          )
      ) ||
      this.provinces.find(
        (province) =>
          configuredName &&
          normalizeText(
            this.getProvinceName(
              province
            )
          ) ===
          normalizeText(
            configuredName
          )
      ) ||
      this.provinces.find(
        (province) =>
          normalizeText(
            this.getProvinceName(
              province
            )
          ) ===
          normalizeText(
            "West Sepik"
          )
      ) ||
      this.provinces[0];

    await this.selectProvince(
      initialProvince,
      {
        source: "startup",
        notify: false
      }
    );
  }

  /**
   * Selects one Province.
   *
   * @param {object} province
   * @param {object} [options]
   * @returns {Promise<boolean>}
   */
  async selectProvince(
    province,
    options = {}
  ) {
    if (!province) {
      this.clearProvinceSelection();
      return false;
    }

    const normalizedProvince =
      this.findMatchingProvince(
        province
      ) ||
      province;

    this.selectedProvince =
      normalizedProvince;

    this.selectedFmu = null;

    this.renderProvinceList();

    const provinceName =
      this.getProvinceName(
        normalizedProvince
      );

    setText(
      this.dom.selectedProvince,
      provinceName
    );

    setText(
      this.dom.mapSubtitle,
      `${provinceName} Province`
    );

    setText(
      this.dom.summaryScope,
      `${provinceName} Province totals`
    );

    this.setFmuLoadingState(
      true,
      `Loading FMUs for ${provinceName}…`
    );

    try {
      this.fmus =
        await this.loadFmusForProvince(
          normalizedProvince
        );

      this.renderFmuTable();

      this.updateProvinceSummary();

      this.updateMapProvinceSelection(
        normalizedProvince
      );

      this.updateMapFmuData(
        this.fmus
      );

      this.ensureMapLayerVisible(
        "province",
        true
      );

      this.ensureMapLayerVisible(
        "fmu",
        true
      );

      this.zoomToProvince(
        normalizedProvince
      );

      if (options.notify !== false) {
        this.setStatus(
          `${provinceName} Province selected; ` +
          `${this.fmus.length} FMU record(s) loaded.`
        );
      }

      return true;
    } catch (error) {
      this.fmus = [];

      this.renderFmuTable();

      this.updateProvinceSummary();

      this.handleError(
        `FMUs for ${provinceName} could not be loaded.`,
        error,
        {
          fatal: false
        }
      );

      return false;
    } finally {
      this.setFmuLoadingState(false);
    }
  }

  /**
   * Clears Province selection.
   */
  clearProvinceSelection() {
    this.selectedProvince = null;
    this.selectedFmu = null;
    this.fmus = [];

    setText(
      this.dom.selectedProvince,
      "No Province selected"
    );

    setText(
      this.dom.mapSubtitle,
      "Papua New Guinea"
    );

    setText(
      this.dom.summaryScope,
      "Province Summary"
    );

    this.renderProvinceList();
    this.renderFmuTable();

    this.summaryManager?.clear({
      notify: false
    });

    this.clearMapSelection();

    this.setStatus(
      "Province selection cleared."
    );
  }

  /* ==========================================================
   * 14. FMU table
   * ==========================================================
   */

  /**
   * Renders all FMUs for the selected Province.
   */
  renderFmuTable() {
    const body =
      this.dom.fmuTableBody;

    if (!body) {
      return;
    }

    body.replaceChildren();

    setText(
      this.dom.fmuCount,
      this.fmus.length
    );

    if (!this.selectedProvince) {
      this.renderFmuEmptyRow(
        "Select a Province to display FMUs."
      );

      return;
    }

    if (this.fmus.length === 0) {
      this.renderFmuEmptyRow(
        "No FMU records are available for the selected Province."
      );

      return;
    }

    for (const fmu of this.fmus) {
      body.appendChild(
        this.createFmuTableRow(fmu)
      );
    }
  }

  /**
   * Creates one FMU table row.
   *
   * The visible columns follow the old-FIMS Summary fields.
   * FMU is added as the record identifier, followed by the 20
   * Province Summary-compatible fields.
   *
   * @param {object} fmu
   * @returns {HTMLTableRowElement}
   */
  createFmuTableRow(fmu) {
  const selected =
    this.isSameFmu(
      fmu,
      this.selectedFmu
    );

  const row =
    document.createElement("tr");

  row.className =
    "fmu-table-row";

  row.dataset.fmuId =
    String(
      this.getFmuId(fmu)
    );

  row.tabIndex = 0;

  row.setAttribute(
    "aria-selected",
    String(selected)
  );

  row.classList.toggle(
    "selected",
    selected
  );

  /*
   * FMU table fields
   *
   * The order must match the <th> order in index.html.
   */
  const displayedValues = [
    /*
     * 1. FMU
     */
    this.getFmuDisplayId(fmu),

    /*
     * 2. Zone
     */
    this.getFmuZone(fmu),

    /*
     * 3. Zone Name
     *
     * In the current dataset, the Province represents
     * the Zone name used for Province-level aggregation.
     */
    this.selectedProvince
      ? this.getProvinceName(
          this.selectedProvince
        )
      : DEFAULT_EMPTY_VALUE,

    /*
     * 4. Veg Type
     */
    this.readFmuField(
      fmu,
      [
        "vegetationType",
        "vegetation_type",
        "vegType",
        "veg_type"
      ]
    ),

    /*
     * 5. Timber Volume
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "timberVolume",
          "timber_volume",
          "timber",
          "volume"
        ]
      )
    ),

    /*
     * 6. Veg Area
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "vegetationArea",
          "vegetation_area",
          "vegArea",
          "veg_area"
        ]
      )
    ),

    /*
     * 7. Protected Area
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "protectedArea",
          "protected_area",
          "protected",
          "area"
        ]
      )
    ),

    /*
     * 8. Ext Altitude
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "extAltitude",
          "ext_altitude",
          "ext_alt",
          "altitude"
        ]
      )
    ),

    /*
     * 9. Ext Slope
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "extSlope",
          "ext_slope",
          "ext_sl",
          "slope"
        ]
      )
    ),

    /*
     * 10. Ext Karst
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "extKarst",
          "ext_karst",
          "ext_kst",
          "karst"
        ]
      )
    ),

    /*
     * 11. Ext Inund
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "extInund",
          "ext_inund",
          "ext_in",
          "inundation"
        ]
      )
    ),

    /*
     * 12. Ext Mangrove
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "extMangrove",
          "ext_mangrove",
          "ext_man",
          "mangrove"
        ]
      )
    ),

    /*
     * 13. Ser Slope Relief
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "serSlopeRelief",
          "ser_slope_relief",
          "ser_sl",
          "sloperelie"
        ]
      )
    ),

    /*
     * 14. Ser Inund
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "serInund",
          "ser_inund",
          "ser_in",
          "inundati0"
        ]
      )
    ),

    /*
     * 15. Gross Frst Area 75
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "grossForestArea75",
          "gross_forest_area_75",
          "gross_frst_area_75",
          "area_75"
        ]
      )
    ),

    /*
     * 16. Adj Frst Area 75
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "adjustedForestArea75",
          "adjusted_forest_area_75",
          "adj_frst_area_75",
          "area_750"
        ]
      )
    ),

    /*
     * 17. Gross Frst Vol 75
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "grossForestVolume75",
          "gross_forest_volume_75",
          "gross_frst_vol_75",
          "vol_75"
        ]
      )
    ),

    /*
     * 18. Logged LUse
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "loggedLandUse",
          "logged_land_use",
          "logged_luse",
          "to96"
        ]
      )
    ),

    /*
     * 19. Rev Gross Frst Area
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "revisedGrossForestArea",
          "revised_gross_forest_area",
          "rev_gross_frst_area",
          "current_"
        ]
      )
    ),

    /*
     * 20. Rev Adj Frst Area
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "revisedAdjustedForestArea",
          "revised_adjusted_forest_area",
          "rev_adj_frst_area",
          "current0"
        ]
      )
    ),

    /*
     * 21. Rev Gross Frst Vol
     */
    this.formatFmuNumber(
      this.readFmuField(
        fmu,
        [
          "revisedGrossForestVolume",
          "revised_gross_forest_volume",
          "rev_gross_frst_vol",
          "forest_vol",
          "current2",
          "current1"
        ]
      )
    )
  ];

  for (
    const [index, value]
    of displayedValues.entries()
  ) {
    const cell =
      document.createElement("td");

    cell.textContent =
      hasValue(value)
        ? String(value)
        : DEFAULT_EMPTY_VALUE;

    /*
     * Columns 5–21 are numeric.
     * Array index starts from zero, so index 4 is column 5.
     */
    if (index >= 4) {
      cell.classList.add(
        "number-cell",
        "numeric"
      );
    }

    row.appendChild(cell);
  }

  row.addEventListener(
    "click",
    () => {
      this.selectFmu(
        fmu,
        {
          source: "table"
        }
      );
    }
  );

  row.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();

        this.selectFmu(
          fmu,
          {
            source: "keyboard"
          }
        );
      }
    }
  );

  return row;
}


  /**
   * Renders one full-width FMU empty row.
   *
   * @param {string} message
   */
  renderFmuEmptyRow(message) {
    const row =
      document.createElement("tr");

    row.className =
      "empty-row";

    const cell =
      document.createElement("td");

    cell.colSpan =
      this.getFmuTableColumnCount();

    cell.textContent =
      message;

    row.appendChild(cell);

    this.dom.fmuTableBody
      ?.appendChild(row);
  }

  /**
   * Returns the current FMU table column count.
   *
   * @returns {number}
   */
  getFmuTableColumnCount() {
    const table =
      this.dom.fmuTableBody
        ?.closest("table");

    const count =
      table?.querySelectorAll(
        "thead th"
      ).length;

    return count || 4;
  }

  /**
   * Shows or removes FMU loading status.
   */
  setFmuLoadingState(
    loading,
    message =
      "Loading FMUs…"
  ) {
    const body =
      this.dom.fmuTableBody;

    if (!body) {
      return;
    }

    body
      .closest("table")
      ?.setAttribute(
        "aria-busy",
        String(Boolean(loading))
      );

    if (!loading) {
      return;
    }

    body.replaceChildren();

    const row =
      document.createElement("tr");

    row.className =
      "empty-row loading-row";

    const cell =
      document.createElement("td");

    cell.colSpan =
      this.getFmuTableColumnCount();

    cell.textContent =
      message;

    row.appendChild(cell);
    body.appendChild(row);
  }

  /* ==========================================================
   * 15. FMU selection
   * ==========================================================
   */

  /**
   * Selects one FMU.
   *
   * @param {object} fmu
   * @param {object} [options]
   * @returns {boolean}
   */
  selectFmu(
    fmu,
    options = {}
  ) {
    if (!fmu) {
      this.clearFmuSelection();
      return false;
    }

    const matchingFmu =
      this.findMatchingFmu(fmu) ||
      fmu;

    this.selectedFmu =
      matchingFmu;

    this.renderFmuTable();

    this.updateMapFmuSelection(
      matchingFmu
    );

    this.zoomToFmu(
      matchingFmu
    );

    if (options.notify !== false) {
      this.setStatus(
        `FMU ${this.getFmuDisplayId(
          matchingFmu
        )}, Zone ${this.getFmuZone(
          matchingFmu
        )} selected.`
      );
    }

    return true;
  }

  /**
   * Clears FMU selection.
   */
  clearFmuSelection() {
    this.selectedFmu = null;

    this.renderFmuTable();

    if (
      typeof this.mapManager
        ?.clearFmuSelection ===
      "function"
    ) {
      this.mapManager
        .clearFmuSelection();
    }
  }

  /* ==========================================================
   * 16. Province Summary
   * ==========================================================
   */

  /**
   * Recalculates Province totals from current FMUs.
   */
  updateProvinceSummary() {
    if (!this.summaryManager) {
      return;
    }

    const result =
      this.summaryManager.update(
        this.selectedProvince,
        this.fmus,
        {
          render: true,
          notify: false
        }
      );

    const fmuCount =
      result?.metadata?.fmuCount ??
      this.fmus.length;

    this.setSummaryStatus(
      this.selectedProvince
        ? `${fmuCount} FMU record(s) aggregated.`
        : "Select a Province."
    );
  }

  /* ==========================================================
   * 17. Layer controls
   * ==========================================================
   */

  /**
   * Renders configurable map layers.
   */
  renderLayerControls() {
    const container =
      this.dom.layerList;

    if (!container) {
      return;
    }

    /*
     * Prefer map.js controls where provided.
     */
    if (
      typeof this.mapManager
        ?.renderLayerControls ===
      "function"
    ) {
      try {
        this.mapManager
          .renderLayerControls(
            container
          );

        return;
      } catch (error) {
        this.handleError(
          "Map layer controls could not be rendered by map.js.",
          error,
          {
            fatal: false
          }
        );
      }
    }

    const layers =
      this.getConfiguredLayers();

    container.replaceChildren();

    for (const layer of layers) {
      const label =
        document.createElement("label");

      label.className =
        "layer-option";

      const checkbox =
        document.createElement("input");

      checkbox.type =
        "checkbox";

      checkbox.dataset.layer =
        layer.key;

      checkbox.checked =
        Boolean(
          layer.visible ??
          layer.defaultVisible
        );

      checkbox.addEventListener(
        "change",
        () => {
          this.setMapLayerVisible(
            layer.key,
            checkbox.checked
          );
        }
      );

      const text =
        document.createElement("span");

      text.textContent =
        layer.label ||
        layer.title ||
        layer.key;

      label.append(
        checkbox,
        text
      );

      container.appendChild(label);
    }
  }

  /**
   * Returns configured layer definitions.
   *
   * @returns {object[]}
   */
  getConfiguredLayers() {
    if (
      Array.isArray(
        this.config.layers
      )
    ) {
      return this.config.layers;
    }

    if (
      Array.isArray(
        this.config.map?.layers
      )
    ) {
      return this.config.map.layers;
    }

    if (
      this.config.layers &&
      typeof this.config.layers ===
        "object"
    ) {
      return Object.entries(
        this.config.layers
      ).map(
        ([key, value]) => ({
          key,
          ...value
        })
      );
    }

    return [];
  }

  /**
   * Sets layer visibility.
   */
  setMapLayerVisible(
    layerKey,
    visible
  ) {
    if (
      typeof this.mapManager
        ?.setLayerVisible ===
      "function"
    ) {
      this.mapManager.setLayerVisible(
        layerKey,
        visible
      );

      return true;
    }

    if (
      typeof this.mapManager
        ?.toggleLayer ===
      "function"
    ) {
      this.mapManager.toggleLayer(
        layerKey,
        visible
      );

      return true;
    }

    return false;
  }

  /**
   * Sets a layer and synchronizes its checkbox.
   */
  ensureMapLayerVisible(
    layerKey,
    visible
  ) {
    this.setMapLayerVisible(
      layerKey,
      visible
    );

    const checkbox =
      document.querySelector(
        `input[data-layer="${escapeSelector(
          layerKey
        )}"]`
      );

    if (checkbox) {
      checkbox.checked =
        Boolean(visible);
    }
  }

  /**
   * Clears optional overlay layers.
   */
  clearMapLayers() {
    if (
      typeof this.mapManager
        ?.clearOverlays ===
      "function"
    ) {
      this.mapManager.clearOverlays();
    } else {
      for (
        const layer
        of this.getConfiguredLayers()
      ) {
        this.setMapLayerVisible(
          layer.key,
          false
        );
      }
    }

    for (
      const checkbox
      of document.querySelectorAll(
        "input[data-layer]"
      )
    ) {
      checkbox.checked = false;
    }

    this.setStatus(
      "Optional map layers cleared."
    );
  }

  /* ==========================================================
   * 18. Map data and selection synchronization
   * ==========================================================
   */

  /**
   * Sends Province selection to map.js.
   */
  updateMapProvinceSelection(province) {
    if (
      typeof this.mapManager
        ?.selectProvince ===
      "function"
    ) {
      this.mapManager.selectProvince(
        province,
        {
          zoom: false,
          notify: false
        }
      );

      return;
    }

    if (
      typeof this.mapManager
        ?.setSelectedProvince ===
      "function"
    ) {
      this.mapManager
        .setSelectedProvince(
          province
        );
    }
  }

  /**
   * Sends FMU records to map.js.
   */
  updateMapFmuData(fmus) {
    const methods = [
      "setFmus",
      "setFmuData",
      "renderFmus",
      "loadFmus"
    ];

    for (const method of methods) {
      if (
        typeof this.mapManager?.[
          method
        ] === "function"
      ) {
        try {
          this.mapManager[method](
            fmus,
            {
              province:
                this.selectedProvince
            }
          );
        } catch (error) {
          this.handleError(
            "FMU map features could not be updated.",
            error,
            {
              fatal: false
            }
          );
        }

        return;
      }
    }
  }

  /**
   * Sends FMU selection to map.js.
   */
  updateMapFmuSelection(fmu) {
    if (
      typeof this.mapManager
        ?.selectFmu ===
      "function"
    ) {
      this.mapManager.selectFmu(
        fmu,
        {
          zoom: false,
          notify: false
        }
      );

      return;
    }

    if (
      typeof this.mapManager
        ?.setSelectedFmu ===
      "function"
    ) {
      this.mapManager
        .setSelectedFmu(fmu);
    }
  }

  /**
   * Zooms to a Province.
   */
  zoomToProvince(province) {
    const methods = [
      "zoomToProvince",
      "fitProvince",
      "focusProvince"
    ];

    for (const method of methods) {
      if (
        typeof this.mapManager?.[
          method
        ] === "function"
      ) {
        this.mapManager[method](
          province
        );

        return true;
      }
    }

    return this.zoomToHomeExtent();
  }

  /**
   * Zooms to one FMU.
   */
  zoomToFmu(fmu) {
    const methods = [
      "zoomToFmu",
      "fitFmu",
      "focusFmu",
      "zoomToFeature"
    ];

    for (const method of methods) {
      if (
        typeof this.mapManager?.[
          method
        ] === "function"
      ) {
        this.mapManager[method](fmu);
        return true;
      }
    }

    return false;
  }

  /**
   * Returns to PNG extent.
   */
  zoomToHomeExtent() {
    const methods = [
      "zoomToPng",
      "zoomToHome",
      "resetExtent",
      "fitHomeExtent"
    ];

    for (const method of methods) {
      if (
        typeof this.mapManager?.[
          method
        ] === "function"
      ) {
        this.mapManager[method]();
        return true;
      }
    }

    return false;
  }

  /**
   * Clears map selections.
   */
  clearMapSelection() {
    if (
      typeof this.mapManager
        ?.clearSelection ===
      "function"
    ) {
      this.mapManager.clearSelection();
    }
  }

  /* ==========================================================
   * 19. Reports
   * ==========================================================
   */

  /**
   * Returns Province report definitions.
   *
   * @returns {object[]}
   */
  getProvinceReports() {
    const configured =
      this.config.reports?.province ??
      this.config.provinceScreen
        ?.reports;

    if (Array.isArray(configured)) {
      return configured.map(
        (report, index) =>
          this.normalizeReport(
            report,
            index
          )
      );
    }

    if (
      Array.isArray(
        DataModule.PROVINCE_REPORTS
      )
    ) {
      return DataModule
        .PROVINCE_REPORTS
        .map(
          (report, index) =>
            this.normalizeReport(
              report,
              index
            )
        );
    }

    return [
      {
        id:
          "province-fmu-summary",

        title:
          "Province / FMU Summary",

        description:
          "Province-level totals calculated from all FMUs."
      },

      {
        id:
          "province-fmu-list",

        title:
          "FMU List",

        description:
          "FMU records within the selected Province."
      }
    ];
  }

  /**
   * Normalizes report definitions.
   */
  normalizeReport(report, index) {
    if (Array.isArray(report)) {
      return {
        id:
          `province-report-${index + 1}`,

        title:
          String(
            report[0] ||
            `Report ${index + 1}`
          ),

        description:
          String(
            report[1] || ""
          )
      };
    }

    return {
      id:
        report.id ||
        report.key ||
        `province-report-${index + 1}`,

      title:
        report.title ||
        report.label ||
        `Report ${index + 1}`,

      description:
        report.description ||
        report.subtitle ||
        ""
    };
  }

  /**
   * Renders report options.
   */
  renderReports() {
    const container =
      this.dom.reportList;

    if (!container) {
      return;
    }

    const reports =
      this.getProvinceReports();

    container.replaceChildren();

    for (
      const [index, report]
      of reports.entries()
    ) {
      const option =
        document.createElement("label");

      option.className =
        "report-option";

      const radio =
        document.createElement("input");

      radio.type = "radio";
      radio.name =
        "province-report";

      radio.value =
        report.id;

      radio.checked =
        index === 0;

      if (radio.checked) {
        this.selectedReportId =
          report.id;
      }

      radio.addEventListener(
        "change",
        () => {
          if (radio.checked) {
            this.selectedReportId =
              report.id;
          }
        }
      );

      const text =
        document.createElement("span");

      const title =
        document.createElement("strong");

      title.textContent =
        report.title;

      const description =
        document.createElement("small");

      description.textContent =
        report.description;

      text.append(
        title,
        description
      );

      option.append(
        radio,
        text
      );

      container.appendChild(option);
    }
  }

  /**
   * Runs Preview or Export.
   */
  runReportAction(action) {
    if (!this.selectedProvince) {
      this.setStatus(
        "Select a Province before running a report."
      );

      return false;
    }

    const report =
      this.getSelectedReport();

    if (!report) {
      this.setStatus(
        "Select a report."
      );

      return false;
    }

    if (
      action === REPORT_ACTION.EXPORT &&
      report.id ===
        "province-fmu-summary" &&
      this.summaryManager
    ) {
      this.summaryManager
        .downloadCsv();

      return true;
    }

    const event =
      new CustomEvent(
        "fims:report",
        {
          detail: {
            action,
            report,
            province:
              this.selectedProvince,
            fmus:
              [...this.fmus],
            summary:
              this.summaryManager
                ?.getSummary() ??
              null
          }
        }
      );

    document.dispatchEvent(event);

    this.setStatus(
      `${action === REPORT_ACTION.PREVIEW
        ? "Preview"
        : "Export"}: ` +
      `${report.title} for ` +
      `${this.getProvinceName(
        this.selectedProvince
      )}.`
    );

    return true;
  }

  /**
   * Returns selected report.
   */
  getSelectedReport() {
    const checked =
      document.querySelector(
        'input[name="province-report"]:checked'
      );

    const reportId =
      checked?.value ||
      this.selectedReportId;

    return (
      this.getProvinceReports()
        .find(
          (report) =>
            report.id === reportId
        ) ||
      null
    );
  }

  /* ==========================================================
   * 20. Deferred update actions
   * ==========================================================
   */

  /**
   * Placeholder for future Zone update API.
   */
  requestZoneUpdate() {
    if (!this.selectedFmu) {
      this.setStatus(
        "Select an FMU first."
      );

      return false;
    }

    this.setStatus(
      `Zone ${this.getFmuZone(
        this.selectedFmu
      )}: update API is reserved for the backend implementation phase.`
    );

    return true;
  }

  /**
   * Placeholder for future FMU update API.
   */
  requestFmuUpdate() {
    if (!this.selectedFmu) {
      this.setStatus(
        "Select an FMU first."
      );

      return false;
    }

    this.setStatus(
      `FMU ${this.getFmuDisplayId(
        this.selectedFmu
      )}: update API is reserved for the backend implementation phase.`
    );

    return true;
  }

  /* ==========================================================
   * 21. Large Map and Exit
   * ==========================================================
   */

  /**
   * Opens or toggles Large Map mode.
   */
  openLargeMap() {
    if (
      typeof this.menuManager
        ?.toggleLargeMapLayout ===
      "function"
    ) {
      const expanded =
        this.menuManager
          .toggleLargeMapLayout();

      this.invalidateMapSize();

      return expanded;
    }

    const mapPanel =
      this.dom.mapContainer
        ?.closest(".map-panel");

    mapPanel?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    this.invalidateMapSize();

    return true;
  }

  /**
   * Notifies Leaflet of layout changes.
   */
  invalidateMapSize() {
    window.setTimeout(() => {
      if (
        typeof this.mapManager
          ?.invalidateSize ===
        "function"
      ) {
        this.mapManager
          .invalidateSize();

        return;
      }

      if (
        typeof this.mapManager
          ?.map?.invalidateSize ===
        "function"
      ) {
        this.mapManager
          .map.invalidateSize();
      }
    }, 60);
  }

  /**
   * Leaves the application.
   */
  exitApplication() {
    const exitUrl =
      this.config.urls?.portal ||
      this.config.urls?.frims ||
      this.config.application
        ?.portalUrl ||
      this.config.navigation
        ?.exitUrl;

    if (exitUrl) {
      window.location.href =
        exitUrl;

      return true;
    }

    if (window.history.length > 1) {
      window.history.back();
      return true;
    }

    this.setStatus(
      "No portal return URL is configured."
    );

    return false;
  }

  /* ==========================================================
   * 22. UI event binding
   * ==========================================================
   */

  /**
   * Binds application UI events.
   */
  bindUiEvents() {
    this.bindEvent(
      this.dom.provinceSearch,
      "input",
      (event) => {
        this.filterProvinceList(
          event.target.value
        );
      }
    );

    this.bindEvent(
      this.dom.homeExtentButton,
      "click",
      () => {
        this.zoomToHomeExtent();
        this.setStatus(
          "Map returned to the Papua New Guinea extent."
        );
      }
    );

    this.bindEvent(
      this.dom.clearLayersButton,
      "click",
      () => {
        this.clearMapLayers();
      }
    );

    this.bindEvent(
      this.dom.updateZoneButton,
      "click",
      () => {
        this.requestZoneUpdate();
      }
    );

    this.bindEvent(
      this.dom.updateFmuButton,
      "click",
      () => {
        this.requestFmuUpdate();
      }
    );

    this.bindEvent(
      this.dom.previewReportButton,
      "click",
      () => {
        this.runReportAction(
          REPORT_ACTION.PREVIEW
        );
      }
    );

    this.bindEvent(
      this.dom.exportReportButton,
      "click",
      () => {
        this.runReportAction(
          REPORT_ACTION.EXPORT
        );
      }
    );

    /*
     * Compatibility with old tab buttons.
     * Only Province is currently operational.
     */
    for (
      const button
      of all(
        ".tab-button",
        "[data-mode]"
      )
    ) {
      this.bindEvent(
        button,
        "click",
        () => {
          const mode =
            button.dataset.mode;

          if (mode === "province") {
            this.menuManager
              ?.setActiveItem(
                MENU_MODULE_ID.PROVINCE
              );

            this.showProvinceView();
          } else {
            this.setStatus(
              `${mode} mode is reserved for a later implementation phase.`
            );
          }
        }
      );
    }

    this.bindEvent(
      window,
      "beforeunload",
      () => {
        this.destroy({
          clearDom: false
        });
      }
    );
  }

  /**
   * Binds an event and records its cleanup operation.
   */
  bindEvent(
    target,
    eventName,
    handler,
    options
  ) {
    if (
      !target ||
      typeof target.addEventListener !==
        "function"
    ) {
      return;
    }

    target.addEventListener(
      eventName,
      handler,
      options
    );

    this.eventCleanupFunctions.push(
      () => {
        target.removeEventListener(
          eventName,
          handler,
          options
        );
      }
    );
  }

  /* ==========================================================
   * 23. Record access helpers
   * ==========================================================
   */

  getProvinceId(province) {
    return (
      province?.id ??
      province?.provinceId ??
      province?.province_id ??
      province?.properties?.id ??
      province?.properties
        ?.province_id ??
      null
    );
  }

  getProvinceCode(province) {
    const value =
      province?.code ??
      province?.provinceCode ??
      province?.province_code ??
      province?.provCode ??
      province?.properties
        ?.province_code ??
      province?.properties
        ?.prov_code ??
      province?.properties?.code ??
      province?.properties?.zone;

    return hasValue(value)
      ? String(value).trim()
      : DEFAULT_EMPTY_VALUE;
  }

  getProvinceName(province) {
    const value =
      province?.name ??
      province?.provinceName ??
      province?.province_name ??
      province?.provName ??
      province?.properties
        ?.province_name ??
      province?.properties
        ?.prov_name ??
      province?.properties?.name ??
      province?.properties
        ?.zone_name;

    return hasValue(value)
      ? String(value).trim()
      : this.getProvinceCode(
          province
        );
  }

  getFmuId(fmu) {
    return (
      fmu?.id ??
      fmu?.fmuId ??
      fmu?.fmu_id ??
      fmu?.properties?.fmu_id ??
      fmu?.properties?.id ??
      null
    );
  }

  getFmuDisplayId(fmu) {
    const value =
      fmu?.fmuCode ??
      fmu?.fmu_code ??
      fmu?.code ??
      fmu?.id ??
      fmu?.properties
        ?.fmu_code ??
      fmu?.properties?.code ??
      fmu?.properties?.fmu_id;

    return hasValue(value)
      ? String(value).trim()
      : DEFAULT_EMPTY_VALUE;
  }

  getFmuZone(fmu) {
    const value =
      fmu?.zone ??
      fmu?.zoneCode ??
      fmu?.zone_code ??
      fmu?.properties?.zone ??
      fmu?.properties
        ?.zone_code ??
      fmu?.code;

    return hasValue(value)
      ? String(value).trim()
      : DEFAULT_EMPTY_VALUE;
  }

  getFmuSortValue(fmu) {
    return [
      this.getFmuZone(fmu),
      this.getFmuDisplayId(fmu)
    ].join(" ");
  }

  /**
   * Reads an FMU field by multiple aliases.
   */
  readFmuField(fmu, aliases) {
    const sources = [
      fmu,
      fmu?.properties,
      fmu?.raw,
      fmu?.raw?.properties
    ].filter(
      (source) =>
        source &&
        typeof source === "object"
    );

    const normalizedAliases =
      aliases.map(
        (alias) =>
          String(alias)
            .toLocaleLowerCase("en")
            .replace(
              /[^a-z0-9]/g,
              ""
            )
      );

    for (const source of sources) {
      for (
        const [key, value]
        of Object.entries(source)
      ) {
        const normalizedKey =
          key
            .toLocaleLowerCase("en")
            .replace(
              /[^a-z0-9]/g,
              ""
            );

        if (
          normalizedAliases.includes(
            normalizedKey
          )
        ) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Formats FMU table numeric values.
   */
  formatFmuNumber(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return DEFAULT_EMPTY_VALUE;
    }

    const numeric =
      Number(
        String(value)
          .replace(/,/g, "")
          .replace(
            /[^0-9eE+\-.]/g,
            ""
          )
      );

    if (!Number.isFinite(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat(
      this.config.data
        ?.numberFormat?.locale ||
      "en-US",
      {
        maximumFractionDigits: 2
      }
    ).format(numeric);
  }

  /* ==========================================================
   * 24. Matching and filtering
   * ==========================================================
   */

  isSameProvince(left, right) {
    if (!left || !right) {
      return false;
    }

    const leftId =
      this.getProvinceId(left);

    const rightId =
      this.getProvinceId(right);

    if (
      hasValue(leftId) &&
      hasValue(rightId)
    ) {
      return (
        normalizeText(leftId) ===
        normalizeText(rightId)
      );
    }

    return (
      normalizeText(
        this.getProvinceCode(left)
      ) ===
      normalizeText(
        this.getProvinceCode(right)
      )
    );
  }

  isSameFmu(left, right) {
    if (!left || !right) {
      return false;
    }

    const leftId =
      this.getFmuId(left);

    const rightId =
      this.getFmuId(right);

    if (
      hasValue(leftId) &&
      hasValue(rightId)
    ) {
      return (
        normalizeText(leftId) ===
        normalizeText(rightId)
      );
    }

    return (
      normalizeText(
        this.getFmuDisplayId(left)
      ) ===
      normalizeText(
        this.getFmuDisplayId(right)
      )
    );
  }

  findMatchingProvince(province) {
    return (
      this.provinces.find(
        (candidate) =>
          this.isSameProvince(
            candidate,
            province
          )
      ) ||
      null
    );
  }

  findMatchingFmu(fmu) {
    return (
      this.fmus.find(
        (candidate) =>
          this.isSameFmu(
            candidate,
            fmu
          )
      ) ||
      null
    );
  }

  /**
   * Filters static FMU records by Province relationship.
   */
  filterFmusByProvince(
    fmus,
    province
  ) {
    const provinceValues = [
      this.getProvinceId(province),
      this.getProvinceCode(province),
      this.getProvinceName(province)
    ]
      .filter(hasValue)
      .map(normalizeText);

    const matched =
      asArray(fmus).filter(
        (fmu) => {
          const fmuValues = [
            fmu?.provinceId,
            fmu?.provinceCode,
            fmu?.provinceName,
            fmu?.province_id,
            fmu?.province_code,
            fmu?.province_name,
            fmu?.properties
              ?.province_id,
            fmu?.properties
              ?.province_code,
            fmu?.properties
              ?.province_name,
            fmu?.properties
              ?.prov_id,
            fmu?.properties
              ?.prov_code,
            fmu?.properties
              ?.prov_name
          ]
            .filter(hasValue)
            .map(normalizeText);

          return fmuValues.some(
            (value) =>
              provinceValues.includes(
                value
              )
          );
        }
      );

    /*
     * If records do not contain a Province relationship, retain
     * the original collection because it may already be filtered.
     */
    const relationshipExists =
      asArray(fmus).some(
        (fmu) =>
          hasValue(
            fmu?.provinceId ??
            fmu?.provinceCode ??
            fmu?.provinceName ??
            fmu?.province_id ??
            fmu?.province_code ??
            fmu?.province_name ??
            fmu?.properties
              ?.province_id ??
            fmu?.properties
              ?.province_code ??
            fmu?.properties
              ?.province_name
          )
      );

    return relationshipExists
      ? matched
      : asArray(fmus);
  }

  /* ==========================================================
   * 25. Status and error handling
   * ==========================================================
   */

  setStatus(message) {
    setText(
      this.dom.status ||
      first(SELECTORS.status),
      message
    );
  }

  setCoordinate(message) {
    let displayValue = message;

    if (
      message &&
      typeof message === "object"
    ) {
      const lat =
        message.lat ??
        message.latitude;

      const lng =
        message.lng ??
        message.lon ??
        message.longitude;

      if (
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng))
      ) {
        displayValue =
          `${Number(lat).toFixed(5)}, ` +
          `${Number(lng).toFixed(5)}`;
      } else {
        displayValue =
          JSON.stringify(message);
      }
    }

    setText(
      this.dom.coordinate ||
      first(SELECTORS.coordinate),
      displayValue
    );
  }

  setSummaryStatus(message) {
    setText(
      this.dom.summaryStatus,
      message
    );
  }

  getGeoServerStatusText() {
    const wmsUrl =
      this.config.geoserver
        ?.wmsUrl ||
      this.config.geoserver
        ?.wms ||
      this.config.services
        ?.wmsUrl;

    return wmsUrl
      ? "GeoServer configured"
      : "Local or prototype data";
  }

  /**
   * Handles application errors.
   */
  handleError(
    message,
    error,
    options = {}
  ) {
    const normalizedError =
      error instanceof Error
        ? error
        : new ApplicationError(
            String(
              error || message
            )
          );

    console.error(
      `[FIMS app] ${message}`,
      normalizedError
    );

    this.setStatus(
      `${message} ${normalizedError.message}`
    );

    if (options.fatal !== false) {
      this.status =
        APP_STATUS.ERROR;
    }

    document.dispatchEvent(
      new CustomEvent(
        "fims:error",
        {
          detail: {
            message,
            error:
              normalizedError,
            fatal:
              options.fatal !== false
          }
        }
      )
    );
  }

  /* ==========================================================
   * 26. Application state
   * ==========================================================
   */

  /**
   * Returns application state.
   */
  getState() {
    return {
      version:
        APP_VERSION,

      status:
        this.status,

      initialized:
        this.initialized,

      destroyed:
        this.destroyed,

      activeView:
        this.activeView,

      provinceCount:
        this.provinces.length,

      filteredProvinceCount:
        this.filteredProvinces.length,

      fmuCount:
        this.fmus.length,

      selectedProvince:
        this.selectedProvince,

      selectedFmu:
        this.selectedFmu,

      selectedReportId:
        this.selectedReportId,

      map:
        typeof this.mapManager
          ?.getState === "function"
          ? this.mapManager.getState()
          : null,

      menu:
        this.menuManager
          ?.getState() ??
        null,

      summary:
        this.summaryManager
          ?.getSummary() ??
        null,

      startupErrors:
        [...this.startupErrors]
    };
  }

  /* ==========================================================
   * 27. Cleanup
   * ==========================================================
   */

  /**
   * Destroys the application.
   */
  destroy(options = {}) {
    if (this.destroyed) {
      return;
    }

    for (
      const cleanup
      of this.eventCleanupFunctions
    ) {
      try {
        cleanup();
      } catch {
        // Cleanup failures are non-fatal.
      }
    }

    this.eventCleanupFunctions = [];

    this.summaryManager?.destroy({
      clearContainer:
        options.clearDom !== false
    });

    this.menuManager?.destroy({
      clearContainer:
        options.clearDom !== false
    });

    if (
      typeof this.mapManager
        ?.destroy ===
      "function"
    ) {
      this.mapManager.destroy();
    } else if (
      typeof this.mapManager
        ?.remove ===
      "function"
    ) {
      this.mapManager.remove();
    }

    this.mapManager = null;
    this.menuManager = null;
    this.summaryManager = null;

    this.provinces = [];
    this.filteredProvinces = [];
    this.fmus = [];

    this.selectedProvince = null;
    this.selectedFmu = null;

    this.initialized = false;
    this.destroyed = true;
    this.status =
      APP_STATUS.DESTROYED;
  }
}

/* ============================================================
 * 28. Error classes
 * ============================================================
 */

export class ApplicationError
  extends Error {
  constructor(
    message,
    options = {}
  ) {
    super(message, options);

    this.name =
      "ApplicationError";

    this.code =
      options.code ||
      "APPLICATION_ERROR";

    this.details =
      options.details ||
      null;
  }
}

export class ApplicationInitializationError
  extends ApplicationError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ||
          "APPLICATION_INITIALIZATION_ERROR"
      }
    );

    this.name =
      "ApplicationInitializationError";
  }
}

/* ============================================================
 * 29. Application factory
 * ============================================================
 */

/**
 * Creates an ApplicationController.
 */
export function createApplication(
  options = {}
) {
  return new ApplicationController(
    options
  );
}

/* ============================================================
 * 30. Startup
 * ============================================================
 */

let application = null;

/**
 * Starts one global application instance.
 */
async function startApplication() {
  if (application) {
    return application;
  }

  application =
    createApplication({
      config: CONFIG
    });

  /*
   * Exposed for debugging from the browser console.
   */
  window.FIMS_APP =
    application;

  await application.start();

  return application;
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      startApplication();
    },
    {
      once: true
    }
  );
} else {
  startApplication();
}

/* ============================================================
 * 31. Default export
 * ============================================================
 */

export default ApplicationController;

/**
 * ============================================================
 * End of app.js Ver.2.0.1
 * ============================================================
 */
