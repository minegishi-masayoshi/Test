/**
 * ============================================================
 * FIMS Cloud Ver.2.0
 * Data Access and Normalization Module
 * ============================================================
 *
 * File:
 *   js/data.js
 *
 * Responsibilities:
 *   - Retrieve Province and FMU features from GeoServer WFS
 *   - Normalize inconsistent legacy/PostGIS field names
 *   - Provide local fallback data when GeoServer is unavailable
 *   - Relate FMUs to the selected Province
 *   - Search and sort Province/FMU records
 *   - Calculate Province/FMU summary values
 *   - Prepare report rows for preview/export/print
 *
 * This module does not manipulate the DOM or draw maps.
 * ============================================================
 */

import {
  CONFIG,
  buildWfsGetFeatureUrl,
  getFieldValue,
  getWfsTypeName,
  resolveFieldName
} from "./config.js";

/* ============================================================
 * 1. Constants
 * ============================================================
 */

const DATA_SOURCE = Object.freeze({
  GEOSERVER: "geoserver",
  FALLBACK: "fallback"
});

const ENTITY_TYPE = Object.freeze({
  PROVINCE: "province",
  FMU: "fmu"
});

const DEFAULT_EMPTY_VALUE = CONFIG.data?.emptyValue ?? "—";

/* ============================================================
 * 2. Local fallback data
 * ============================================================
 *
 * Province fallback data are retained so that the Province
 * screen can still be tested when GeoServer is unavailable.
 *
 * FMU fallback values are demonstration records only. They must
 * not be treated as authoritative forest inventory data.
 * ============================================================
 */

export const FALLBACK_PROVINCES = deepFreeze([
  { id: "1", code: 1, name: "Western", area: null },
  { id: "2", code: 2, name: "Gulf", area: null },
  { id: "3", code: 3, name: "Central", area: null },
  { id: "4", code: 4, name: "Milne Bay", area: null },
  { id: "5", code: 5, name: "Oro", area: null },
  { id: "6", code: 6, name: "Southern Highlands", area: null },
  { id: "7", code: 7, name: "Hela", area: null },
  { id: "8", code: 8, name: "Enga", area: null },
  { id: "9", code: 9, name: "Western Highlands", area: null },
  { id: "10", code: 10, name: "Jiwaka", area: null },
  { id: "11", code: 11, name: "Simbu", area: null },
  { id: "12", code: 12, name: "Eastern Highlands", area: null },
  { id: "13", code: 13, name: "Morobe", area: null },
  { id: "14", code: 14, name: "Madang", area: null },
  { id: "15", code: 15, name: "East Sepik", area: null },
  { id: "16", code: 16, name: "West Sepik", area: null },
  { id: "17", code: 17, name: "Manus", area: null },
  { id: "18", code: 18, name: "New Ireland", area: null },
  { id: "19", code: 19, name: "East New Britain", area: null },
  { id: "20", code: 20, name: "West New Britain", area: null },
  { id: "21", code: 21, name: "Bougainville", area: null },
  { id: "22", code: 22, name: "National Capital District", area: null }
].map((record) => createFallbackProvince(record)));

export const FALLBACK_FMUS = deepFreeze([
  createFallbackFmu({
    id: "WS-FMU-001",
    code: "WS-001",
    name: "West Sepik FMU 1",
    provinceId: "16",
    provinceCode: 16,
    provinceName: "West Sepik",
    zone: "Zone 1",
    vegetationType: "Lowland Forest",
    area: 31250,
    vegetationArea: 26740,
    protectedArea: 1850,
    timberVolume: 1864000,
    adjustedForestArea: 24890,
    adjustedForestVolume: 1712000
  }),
  createFallbackFmu({
    id: "WS-FMU-002",
    code: "WS-002",
    name: "West Sepik FMU 2",
    provinceId: "16",
    provinceCode: 16,
    provinceName: "West Sepik",
    zone: "Zone 1",
    vegetationType: "Lowland Forest",
    area: 28600,
    vegetationArea: 23150,
    protectedArea: 970,
    timberVolume: 1527000,
    adjustedForestArea: 21940,
    adjustedForestVolume: 1438000
  }),
  createFallbackFmu({
    id: "WS-FMU-003",
    code: "WS-003",
    name: "West Sepik FMU 3",
    provinceId: "16",
    provinceCode: 16,
    provinceName: "West Sepik",
    zone: "Zone 2",
    vegetationType: "Hill Forest",
    area: 34400,
    vegetationArea: 28110,
    protectedArea: 2460,
    timberVolume: 2015000,
    adjustedForestArea: 25760,
    adjustedForestVolume: 1849000
  }),
  createFallbackFmu({
    id: "MO-FMU-001",
    code: "MO-001",
    name: "Morobe FMU 1",
    provinceId: "13",
    provinceCode: 13,
    provinceName: "Morobe",
    zone: "Zone 1",
    vegetationType: "Lowland Forest",
    area: 40200,
    vegetationArea: 33800,
    protectedArea: 3100,
    timberVolume: 2375000,
    adjustedForestArea: 30650,
    adjustedForestVolume: 2160000
  }),
  createFallbackFmu({
    id: "MD-FMU-001",
    code: "MD-001",
    name: "Madang FMU 1",
    provinceId: "14",
    provinceCode: 14,
    provinceName: "Madang",
    zone: "Zone 1",
    vegetationType: "Lowland Forest",
    area: 35800,
    vegetationArea: 30250,
    protectedArea: 2110,
    timberVolume: 2108000,
    adjustedForestArea: 28420,
    adjustedForestVolume: 1957000
  }),
  createFallbackFmu({
    id: "ENB-FMU-001",
    code: "ENB-001",
    name: "East New Britain FMU 1",
    provinceId: "19",
    provinceCode: 19,
    provinceName: "East New Britain",
    zone: "Zone 1",
    vegetationType: "Island Forest",
    area: 22100,
    vegetationArea: 17650,
    protectedArea: 1450,
    timberVolume: 1098000,
    adjustedForestArea: 16220,
    adjustedForestVolume: 1016000
  })
]);

/* Backward-compatible aliases for older imports. */
export const PROVINCES = FALLBACK_PROVINCES;
export const FMUS = FALLBACK_FMUS;

/* ============================================================
 * 3. Runtime data store
 * ============================================================
 */

const store = {
  provinces: [],
  fmus: [],
  provinceSource: null,
  fmuSource: null,
  provinceFieldMap: null,
  fmuFieldMap: null,
  loadedAt: null,
  warnings: []
};

/**
 * Returns a safe snapshot of the current data state.
 *
 * @returns {object}
 */
export function getDataState() {
  return {
    provinces: [...store.provinces],
    fmus: [...store.fmus],
    provinceSource: store.provinceSource,
    fmuSource: store.fmuSource,
    provinceFieldMap: store.provinceFieldMap
      ? { ...store.provinceFieldMap }
      : null,
    fmuFieldMap: store.fmuFieldMap
      ? { ...store.fmuFieldMap }
      : null,
    loadedAt: store.loadedAt,
    warnings: [...store.warnings]
  };
}

/**
 * Clears all loaded runtime data.
 */
export function resetDataState() {
  store.provinces = [];
  store.fmus = [];
  store.provinceSource = null;
  store.fmuSource = null;
  store.provinceFieldMap = null;
  store.fmuFieldMap = null;
  store.loadedAt = null;
  store.warnings = [];
}

/* ============================================================
 * 4. Main loading functions
 * ============================================================
 */

/**
 * Loads Province and FMU datasets required by the Province
 * Selection screen.
 *
 * Province data are always loaded first. FMUs can either be
 * loaded immediately or deferred until a Province is selected.
 *
 * @param {object} [options]
 * @param {boolean} [options.loadFmus=true]
 * @param {boolean} [options.forceReload=false]
 * @param {AbortSignal|null} [options.signal=null]
 * @returns {Promise<object>}
 */
export async function loadProvinceScreenData(options = {}) {
  const {
    loadFmus = true,
    forceReload = false,
    signal = null
  } = options;

  const provinceResult = await loadProvinces({
    forceReload,
    signal
  });

  let fmuResult = {
    records: [...store.fmus],
    source: store.fmuSource,
    fieldMap: store.fmuFieldMap,
    warnings: []
  };

  if (loadFmus) {
    fmuResult = await loadFmus({
      forceReload,
      signal
    });
  }

  store.loadedAt = new Date().toISOString();

  return {
    provinces: provinceResult.records,
    fmus: fmuResult.records,
    provinceSource: provinceResult.source,
    fmuSource: fmuResult.source,
    provinceFieldMap: provinceResult.fieldMap,
    fmuFieldMap: fmuResult.fieldMap,
    warnings: [
      ...provinceResult.warnings,
      ...fmuResult.warnings
    ],
    loadedAt: store.loadedAt
  };
}

/**
 * Loads Province records from GeoServer, with local fallback.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceReload=false]
 * @param {AbortSignal|null} [options.signal=null]
 * @returns {Promise<object>}
 */
export async function loadProvinces(options = {}) {
  const {
    forceReload = false,
    signal = null
  } = options;

  if (!forceReload && store.provinces.length > 0) {
    return createLoadResult(
      store.provinces,
      store.provinceSource,
      store.provinceFieldMap,
      []
    );
  }

  const warnings = [];

  if (isGeoServerEnabled()) {
    try {
      const geoJson = await fetchWfsFeatureCollection({
        layerKey: CONFIG.province.layer.key,
        count: CONFIG.province.list.maximumRecords,
        signal
      });

      const fieldMap = resolveEntityFieldMap(
        geoJson.features,
        CONFIG.province.fields
      );

      const records = geoJson.features
        .map((feature, index) =>
          normalizeProvinceFeature(feature, index, fieldMap)
        )
        .filter(isUsableProvince);

      const uniqueRecords = deduplicateRecords(
        records,
        provinceIdentityKey
      );

      const sortedRecords = sortProvinces(uniqueRecords);

      if (sortedRecords.length === 0) {
        throw new DataValidationError(
          "GeoServer returned no usable Province records."
        );
      }

      store.provinces = sortedRecords;
      store.provinceSource = DATA_SOURCE.GEOSERVER;
      store.provinceFieldMap = fieldMap;

      debugLog("Province records loaded from GeoServer.", {
        count: sortedRecords.length,
        fieldMap
      });

      return createLoadResult(
        sortedRecords,
        DATA_SOURCE.GEOSERVER,
        fieldMap,
        warnings
      );
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      warnings.push(createWarning(
        "PROVINCE_WFS_FAILED",
        CONFIG.ui.messages.provinceLoadFailed,
        error
      ));

      debugError("Province WFS loading failed.", error);
    }
  }

  if (!CONFIG.data.fallback.enabled) {
    throw new DataSourceError(
      CONFIG.ui.messages.provinceLoadFailed
    );
  }

  const fallbackRecords = sortProvinces(
    FALLBACK_PROVINCES.map(cloneRecord)
  );

  store.provinces = fallbackRecords;
  store.provinceSource = DATA_SOURCE.FALLBACK;
  store.provinceFieldMap = null;
  store.warnings.push(...warnings);

  warnings.push(createWarning(
    "PROVINCE_FALLBACK_USED",
    CONFIG.ui.messages.fallbackDataUsed
  ));

  return createLoadResult(
    fallbackRecords,
    DATA_SOURCE.FALLBACK,
    null,
    warnings
  );
}

/**
 * Loads all FMU records from GeoServer, with local fallback.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceReload=false]
 * @param {AbortSignal|null} [options.signal=null]
 * @returns {Promise<object>}
 */
export async function loadFmus(options = {}) {
  const {
    forceReload = false,
    signal = null
  } = options;

  if (!forceReload && store.fmus.length > 0) {
    return createLoadResult(
      store.fmus,
      store.fmuSource,
      store.fmuFieldMap,
      []
    );
  }

  const warnings = [];

  if (isGeoServerEnabled()) {
    try {
      const geoJson = await fetchWfsFeatureCollection({
        layerKey: CONFIG.fmu.layer.key,
        count: CONFIG.fmu.list.maximumRecords,
        signal
      });

      const fieldMap = resolveEntityFieldMap(
        geoJson.features,
        CONFIG.fmu.fields
      );

      const records = geoJson.features
        .map((feature, index) =>
          normalizeFmuFeature(feature, index, fieldMap)
        )
        .filter(isUsableFmu);

      const uniqueRecords = deduplicateRecords(
        records,
        fmuIdentityKey
      );

      const sortedRecords = sortFmus(uniqueRecords);

      if (sortedRecords.length === 0) {
        throw new DataValidationError(
          "GeoServer returned no usable FMU records."
        );
      }

      store.fmus = sortedRecords;
      store.fmuSource = DATA_SOURCE.GEOSERVER;
      store.fmuFieldMap = fieldMap;

      debugLog("FMU records loaded from GeoServer.", {
        count: sortedRecords.length,
        fieldMap
      });

      return createLoadResult(
        sortedRecords,
        DATA_SOURCE.GEOSERVER,
        fieldMap,
        warnings
      );
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      warnings.push(createWarning(
        "FMU_WFS_FAILED",
        CONFIG.ui.messages.fmuLoadFailed,
        error
      ));

      debugError("FMU WFS loading failed.", error);
    }
  }

  if (!CONFIG.data.fallback.enabled) {
    throw new DataSourceError(
      CONFIG.ui.messages.fmuLoadFailed
    );
  }

  const fallbackRecords = sortFmus(
    FALLBACK_FMUS.map(cloneRecord)
  );

  store.fmus = fallbackRecords;
  store.fmuSource = DATA_SOURCE.FALLBACK;
  store.fmuFieldMap = null;
  store.warnings.push(...warnings);

  warnings.push(createWarning(
    "FMU_FALLBACK_USED",
    CONFIG.ui.messages.fallbackDataUsed
  ));

  return createLoadResult(
    fallbackRecords,
    DATA_SOURCE.FALLBACK,
    null,
    warnings
  );
}

/**
 * Loads FMUs for one Province.
 *
 * The default implementation loads/caches all FMUs and performs
 * robust client-side matching. This avoids depending on an
 * unverified PostGIS/GeoServer Province field name.
 *
 * @param {object} province
 * @param {object} [options]
 * @param {boolean} [options.forceReload=false]
 * @param {AbortSignal|null} [options.signal=null]
 * @returns {Promise<object>}
 */
export async function loadFmusForProvince(province, options = {}) {
  assertProvince(province);

  const loadResult = await loadFmus(options);
  const records = filterFmusByProvince(
    loadResult.records,
    province
  );

  return {
    ...loadResult,
    records,
    province
  };
}

/* ============================================================
 * 5. WFS access
 * ============================================================
 */

/**
 * Retrieves a WFS FeatureCollection.
 *
 * @param {object} options
 * @param {string} options.layerKey
 * @param {number|null} [options.count=null]
 * @param {string|null} [options.cqlFilter=null]
 * @param {string|null} [options.sortBy=null]
 * @param {AbortSignal|null} [options.signal=null]
 * @returns {Promise<object>}
 */
export async function fetchWfsFeatureCollection(options) {
  const {
    layerKey,
    count = null,
    cqlFilter = null,
    sortBy = null,
    signal = null
  } = options ?? {};

  if (!layerKey) {
    throw new TypeError("layerKey is required.");
  }

  const url = buildWfsGetFeatureUrl({
    layerKey,
    count,
    cqlFilter,
    sortBy,
    includeGeometry: true
  });

  debugLog("WFS request", {
    layerKey,
    typeName: getWfsTypeName(layerKey),
    url
  });

  const response = await fetchJsonWithRetry(url, {
    signal,
    timeoutMs: CONFIG.geoserver.request.timeoutMs,
    retryCount: CONFIG.geoserver.request.retryCount,
    retryDelayMs: CONFIG.geoserver.request.retryDelayMs,
    fetchOptions: {
      method: "GET",
      mode: "cors",
      cache: CONFIG.geoserver.request.cache,
      credentials: CONFIG.geoserver.request.credentials,
      headers: {
        Accept: "application/json"
      }
    }
  });

  validateFeatureCollection(response);
  return response;
}

/**
 * Fetches JSON with timeout and retry handling.
 *
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function fetchJsonWithRetry(url, options = {}) {
  const {
    signal = null,
    timeoutMs = 30000,
    retryCount = 0,
    retryDelayMs = 1000,
    fetchOptions = {}
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetchJson(url, {
        signal,
        timeoutMs,
        fetchOptions
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;

      if (attempt < retryCount) {
        await delay(retryDelayMs, signal);
      }
    }
  }

  throw lastError ?? new DataSourceError(
    "The JSON request failed."
  );
}

/**
 * Performs one JSON request with timeout handling.
 *
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function fetchJson(url, options = {}) {
  const {
    signal = null,
    timeoutMs = 30000,
    fetchOptions = {}
  } = options;

  const timeoutController = new AbortController();
  const combinedController = new AbortController();

  const abortFromExternalSignal = () => {
    combinedController.abort(signal?.reason);
  };

  const abortFromTimeout = () => {
    const timeoutError = new DOMException(
      `Request timed out after ${timeoutMs} ms.`,
      "TimeoutError"
    );
    timeoutController.abort(timeoutError);
    combinedController.abort(timeoutError);
  };

  if (signal) {
    if (signal.aborted) {
      combinedController.abort(signal.reason);
    } else {
      signal.addEventListener("abort", abortFromExternalSignal, {
        once: true
      });
    }
  }

  const timeoutId = window.setTimeout(
    abortFromTimeout,
    Math.max(1, timeoutMs)
  );

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedController.signal
    });

    if (!response.ok) {
      const bodySnippet = await safeReadText(response);
      throw new HttpError(
        `HTTP ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        bodySnippet
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      !contentType.toLowerCase().includes("application/json") &&
      !contentType.toLowerCase().includes("geo+json")
    ) {
      const bodySnippet = await safeReadText(response);
      throw new DataValidationError(
        `Expected JSON but received '${contentType || "unknown"}'. ` +
        `${bodySnippet.slice(0, 160)}`
      );
    }

    return await response.json();
  } catch (error) {
    if (
      combinedController.signal.aborted &&
      timeoutController.signal.aborted
    ) {
      throw new RequestTimeoutError(
        `Request timed out after ${timeoutMs} ms.`,
        error
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);

    if (signal) {
      signal.removeEventListener(
        "abort",
        abortFromExternalSignal
      );
    }
  }
}

/* ============================================================
 * 6. Feature normalization
 * ============================================================
 */

export function normalizeProvinceFeature(
  feature,
  index = 0,
  fieldMap = null
) {
  const properties = feature?.properties ?? {};
  const fields = CONFIG.province.fields;

  const rawId = readMappedValue(
    properties,
    fieldMap,
    "id",
    fields.id
  );
  const rawCode = readMappedValue(
    properties,
    fieldMap,
    "code",
    fields.code
  );
  const rawName = readMappedValue(
    properties,
    fieldMap,
    "name",
    fields.name
  );
  const rawArea = readMappedValue(
    properties,
    fieldMap,
    "area",
    fields.area
  );

  const code = normalizeIdentifierValue(rawCode);
  const name = normalizeText(rawName);
  const id = normalizeText(
    rawId ?? feature?.id ?? code ?? `province-${index + 1}`
  );

  return {
    entityType: ENTITY_TYPE.PROVINCE,
    id,
    code,
    name: name || `Province ${code ?? index + 1}`,
    area: toNullableNumber(rawArea),
    geometry: cloneGeometry(feature?.geometry),
    bbox: normalizeBbox(feature?.bbox),
    featureId: normalizeText(feature?.id) || id,
    properties: { ...properties },
    fieldMap: fieldMap ? { ...fieldMap } : null,
    source: DATA_SOURCE.GEOSERVER
  };
}

export function normalizeFmuFeature(
  feature,
  index = 0,
  fieldMap = null
) {
  const properties = feature?.properties ?? {};
  const fields = CONFIG.fmu.fields;

  const id = normalizeText(
    readMappedValue(properties, fieldMap, "id", fields.id) ??
    feature?.id ??
    `fmu-${index + 1}`
  );

  const code = normalizeIdentifierValue(
    readMappedValue(properties, fieldMap, "code", fields.code)
  );

  const name = normalizeText(
    readMappedValue(properties, fieldMap, "name", fields.name)
  );

  return {
    entityType: ENTITY_TYPE.FMU,
    id,
    code: code ?? id,
    name: name || String(code ?? id),
    provinceId: normalizeIdentifierValue(
      readMappedValue(
        properties,
        fieldMap,
        "provinceId",
        fields.provinceId
      )
    ),
    provinceCode: normalizeIdentifierValue(
      readMappedValue(
        properties,
        fieldMap,
        "provinceCode",
        fields.provinceCode
      )
    ),
    provinceName: normalizeText(
      readMappedValue(
        properties,
        fieldMap,
        "provinceName",
        fields.provinceName
      )
    ),
    zone: normalizeText(
      readMappedValue(properties, fieldMap, "zone", fields.zone)
    ),
    vegetationType: normalizeText(
      readMappedValue(
        properties,
        fieldMap,
        "vegetationType",
        fields.vegetationType
      )
    ),
    timberVolume: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "timberVolume",
        fields.timberVolume
      )
    ),
    area: toNullableNumber(
      readMappedValue(properties, fieldMap, "area", fields.area)
    ),
    vegetationArea: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "vegetationArea",
        fields.vegetationArea
      )
    ),
    protectedArea: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "protectedArea",
        fields.protectedArea
      )
    ),
    loggedNotLandUse: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "loggedNotLandUse",
        fields.loggedNotLandUse
      )
    ),
    loggedLandUse: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "loggedLandUse",
        fields.loggedLandUse
      )
    ),
    landUseNotLogged: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "landUseNotLogged",
        fields.landUseNotLogged
      )
    ),
    loggedLUse: [
      toNullableNumber(readMappedValue(properties, fieldMap, "loggedNotLandUse", fields.loggedNotLandUse)),
      toNullableNumber(readMappedValue(properties, fieldMap, "loggedLandUse", fields.loggedLandUse)),
      toNullableNumber(readMappedValue(properties, fieldMap, "landUseNotLogged", fields.landUseNotLogged))
    ].reduce((sum, value) => sum + (value ?? 0), 0),
    revisedGrossForestArea: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "revisedGrossForestArea",
        fields.revisedGrossForestArea
      )
    ),
    adjustedForestArea: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "adjustedForestArea",
        fields.adjustedForestArea
      )
    ),
    adjustedForestVolume: toNullableNumber(
      readMappedValue(
        properties,
        fieldMap,
        "adjustedForestVolume",
        fields.adjustedForestVolume
      )
    ),
    geometry: cloneGeometry(feature?.geometry),
    bbox: normalizeBbox(feature?.bbox),
    featureId: normalizeText(feature?.id) || id,
    properties: { ...properties },
    fieldMap: fieldMap ? { ...fieldMap } : null,
    source: DATA_SOURCE.GEOSERVER
  };
}

export function resolveEntityFieldMap(features, fieldCandidates) {
  const propertySamples = (Array.isArray(features) ? features : [])
    .map((feature) => feature?.properties)
    .filter((properties) =>
      properties && typeof properties === "object"
    );

  const mergedProperties = Object.assign({}, ...propertySamples);
  const result = {};

  for (const [logicalField, candidates] of Object.entries(
    fieldCandidates ?? {}
  )) {
    result[logicalField] = resolveFieldName(
      mergedProperties,
      candidates
    );
  }

  if (CONFIG.debug.logFieldResolution) {
    debugLog("Resolved field map", result);
  }

  return result;
}

/* ============================================================
 * 7. Province/FMU relation and lookup
 * ============================================================
 */

export function filterFmusByProvince(fmus, province) {
  assertProvince(province);

  const records = Array.isArray(fmus) ? fmus : [];
  const priority = CONFIG.fmu.relation.matchingPriority ?? [
    "provinceId",
    "provinceCode",
    "provinceName"
  ];

  return sortFmus(records.filter((fmu) => {
    for (const relationKey of priority) {
      const pair = getProvinceRelationPair(
        relationKey,
        province,
        fmu
      );

      if (!pair) {
        continue;
      }

      const [provinceValue, fmuValue] = pair;

      if (
        !isBlank(provinceValue) &&
        !isBlank(fmuValue) &&
        valuesEqual(provinceValue, fmuValue)
      ) {
        return true;
      }
    }

    return false;
  }));
}

export function findProvince(value, provinces = store.provinces) {
  if (isBlank(value)) {
    return null;
  }

  return (Array.isArray(provinces) ? provinces : []).find(
    (province) =>
      valuesEqual(province.id, value) ||
      valuesEqual(province.code, value) ||
      valuesEqual(province.name, value)
  ) ?? null;
}

export function findFmu(value, fmus = store.fmus) {
  if (isBlank(value)) {
    return null;
  }

  return (Array.isArray(fmus) ? fmus : []).find(
    (fmu) =>
      valuesEqual(fmu.id, value) ||
      valuesEqual(fmu.code, value) ||
      valuesEqual(fmu.name, value)
  ) ?? null;
}

/* ============================================================
 * 8. Search and sorting
 * ============================================================
 */

export function searchProvinces(provinces, query) {
  const records = Array.isArray(provinces) ? provinces : [];
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return sortProvinces(records);
  }

  return sortProvinces(records.filter((province) =>
    [province.code, province.name]
      .map(normalizeSearchText)
      .some((value) => value.includes(normalizedQuery))
  ));
}

export function searchFmus(fmus, query) {
  const records = Array.isArray(fmus) ? fmus : [];
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return sortFmus(records);
  }

  return sortFmus(records.filter((fmu) =>
    [
      fmu.code,
      fmu.name,
      fmu.zone,
      fmu.vegetationType,
      fmu.provinceName
    ]
      .map(normalizeSearchText)
      .some((value) => value.includes(normalizedQuery))
  ));
}

export function sortProvinces(provinces) {
  const primary = CONFIG.province.list.sortField ?? "code";
  const secondary =
    CONFIG.province.list.secondarySortField ?? "name";
  const direction =
    CONFIG.province.list.sortDirection === "desc" ? -1 : 1;

  return [...(Array.isArray(provinces) ? provinces : [])].sort(
    (left, right) => {
      const primaryResult = compareValues(
        left?.[primary],
        right?.[primary]
      );

      if (primaryResult !== 0) {
        return primaryResult * direction;
      }

      return compareValues(
        left?.[secondary],
        right?.[secondary]
      ) * direction;
    }
  );
}

export function sortFmus(fmus) {
  const primary = CONFIG.fmu.list.sortField ?? "code";
  const secondary =
    CONFIG.fmu.list.secondarySortField ?? "name";
  const direction =
    CONFIG.fmu.list.sortDirection === "desc" ? -1 : 1;

  return [...(Array.isArray(fmus) ? fmus : [])].sort(
    (left, right) => {
      const primaryResult = compareValues(
        left?.[primary],
        right?.[primary]
      );

      if (primaryResult !== 0) {
        return primaryResult * direction;
      }

      return compareValues(
        left?.[secondary],
        right?.[secondary]
      ) * direction;
    }
  );
}

/* ============================================================
 * 9. Summary calculation
 * ============================================================
 */

export function calculateProvinceSummary(province, fmus) {
  assertProvince(province);

  const records = Array.isArray(fmus) ? fmus : [];

  const summary = {
    provinceCode: province.code ?? null,
    provinceName: province.name ?? DEFAULT_EMPTY_VALUE,
    provinceArea: toNullableNumber(province.area),
    fmuCount: records.length,
    totalFmuArea: sumField(records, "area"),
    totalVegetationArea: sumField(records, "vegetationArea"),
    totalProtectedArea: sumField(records, "protectedArea"),
    totalTimberVolume: sumField(records, "timberVolume"),
    adjustedForestArea: sumField(records, "adjustedForestArea"),
    adjustedForestVolume: sumField(
      records,
      "adjustedForestVolume"
    )
  };

  if (CONFIG.debug.logSummaryCalculations) {
    debugLog("Province summary calculated", summary);
  }

  return summary;
}

export function buildSummaryRows(summary) {
  const rows = [];

  for (const section of CONFIG.summary.sections) {
    for (const field of section.fields) {
      rows.push({
        sectionKey: section.key,
        sectionLabel: section.label,
        key: field.key,
        label: field.label,
        rawValue: summary?.[field.key] ?? null,
        value: formatConfiguredValue(
          summary?.[field.key],
          field
        ),
        unit: field.unit ?? ""
      });
    }
  }

  return rows;
}

/* ============================================================
 * 10. Report data preparation
 * ============================================================
 */

export function buildReportData(reportKey, context) {
  const province = context?.province;
  const fmus = Array.isArray(context?.fmus)
    ? context.fmus
    : [];

  assertProvince(province);

  const definition = CONFIG.reports.definitions.find(
    (report) => report.key === reportKey
  );

  if (!definition || !definition.enabled) {
    throw new DataValidationError(
      `Unknown or disabled report: ${reportKey}`
    );
  }

  const summary = calculateProvinceSummary(province, fmus);
  const generatedAt = new Date().toISOString();

  switch (reportKey) {
    case "province-fmu-list":
      return {
        key: reportKey,
        title: definition.label,
        description: definition.description,
        province,
        generatedAt,
        columns: [
          { key: "code", label: "FMU" },
          { key: "name", label: "FMU Name" },
          { key: "zone", label: "Zone" },
          { key: "vegetationType", label: "Vegetation Type" },
          { key: "area", label: "Area (ha)" },
          {
            key: "timberVolume",
            label: "Timber Volume (m³)"
          }
        ],
        rows: fmus.map((fmu) => ({
          code: fmu.code ?? DEFAULT_EMPTY_VALUE,
          name: fmu.name ?? DEFAULT_EMPTY_VALUE,
          zone: fmu.zone ?? DEFAULT_EMPTY_VALUE,
          vegetationType:
            fmu.vegetationType ?? DEFAULT_EMPTY_VALUE,
          area: fmu.area,
          timberVolume: fmu.timberVolume
        })),
        summary
      };

    case "province-fmu-summary":
      return {
        key: reportKey,
        title: definition.label,
        description: definition.description,
        province,
        generatedAt,
        columns: [
          { key: "item", label: "Item" },
          { key: "value", label: "Value" }
        ],
        rows: buildSummaryRows(summary).map((row) => ({
          item: row.label,
          value: row.value
        })),
        summary
      };

    case "province-timber-volume":
      return {
        key: reportKey,
        title: definition.label,
        description: definition.description,
        province,
        generatedAt,
        columns: [
          { key: "code", label: "FMU" },
          { key: "name", label: "FMU Name" },
          { key: "zone", label: "Zone" },
          {
            key: "timberVolume",
            label: "Timber Volume (m³)"
          },
          {
            key: "adjustedForestVolume",
            label: "Revised Gross Forest Volume (m³)"
          }
        ],
        rows: fmus.map((fmu) => ({
          code: fmu.code ?? DEFAULT_EMPTY_VALUE,
          name: fmu.name ?? DEFAULT_EMPTY_VALUE,
          zone: fmu.zone ?? DEFAULT_EMPTY_VALUE,
          timberVolume: fmu.timberVolume,
          adjustedForestVolume: fmu.adjustedForestVolume
        })),
        summary
      };

    default:
      throw new DataValidationError(
        `Report builder is not implemented: ${reportKey}`
      );
  }
}

export function reportDataToCsv(reportData) {
  if (!reportData || !Array.isArray(reportData.columns)) {
    throw new TypeError("Valid reportData is required.");
  }

  const lines = [];
  lines.push(csvLine([reportData.title]));
  lines.push(csvLine([
    "Province",
    reportData.province?.name ?? DEFAULT_EMPTY_VALUE
  ]));
  lines.push(csvLine([
    "Generated At",
    reportData.generatedAt ?? new Date().toISOString()
  ]));
  lines.push("");

  lines.push(csvLine(
    reportData.columns.map((column) => column.label)
  ));

  for (const row of reportData.rows ?? []) {
    lines.push(csvLine(
      reportData.columns.map((column) =>
        formatCsvValue(row?.[column.key])
      )
    ));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

/* ============================================================
 * 11. GeoJSON helpers for map.js
 * ============================================================
 */

export function recordsToFeatureCollection(records) {
  return {
    type: "FeatureCollection",
    features: (Array.isArray(records) ? records : [])
      .filter((record) => record?.geometry)
      .map(recordToFeature)
  };
}

export function recordToFeature(record) {
  return {
    type: "Feature",
    id: record.featureId ?? record.id,
    bbox: record.bbox ?? undefined,
    geometry: cloneGeometry(record.geometry),
    properties: {
      ...(record.properties ?? {}),
      __entityType: record.entityType,
      __normalizedId: record.id,
      __normalizedCode: record.code,
      __normalizedName: record.name
    }
  };
}

/* ============================================================
 * 12. Formatting and numeric helpers
 * ============================================================
 */

export function formatConfiguredValue(value, definition = {}) {
  if (isBlank(value)) {
    return CONFIG.summary.emptyValue ?? DEFAULT_EMPTY_VALUE;
  }

  let formatted;

  switch (definition.format) {
    case "integer":
      formatted = formatNumber(value, 0);
      break;

    case "number":
      formatted = formatNumber(
        value,
        definition.decimalPlaces ?? 2
      );
      break;

    case "text":
    default:
      formatted = String(value);
      break;
  }

  return definition.unit
    ? `${formatted} ${definition.unit}`
    : formatted;
}

export function formatNumber(value, decimalPlaces = 2) {
  const numericValue = toNullableNumber(value);

  if (numericValue === null) {
    return DEFAULT_EMPTY_VALUE;
  }

  return new Intl.NumberFormat(
    CONFIG.data.numberFormat.locale,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces
    }
  ).format(numericValue);
}

export function sumField(records, fieldName) {
  let count = 0;
  let total = 0;

  for (const record of Array.isArray(records) ? records : []) {
    const value = toNullableNumber(record?.[fieldName]);

    if (value !== null) {
      total += value;
      count += 1;
    }
  }

  return count > 0 ? total : null;
}

export function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/\s+/g, "");

  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);
  return Number.isFinite(numericValue) ? numericValue : null;
}

/* ============================================================
 * 13. Internal helpers
 * ============================================================
 */

function createFallbackProvince(record) {
  return {
    entityType: ENTITY_TYPE.PROVINCE,
    id: String(record.id ?? record.code),
    code: record.code ?? null,
    name: record.name ?? DEFAULT_EMPTY_VALUE,
    area: record.area ?? null,
    geometry: null,
    bbox: null,
    featureId: String(record.id ?? record.code),
    properties: {
      code: record.code ?? null,
      name: record.name ?? null,
      area: record.area ?? null
    },
    fieldMap: null,
    source: DATA_SOURCE.FALLBACK
  };
}

function createFallbackFmu(record) {
  return {
    entityType: ENTITY_TYPE.FMU,
    id: String(record.id),
    code: record.code ?? record.id,
    name: record.name ?? record.code ?? record.id,
    provinceId: record.provinceId ?? null,
    provinceCode: record.provinceCode ?? null,
    provinceName: record.provinceName ?? null,
    zone: record.zone ?? null,
    vegetationType: record.vegetationType ?? null,
    timberVolume: record.timberVolume ?? null,
    area: record.area ?? null,
    vegetationArea: record.vegetationArea ?? null,
    protectedArea: record.protectedArea ?? null,
    adjustedForestArea: record.adjustedForestArea ?? null,
    adjustedForestVolume: record.adjustedForestVolume ?? null,
    geometry: null,
    bbox: null,
    featureId: String(record.id),
    properties: { ...record },
    fieldMap: null,
    source: DATA_SOURCE.FALLBACK
  };
}

function readMappedValue(
  properties,
  fieldMap,
  logicalField,
  candidates
) {
  const mappedField = fieldMap?.[logicalField];

  if (
    mappedField &&
    Object.prototype.hasOwnProperty.call(properties, mappedField)
  ) {
    return properties[mappedField];
  }

  return getFieldValue(properties, candidates, null);
}

function getProvinceRelationPair(relationKey, province, fmu) {
  switch (relationKey) {
    case "provinceId":
      return [province.id, fmu.provinceId];
    case "provinceCode":
      return [province.code, fmu.provinceCode];
    case "provinceName":
      return [province.name, fmu.provinceName];
    default:
      return null;
  }
}

function valuesEqual(left, right) {
  if (isBlank(left) || isBlank(right)) {
    return false;
  }

  const leftNumber = toNullableNumber(left);
  const rightNumber = toNullableNumber(right);

  if (
    CONFIG.data.matching.treatNumericStringsAsNumbers &&
    leftNumber !== null &&
    rightNumber !== null
  ) {
    return leftNumber === rightNumber;
  }

  return normalizeComparableText(left) ===
    normalizeComparableText(right);
}

function normalizeComparableText(value) {
  let text = String(value);

  if (CONFIG.data.matching.trimStrings) {
    text = text.trim();
  }

  if (CONFIG.data.matching.normalizeWhitespace) {
    text = text.replace(/\s+/g, " ");
  }

  if (!CONFIG.fmu.relation.caseSensitive) {
    text = text.toLocaleLowerCase("en");
  }

  return text;
}

function normalizeSearchText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim().replace(/\s+/g, " ");
  return text || null;
}

function normalizeIdentifierValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = toNullableNumber(value);

  if (
    numericValue !== null &&
    Number.isInteger(numericValue)
  ) {
    return numericValue;
  }

  return normalizeText(value);
}

function normalizeBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) {
    return null;
  }

  const values = bbox.map(toNullableNumber);
  return values.every((value) => value !== null)
    ? values
    : null;
}

function cloneGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  return typeof structuredClone === "function"
    ? structuredClone(geometry)
    : JSON.parse(JSON.stringify(geometry));
}

function cloneRecord(record) {
  return {
    ...record,
    properties: { ...(record.properties ?? {}) },
    geometry: cloneGeometry(record.geometry),
    bbox: Array.isArray(record.bbox)
      ? [...record.bbox]
      : null,
    fieldMap: record.fieldMap
      ? { ...record.fieldMap }
      : null
  };
}

function isUsableProvince(province) {
  return Boolean(
    province &&
    !isBlank(province.id) &&
    !isBlank(province.name)
  );
}

function isUsableFmu(fmu) {
  return Boolean(
    fmu &&
    !isBlank(fmu.id) &&
    (!isBlank(fmu.code) || !isBlank(fmu.name))
  );
}

function provinceIdentityKey(province) {
  return normalizeComparableText(
    province.code ?? province.id ?? province.name
  );
}

function fmuIdentityKey(fmu) {
  return normalizeComparableText(
    fmu.id ?? fmu.code ?? fmu.name
  );
}

function deduplicateRecords(records, keySelector) {
  const result = [];
  const seen = new Set();

  for (const record of records) {
    const key = keySelector(record);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(record);
  }

  return result;
}

function compareValues(left, right) {
  if (isBlank(left) && isBlank(right)) {
    return 0;
  }
  if (isBlank(left)) {
    return 1;
  }
  if (isBlank(right)) {
    return -1;
  }

  const leftNumber = toNullableNumber(left);
  const rightNumber = toNullableNumber(right);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base"
  });
}

function isBlank(value) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

function assertProvince(province) {
  if (!province || typeof province !== "object") {
    throw new TypeError("A valid Province record is required.");
  }
}

function validateFeatureCollection(value) {
  if (
    !value ||
    value.type !== "FeatureCollection" ||
    !Array.isArray(value.features)
  ) {
    throw new DataValidationError(
      "The WFS response is not a valid GeoJSON FeatureCollection."
    );
  }
}

function isGeoServerEnabled() {
  return Boolean(
    CONFIG.geoserver.enabled &&
    CONFIG.geoserver.services.wfs.enabled
  );
}

function createLoadResult(records, source, fieldMap, warnings) {
  return {
    records: [...records],
    source,
    fieldMap: fieldMap ? { ...fieldMap } : null,
    warnings: [...warnings]
  };
}

function createWarning(code, message, error = null) {
  return {
    code,
    message,
    detail: error?.message ?? null,
    errorName: error?.name ?? null,
    timestamp: new Date().toISOString()
  };
}

function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return String(value);
}

function csvLine(values) {
  return values.map(csvEscape).join(",");
}

function csvEscape(value) {
  const text = value === null || value === undefined
    ? ""
    : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function safeReadText(response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}

function delay(milliseconds, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException(
        "The operation was aborted.",
        "AbortError"
      ));
      return;
    }

    const timerId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, Math.max(0, milliseconds));

    const abortHandler = () => {
      window.clearTimeout(timerId);
      cleanup();
      reject(signal.reason ?? new DOMException(
        "The operation was aborted.",
        "AbortError"
      ));
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", abortHandler);
    };

    signal?.addEventListener("abort", abortHandler, {
      once: true
    });
  });
}

function isAbortError(error) {
  return (
    error?.name === "AbortError" ||
    error?.name === "TimeoutError"
  );
}

function debugLog(message, detail = null) {
  if (!CONFIG.debug.enabled || !CONFIG.debug.logNetworkRequests) {
    return;
  }

  if (detail === null) {
    console.info(`[FIMS data] ${message}`);
  } else {
    console.info(`[FIMS data] ${message}`, detail);
  }
}

function debugError(message, error) {
  if (!CONFIG.debug.enabled) {
    return;
  }

  console.error(`[FIMS data] ${message}`, error);
}

function deepFreeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

/* ============================================================
 * 14. Error classes
 * ============================================================
 */

export class DataSourceError extends Error {
  constructor(message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "DataSourceError";
  }
}

export class DataValidationError extends Error {
  constructor(message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "DataValidationError";
  }
}

export class RequestTimeoutError extends Error {
  constructor(message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "RequestTimeoutError";
  }
}

export class HttpError extends Error {
  constructor(message, status, statusText, bodySnippet = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
    this.bodySnippet = bodySnippet;
  }
}
