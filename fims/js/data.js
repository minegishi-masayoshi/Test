export const PROVINCES = Object.freeze([
  { code: 1, name: "Western", fmus: 12 }, { code: 2, name: "Gulf", fmus: 8 },
  { code: 3, name: "Central", fmus: 10 }, { code: 4, name: "Milne Bay", fmus: 9 },
  { code: 5, name: "Oro", fmus: 7 }, { code: 6, name: "Southern Highlands", fmus: 5 },
  { code: 7, name: "Hela", fmus: 4 }, { code: 8, name: "Enga", fmus: 4 },
  { code: 9, name: "Western Highlands", fmus: 5 }, { code: 10, name: "Jiwaka", fmus: 3 },
  { code: 11, name: "Simbu", fmus: 4 }, { code: 12, name: "Eastern Highlands", fmus: 6 },
  { code: 13, name: "Morobe", fmus: 14 }, { code: 14, name: "Madang", fmus: 11 },
  { code: 15, name: "East Sepik", fmus: 10 }, { code: 16, name: "West Sepik", fmus: 9 },
  { code: 17, name: "Manus", fmus: 3 }, { code: 18, name: "New Ireland", fmus: 6 },
  { code: 19, name: "East New Britain", fmus: 8 }, { code: 20, name: "West New Britain", fmus: 12 },
  { code: 21, name: "Bougainville", fmus: 7 }, { code: 22, name: "National Capital District", fmus: 1 }
]);

/*
 * Prototype concession master.
 * The fields correspond to the legacy CONCESSIONAREA structure:
 * PLAN_ID, NAME, CONSTYPE, STATUS, PROVINCE and AREA.
 * Replace this array with API/PostGIS results when the backend is connected.
 */
export const CONCESSIONS = Object.freeze([
  { planId: 16001, name: "Wape (No one)", provinceCode: 16, provinceName: "West Sepik", type: "TRP", status: "Concession", area: 19229, fmus: 8 },
  { planId: 16002, name: "Wape Gawi Block 1", provinceCode: 16, provinceName: "West Sepik", type: "TRP", status: "Concession", area: 24475, fmus: 7 },
  { planId: 16003, name: "Wape Gawi Block 2", provinceCode: 16, provinceName: "West Sepik", type: "TRP", status: "Concession", area: 31520, fmus: 9 },
  { planId: 16004, name: "Musa Opa", provinceCode: 16, provinceName: "West Sepik", type: "FMA", status: "Concession", area: 42080, fmus: 6 },
  { planId: 16005, name: "Belama", provinceCode: 16, provinceName: "West Sepik", type: "TRP", status: "Concession", area: 37610, fmus: 8 },
  { planId: 16006, name: "SIA Belama", provinceCode: 16, provinceName: "West Sepik", type: "LFA", status: "Concession", area: 28190, fmus: 5 },
  { planId: 16007, name: "East Aitape", provinceCode: 16, provinceName: "West Sepik", type: "TRP", status: "Concession", area: 49260, fmus: 10 },
  { planId: 16008, name: "Wigton Triple FMA", provinceCode: 16, provinceName: "West Sepik", type: "FMA", status: "Concession", area: 53340, fmus: 7 },
  { planId: 15001, name: "Sepik River", provinceCode: 15, provinceName: "East Sepik", type: "FMA", status: "Concession", area: 61800, fmus: 9 },
  { planId: 13001, name: "Middle Ramu", provinceCode: 13, provinceName: "Morobe", type: "FMA", status: "Concession", area: 73120, fmus: 11 },
  { planId: 14001, name: "Rai Coast", provinceCode: 14, provinceName: "Madang", type: "TRP", status: "Concession", area: 45200, fmus: 8 },
  { planId: 20001, name: "Open Bay", provinceCode: 20, provinceName: "West New Britain", type: "FMA", status: "Concession", area: 85000, fmus: 12 }
]);

export const SUMMARY_BASE = Object.freeze([
  ["Available Forest Area", "7,470,600 ha"], ["Protected Area", "605,772 ha"],
  ["Extreme Slope", "31,695 ha"], ["Extreme Altitude", "47,401 ha"],
  ["Extreme Karst", "209,684 ha"], ["Extreme Inundation", "683,241 ha"],
  ["Gross Forest Volume", "215,116,730 m³"], ["Adjusted Forest Area", "6,668,149 ha"],
  ["Production Forest", "5,739,146 ha"], ["Regrowth Forest Volume", "183,537,755 m³"],
  ["Annual Allowable Cut", "1,322,470 m³/yr"], ["Last Update", "29 Jul 2026"]
]);

export const PROVINCE_REPORTS = Object.freeze([
  ["FMU Report (Province)", "FMU ledger for the selected province"],
  ["National Change by Forest Type", "National forest change summary"],
  ["National Change by Forest Type & Province", "National summary by forest type and province"],
  ["National Change Summary", "National change totals"],
  ["National Concession Change by Province", "Concession statistics by province"],
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
  ["Concession Change Summary by FMU", "Forest change totals by concession FMU"],
  ["Concession Constraint Summary by FMU", "Constraint totals by concession FMU"],
  ["Concession Constraint Summary – Extreme", "Extreme constraint areas"],
  ["Concession Constraint Summary – Serious", "Serious constraint areas"],
  ["FMU Report (Concession)", "FMU ledger for the selected concession"],
  ["Province Concession Change Summary", "Concession change within the province"],
  ["Province Concession Constraint Summary", "Constraint summary within the province"],
  ["Province Concession Constraint – Extreme", "Extreme constraints within the province"],
  ["Province Concession Constraint – Serious", "Serious constraints within the province"],
  ["Appendix 2 – Forest Classification", "Forest classification for selected PLAN_ID"],
  ["Appendix 5a-1 – AAC Scenario 1", "AAC scenario 1 for selected PLAN_ID"],
  ["Appendix 5a-2 – AAC Scenario 2", "AAC scenario 2 for selected PLAN_ID"]
]);

export function createFmus(province) {
  return Array.from({ length: province.fmus }, (_, index) => ({
    id: index + 1,
    zone: 100 + ((province.code + index) % 8),
    timber: ((province.code * 13 + index * 7) % 95) + 5,
    vegArea: (((province.code * 17 + index * 11) % 80) + 12) * 1000
  }));
}

export function createConcessionFmus(concession) {
  const base = concession.planId;
  return Array.from({ length: concession.fmus }, (_, index) => ({
    id: base * 10 + index + 1,
    zone: 100 + ((concession.provinceCode + index) % 8),
    timber: ((base + index * 11) % 90) + 10,
    vegArea: Math.max(500, Math.round((concession.area / concession.fmus) * (0.72 + index * 0.045)))
  }));
}
