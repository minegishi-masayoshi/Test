export const PROVINCES = Object.freeze([
  { code: 1, name: "Western", fmus: 12 },
  { code: 2, name: "Gulf", fmus: 8 },
  { code: 3, name: "Central", fmus: 10 },
  { code: 4, name: "Milne Bay", fmus: 9 },
  { code: 5, name: "Oro", fmus: 7 },
  { code: 6, name: "Southern Highlands", fmus: 5 },
  { code: 7, name: "Hela", fmus: 4 },
  { code: 8, name: "Enga", fmus: 4 },
  { code: 9, name: "Western Highlands", fmus: 5 },
  { code: 10, name: "Jiwaka", fmus: 3 },
  { code: 11, name: "Simbu", fmus: 4 },
  { code: 12, name: "Eastern Highlands", fmus: 6 },
  { code: 13, name: "Morobe", fmus: 14 },
  { code: 14, name: "Madang", fmus: 11 },
  { code: 15, name: "East Sepik", fmus: 10 },
  { code: 16, name: "West Sepik", fmus: 9 },
  { code: 17, name: "Manus", fmus: 3 },
  { code: 18, name: "New Ireland", fmus: 6 },
  { code: 19, name: "East New Britain", fmus: 8 },
  { code: 20, name: "West New Britain", fmus: 12 },
  { code: 21, name: "Bougainville", fmus: 7 },
  { code: 22, name: "National Capital District", fmus: 1 }
]);

/*
 * Prototype concession master.
 *
 * This array is retained as fallback data.
 * The normal Ver.1.1 workflow retrieves concession records
 * from GeoServer WFS.
 */
export const CONCESSIONS = Object.freeze([
  {
    planId: 16001,
    name: "Wape (No one)",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "TRP",
    status: "Concession",
    area: 19229,
    fmus: 8
  },
  {
    planId: 16002,
    name: "Wape Gawi Block 1",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "TRP",
    status: "Concession",
    area: 24475,
    fmus: 7
  },
  {
    planId: 16003,
    name: "Wape Gawi Block 2",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "TRP",
    status: "Concession",
    area: 31520,
    fmus: 9
  },
  {
    planId: 16004,
    name: "Musa Opa",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "FMA",
    status: "Concession",
    area: 42080,
    fmus: 6
  },
  {
    planId: 16005,
    name: "Belama",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "TRP",
    status: "Concession",
    area: 37610,
    fmus: 8
  },
  {
    planId: 16006,
    name: "SIA Belama",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "LFA",
    status: "Concession",
    area: 28190,
    fmus: 5
  },
  {
    planId: 16007,
    name: "East Aitape",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "TRP",
    status: "Concession",
    area: 49260,
    fmus: 10
  },
  {
    planId: 16008,
    name: "Wigton Triple FMA",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "FMA",
    status: "Concession",
    area: 53340,
    fmus: 7
  },
  {
    planId: 15001,
    name: "Sepik River",
    provinceCode: 15,
    provinceName: "East Sepik",
    type: "FMA",
    status: "Concession",
    area: 61800,
    fmus: 9
  },
  {
    planId: 13001,
    name: "Middle Ramu",
    provinceCode: 13,
    provinceName: "Morobe",
    type: "FMA",
    status: "Concession",
    area: 73120,
    fmus: 11
  },
  {
    planId: 14001,
    name: "Rai Coast",
    provinceCode: 14,
    provinceName: "Madang",
    type: "TRP",
    status: "Concession",
    area: 45200,
    fmus: 8
  },
  {
    planId: 20001,
    name: "Open Bay",
    provinceCode: 20,
    provinceName: "West New Britain",
    type: "FMA",
    status: "Concession",
    area: 85000,
    fmus: 12
  }
]);

/*
 * Proposed Concession prototype data.
 *
 * The legacy or PostGIS source has not yet been confirmed.
 * This mode therefore remains dummy data in Ver.1.1.
 */
export const PROPOSED_CONCESSIONS = Object.freeze([
  {
    id: "PC-001",
    name: "Western Proposed Forest Area",
    provinceCode: 1,
    provinceName: "Western",
    type: "Proposed FMA",
    status: "Proposed",
    area: 42500
  },
  {
    id: "PC-002",
    name: "Gulf Proposed Forest Area",
    provinceCode: 2,
    provinceName: "Gulf",
    type: "Proposed FMA",
    status: "Proposed",
    area: 38750
  },
  {
    id: "PC-003",
    name: "Central Proposed Forest Area",
    provinceCode: 3,
    provinceName: "Central",
    type: "Proposed TRP",
    status: "Proposed",
    area: 21400
  },
  {
    id: "PC-004",
    name: "Milne Bay Proposed Forest Area",
    provinceCode: 4,
    provinceName: "Milne Bay",
    type: "Proposed FMA",
    status: "Proposed",
    area: 33200
  },
  {
    id: "PC-005",
    name: "Oro Proposed Forest Area",
    provinceCode: 5,
    provinceName: "Oro",
    type: "Proposed TRP",
    status: "Proposed",
    area: 19700
  },
  {
    id: "PC-006",
    name: "Morobe Proposed Forest Area",
    provinceCode: 13,
    provinceName: "Morobe",
    type: "Proposed FMA",
    status: "Proposed",
    area: 46500
  },
  {
    id: "PC-007",
    name: "Madang Proposed Forest Area",
    provinceCode: 14,
    provinceName: "Madang",
    type: "Proposed FMA",
    status: "Proposed",
    area: 40800
  },
  {
    id: "PC-008",
    name: "East Sepik Proposed Forest Area",
    provinceCode: 15,
    provinceName: "East Sepik",
    type: "Proposed TRP",
    status: "Proposed",
    area: 37250
  },
  {
    id: "PC-009",
    name: "West Sepik Proposed Forest Area",
    provinceCode: 16,
    provinceName: "West Sepik",
    type: "Proposed FMA",
    status: "Proposed",
    area: 51600
  },
  {
    id: "PC-010",
    name: "West New Britain Proposed Forest Area",
    provinceCode: 20,
    provinceName: "West New Britain",
    type: "Proposed FMA",
    status: "Proposed",
    area: 57400
  }
]);

export const SUMMARY_BASE = Object.freeze([
  ["Available Forest Area", "7,470,600 ha"],
  ["Protected Area", "605,772 ha"],
  ["Extreme Slope", "31,695 ha"],
  ["Extreme Altitude", "47,401 ha"],
  ["Extreme Karst", "209,684 ha"],
  ["Extreme Inundation", "683,241 ha"],
  ["Gross Forest Volume", "215,116,730 m³"],
  ["Adjusted Forest Area", "6,668,149 ha"],
  ["Production Forest", "5,739,146 ha"],
  ["Regrowth Forest Volume", "183,537,755 m³"],
  ["Annual Allowable Cut", "1,322,470 m³/yr"],
  ["Last Update", "29 Jul 2026"]
]);

export const PROVINCE_REPORTS = Object.freeze([
  ["FMU Report (Province)", "FMU ledger for the selected province"],
  ["National Change by Forest Type", "National forest change summary"],
  [
    "National Change by Forest Type & Province",
    "National summary by forest type and province"
  ],
  ["National Change Summary", "National change totals"],
  [
    "National Concession Change by Province",
    "Concession statistics by province"
  ],
  ["National Constraint Summary", "Constraint areas and totals"],
  ["Province Change by FMU", "Forest change by FMU"],
  ["Province Change by Forest Type", "Selected province forest change"],
  ["Province Constraint Summary", "Selected province constraints"],
  ["Province Timber Volumes", "Timber volume by FMU and zone"],
  ["Appendix 2 – Forest Classification", "Forest classification report"],
  ["Appendix 5a-1 – AAC Scenario 1", "AAC report, scenario 1"],
  ["Appendix 5a-2 – AAC Scenario 2", "AAC report, scenario 2"]
]);

export const CONCESSION_REPORTS = Object.freeze([
  [
    "Concession Change Summary by FMU",
    "Forest change totals by concession FMU"
  ],
  [
    "Concession Constraint Summary by FMU",
    "Constraint totals by concession FMU"
  ],
  [
    "Concession Constraint Summary – Extreme",
    "Extreme constraint areas"
  ],
  [
    "Concession Constraint Summary – Serious",
    "Serious constraint areas"
  ],
  [
    "FMU Report (Concession)",
    "FMU ledger for the selected concession"
  ],
  [
    "Province Concession Change Summary",
    "Concession change within the province"
  ],
  [
    "Province Concession Constraint Summary",
    "Constraint summary within the province"
  ],
  [
    "Province Concession Constraint – Extreme",
    "Extreme constraints within the province"
  ],
  [
    "Province Concession Constraint – Serious",
    "Serious constraints within the province"
  ],
  [
    "Appendix 2 – Forest Classification",
    "Forest classification for selected PLAN_ID"
  ],
  [
    "Appendix 5a-1 – AAC Scenario 1",
    "AAC scenario 1 for selected PLAN_ID"
  ],
  [
    "Appendix 5a-2 – AAC Scenario 2",
    "AAC scenario 2 for selected PLAN_ID"
  ]
]);

export const PROPOSED_CONCESSION_REPORTS = Object.freeze([
  [
    "Proposed Concession List",
    "List of proposed concessions in the selected province"
  ],
  [
    "Proposed Concession Area Summary",
    "Area summary for proposed concessions"
  ],
  [
    "Proposed Concession Status Summary",
    "Status summary for proposed concessions"
  ]
]);

/*
 * Returns a Province object by code.
 */
export function getProvinceByCode(code) {
  const numericCode = Number(code);

  return (
    PROVINCES.find((province) => province.code === numericCode) ?? null
  );
}

/*
 * Returns a Province object by name.
 *
 * Matching is case-insensitive and ignores leading/trailing spaces.
 */
export function getProvinceByName(name) {
  const normalizedName = normalizeText(name);

  return (
    PROVINCES.find(
      (province) => normalizeText(province.name) === normalizedName
    ) ?? null
  );
}

/*
 * Returns concessions belonging to the specified province.
 *
 * This function is primarily used as fallback when WFS data cannot
 * be loaded.
 */
export function getConcessionsByProvince(province) {
  if (!province) {
    return [];
  }

  return CONCESSIONS.filter(
    (concession) =>
      concession.provinceCode === Number(province.code) ||
      normalizeText(concession.provinceName) ===
        normalizeText(province.name)
  );
}

/*
 * Returns dummy proposed concessions belonging to the specified province.
 */
export function getProposedConcessionsByProvince(province) {
  if (!province) {
    return [];
  }

  return PROPOSED_CONCESSIONS.filter(
    (concession) =>
      concession.provinceCode === Number(province.code) ||
      normalizeText(concession.provinceName) ===
        normalizeText(province.name)
  );
}

/*
 * Converts a GeoJSON FeatureCollection into a plain property array.
 *
 * Geometry is intentionally excluded because the upper-middle table
 * displays attribute information only.
 */
export function extractFeatureProperties(featureCollection) {
  if (
    !featureCollection ||
    !Array.isArray(featureCollection.features)
  ) {
    return [];
  }

  return featureCollection.features.map((feature, index) => ({
    __featureId: feature.id ?? `feature-${index + 1}`,
    ...(feature.properties ?? {})
  }));
}

/*
 * Collects all attribute names from WFS records.
 *
 * This allows the FMU table to display all available attributes.
 */
export function collectAttributeNames(records) {
  const attributeNames = [];
  const knownAttributes = new Set();

  records.forEach((record) => {
    Object.keys(record).forEach((attributeName) => {
      if (
        attributeName === "__featureId" ||
        knownAttributes.has(attributeName)
      ) {
        return;
      }

      knownAttributes.add(attributeName);
      attributeNames.push(attributeName);
    });
  });

  return attributeNames;
}

/*
 * Sorts records by a specified attribute.
 *
 * If the field does not exist, the original order is retained.
 */
export function sortRecords(records, fieldName) {
  if (!Array.isArray(records)) {
    return [];
  }

  if (!fieldName) {
    return [...records];
  }

  return [...records].sort((recordA, recordB) => {
    const valueA = recordA?.[fieldName];
    const valueB = recordB?.[fieldName];

    if (valueA === undefined || valueA === null) {
      return 1;
    }

    if (valueB === undefined || valueB === null) {
      return -1;
    }

    return String(valueA).localeCompare(
      String(valueB),
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}

/*
 * Escapes a value for use in a CQL string literal.
 *
 * Example:
 *   East Sepik -> 'East Sepik'
 *   O'Brien    -> 'O''Brien'
 */
export function escapeCqlString(value) {
  return String(value ?? "").replaceAll("'", "''");
}

/*
 * Compatibility-only dummy FMU generator.
 *
 * The normal Province workflow in Ver.1.1 must use GeoServer WFS.
 * This function is retained so that the current application does not
 * immediately fail before app.js is replaced.
 */
export function createFmus(province) {
  if (!province) {
    return [];
  }

  return Array.from(
    { length: Number(province.fmus) || 0 },
    (_, index) => ({
      id: index + 1,
      fmu: index + 1,
      province: province.name,
      zone: 100 + ((province.code + index) % 8),
      volume: ((province.code * 13 + index * 7) % 95) + 5,
      veg_area:
        (((province.code * 17 + index * 11) % 80) + 12) *
        1000,
      data_source: "Prototype fallback"
    })
  );
}

/*
 * Compatibility-only dummy concession FMU generator.
 */
export function createConcessionFmus(concession) {
  if (!concession) {
    return [];
  }

  const base = Number(concession.planId) || 0;
  const fmuCount = Number(concession.fmus) || 0;

  return Array.from({ length: fmuCount }, (_, index) => ({
    id: base * 10 + index + 1,
    fmu: base * 10 + index + 1,
    plan_id: concession.planId,
    concession: concession.name,
    province: concession.provinceName,
    zone: 100 + ((concession.provinceCode + index) % 8),
    volume: ((base + index * 11) % 90) + 10,
    veg_area: Math.max(
      500,
      Math.round(
        (concession.area / Math.max(fmuCount, 1)) *
          (0.72 + index * 0.045)
      )
    ),
    data_source: "Prototype fallback"
  }));
}

/*
 * Internal text-normalization helper.
 */
function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
