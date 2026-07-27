export const MENU_ITEMS = Object.freeze([
  { id: "map", label: "Map Explorer", icon: "▣", title: "Map Explorer", subtitle: "FIMS spatial information" },
  { id: "forest", label: "Forest Resources", icon: "♣", title: "Forest Resources", subtitle: "Concessions, FMUs and Forest Base Map" },
  { id: "logging", label: "Logging", icon: "▤", title: "Logging", subtitle: "Logging-area and operational information" },
  { id: "analysis", label: "Analysis", icon: "◎", title: "Analysis", subtitle: "Timber volume, spatial analysis and AAC" },
  { id: "reports", label: "Reports", icon: "▥", title: "Reports", subtitle: "Preview and export FIMS reports" },
  { id: "data", label: "Data", icon: "◆", title: "Data", subtitle: "Layer, file and FIPS data management" },
  { id: "administration", label: "Administration", icon: "⚙", title: "Administration", subtitle: "Users, roles and system settings" },
  { id: "help", label: "Help", icon: "?", title: "Help", subtitle: "FIMS user guidance and system information" }
]);

export function renderMenu(container, onSelect) {
  container.replaceChildren();
  MENU_ITEMS.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `menu-item${index === 0 ? " active" : ""}`;
    button.dataset.view = item.id;
    button.innerHTML = `<span aria-hidden="true">${item.icon}</span>${item.label}`;
    button.addEventListener("click", () => {
      container.querySelectorAll(".menu-item").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      onSelect(item);
    });
    container.appendChild(button);
  });
}
