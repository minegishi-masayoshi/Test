export const SUMMARY_ITEMS = Object.freeze([
  { key: "concession", icon: "▰", title: "Concessions", subtitle: "View concession areas", count: "—" },
  { key: "fmu", icon: "⬡", title: "FMUs", subtitle: "Forest management units", count: "—" },
  { key: "forestBaseMap", icon: "♣", title: "Forest Base Map", subtitle: "Forest resource layers", count: "—" },
  { key: "protectedArea", icon: "⬟", title: "Protected Areas", subtitle: "Environmental constraints", count: "—" },
  { key: "loggingArea", icon: "▥", title: "Logging Areas", subtitle: "Logging information", count: "—" },
  { key: "inventorySurveys", icon: "▤", title: "Inventory Surveys", subtitle: "Open FIPS surveys", count: "FIPS", link: "fipsSurveys" }
]);

export function renderSummary(container, urls, onSelect) {
  container.replaceChildren();
  SUMMARY_ITEMS.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "summary-card";
    button.innerHTML = `
      <span class="summary-icon" aria-hidden="true">${item.icon}</span>
      <span><strong>${item.title}</strong><small>${item.subtitle}</small></span>
      <b>${item.count}</b>`;
    button.addEventListener("click", () => {
      if (item.link) {
        window.location.href = urls[item.link];
      } else {
        onSelect(item.key);
      }
    });
    container.appendChild(button);
  });
}
