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

export const SUMMARY_BASE = Object.freeze([
  ["Available Forest Area", "7,470,600 ha"], ["Protected Area", "605,772 ha"],
  ["Extreme Slope", "31,695 ha"], ["Extreme Altitude", "47,401 ha"],
  ["Extreme Karst", "209,684 ha"], ["Extreme Inundation", "683,241 ha"],
  ["Gross Forest Volume", "215,116,730 m³"], ["Adjusted Forest Area", "6,668,149 ha"],
  ["Production Forest", "5,739,146 ha"], ["Regrowth Forest Volume", "183,537,755 m³"],
  ["Annual Allowable Cut", "1,322,470 m³/yr"], ["Last Update", "29 Jul 2026"]
]);

export const REPORTS = Object.freeze([
  ["FMU Report", "FMU ledger for the selected unit"],
  ["National Change by Forest Type", "National forest change summary"],
  ["National Concession Change by Province", "Concession statistics by province"],
  ["National Constraint Summary", "Constraint areas and totals"],
  ["Province Change by Forest Type", "Selected province forest change"],
  ["Province Constraint Summary", "Selected province constraints"],
  ["Province Timber Volumes", "Timber volume by FMU and zone"],
  ["Appendix 2 – Forest Classification", "Forest classification report"],
  ["Appendix 5a-1 – AAC Scenario 1", "AAC report, scenario 1"],
  ["Appendix 5a-2 – AAC Scenario 2", "AAC report, scenario 2"]
]);

export function createFmus(province) {
  return Array.from({ length: province.fmus }, (_, index) => ({
    id: index + 1,
    zone: 100 + ((province.code + index) % 8),
    timber: ((province.code * 13 + index * 7) % 95) + 5,
    vegArea: (((province.code * 17 + index * 11) % 80) + 12) * 1000
  }));
}
