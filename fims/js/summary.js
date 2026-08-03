/**
 * ============================================================
 * FIMS Cloud Ver.2.0
 * Province / FMU Summary Module
 * ============================================================
 *
 * File:
 *   js/summary.js
 *
 * Version:
 *   2.0.0
 *
 * Parts:
 *   Part 1 / 3
 *
 * Purpose:
 *   - Aggregate FMU values within the selected Province
 *   - Display the Province-level total of FMU attributes
 *   - Keep the displayed items consistent with the old FIMS
 *   - Provide summary data for reports and CSV export
 *
 * Old FIMS concept:
 *
 *   Province selected
 *          ↓
 *   FMUs belonging to Province
 *          ↓
 *   FMU table:
 *     One row for each FMU
 *          ↓
 *   Summary:
 *     Province-level totals of the FMU numeric fields
 *
 * Important:
 *   Zone, Zone Name and Veg Type are descriptive fields.
 *   The remaining numeric fields are aggregated.
 *
 * ============================================================
 */

import {
  CONFIG
} from "./config.js";

import {
  formatConfiguredValue,
  formatNumber,
  toNullableNumber
} from "./data.js";

/* ============================================================
 * 1. Module constants
 * ============================================================
 */

/**
 * Summary module version.
 */
export const SUMMARY_MODULE_VERSION = "3.7.0";

/**
 * Default Summary container ID.
 */
export const DEFAULT_SUMMARY_CONTAINER_ID =
  "province-summary";

/**
 * Summary entity type.
 */
export const SUMMARY_ENTITY_TYPE = Object.freeze({
  PROVINCE: "province",
  FMU: "fmu"
});

/**
 * Supported field data types.
 */
export const SUMMARY_FIELD_TYPE = Object.freeze({
  TEXT: "text",
  INTEGER: "integer",
  NUMBER: "number",
  AREA: "area",
  VOLUME: "volume"
});

/**
 * Aggregation types.
 */
export const SUMMARY_AGGREGATION = Object.freeze({
  NONE: "none",
  FIRST: "first",
  DISTINCT: "distinct",
  COUNT: "count",
  SUM: "sum"
});

/**
 * Summary status.
 */
export const SUMMARY_STATUS = Object.freeze({
  IDLE: "idle",
  READY: "ready",
  EMPTY: "empty",
  ERROR: "error"
});

/**
 * Default empty-value text.
 */
export const DEFAULT_EMPTY_VALUE =
  CONFIG.data?.emptyValue || "—";

/**
 * Default number-format locale.
 */
export const DEFAULT_LOCALE =
  CONFIG.data?.numberFormat?.locale || "en-US";

/* ============================================================
 * 2. Old FIMS Summary field definitions
 * ============================================================
 */

/**
 * Old FIMS Province Summary fields.
 *
 * The order of this array determines the display order.
 *
 * Notes:
 *   - Zone:
 *       Province code or Zone code representing the selected
 *       Province.
 *
 *   - Zone Name:
 *       Name of the selected Province.
 *
 *   - Veg Type:
 *       A single value if every FMU has the same vegetation type.
 *       "Multiple" if more than one vegetation type exists.
 *
 *   - Other numeric fields:
 *       Sum of all FMUs belonging to the selected Province.
 */
export const OLD_FIMS_SUMMARY_FIELDS = Object.freeze([
  Object.freeze({
    key: "zone",
    label: "Zone",
    description: "Zone Code",
    type: SUMMARY_FIELD_TYPE.TEXT,
    aggregation: SUMMARY_AGGREGATION.FIRST,
    source: "province",
    aliases: Object.freeze([
      "zone",
      "zone_code",
      "zonecode",
      "province_code",
      "provincecode",
      "prov_code",
      "provcode",
      "code"
    ])
  }),

  Object.freeze({
    key: "zoneName",
    label: "Zone Name",
    description: "Zone Name",
    type: SUMMARY_FIELD_TYPE.TEXT,
    aggregation: SUMMARY_AGGREGATION.FIRST,
    source: "province",
    aliases: Object.freeze([
      "zone_name",
      "zonename",
      "province_name",
      "provincename",
      "prov_name",
      "provname",
      "name"
    ])
  }),

  Object.freeze({
    key: "vegType",
    label: "Veg Type",
    description: "Vegetation Type",
    type: SUMMARY_FIELD_TYPE.TEXT,
    aggregation: SUMMARY_AGGREGATION.DISTINCT,
    source: "fmu",
    aliases: Object.freeze([
      "veg_type",
      "vegtype",
      "vegetation_type",
      "vegetationtype",
      "forest_type",
      "foresttype",
      "vegetation",
      "veg"
    ])
  }),

  Object.freeze({
    key: "timberVolume",
    label: "Timber Volume",
    description: "Timber Volume",
    type: SUMMARY_FIELD_TYPE.VOLUME,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "timber_volume",
      "timbervolume",
      "timber_vol",
      "timbervol",
      "volume",
      "vol",
      "gross_volume",
      "grossvolume"
    ])
  }),

  Object.freeze({
    key: "vegArea",
    label: "Veg Area",
    description: "Vegetation Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "veg_area",
      "vegarea",
      "vegetation_area",
      "vegetationarea",
      "forest_area",
      "forestarea",
      "area"
    ])
  }),

  Object.freeze({
    key: "protectedArea",
    label: "Protected Area",
    description: "Protected Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "protected_area",
      "protectedarea",
      "protection_area",
      "protectionarea",
      "prot_area",
      "protarea",
      "protected"
    ])
  }),

  Object.freeze({
    key: "extAltitude",
    label: "Ext_Altitude",
    description: "Altitude Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "altitude",
      "ext_altitude",
      "extaltitude",
      "extent_altitude",
      "extentaltitude",
      "altitude_area",
      "altitudearea",
      "ext_alt",
      "extalt"
    ])
  }),

  Object.freeze({
    key: "extSlope",
    label: "Ext_Slope",
    description: "Slope Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "slope",
      "ext_slope",
      "extslope",
      "extent_slope",
      "extentslope",
      "slope_area",
      "slopearea",
      "ext_sl",
      "extsl"
    ])
  }),

  Object.freeze({
    key: "extKarst",
    label: "Ext_Karst",
    description: "Karst Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "karst",
      "ext_karst",
      "extkarst",
      "extent_karst",
      "extentkarst",
      "karst_area",
      "karstarea",
      "ext_kst",
      "extkst"
    ])
  }),

  Object.freeze({
    key: "extInund",
    label: "Ext_Inund",
    description: "Inundation Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "inundation",
      "ext_inund",
      "extinund",
      "extent_inund",
      "extentinund",
      "inundation_area",
      "inundationarea",
      "inund_area",
      "inundarea",
      "ext_in",
      "extin"
    ])
  }),

  Object.freeze({
    key: "extMangrove",
    label: "Ext_Mangrove",
    description: "Mangrove Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "mangrove",
      "ext_mangrove",
      "extmangrove",
      "extent_mangrove",
      "extentmangrove",
      "mangrove_area",
      "mangrovearea",
      "ext_man",
      "extman"
    ])
  }),

  Object.freeze({
    key: "serSlopeRelief",
    label: "Ser_SlopeRelief",
    description: "Slope Relief Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "sloperelie",
      "ser_sloperelief",
      "sersloperelief",
      "ser_slope_relief",
      "service_slope_relief",
      "slope_relief_area",
      "slopereliefarea",
      "ser_sl",
      "sersl"
    ])
  }),

  Object.freeze({
    key: "serInund",
    label: "Ser_Inund",
    description: "Inundation Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "inundati0",
      "ser_inund",
      "serinund",
      "service_inund",
      "serviceinund",
      "ser_inundation",
      "service_inundation",
      "ser_in",
      "serin"
    ])
  }),

  Object.freeze({
    key: "grossFrstArea75",
    label: "Gross_Frst_Area_75",
    description: "Gross Forest Area in 1975",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "gross_frst_area_75",
      "grossfrstarea75",
      "gross_forest_area_75",
      "grossforestarea75",
      "gross_area_75",
      "grossarea75",
      "area_75",
      "area75"
    ])
  }),

  Object.freeze({
    key: "adjFrstArea75",
    label: "Adj_Frst_Area_75",
    description: "Adjusted Forest Area in 1975",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "adj_frst_area_75",
      "adjfrstarea75",
      "adjusted_frst_area_75",
      "adjusted_forest_area_75",
      "adjustedforestarea75",
      "adj_area_75",
      "adjarea75",
      "area_750",
      "area750"
    ])
  }),

  Object.freeze({
    key: "grossFrstVol75",
    label: "Gross_Frst_Vol_75",
    description: "Gross Forest Volume in 1975",
    type: SUMMARY_FIELD_TYPE.VOLUME,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "gross_frst_vol_75",
      "grossfrstvol75",
      "gross_forest_vol_75",
      "gross_forest_volume_75",
      "grossforestvolume75",
      "gross_vol_75",
      "grossvol75",
      "vol_75",
      "vol75"
    ])
  }),

  Object.freeze({
    key: "loggedLUse",
    label: "Logged_LUse",
    description: "Logged or Converted Land-use Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "loggedLUse",
      "logged_luse",
      "loggedluse",
      "logged_land_use",
      "loggedlanduse",
      "logged_landuse",
      "loggedland_use",
      "converted_land_use",
      "convertedlanduse",
      "to96"
    ])
  }),

  Object.freeze({
    key: "revGrossFrstArea",
    label: "Rev_Gross_Frst_Area",
    description: "Revised Gross Forest Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "rev_gross_frst_area",
      "revgrossfrstarea",
      "revised_gross_frst_area",
      "revised_gross_forest_area",
      "revisedgrossforestarea",
      "revisedGrossForestArea",
      "area2",
      "current_",
      "current"
    ])
  }),

  Object.freeze({
    key: "revAdjFrstArea",
    label: "Rev_Adj_Frst_Area",
    description: "Revised Adjusted Forest Area",
    type: SUMMARY_FIELD_TYPE.AREA,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "rev_adj_frst_area",
      "revadjfrstarea",
      "revised_adj_frst_area",
      "revised_adjusted_forest_area",
      "revisedadjustedforestarea",
      "adjustedForestArea",
      "area3",
      "current0"
    ])
  }),

  Object.freeze({
    key: "revGrossFrstVol",
    label: "Rev_Gross_Frst_Vol",
    description: "Revised Gross Forest Volume",
    type: SUMMARY_FIELD_TYPE.VOLUME,
    aggregation: SUMMARY_AGGREGATION.SUM,
    source: "fmu",
    aliases: Object.freeze([
      "rev_gross_frst_vol",
      "revgrossfrstvol",
      "revised_gross_frst_vol",
      "revised_gross_forest_volume",
      "revisedgrossforestvolume",
      "forest_vol",
      "forestvol",
      "current1",
      "current2"
    ])
  })
]);

/* ============================================================
 * 3. Additional summary metadata
 * ============================================================
 */

/**
 * Numeric Summary fields.
 */
export const OLD_FIMS_NUMERIC_FIELDS =
  Object.freeze(
    OLD_FIMS_SUMMARY_FIELDS.filter(
      (field) =>
        field.aggregation ===
        SUMMARY_AGGREGATION.SUM
    )
  );

/**
 * Text Summary fields.
 */
export const OLD_FIMS_TEXT_FIELDS =
  Object.freeze(
    OLD_FIMS_SUMMARY_FIELDS.filter(
      (field) =>
        field.type ===
        SUMMARY_FIELD_TYPE.TEXT
    )
  );

/**
 * Area fields.
 */
export const OLD_FIMS_AREA_FIELDS =
  Object.freeze(
    OLD_FIMS_SUMMARY_FIELDS.filter(
      (field) =>
        field.type ===
        SUMMARY_FIELD_TYPE.AREA
    )
  );

/**
 * Volume fields.
 */
export const OLD_FIMS_VOLUME_FIELDS =
  Object.freeze(
    OLD_FIMS_SUMMARY_FIELDS.filter(
      (field) =>
        field.type ===
        SUMMARY_FIELD_TYPE.VOLUME
    )
  );

/* ============================================================
 * 4. Default Summary result
 * ============================================================
 */

/**
 * Creates an empty Summary result.
 *
 * @returns {object}
 */
export function createEmptySummaryResult() {
  const values = {};

  for (const field of OLD_FIMS_SUMMARY_FIELDS) {
    values[field.key] =
      field.type === SUMMARY_FIELD_TYPE.TEXT
        ? null
        : 0;
  }

  return {
    status: SUMMARY_STATUS.EMPTY,

    province: null,

    fmus: [],

    values,

    rows: [],

    metadata: {
      provinceId: null,
      provinceCode: null,
      provinceName: null,

      fmuCount: 0,
      sourceFmuCount: 0,
      geometryCount: 0,

      vegetationTypes: [],
      missingFields: [],
      invalidNumericValues: [],

      calculatedAt: null
    }
  };
}

/* ============================================================
 * 5. ProvinceSummaryManager class
 * ============================================================
 */

/**
 * Controls Province Summary aggregation and display.
 */
export class ProvinceSummaryManager {
  /**
   * @param {object} [options]
   * @param {string|HTMLElement} [options.container]
   * @param {object} [options.config]
   * @param {Function} [options.onStatus]
   * @param {Function} [options.onError]
   * @param {string} [options.emptyValue]
   * @param {string} [options.locale]
   */
  constructor(options = {}) {
    const {
      container =
        DEFAULT_SUMMARY_CONTAINER_ID,

      config = CONFIG,

      onStatus = () => {},
      onError = () => {},

      emptyValue =
        DEFAULT_EMPTY_VALUE,

      locale =
        DEFAULT_LOCALE
    } = options;

    this.config = config;

    this.containerReference =
      container;

    this.container = null;

    this.callbacks = {
      onStatus:
        typeof onStatus === "function"
          ? onStatus
          : () => {},

      onError:
        typeof onError === "function"
          ? onError
          : () => {}
    };

    this.emptyValue =
      String(emptyValue || "—");

    this.locale =
      String(locale || "en-US");

    this.fields =
      [...OLD_FIMS_SUMMARY_FIELDS];

    this.selectedProvince = null;

    this.fmus = [];

    this.summary =
      createEmptySummaryResult();

    this.status =
      SUMMARY_STATUS.IDLE;

    this.initialized = false;

    this.destroyed = false;

    this.initialize();
  }

  /* ==========================================================
   * 6. Initialization
   * ==========================================================
   */

  /**
   * Initializes the Summary container.
   */
  initialize() {
    if (this.destroyed) {
      return;
    }

    this.container =
      this.resolveContainer(
        this.containerReference
      );

    if (!this.container) {
      const error =
        new SummaryInitializationError(
          "Province Summary container was not found."
        );

      this.status =
        SUMMARY_STATUS.ERROR;

      this.handleError(
        error.message,
        error
      );

      return;
    }

    this.initialized = true;

    this.status =
      SUMMARY_STATUS.EMPTY;

    this.renderEmptyState(
      "Select a Province to display its FMU summary."
    );
  }

  /**
   * Resolves the Summary container element.
   *
   * @param {string|HTMLElement} reference
   * @returns {HTMLElement|null}
   */
  resolveContainer(reference) {
    if (
      typeof HTMLElement !== "undefined" &&
      reference instanceof HTMLElement
    ) {
      return reference;
    }

    if (
      typeof reference === "string" &&
      reference.trim() !== ""
    ) {
      return document.getElementById(
        reference.trim()
      );
    }

    return null;
  }

  /* ==========================================================
   * 7. Public update methods
   * ==========================================================
   */

  /**
   * Updates the Province Summary.
   *
   * @param {object|null} province
   * @param {object[]} fmus
   * @param {object} [options]
   * @param {boolean} [options.render=true]
   * @param {boolean} [options.notify=true]
   * @returns {object}
   */
  update(
    province,
    fmus = [],
    options = {}
  ) {
    const {
      render = true,
      notify = true
    } = options;

    if (this.destroyed) {
      return this.summary;
    }

    this.selectedProvince =
      province || null;

    this.fmus =
      Array.isArray(fmus)
        ? [...fmus]
        : [];

    try {
      this.summary =
        this.calculateProvinceSummary(
          this.selectedProvince,
          this.fmus
        );

      this.status =
        this.summary.status;

      if (render) {
        this.render();
      }

      if (notify) {
        if (!this.selectedProvince) {
          this.emitStatus(
            "Province Summary cleared."
          );
        } else {
          this.emitStatus(
            `Province Summary calculated: ` +
            `${this.getProvinceDisplayName(
              this.selectedProvince
            )} / ` +
            `${this.summary.metadata.fmuCount} FMU(s)`
          );
        }
      }

      return this.summary;
    } catch (error) {
      this.status =
        SUMMARY_STATUS.ERROR;

      this.summary =
        createEmptySummaryResult();

      this.summary.status =
        SUMMARY_STATUS.ERROR;

      if (render) {
        this.renderErrorState(
          "The Province Summary could not be calculated."
        );
      }

      this.handleError(
        "The Province Summary could not be calculated.",
        error
      );

      return this.summary;
    }
  }

  /**
   * Compatibility alias.
   *
   * @param {object|null} province
   * @param {object[]} fmus
   * @param {object} [options]
   * @returns {object}
   */
  setData(
    province,
    fmus = [],
    options = {}
  ) {
    return this.update(
      province,
      fmus,
      options
    );
  }

  /**
   * Updates only the Province.
   *
   * @param {object|null} province
   * @param {object} [options]
   * @returns {object}
   */
  setProvince(
    province,
    options = {}
  ) {
    return this.update(
      province,
      this.fmus,
      options
    );
  }

  /**
   * Updates only the FMU records.
   *
   * @param {object[]} fmus
   * @param {object} [options]
   * @returns {object}
   */
  setFmus(
    fmus,
    options = {}
  ) {
    return this.update(
      this.selectedProvince,
      fmus,
      options
    );
  }

  /**
   * Clears the current Summary.
   *
   * @param {object} [options]
   * @param {boolean} [options.render=true]
   * @param {boolean} [options.notify=true]
   */
  clear(options = {}) {
    const {
      render = true,
      notify = true
    } = options;

    this.selectedProvince = null;

    this.fmus = [];

    this.summary =
      createEmptySummaryResult();

    this.status =
      SUMMARY_STATUS.EMPTY;

    if (render) {
      this.renderEmptyState(
        "Select a Province to display its FMU summary."
      );
    }

    if (notify) {
      this.emitStatus(
        "Province Summary cleared."
      );
    }
  }

  /**
   * Recalculates Summary using the current Province and FMUs.
   *
   * @param {object} [options]
   * @returns {object}
   */
  refresh(options = {}) {
    return this.update(
      this.selectedProvince,
      this.fmus,
      options
    );
  }

  /* ==========================================================
   * 8. Province-level Summary calculation
   * ==========================================================
   */

  /**
   * Calculates the Province-level total of FMU attributes.
   *
   * @param {object|null} province
   * @param {object[]} fmus
   * @returns {object}
   */
  calculateProvinceSummary(
    province,
    fmus
  ) {
    const result =
      createEmptySummaryResult();

    result.province =
      province || null;

    result.fmus =
      Array.isArray(fmus)
        ? [...fmus]
        : [];

    result.metadata.sourceFmuCount =
      result.fmus.length;

    result.metadata.calculatedAt =
      new Date().toISOString();

    if (!province) {
      result.status =
        SUMMARY_STATUS.EMPTY;

      result.rows =
        this.buildSummaryRows(
          result.values
        );

      return result;
    }

    const provinceId =
      this.getProvinceIdentifier(
        province
      );

    const provinceCode =
      this.getProvinceCode(
        province
      );

    const provinceName =
      this.getProvinceDisplayName(
        province
      );

    result.metadata.provinceId =
      provinceId;

    result.metadata.provinceCode =
      provinceCode;

    result.metadata.provinceName =
      provinceName;

    /*
     * Although app.js normally supplies already-filtered FMUs,
     * Summary performs another relationship check where possible.
     *
     * This prevents accidental aggregation of FMUs belonging to
     * another Province.
     */
    const provinceFmus =
      this.filterFmusForProvince(
        result.fmus,
        province
      );

    result.fmus =
      provinceFmus;

    result.metadata.fmuCount =
      provinceFmus.length;

    result.metadata.geometryCount =
      provinceFmus.filter(
        (fmu) =>
          Boolean(
            fmu?.geometry
          )
      ).length;

    /*
     * Province descriptive values.
     */
    result.values.zone =
      provinceCode;

    result.values.zoneName =
      provinceName;

    /*
     * Vegetation type is not a numeric total.
     *
     * Rules:
     *   0 distinct values → null
     *   1 distinct value  → that value
     *   2+ values         → "Multiple"
     */
    const vegetationTypes =
      this.collectDistinctValues(
        provinceFmus,
        this.getFieldDefinition(
          "vegType"
        )
      );

    result.metadata.vegetationTypes =
      vegetationTypes;

    result.values.vegType =
      this.summarizeDistinctValues(
        vegetationTypes
      );

    /*
     * Aggregate all old-FIMS numeric fields.
     */
    for (
      const field
      of OLD_FIMS_NUMERIC_FIELDS
    ) {
      const aggregation =
        this.sumFmuField(
          provinceFmus,
          field
        );

      result.values[field.key] =
        aggregation.total;

      if (aggregation.missingCount > 0) {
        result.metadata.missingFields.push({
          field: field.key,
          label: field.label,
          missingCount:
            aggregation.missingCount
        });
      }

      if (
        aggregation.invalidValues.length > 0
      ) {
        result.metadata.invalidNumericValues.push({
          field: field.key,
          label: field.label,
          values:
            aggregation.invalidValues
        });
      }
    }

    result.rows =
      this.buildSummaryRows(
        result.values
      );

    result.status =
      provinceFmus.length > 0
        ? SUMMARY_STATUS.READY
        : SUMMARY_STATUS.EMPTY;

    return result;
  }

  /* ==========================================================
   * 9. FMU relationship filtering
   * ==========================================================
   */

  /**
   * Filters FMUs belonging to the selected Province.
   *
   * If none of the FMU records contain a usable Province
   * relationship, the original FMU array is returned because
   * app.js may already have filtered the records through WFS.
   *
   * @param {object[]} fmus
   * @param {object} province
   * @returns {object[]}
   */
  filterFmusForProvince(
    fmus,
    province
  ) {
    if (!Array.isArray(fmus)) {
      return [];
    }

    if (!province) {
      return [];
    }

    const provinceIdentifiers =
      this.getProvinceComparisonValues(
        province
      );

    if (
      provinceIdentifiers.length === 0
    ) {
      return [...fmus];
    }

    let relationshipFieldFound =
      false;

    const matched =
      fmus.filter((fmu) => {
        const fmuProvinceValues =
          this.getFmuProvinceComparisonValues(
            fmu
          );

        if (
          fmuProvinceValues.length === 0
        ) {
          return false;
        }

        relationshipFieldFound = true;

        return fmuProvinceValues.some(
          (fmuValue) =>
            provinceIdentifiers.some(
              (provinceValue) =>
                this.valuesEqual(
                  fmuValue,
                  provinceValue
                )
            )
        );
      });

    /*
     * WFS requests may already have returned only FMUs in the
     * selected Province, while the response lacks a Province key.
     */
    if (!relationshipFieldFound) {
      return [...fmus];
    }

    return matched;
  }

  /**
   * Returns comparison values for a Province.
   *
   * @param {object} province
   * @returns {Array<string|number>}
   */
  getProvinceComparisonValues(province) {
    return this.uniqueNonEmptyValues([
      province?.id,
      province?.code,
      province?.name,
      province?.provinceId,
      province?.provinceCode,
      province?.provinceName,

      province?.properties?.id,
      province?.properties?.code,
      province?.properties?.name,

      province?.properties?.province_id,
      province?.properties?.province_code,
      province?.properties?.province_name,

      province?.properties?.prov_id,
      province?.properties?.prov_code,
      province?.properties?.prov_name,

      province?.raw?.id,
      province?.raw?.code,
      province?.raw?.name,

      province?.raw?.province_id,
      province?.raw?.province_code,
      province?.raw?.province_name,

      province?.raw?.prov_id,
      province?.raw?.prov_code,
      province?.raw?.prov_name
    ]);
  }

  /**
   * Returns Province relationship values from an FMU record.
   *
   * @param {object} fmu
   * @returns {Array<string|number>}
   */
  getFmuProvinceComparisonValues(fmu) {
    return this.uniqueNonEmptyValues([
      fmu?.provinceId,
      fmu?.provinceCode,
      fmu?.provinceName,

      fmu?.province_id,
      fmu?.province_code,
      fmu?.province_name,

      fmu?.provId,
      fmu?.provCode,
      fmu?.provName,

      fmu?.prov_id,
      fmu?.prov_code,
      fmu?.prov_name,

      fmu?.properties?.provinceId,
      fmu?.properties?.provinceCode,
      fmu?.properties?.provinceName,

      fmu?.properties?.province_id,
      fmu?.properties?.province_code,
      fmu?.properties?.province_name,

      fmu?.properties?.prov_id,
      fmu?.properties?.prov_code,
      fmu?.properties?.prov_name,

      fmu?.raw?.provinceId,
      fmu?.raw?.provinceCode,
      fmu?.raw?.provinceName,

      fmu?.raw?.province_id,
      fmu?.raw?.province_code,
      fmu?.raw?.province_name,

      fmu?.raw?.prov_id,
      fmu?.raw?.prov_code,
      fmu?.raw?.prov_name
    ]);
  }

  /* ==========================================================
   * 10. Numeric FMU aggregation
   * ==========================================================
   */

  /**
   * Sums one numeric field across FMUs.
   *
   * @param {object[]} fmus
   * @param {object} field
   * @returns {{
   *   total: number,
   *   validCount: number,
   *   missingCount: number,
   *   invalidValues: Array
   * }}
   */
  sumFmuField(
    fmus,
    field
  ) {
    let total = 0;
    let validCount = 0;
    let missingCount = 0;

    const invalidValues = [];

    for (const fmu of fmus) {
      const rawValue =
        this.readFieldValue(
          fmu,
          field
        );

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ""
      ) {
        missingCount += 1;
        continue;
      }

      const numericValue =
        this.parseNumericValue(
          rawValue
        );

      if (numericValue === null) {
        invalidValues.push({
          fmuId:
            fmu?.id ?? null,

          fmuCode:
            fmu?.code ?? null,

          rawValue
        });

        continue;
      }

      total += numericValue;
      validCount += 1;
    }

    return {
      total,
      validCount,
      missingCount,
      invalidValues
    };
  }

  /**
   * Collects distinct text values from FMUs.
   *
   * @param {object[]} fmus
   * @param {object} field
   * @returns {string[]}
   */
  collectDistinctValues(
    fmus,
    field
  ) {
    const values =
      new Map();

    for (const fmu of fmus) {
      const rawValue =
        this.readFieldValue(
          fmu,
          field
        );

      if (
        rawValue === null ||
        rawValue === undefined
      ) {
        continue;
      }

      const text =
        String(rawValue).trim();

      if (!text) {
        continue;
      }

      const normalized =
        this.normalizeComparisonValue(
          text
        );

      if (!values.has(normalized)) {
        values.set(
          normalized,
          text
        );
      }
    }

    return [...values.values()]
      .sort((left, right) =>
        left.localeCompare(
          right,
          this.locale,
          {
            numeric: true,
            sensitivity: "base"
          }
        )
      );
  }

  /**
   * Converts distinct values into one Summary value.
   *
   * @param {string[]} values
   * @returns {string|null}
   */
  summarizeDistinctValues(values) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return null;
    }

    if (values.length === 1) {
      return values[0];
    }

    return "Multiple";
  }

  /* ==========================================================
   * 11. Summary row creation
   * ==========================================================
   */

  /**
   * Builds display rows in old-FIMS order.
   *
   * @param {object} values
   * @returns {object[]}
   */
  buildSummaryRows(values) {
    return this.fields.map(
      (field, index) => {
        const rawValue =
          values?.[field.key] ?? null;

        return {
          index,
          key: field.key,
          label: field.label,
          description:
            field.description,

          type: field.type,
          aggregation:
            field.aggregation,

          rawValue,

          formattedValue:
            this.formatSummaryValue(
              rawValue,
              field
            ),

          isEmpty:
            this.isEmptySummaryValue(
              rawValue,
              field
            )
        };
      }
    );
  }

  /* ==========================================================
   * Part 1 ends here.
   *
   * Do not close the ProvinceSummaryManager class yet.
   * Paste Part 2 immediately below this comment.
   * ==========================================================
   */
  /* ==========================================================
   * 12. Summary value formatting
   * ==========================================================
   */

  /**
   * Formats one Summary value according to its field type.
   *
   * @param {*} value
   * @param {object} field
   * @returns {string}
   */
  formatSummaryValue(
    value,
    field
  ) {
    if (!field) {
      return this.formatTextValue(value);
    }

    switch (field.type) {
      case SUMMARY_FIELD_TYPE.INTEGER:
        return this.formatIntegerValue(
          value
        );

      case SUMMARY_FIELD_TYPE.NUMBER:
        return this.formatNumberValue(
          value
        );

      case SUMMARY_FIELD_TYPE.AREA:
        return this.formatAreaValue(
          value
        );

      case SUMMARY_FIELD_TYPE.VOLUME:
        return this.formatVolumeValue(
          value
        );

      case SUMMARY_FIELD_TYPE.TEXT:
      default:
        return this.formatTextValue(
          value
        );
    }
  }

  /**
   * Formats a text value.
   *
   * @param {*} value
   * @returns {string}
   */
  formatTextValue(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return this.emptyValue;
    }

    return String(value).trim();
  }

  /**
   * Formats an integer value.
   *
   * @param {*} value
   * @returns {string}
   */
  formatIntegerValue(value) {
    const numeric =
      this.parseNumericValue(value);

    if (numeric === null) {
      return this.emptyValue;
    }

    return new Intl.NumberFormat(
      this.locale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    ).format(
      Math.round(numeric)
    );
  }

  /**
   * Formats a general numeric value.
   *
   * @param {*} value
   * @param {number} [maximumFractionDigits]
   * @returns {string}
   */
  formatNumberValue(
    value,
    maximumFractionDigits = 2
  ) {
    const numeric =
      this.parseNumericValue(value);

    if (numeric === null) {
      return this.emptyValue;
    }

    /*
     * Prefer data.js formatting where available so that all
     * application screens use the same numeric representation.
     */
    try {
      const formatted =
        formatNumber(
          numeric,
          maximumFractionDigits
        );

      if (
        formatted !== null &&
        formatted !== undefined &&
        String(formatted).trim() !== ""
      ) {
        return String(formatted);
      }
    } catch {
      /*
       * Fall back to Intl.NumberFormat below.
       */
    }

    return new Intl.NumberFormat(
      this.locale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits
      }
    ).format(numeric);
  }

  /**
   * Formats an area value.
   *
   * Old FIMS stores and displays area values as numeric totals.
   * The web version adds the configured unit where available.
   *
   * @param {*} value
   * @returns {string}
   */
  formatAreaValue(value) {
    const numeric =
      this.parseNumericValue(value);

    if (numeric === null) {
      return this.emptyValue;
    }

    const maximumFractionDigits =
      this.getConfiguredFractionDigits(
        "area",
        2
      );

    const formatted =
      this.formatNumberValue(
        numeric,
        maximumFractionDigits
      );

    const unit =
      this.getConfiguredUnit(
        "area",
        "ha"
      );

    return unit
      ? `${formatted} ${unit}`
      : formatted;
  }

  /**
   * Formats a timber-volume value.
   *
   * @param {*} value
   * @returns {string}
   */
  formatVolumeValue(value) {
    const numeric =
      this.parseNumericValue(value);

    if (numeric === null) {
      return this.emptyValue;
    }

    const maximumFractionDigits =
      this.getConfiguredFractionDigits(
        "volume",
        2
      );

    const formatted =
      this.formatNumberValue(
        numeric,
        maximumFractionDigits
      );

    const unit =
      this.getConfiguredUnit(
        "volume",
        "m³"
      );

    return unit
      ? `${formatted} ${unit}`
      : formatted;
  }

  /**
   * Determines whether a Summary value is empty.
   *
   * A numeric zero is a valid value and is not treated as empty.
   *
   * @param {*} value
   * @param {object} field
   * @returns {boolean}
   */
  isEmptySummaryValue(
    value,
    field
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return true;
    }

    if (
      field?.type ===
        SUMMARY_FIELD_TYPE.TEXT &&
      String(value).trim() === ""
    ) {
      return true;
    }

    return false;
  }

  /**
   * Returns the configured number of decimal places.
   *
   * @param {"area"|"volume"|"number"} type
   * @param {number} fallback
   * @returns {number}
   */
  getConfiguredFractionDigits(
    type,
    fallback
  ) {
    const numberFormat =
      this.config.data?.numberFormat ?? {};

    const typeConfiguration =
      numberFormat[type] ?? {};

    const configured =
      typeConfiguration
        .maximumFractionDigits ??
      numberFormat
        .maximumFractionDigits;

    const numeric =
      Number(configured);

    if (
      Number.isInteger(numeric) &&
      numeric >= 0 &&
      numeric <= 10
    ) {
      return numeric;
    }

    return fallback;
  }

  /**
   * Returns a configured display unit.
   *
   * @param {"area"|"volume"} type
   * @param {string} fallback
   * @returns {string}
   */
  getConfiguredUnit(
    type,
    fallback
  ) {
    const configured =
      this.config.data?.units?.[type] ??
      this.config.summary?.units?.[type] ??
      this.config.provinceScreen
        ?.summary?.units?.[type];

    if (
      configured === null ||
      configured === undefined
    ) {
      return fallback;
    }

    return String(configured).trim();
  }

  /* ==========================================================
   * 13. Field-definition lookup
   * ==========================================================
   */

  /**
   * Returns a Summary field definition by key.
   *
   * @param {string} key
   * @returns {object|null}
   */
  getFieldDefinition(key) {
    if (
      key === null ||
      key === undefined
    ) {
      return null;
    }

    const normalizedKey =
      this.normalizeFieldName(key);

    return (
      this.fields.find(
        (field) =>
          this.normalizeFieldName(
            field.key
          ) === normalizedKey
      ) ||
      this.fields.find(
        (field) =>
          this.normalizeFieldName(
            field.label
          ) === normalizedKey
      ) ||
      null
    );
  }

  /**
   * Returns all supported lookup names for one field.
   *
   * @param {object} field
   * @returns {string[]}
   */
  getFieldLookupNames(field) {
    if (!field) {
      return [];
    }

    return this.uniqueNonEmptyValues([
      field.key,
      field.label,
      ...(field.aliases ?? [])
    ]).map(
      (value) =>
        String(value)
    );
  }

  /**
   * Returns normalized aliases for a Summary field.
   *
   * @param {object} field
   * @returns {string[]}
   */
  getNormalizedFieldAliases(field) {
    return this.getFieldLookupNames(
      field
    )
      .map(
        (name) =>
          this.normalizeFieldName(name)
      )
      .filter(Boolean);
  }

  /* ==========================================================
   * 14. Reading FMU attribute values
   * ==========================================================
   */

  /**
   * Reads a Summary field value from an FMU record.
   *
   * Search order:
   *   1. Normalized record properties
   *   2. record.properties
   *   3. record.raw
   *   4. record.raw.properties
   *   5. record.feature.properties
   *
   * @param {object} record
   * @param {object|string} fieldOrKey
   * @returns {*}
   */
  readFieldValue(
    record,
    fieldOrKey
  ) {
    if (!record) {
      return null;
    }

    const field =
      typeof fieldOrKey === "string"
        ? this.getFieldDefinition(
            fieldOrKey
          )
        : fieldOrKey;

    if (!field) {
      return null;
    }

    const sourceObjects =
      this.getRecordSourceObjects(
        record
      );

    /*
     * First attempt direct property access. This supports the
     * normalized camelCase attributes generated by data.js.
     */
    for (const source of sourceObjects) {
      for (
        const fieldName
        of this.getFieldLookupNames(field)
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            source,
            fieldName
          )
        ) {
          const value =
            source[fieldName];

          if (
            value !== null &&
            value !== undefined
          ) {
            return value;
          }
        }
      }
    }

    /*
     * GeoServer and legacy SQL Server fields can differ in
     * capitalization and underscore usage. The normalized lookup
     * handles these variations.
     */
    const normalizedAliases =
      new Set(
        this.getNormalizedFieldAliases(
          field
        )
      );

    for (const source of sourceObjects) {
      for (
        const [sourceKey, sourceValue]
        of Object.entries(source)
      ) {
        const normalizedSourceKey =
          this.normalizeFieldName(
            sourceKey
          );

        if (
          normalizedAliases.has(
            normalizedSourceKey
          )
        ) {
          return sourceValue;
        }
      }
    }

    /*
     * Use data.js configured field resolution as a final
     * compatibility path.
     */
    try {
      const configuredValue =
        formatConfiguredValue(
          record,
          field.key,
          {
            returnRaw: true
          }
        );

      if (
        configuredValue !== null &&
        configuredValue !== undefined &&
        configuredValue !==
          this.emptyValue
      ) {
        return configuredValue;
      }
    } catch {
      /*
       * Not all data.js versions support the options object.
       * Failure here is intentionally non-fatal.
       */
    }

    return null;
  }

  /**
   * Returns every object that may contain record attributes.
   *
   * Duplicate objects are removed while preserving order.
   *
   * @param {object} record
   * @returns {object[]}
   */
  getRecordSourceObjects(record) {
    const candidates = [
      record,

      record?.properties,

      record?.attributes,

      record?.raw,

      record?.raw?.properties,

      record?.feature,

      record?.feature?.properties,

      record?.source,

      record?.source?.properties
    ];

    const result = [];

    const seen =
      new Set();

    for (const candidate of candidates) {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        continue;
      }

      if (seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);
      result.push(candidate);
    }

    return result;
  }

  /**
   * Reads the first non-empty value from an object using aliases.
   *
   * @param {object} record
   * @param {string[]} aliases
   * @returns {*}
   */
  readAliasedValue(
    record,
    aliases
  ) {
    if (
      !record ||
      !Array.isArray(aliases)
    ) {
      return null;
    }

    const normalizedAliases =
      new Set(
        aliases
          .map(
            (alias) =>
              this.normalizeFieldName(
                alias
              )
          )
          .filter(Boolean)
      );

    for (
      const source
      of this.getRecordSourceObjects(record)
    ) {
      for (
        const [key, value]
        of Object.entries(source)
      ) {
        if (
          !normalizedAliases.has(
            this.normalizeFieldName(key)
          )
        ) {
          continue;
        }

        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {
          continue;
        }

        return value;
      }
    }

    return null;
  }

  /* ==========================================================
   * 15. Province identification
   * ==========================================================
   */

  /**
   * Returns the Province identifier.
   *
   * @param {object} province
   * @returns {*}
   */
  getProvinceIdentifier(province) {
    if (!province) {
      return null;
    }

    return (
      province.id ??
      province.provinceId ??
      province.province_id ??
      province.properties?.id ??
      province.properties
        ?.province_id ??
      province.raw?.id ??
      province.raw?.province_id ??
      null
    );
  }

  /**
   * Returns the Province code.
   *
   * @param {object} province
   * @returns {string|null}
   */
  getProvinceCode(province) {
    if (!province) {
      return null;
    }

    const value =
      province.code ??
      province.provinceCode ??
      province.province_code ??
      province.provCode ??
      province.prov_code ??
      this.readAliasedValue(
        province,
        [
          "province_code",
          "provincecode",
          "prov_code",
          "provcode",
          "zone",
          "zone_code",
          "zonecode",
          "code"
        ]
      );

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return null;
    }

    return String(value).trim();
  }

  /**
   * Returns the Province display name.
   *
   * @param {object} province
   * @returns {string}
   */
  getProvinceDisplayName(province) {
    if (!province) {
      return this.emptyValue;
    }

    const value =
      province.name ??
      province.provinceName ??
      province.province_name ??
      province.provName ??
      province.prov_name ??
      this.readAliasedValue(
        province,
        [
          "province_name",
          "provincename",
          "prov_name",
          "provname",
          "zone_name",
          "zonename",
          "name"
        ]
      );

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return (
        this.getProvinceCode(
          province
        ) ||
        this.emptyValue
      );
    }

    return String(value).trim();
  }

  /* ==========================================================
   * 16. Numeric parsing
   * ==========================================================
   */

  /**
   * Converts a value to a finite number.
   *
   * Supports:
   *   - Native numbers
   *   - Comma-separated values
   *   - Values containing spaces
   *   - Values with area or volume units
   *   - Parentheses representing negative values
   *
   * @param {*} value
   * @returns {number|null}
   */
  parseNumericValue(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (typeof value === "bigint") {
      const numeric =
        Number(value);

      return Number.isFinite(numeric)
        ? numeric
        : null;
    }

    /*
     * Prefer the conversion utility from data.js.
     */
    try {
      const converted =
        toNullableNumber(value);

      if (
        converted !== null &&
        converted !== undefined &&
        Number.isFinite(
          Number(converted)
        )
      ) {
        return Number(converted);
      }
    } catch {
      /*
       * Continue using the local parser.
       */
    }

    let text =
      String(value).trim();

    if (!text) {
      return null;
    }

    let negative = false;

    if (
      text.startsWith("(") &&
      text.endsWith(")")
    ) {
      negative = true;
      text =
        text.slice(1, -1);
    }

    text =
      text
        .replace(/,/g, "")
        .replace(/\s+/g, "")
        .replace(
          /(?:m3|m³|ha|hectares?|km2|km²)$/i,
          ""
        )
        .replace(
          /[^0-9eE+\-.]/g,
          ""
        );

    if (
      !text ||
      text === "-" ||
      text === "." ||
      text === "-."
    ) {
      return null;
    }

    const numeric =
      Number(text);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    return negative
      ? -Math.abs(numeric)
      : numeric;
  }

  /* ==========================================================
   * 17. Main rendering entry point
   * ==========================================================
   */

  /**
   * Renders the current Summary result.
   *
   * @returns {HTMLElement|null}
   */
  render() {
    if (
      !this.container ||
      this.destroyed
    ) {
      return null;
    }

    if (
      this.status ===
      SUMMARY_STATUS.ERROR
    ) {
      return this.renderErrorState(
        "The Province Summary could not be displayed."
      );
    }

    if (!this.selectedProvince) {
      return this.renderEmptyState(
        "Select a Province to display its FMU summary."
      );
    }

    /*
     * Even when no FMUs are available, the old-FIMS field list
     * remains visible so that the user can see the expected data
     * structure.
     */
    return this.renderSummaryTable(
      this.summary
    );
  }

  /**
   * Renders the old-FIMS Province Summary table.
   *
   * @param {object} summary
   * @returns {HTMLElement|null}
   */
  renderSummaryTable(summary) {
    if (!this.container) {
      return null;
    }

    this.container.replaceChildren();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "summary-table-wrapper legacy-summary-wrapper";

    wrapper.dataset.summaryStatus =
      summary?.status ||
      SUMMARY_STATUS.EMPTY;

    const heading =
      this.createSummaryHeading(summary);

    const rows =
      Array.isArray(summary?.rows)
        ? summary.rows
        : [];

    const rowMap =
      new Map(
        rows.map((row) => [
          row.key,
          row
        ])
      );

    /*
     * Old FIMS Province Summary layout.
     * The left and right arrays reproduce the field placement
     * shown in the legacy FIM-ADMIN Province screen.
     */
    const leftFields = [
      ["vegArea", "Area(ha)"],
      ["protectedArea", "Protected"],
      ["extSlope", "Ext Slope"],
      ["extAltitude", "Ext Altitude"],
      ["extKarst", "Ext Karst"],
      ["extInund", "Ext Inundation"],
      ["extMangrove", "Ext Mangrove"],
      ["serSlopeRelief", "Ser Slope"],
      ["serInund", "Ser Inundation"]
    ];

    const rightFields = [
      ["grossFrstArea75", "Gross Forest Area '75"],
      ["adjFrstArea75", "Adjusted Forest Area '75"],
      ["grossFrstVol75", "Gross Forest Volume '75"],
      ["loggedLUse", "Logged Land Use"],
      ["revGrossFrstArea", "Revised Gross Forest Area"],
      ["revAdjFrstArea", "Rev Adj Forest Area"],
      ["revGrossFrstVol", "Rev Gross Forest Vol"]
    ];

    const grid =
      document.createElement("div");

    grid.className =
      "legacy-summary-grid";

    grid.append(
      this.createLegacySummaryColumn(
        leftFields,
        rowMap
      ),
      this.createLegacySummaryColumn(
        rightFields,
        rowMap
      )
    );

    const note =
      document.createElement("p");

    note.className =
      "legacy-summary-note";

    note.textContent =
      "Please refer to reports for detailed data.";

    wrapper.append(
      heading,
      grid,
      note
    );

    if (
      summary?.metadata?.fmuCount === 0
    ) {
      wrapper.appendChild(
        this.createNoFmuNotice()
      );
    }

    const metadata =
      this.createSummaryMetadata(summary);

    if (metadata) {
      wrapper.appendChild(metadata);
    }

    this.container.appendChild(wrapper);

    return wrapper;
  }

  /**
   * Creates one column of the legacy two-column Summary layout.
   *
   * @param {Array<Array<string>>} definitions
   * @param {Map<string, object>} rowMap
   * @returns {HTMLElement}
   */
  createLegacySummaryColumn(
    definitions,
    rowMap
  ) {
    const column =
      document.createElement("div");

    column.className =
      "legacy-summary-column";

    for (
      const [key, label]
      of definitions
    ) {
      const sourceRow =
        rowMap.get(key);

      column.appendChild(
        this.createLegacySummaryItem(
          key,
          label,
          sourceRow
        )
      );
    }

    return column;
  }

  /**
   * Creates one label/value row in the legacy Summary layout.
   *
   * @param {string} key
   * @param {string} label
   * @param {object|undefined} sourceRow
   * @returns {HTMLElement}
   */
  createLegacySummaryItem(
    key,
    label,
    sourceRow
  ) {
    const item =
      document.createElement("div");

    item.className =
      "legacy-summary-item";

    item.dataset.summaryKey = key;
    item.dataset.empty =
      String(
        sourceRow?.isEmpty ?? true
      );

    const labelElement =
      document.createElement("span");

    labelElement.className =
      "legacy-summary-label";

    labelElement.textContent = label;
    labelElement.title = label;

    const valueElement =
      document.createElement("span");

    valueElement.className =
      "legacy-summary-value number-cell numeric";

    valueElement.dataset.rawValue =
      this.serializeDataValue(
        sourceRow?.rawValue ?? null
      );

    valueElement.textContent =
      sourceRow?.formattedValue ??
      this.emptyValue;

    item.append(
      labelElement,
      valueElement
    );

    return item;
  }

  /**
   * Creates the Summary heading.
   *
   * @param {object} summary
   * @returns {HTMLElement}
   */
  createSummaryHeading(summary) {
    const heading =
      document.createElement("div");

    heading.className =
      "summary-heading";

    const titleBlock =
      document.createElement("div");

    titleBlock.className =
      "summary-heading-text";

    const title =
      document.createElement("h4");

    title.className =
      "summary-title";

    title.textContent =
      this.getProvinceDisplayName(
        summary?.province
      );

    const subtitle =
      document.createElement("p");

    subtitle.className =
      "summary-subtitle";

    const fmuCount =
      summary?.metadata?.fmuCount ?? 0;

    subtitle.textContent =
      `Province total based on ` +
      `${this.formatIntegerValue(
        fmuCount
      )} FMU(s)`;

    titleBlock.append(
      title,
      subtitle
    );

    const badge =
      document.createElement("span");

    badge.className =
      "summary-count-badge";

    badge.textContent =
      `${this.formatIntegerValue(
        fmuCount
      )} FMU`;

    heading.append(
      titleBlock,
      badge
    );

    return heading;
  }

  /**
   * Creates the Summary table header.
   *
   * @returns {HTMLTableSectionElement}
   */
  createSummaryTableHead() {
    const thead =
      document.createElement("thead");

    const row =
      document.createElement("tr");

    const itemHeader =
      document.createElement("th");

    itemHeader.scope = "col";
    itemHeader.textContent =
      "FMU Item";

    const valueHeader =
      document.createElement("th");

    valueHeader.scope = "col";
    valueHeader.textContent =
      "Province Total";

    const descriptionHeader =
      document.createElement("th");

    descriptionHeader.scope = "col";
    descriptionHeader.textContent =
      "Description";

    row.append(
      itemHeader,
      valueHeader,
      descriptionHeader
    );

    thead.appendChild(row);

    return thead;
  }

  /**
   * Creates one old-FIMS Summary row.
   *
   * @param {object} row
   * @returns {HTMLTableRowElement}
   */
  createSummaryTableRow(row) {
    const tr =
      document.createElement("tr");

    tr.dataset.summaryKey =
      row.key;

    tr.dataset.summaryType =
      row.type;

    tr.dataset.aggregation =
      row.aggregation;

    tr.dataset.empty =
      String(Boolean(row.isEmpty));

    const labelCell =
      document.createElement("th");

    labelCell.scope = "row";
    labelCell.className =
      "summary-field-label";

    labelCell.textContent =
      row.label;

    const valueCell =
      document.createElement("td");

    valueCell.className =
      this.getSummaryValueCellClass(
        row
      );

    valueCell.dataset.rawValue =
      this.serializeDataValue(
        row.rawValue
      );

    valueCell.textContent =
      row.formattedValue;

    const descriptionCell =
      document.createElement("td");

    descriptionCell.className =
      "summary-field-description";

    descriptionCell.textContent =
      row.description ||
      this.emptyValue;

    tr.append(
      labelCell,
      valueCell,
      descriptionCell
    );

    return tr;
  }

  /**
   * Returns the appropriate value-cell classes.
   *
   * @param {object} row
   * @returns {string}
   */
  getSummaryValueCellClass(row) {
    const classes = [
      "summary-field-value"
    ];

    if (
      row.type ===
        SUMMARY_FIELD_TYPE.INTEGER ||
      row.type ===
        SUMMARY_FIELD_TYPE.NUMBER ||
      row.type ===
        SUMMARY_FIELD_TYPE.AREA ||
      row.type ===
        SUMMARY_FIELD_TYPE.VOLUME
    ) {
      classes.push(
        "number-cell",
        "numeric"
      );
    }

    if (row.isEmpty) {
      classes.push(
        "is-empty"
      );
    }

    return classes.join(" ");
  }

  /**
   * Creates a notice when the Province has no FMU records.
   *
   * @returns {HTMLElement}
   */
  createNoFmuNotice() {
    const notice =
      document.createElement("div");

    notice.className =
      "summary-notice summary-notice-empty";

    notice.setAttribute(
      "role",
      "status"
    );

    notice.textContent =
      "No FMU records are available for the selected Province. " +
      "Numeric totals are currently shown as zero.";

    return notice;
  }

  /**
   * Creates Summary calculation metadata.
   *
   * @param {object} summary
   * @returns {HTMLElement|null}
   */
  createSummaryMetadata(summary) {
    const calculatedAt =
      summary?.metadata?.calculatedAt;

    if (!calculatedAt) {
      return null;
    }

    const container =
      document.createElement("div");

    container.className =
      "summary-metadata";

    const sourceText =
      document.createElement("span");

    sourceText.textContent =
      `Source records: ` +
      `${this.formatIntegerValue(
        summary.metadata
          .sourceFmuCount ?? 0
      )}`;

    const matchedText =
      document.createElement("span");

    matchedText.textContent =
      `Matched FMUs: ` +
      `${this.formatIntegerValue(
        summary.metadata
          .fmuCount ?? 0
      )}`;

    const timeText =
      document.createElement("span");

    timeText.textContent =
      `Calculated: ` +
      `${this.formatDateTime(
        calculatedAt
      )}`;

    container.append(
      sourceText,
      matchedText,
      timeText
    );

    return container;
  }

  /* ==========================================================
   * 18. Empty and error rendering
   * ==========================================================
   */

  /**
   * Renders an empty-state message.
   *
   * @param {string} message
   * @returns {HTMLElement|null}
   */
  renderEmptyState(message) {
    if (!this.container) {
      return null;
    }

    this.container.replaceChildren();

    const emptyState =
      document.createElement("div");

    emptyState.className =
      "empty-message summary-empty-message";

    emptyState.setAttribute(
      "role",
      "status"
    );

    emptyState.textContent =
      message ||
      "No Summary data is available.";

    this.container.appendChild(
      emptyState
    );

    return emptyState;
  }

  /**
   * Renders a Summary error state.
   *
   * @param {string} message
   * @returns {HTMLElement|null}
   */
  renderErrorState(message) {
    if (!this.container) {
      return null;
    }

    this.container.replaceChildren();

    const errorState =
      document.createElement("div");

    errorState.className =
      "empty-message summary-error-message";

    errorState.setAttribute(
      "role",
      "alert"
    );

    errorState.textContent =
      message ||
      "The Summary could not be displayed.";

    this.container.appendChild(
      errorState
    );

    return errorState;
  }

  /**
   * Sets the Summary container loading state.
   *
   * @param {boolean} loading
   * @param {string} [message]
   */
  setLoading(
    loading,
    message =
      "Calculating Province Summary…"
  ) {
    if (!this.container) {
      return;
    }

    this.container.setAttribute(
      "aria-busy",
      String(Boolean(loading))
    );

    this.container.classList.toggle(
      "is-loading",
      Boolean(loading)
    );

    if (loading) {
      this.container.replaceChildren();

      const loadingState =
        document.createElement("div");

      loadingState.className =
        "summary-loading";

      loadingState.setAttribute(
        "role",
        "status"
      );

      const spinner =
        document.createElement("span");

      spinner.className =
        "loading-spinner summary-spinner";

      spinner.setAttribute(
        "aria-hidden",
        "true"
      );

      const text =
        document.createElement("span");

      text.textContent = message;

      loadingState.append(
        spinner,
        text
      );

      this.container.appendChild(
        loadingState
      );
    }
  }

  /* ==========================================================
   * 19. Direct value updates
   * ==========================================================
   */

  /**
   * Updates one currently rendered Summary value.
   *
   * This can be used later when the Timber Volume update API is
   * implemented.
   *
   * @param {string} fieldKey
   * @param {*} value
   * @param {object} [options]
   * @param {boolean} [options.updateResult=true]
   * @returns {boolean}
   */
  updateRenderedValue(
    fieldKey,
    value,
    options = {}
  ) {
    const {
      updateResult = true
    } = options;

    const field =
      this.getFieldDefinition(
        fieldKey
      );

    if (!field) {
      return false;
    }

    if (updateResult) {
      this.summary.values[field.key] =
        value;

      this.summary.rows =
        this.buildSummaryRows(
          this.summary.values
        );
    }

    if (!this.container) {
      return false;
    }

    const rowElement =
      this.container.querySelector(
        `[data-summary-key="${this.escapeSelector(
          field.key
        )}"]`
      );

    if (!rowElement) {
      return false;
    }

    const valueElement =
      rowElement.querySelector(
        ".summary-field-value"
      );

    if (!valueElement) {
      return false;
    }

    const formatted =
      this.formatSummaryValue(
        value,
        field
      );

    const isEmpty =
      this.isEmptySummaryValue(
        value,
        field
      );

    valueElement.textContent =
      formatted;

    valueElement.dataset.rawValue =
      this.serializeDataValue(value);

    valueElement.classList.toggle(
      "is-empty",
      isEmpty
    );

    rowElement.dataset.empty =
      String(isEmpty);

    return true;
  }

  /**
   * Updates multiple rendered values.
   *
   * @param {object} values
   * @param {object} [options]
   * @returns {number}
   */
  updateRenderedValues(
    values,
    options = {}
  ) {
    if (
      !values ||
      typeof values !== "object"
    ) {
      return 0;
    }

    let updatedCount = 0;

    for (
      const [fieldKey, value]
      of Object.entries(values)
    ) {
      if (
        this.updateRenderedValue(
          fieldKey,
          value,
          options
        )
      ) {
        updatedCount += 1;
      }
    }

    return updatedCount;
  }

  /* ==========================================================
   * 20. Display utilities
   * ==========================================================
   */

  /**
   * Formats an ISO date/time for display.
   *
   * @param {*} value
   * @returns {string}
   */
  formatDateTime(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return this.emptyValue;
    }

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return this.formatTextValue(
        value
      );
    }

    try {
      return new Intl.DateTimeFormat(
        this.locale,
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      ).format(date);
    } catch {
      return date.toISOString();
    }
  }

  /**
   * Converts a raw value for use in an HTML data attribute.
   *
   * @param {*} value
   * @returns {string}
   */
  serializeDataValue(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (
      typeof value === "object"
    ) {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  /* ==========================================================
   * 21. Comparison and normalization
   * ==========================================================
   */

  /**
   * Normalizes a field name for alias comparison.
   *
   * Example:
   *   "Gross_Frst_Area_75"
   *   "grossFrstArea75"
   *   "GROSS FRST AREA 75"
   *
   * all become:
   *   "grossfrstarea75"
   *
   * @param {*} value
   * @returns {string}
   */
  normalizeFieldName(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * Normalizes a general comparison value.
   *
   * @param {*} value
   * @returns {string}
   */
  normalizeComparisonValue(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase("en")
      .replace(/\s+/g, " ");
  }

  /**
   * Compares two identifiers or text values.
   *
   * @param {*} left
   * @param {*} right
   * @returns {boolean}
   */
  valuesEqual(left, right) {
    if (
      left === null ||
      left === undefined ||
      right === null ||
      right === undefined
    ) {
      return false;
    }

    const leftNumber =
      this.parseNumericValue(left);

    const rightNumber =
      this.parseNumericValue(right);

    /*
     * Numeric comparison is used only when both raw values look
     * numeric. This avoids treating codes containing letters as
     * numbers.
     */
    if (
      this.isNumericLike(left) &&
      this.isNumericLike(right) &&
      leftNumber !== null &&
      rightNumber !== null
    ) {
      return leftNumber === rightNumber;
    }

    return (
      this.normalizeComparisonValue(
        left
      ) ===
      this.normalizeComparisonValue(
        right
      )
    );
  }

  /**
   * Determines whether a value can safely be treated as numeric.
   *
   * @param {*} value
   * @returns {boolean}
   */
  isNumericLike(value) {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (
      value === null ||
      value === undefined
    ) {
      return false;
    }

    const text =
      String(value)
        .trim()
        .replace(/,/g, "");

    return /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(
      text
    );
  }

  /**
   * Returns unique, non-empty values.
   *
   * @param {Array} values
   * @returns {Array}
   */
  uniqueNonEmptyValues(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    const result = [];

    const normalizedValues =
      new Set();

    for (const value of values) {
      if (
        value === null ||
        value === undefined
      ) {
        continue;
      }

      const text =
        String(value).trim();

      if (!text) {
        continue;
      }

      const normalized =
        this.normalizeComparisonValue(
          value
        );

      if (
        normalizedValues.has(
          normalized
        )
      ) {
        continue;
      }

      normalizedValues.add(
        normalized
      );

      result.push(value);
    }

    return result;
  }

  /**
   * Escapes a string for use in a querySelector expression.
   *
   * @param {*} value
   * @returns {string}
   */
  escapeSelector(value) {
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

  /* ==========================================================
   * Part 2 ends here.
   *
   * Do not close the ProvinceSummaryManager class yet.
   * Paste Part 3 immediately below this comment.
   * ==========================================================
   */
  /* ==========================================================
   * 22. Summary result access
   * ==========================================================
   */

  /**
   * Returns the current Summary result.
   *
   * The returned object is a defensive copy so that external
   * modules do not accidentally modify the manager state.
   *
   * @returns {object}
   */
  getSummary() {
    return this.cloneSummaryResult(
      this.summary
    );
  }

  /**
   * Compatibility alias.
   *
   * @returns {object}
   */
  getResult() {
    return this.getSummary();
  }

  /**
   * Returns the current Summary rows.
   *
   * @returns {object[]}
   */
  getRows() {
    return Array.isArray(
      this.summary?.rows
    )
      ? this.summary.rows.map(
          (row) => ({
            ...row
          })
        )
      : [];
  }

  /**
   * Returns one Summary value by field key.
   *
   * @param {string} fieldKey
   * @returns {*}
   */
  getValue(fieldKey) {
    const field =
      this.getFieldDefinition(
        fieldKey
      );

    if (!field) {
      return null;
    }

    return (
      this.summary?.values?.[
        field.key
      ] ?? null
    );
  }

  /**
   * Returns all current Summary values.
   *
   * @returns {object}
   */
  getValues() {
    return {
      ...(
        this.summary?.values ??
        {}
      )
    };
  }

  /**
   * Returns current Summary metadata.
   *
   * @returns {object}
   */
  getMetadata() {
    return {
      ...(
        this.summary?.metadata ??
        {}
      ),

      vegetationTypes: [
        ...(
          this.summary?.metadata
            ?.vegetationTypes ??
          []
        )
      ],

      missingFields: (
        this.summary?.metadata
          ?.missingFields ??
        []
      ).map(
        (item) => ({
          ...item
        })
      ),

      invalidNumericValues: (
        this.summary?.metadata
          ?.invalidNumericValues ??
        []
      ).map(
        (item) => ({
          ...item,

          values:
            Array.isArray(item.values)
              ? item.values.map(
                  (value) => ({
                    ...value
                  })
                )
              : []
        })
      )
    };
  }

  /**
   * Returns the currently selected Province.
   *
   * @returns {object|null}
   */
  getProvince() {
    return this.selectedProvince;
  }

  /**
   * Returns the current FMU records.
   *
   * @returns {object[]}
   */
  getFmus() {
    return [...this.fmus];
  }

  /**
   * Returns a serializable state snapshot.
   *
   * @returns {object}
   */
  getState() {
    return {
      version:
        SUMMARY_MODULE_VERSION,

      initialized:
        this.initialized,

      destroyed:
        this.destroyed,

      status:
        this.status,

      containerId:
        this.container?.id ?? null,

      province:
        this.selectedProvince,

      fmuCount:
        this.fmus.length,

      summary:
        this.getSummary()
    };
  }

  /* ==========================================================
   * 23. Report data generation
   * ==========================================================
   */

  /**
   * Builds Province Summary report data.
   *
   * The structure is intentionally independent from the DOM so
   * it can be used by app.js, report.js or pdf-report.js.
   *
   * @param {object} [options]
   * @param {boolean} [options.includeDescription=true]
   * @param {boolean} [options.includeMetadata=true]
   * @param {boolean} [options.includeRawValue=true]
   * @returns {object}
   */
  buildReportData(options = {}) {
    const {
      includeDescription = true,
      includeMetadata = true,
      includeRawValue = true
    } = options;

    const summary =
      this.summary ??
      createEmptySummaryResult();

    const provinceName =
      this.getProvinceDisplayName(
        summary.province
      );

    const provinceCode =
      this.getProvinceCode(
        summary.province
      );

    const rows =
      (
        Array.isArray(summary.rows)
          ? summary.rows
          : []
      ).map(
        (row) => {
          const reportRow = {
            key: row.key,
            item: row.label,
            value:
              row.formattedValue,

            type:
              row.type,

            aggregation:
              row.aggregation
          };

          if (includeDescription) {
            reportRow.description =
              row.description;
          }

          if (includeRawValue) {
            reportRow.rawValue =
              row.rawValue;
          }

          return reportRow;
        }
      );

    const result = {
      reportType:
        "province-fmu-summary",

      title:
        "Province / FMU Summary",

      subtitle:
        provinceName !== this.emptyValue
          ? provinceName
          : null,

      province: {
        id:
          this.getProvinceIdentifier(
            summary.province
          ),

        code:
          provinceCode,

        name:
          provinceName
      },

      columns: [
        {
          key: "item",
          label: "FMU Item"
        },
        {
          key: "value",
          label: "Province Total"
        }
      ],

      rows,

      generatedAt:
        new Date().toISOString()
    };

    if (includeDescription) {
      result.columns.push({
        key: "description",
        label: "Description"
      });
    }

    if (includeMetadata) {
      result.metadata =
        this.getMetadata();
    }

    return result;
  }

  /**
   * Compatibility alias.
   *
   * @param {object} [options]
   * @returns {object}
   */
  toReportData(options = {}) {
    return this.buildReportData(
      options
    );
  }

  /**
   * Builds a flat object suitable for report templates.
   *
   * @param {object} [options]
   * @param {boolean} [options.formatted=false]
   * @returns {object}
   */
  toFlatObject(options = {}) {
    const {
      formatted = false
    } = options;

    const result = {};

    for (
      const row
      of this.summary?.rows ?? []
    ) {
      result[row.key] =
        formatted
          ? row.formattedValue
          : row.rawValue;
    }

    return result;
  }

  /* ==========================================================
   * 24. CSV generation
   * ==========================================================
   */

  /**
   * Converts Province Summary to CSV.
   *
   * @param {object} [options]
   * @param {boolean} [options.includeDescription=true]
   * @param {boolean} [options.includeMetadata=true]
   * @param {boolean} [options.useFormattedValues=true]
   * @param {string} [options.lineEnding="\r\n"]
   * @param {boolean} [options.includeBom=false]
   * @returns {string}
   */
  toCsv(options = {}) {
    const {
      includeDescription = true,
      includeMetadata = true,
      useFormattedValues = true,
      lineEnding = "\r\n",
      includeBom = false
    } = options;

    const lines = [];

    const provinceName =
      this.getProvinceDisplayName(
        this.selectedProvince
      );

    const provinceCode =
      this.getProvinceCode(
        this.selectedProvince
      );

    if (includeMetadata) {
      lines.push(
        [
          "Report",
          "Province / FMU Summary"
        ]
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );

      lines.push(
        [
          "Province Code",
          provinceCode ??
            this.emptyValue
        ]
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );

      lines.push(
        [
          "Province Name",
          provinceName
        ]
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );

      lines.push(
        [
          "Number of FMUs",
          this.summary?.metadata
            ?.fmuCount ?? 0
        ]
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );

      lines.push(
        [
          "Calculated At",
          this.summary?.metadata
            ?.calculatedAt ??
            ""
        ]
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );

      lines.push("");
    }

    const header = [
      "FMU Item",
      "Province Total"
    ];

    if (includeDescription) {
      header.push(
        "Description"
      );
    }

    lines.push(
      header
        .map(
          (value) =>
            this.escapeCsvValue(value)
        )
        .join(",")
    );

    for (
      const row
      of this.summary?.rows ?? []
    ) {
      const csvRow = [
        row.label,

        useFormattedValues
          ? row.formattedValue
          : row.rawValue
      ];

      if (includeDescription) {
        csvRow.push(
          row.description
        );
      }

      lines.push(
        csvRow
          .map(
            (value) =>
              this.escapeCsvValue(value)
          )
          .join(",")
      );
    }

    const csv =
      lines.join(lineEnding);

    return includeBom
      ? `\uFEFF${csv}`
      : csv;
  }

  /**
   * Compatibility alias.
   *
   * @param {object} [options]
   * @returns {string}
   */
  toCSV(options = {}) {
    return this.toCsv(options);
  }

  /**
   * Escapes one CSV value.
   *
   * @param {*} value
   * @returns {string}
   */
  escapeCsvValue(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    let text =
      String(value);

    /*
     * Prevent spreadsheet formula execution when CSV is opened
     * in Excel or similar applications.
     */
    if (
      /^[=+\-@]/.test(text)
    ) {
      text = `'${text}`;
    }

    if (
      text.includes(",") ||
      text.includes('"') ||
      text.includes("\r") ||
      text.includes("\n")
    ) {
      return (
        '"' +
        text.replace(
          /"/g,
          '""'
        ) +
        '"'
      );
    }

    return text;
  }

  /**
   * Creates a CSV Blob.
   *
   * @param {object} [options]
   * @returns {Blob}
   */
  toCsvBlob(options = {}) {
    const csv =
      this.toCsv({
        ...options,
        includeBom:
          options.includeBom ?? true
      });

    return new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );
  }

  /**
   * Downloads the Summary CSV in the browser.
   *
   * @param {object} [options]
   * @param {string} [options.filename]
   * @returns {boolean}
   */
  downloadCsv(options = {}) {
    if (
      typeof document === "undefined" ||
      typeof URL === "undefined"
    ) {
      return false;
    }

    const filename =
      options.filename ||
      this.buildCsvFilename();

    const blob =
      this.toCsvBlob(options);

    const objectUrl =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href =
      objectUrl;

    anchor.download =
      filename;

    anchor.style.display =
      "none";

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(
        objectUrl
      );
    }, 0);

    this.emitStatus(
      `Province Summary exported: ${filename}`
    );

    return true;
  }

  /**
   * Builds the default Summary CSV filename.
   *
   * @returns {string}
   */
  buildCsvFilename() {
    const provinceCode =
      this.getProvinceCode(
        this.selectedProvince
      );

    const provinceName =
      this.getProvinceDisplayName(
        this.selectedProvince
      );

    const provincePart =
      provinceCode ||
      (
        provinceName !== this.emptyValue
          ? provinceName
          : "province"
      );

    const datePart =
      new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    return (
      `fims_province_summary_` +
      `${this.sanitizeFilenamePart(
        provincePart
      )}_` +
      `${datePart}.csv`
    );
  }

  /**
   * Sanitizes part of a file name.
   *
   * @param {*} value
   * @returns {string}
   */
  sanitizeFilenamePart(value) {
    const sanitized =
      String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(
          /[<>:"/\\|?*\u0000-\u001F]/g,
          "_"
        )
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return sanitized || "province";
  }

  /* ==========================================================
   * 25. JSON generation
   * ==========================================================
   */

  /**
   * Converts the Summary result to JSON.
   *
   * @param {object} [options]
   * @param {boolean} [options.pretty=true]
   * @param {boolean} [options.includeFmus=false]
   * @returns {string}
   */
  toJson(options = {}) {
    const {
      pretty = true,
      includeFmus = false
    } = options;

    const result =
      this.getSummary();

    if (!includeFmus) {
      delete result.fmus;
    }

    return JSON.stringify(
      result,
      null,
      pretty ? 2 : 0
    );
  }

  /**
   * Compatibility alias.
   *
   * @param {object} [options]
   * @returns {string}
   */
  toJSON(options = {}) {
    return this.toJson(options);
  }

  /**
   * Creates a JSON Blob.
   *
   * @param {object} [options]
   * @returns {Blob}
   */
  toJsonBlob(options = {}) {
    return new Blob(
      [
        this.toJson(options)
      ],
      {
        type:
          "application/json;charset=utf-8"
      }
    );
  }

  /* ==========================================================
   * 26. Validation
   * ==========================================================
   */

  /**
   * Validates the current Summary result.
   *
   * Validation warnings do not prevent rendering.
   *
   * @returns {{
   *   valid: boolean,
   *   errors: object[],
   *   warnings: object[]
   * }}
   */
  validate() {
    const errors = [];
    const warnings = [];

    if (!this.selectedProvince) {
      errors.push({
        code:
          "PROVINCE_NOT_SELECTED",

        message:
          "A Province has not been selected."
      });
    }

    if (
      !Array.isArray(
        this.summary?.rows
      ) ||
      this.summary.rows.length !==
        this.fields.length
    ) {
      errors.push({
        code:
          "SUMMARY_ROW_COUNT_INVALID",

        message:
          `Summary must contain ` +
          `${this.fields.length} rows.`
      });
    }

    const expectedKeys =
      new Set(
        this.fields.map(
          (field) =>
            field.key
        )
      );

    for (
      const row
      of this.summary?.rows ?? []
    ) {
      if (!expectedKeys.has(row.key)) {
        errors.push({
          code:
            "UNKNOWN_SUMMARY_FIELD",

          field:
            row.key,

          message:
            `Unknown Summary field: ` +
            `${row.key}`
        });
      }
    }

    for (
      const item
      of this.summary?.metadata
        ?.invalidNumericValues ?? []
    ) {
      warnings.push({
        code:
          "INVALID_NUMERIC_VALUE",

        field:
          item.field,

        label:
          item.label,

        count:
          item.values?.length ?? 0,

        message:
          `Invalid numeric values were found in ` +
          `${item.label}.`
      });
    }

    for (
      const item
      of this.summary?.metadata
        ?.missingFields ?? []
    ) {
      warnings.push({
        code:
          "MISSING_NUMERIC_VALUE",

        field:
          item.field,

        label:
          item.label,

        count:
          item.missingCount,

        message:
          `${item.missingCount} FMU record(s) have no ` +
          `${item.label} value.`
      });
    }

    if (
      this.selectedProvince &&
      this.summary?.metadata
        ?.fmuCount === 0
    ) {
      warnings.push({
        code:
          "NO_FMU_RECORDS",

        message:
          "No FMU records matched the selected Province."
      });
    }

    return {
      valid:
        errors.length === 0,

      errors,
      warnings
    };
  }

  /* ==========================================================
   * 27. Defensive cloning
   * ==========================================================
   */

  /**
   * Creates a defensive copy of a Summary result.
   *
   * @param {object} summary
   * @returns {object}
   */
  cloneSummaryResult(summary) {
    if (!summary) {
      return createEmptySummaryResult();
    }

    return {
      status:
        summary.status,

      province:
        summary.province,

      fmus:
        Array.isArray(summary.fmus)
          ? [...summary.fmus]
          : [],

      values: {
        ...(summary.values ?? {})
      },

      rows:
        Array.isArray(summary.rows)
          ? summary.rows.map(
              (row) => ({
                ...row
              })
            )
          : [],

      metadata: {
        ...(summary.metadata ?? {}),

        vegetationTypes: [
          ...(
            summary.metadata
              ?.vegetationTypes ??
            []
          )
        ],

        missingFields: (
          summary.metadata
            ?.missingFields ??
          []
        ).map(
          (item) => ({
            ...item
          })
        ),

        invalidNumericValues: (
          summary.metadata
            ?.invalidNumericValues ??
          []
        ).map(
          (item) => ({
            ...item,

            values:
              Array.isArray(
                item.values
              )
                ? item.values.map(
                    (value) => ({
                      ...value
                    })
                  )
                : []
          })
        )
      }
    };
  }

  /* ==========================================================
   * 28. Status and error handling
   * ==========================================================
   */

  /**
   * Emits a status message.
   *
   * @param {string} message
   */
  emitStatus(message) {
    try {
      this.callbacks.onStatus(
        String(message)
      );
    } catch (error) {
      if (
        this.config.debug?.enabled
      ) {
        console.warn(
          "[FIMS summary] Status callback failed.",
          error
        );
      }
    }
  }

  /**
   * Handles a Summary error.
   *
   * @param {string} message
   * @param {Error} error
   */
  handleError(
    message,
    error
  ) {
    const normalizedError =
      error instanceof Error
        ? error
        : new SummaryError(
            String(
              error ||
              message
            )
          );

    if (
      this.config.debug?.enabled
    ) {
      console.error(
        `[FIMS summary] ${message}`,
        normalizedError
      );
    }

    try {
      this.callbacks.onError(
        normalizedError,
        {
          message,
          status:
            this.status,

          province:
            this.selectedProvince,

          fmuCount:
            this.fmus.length
        }
      );
    } catch (callbackError) {
      if (
        this.config.debug?.enabled
      ) {
        console.error(
          "[FIMS summary] Error callback failed.",
          callbackError
        );
      }
    }

    this.emitStatus(message);
  }

  /* ==========================================================
   * 29. Cleanup
   * ==========================================================
   */

  /**
   * Releases Summary module resources.
   *
   * @param {object} [options]
   * @param {boolean} [options.clearContainer=true]
   */
  destroy(options = {}) {
    const {
      clearContainer = true
    } = options;

    if (this.destroyed) {
      return;
    }

    if (
      clearContainer &&
      this.container
    ) {
      this.container.replaceChildren();
      this.container.removeAttribute(
        "aria-busy"
      );
      this.container.classList.remove(
        "is-loading"
      );
    }

    this.selectedProvince = null;
    this.fmus = [];

    this.summary =
      createEmptySummaryResult();

    this.status =
      SUMMARY_STATUS.IDLE;

    this.callbacks = {
      onStatus: () => {},
      onError: () => {}
    };

    this.container = null;
    this.containerReference = null;

    this.initialized = false;
    this.destroyed = true;
  }
}

/* ============================================================
 * 30. Factory functions
 * ============================================================
 */

/**
 * Creates a ProvinceSummaryManager instance.
 *
 * @param {object} [options]
 * @returns {ProvinceSummaryManager}
 */
export function createProvinceSummaryManager(
  options = {}
) {
  return new ProvinceSummaryManager(
    options
  );
}

/**
 * Compatibility factory alias.
 *
 * @param {object} [options]
 * @returns {ProvinceSummaryManager}
 */
export function createSummaryManager(
  options = {}
) {
  return createProvinceSummaryManager(
    options
  );
}

/* ============================================================
 * 31. Standalone calculation functions
 * ============================================================
 */

/**
 * Calculates a Province Summary without permanently rendering it.
 *
 * A detached DOM element is used so the class can retain the same
 * field-resolution and formatting logic.
 *
 * @param {object|null} province
 * @param {object[]} fmus
 * @param {object} [options]
 * @returns {object}
 */
export function calculateProvinceFmuSummary(
  province,
  fmus = [],
  options = {}
) {
  const detachedContainer =
    document.createElement("div");

  const manager =
    new ProvinceSummaryManager({
      ...options,
      container:
        detachedContainer
    });

  const result =
    manager.update(
      province,
      fmus,
      {
        render: false,
        notify: false
      }
    );

  const cloned =
    manager.getSummary();

  manager.destroy({
    clearContainer: true
  });

  return cloned || result;
}

/**
 * Compatibility alias.
 *
 * @param {object|null} province
 * @param {object[]} fmus
 * @param {object} [options]
 * @returns {object}
 */
export function calculateSummary(
  province,
  fmus = [],
  options = {}
) {
  return calculateProvinceFmuSummary(
    province,
    fmus,
    options
  );
}

/**
 * Builds old-FIMS ordered Summary rows from values.
 *
 * @param {object} values
 * @param {object} [options]
 * @returns {object[]}
 */
export function buildProvinceSummaryRows(
  values,
  options = {}
) {
  const detachedContainer =
    document.createElement("div");

  const manager =
    new ProvinceSummaryManager({
      ...options,
      container:
        detachedContainer
    });

  const rows =
    manager.buildSummaryRows(
      values ?? {}
    );

  manager.destroy();

  return rows;
}

/**
 * Returns the old-FIMS Summary field definition.
 *
 * @returns {object[]}
 */
export function getOldFimsSummaryFields() {
  return OLD_FIMS_SUMMARY_FIELDS.map(
    (field) => ({
      ...field,
      aliases: [
        ...(field.aliases ?? [])
      ]
    })
  );
}

/* ============================================================
 * 32. Standalone CSV functions
 * ============================================================
 */

/**
 * Converts an already-calculated Summary result to CSV.
 *
 * @param {object} summary
 * @param {object} [options]
 * @returns {string}
 */
export function provinceSummaryToCsv(
  summary,
  options = {}
) {
  const detachedContainer =
    document.createElement("div");

  const manager =
    new ProvinceSummaryManager({
      ...options,
      container:
        detachedContainer
    });

  manager.selectedProvince =
    summary?.province ?? null;

  manager.fmus =
    Array.isArray(summary?.fmus)
      ? [...summary.fmus]
      : [];

  manager.summary =
    manager.cloneSummaryResult(
      summary ??
      createEmptySummaryResult()
    );

  manager.status =
    manager.summary.status;

  const csv =
    manager.toCsv(options);

  manager.destroy();

  return csv;
}

/**
 * Compatibility alias.
 *
 * @param {object} summary
 * @param {object} [options]
 * @returns {string}
 */
export function summaryToCsv(
  summary,
  options = {}
) {
  return provinceSummaryToCsv(
    summary,
    options
  );
}

/* ============================================================
 * 33. Error classes
 * ============================================================
 */

/**
 * Base Summary module error.
 */
export class SummaryError extends Error {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      options
    );

    this.name =
      "SummaryError";

    this.code =
      options.code ??
      "SUMMARY_ERROR";

    this.details =
      options.details ??
      null;
  }
}

/**
 * Summary initialization error.
 */
export class SummaryInitializationError
  extends SummaryError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ??
          "SUMMARY_INITIALIZATION_ERROR"
      }
    );

    this.name =
      "SummaryInitializationError";
  }
}

/**
 * Summary calculation error.
 */
export class SummaryCalculationError
  extends SummaryError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ??
          "SUMMARY_CALCULATION_ERROR"
      }
    );

    this.name =
      "SummaryCalculationError";
  }
}

/**
 * Summary validation error.
 */
export class SummaryValidationError
  extends SummaryError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ??
          "SUMMARY_VALIDATION_ERROR"
      }
    );

    this.name =
      "SummaryValidationError";
  }
}

/* ============================================================
 * 34. Default export
 * ============================================================
 */

export default ProvinceSummaryManager;

/**
 * ============================================================
 * End of summary.js Ver.2.0
 * ============================================================
 */
