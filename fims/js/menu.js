export const MENU_ITEMS = Object.freeze([
  { id:"province", label:"Province", icon:"▤", title:"Province information" },
  { id:"concession", label:"Concession", icon:"▰", title:"Concession information" },
  { id:"proposed", label:"Proposed Concession", icon:"◇", title:"Proposed concession information" },
  { id:"assessment", label:"Assessment by FIPS", icon:"◎", title:"Open forest inventory assessment" },
  { id:"largeMap", label:"Large Map", icon:"▣", title:"Open full map" },
  { id:"admin", label:"Administration", icon:"⚙", title:"Administration" },
  { id:"exit", label:"Exit", icon:"×", title:"Return to FRIMS portal" }
]);

export function renderMenu(container, onSelect) {
  container.replaceChildren();
  MENU_ITEMS.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-button";
    button.innerHTML = `<span aria-hidden="true">${item.icon}</span>${item.label}`;
    button.title = item.title;
    button.addEventListener("click", () => onSelect(item));
    container.appendChild(button);
  });
}
