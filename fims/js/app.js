import { CONFIG } from "./config.js";
import { renderMenu } from "./menu.js";
import { FimsMap } from "./map.js";
import { PROVINCES, SUMMARY_BASE, REPORTS, createFmus } from "./data.js";

const $ = (selector) => document.querySelector(selector);
let fimsMap;
let selectedProvince = null;
let selectedFmu = null;
let activeMode = "province";

function setStatus(message){ $("#statusText").textContent = message; }
function setCoordinate(message){ $("#coordinateText").textContent = message; }

function renderLayerList(){
  const container = $("#layerList"); container.replaceChildren();
  CONFIG.layers.slice(0,5).forEach((layer) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type="checkbox"; checkbox.dataset.layer=layer.key;
    checkbox.addEventListener("change",()=>fimsMap.setLayerVisible(layer.key,checkbox.checked));
    label.append(checkbox,document.createTextNode(layer.label)); container.appendChild(label);
  });
}

function renderProvinces(filter=""){
  const query=filter.trim().toLowerCase();
  const items=PROVINCES.filter(p=>p.name.toLowerCase().includes(query));
  const list=$("#provinceList"); list.replaceChildren();
  items.forEach((province)=>{
    const button=document.createElement("button"); button.type="button"; button.className="list-item";
    if(selectedProvince?.code===province.code) button.classList.add("active");
    button.setAttribute("role","option"); button.setAttribute("aria-selected",selectedProvince?.code===province.code?"true":"false");
    button.innerHTML=`<span class="list-code">${province.code}</span><span class="list-name">${province.name}</span>`;
    button.addEventListener("click",()=>selectProvince(province)); list.appendChild(button);
  });
  $("#provinceCount").textContent=items.length;
}

function selectProvince(province){
  selectedProvince=province; selectedFmu=null; renderProvinces($("#provinceSearch").value); renderFmus(); renderSummary();
  $("#selectedProvinceLabel").textContent=province.name; $("#mapSubtitle").textContent=`${province.name} Province`;
  fimsMap.setLayerVisible("province",true); const cb=document.querySelector('input[data-layer="province"]'); if(cb) cb.checked=true;
  fimsMap.zoomToPng(); setStatus(`${province.name} selected`);
}

function renderFmus(){
  const body=$("#fmuTableBody"); body.replaceChildren();
  if(!selectedProvince){ body.innerHTML='<tr class="empty-row"><td colspan="4">Select a province to display FMUs.</td></tr>'; $("#fmuCount").textContent="0"; return; }
  const rows=createFmus(selectedProvince); $("#fmuCount").textContent=rows.length;
  rows.forEach((fmu)=>{
    const tr=document.createElement("tr"); if(selectedFmu?.id===fmu.id) tr.classList.add("selected");
    tr.innerHTML=`<td>${fmu.id}</td><td>${fmu.zone}</td><td>${fmu.timber}</td><td>${fmu.vegArea.toLocaleString()}</td>`;
    tr.addEventListener("click",()=>{selectedFmu=fmu; renderFmus(); setStatus(`FMU ${fmu.id}, Zone ${fmu.zone} selected`);}); body.appendChild(tr);
  });
}

function renderSummary(){
  const scope=selectedProvince?selectedProvince.name:"National"; $("#summaryScope").textContent=`${scope} totals`;
  const factor=selectedProvince?(0.45+selectedProvince.code/45):1;
  const container=$("#summaryTable"); container.replaceChildren();
  SUMMARY_BASE.forEach(([label,value],index)=>{
    let display=value;
    if(selectedProvince && index<11){ const number=Number(value.replace(/[^0-9.]/g,"")); const unit=value.replace(/[0-9,.\s]/g,"").trim(); display=`${Math.round(number*factor).toLocaleString()} ${unit}`.trim(); }
    const row=document.createElement("div"); row.className="summary-row"; row.innerHTML=`<span class="summary-label">${label}</span><span class="summary-value">${display}</span>`; container.appendChild(row);
  });
}

function renderReports(){
  const container=$("#reportList"); container.replaceChildren();
  REPORTS.forEach(([title,description],index)=>{
    const label=document.createElement("label"); label.className="report-option";
    label.innerHTML=`<input type="radio" name="report" value="${index}" ${index===0?"checked":""}><span><strong>${title}</strong><small>${description}</small></span>`;
    container.appendChild(label);
  });
}

function handleMenu(item){
  const routes={assessment:"../fips/index.html",admin:"./views/administration.html",exit:"../index.html"};
  if(routes[item.id]){ window.location.href=routes[item.id]; return; }
  if(item.id==="largeMap"){ fimsMap.zoomToPng(); document.querySelector(".map-panel").scrollIntoView({behavior:"smooth"}); }
  else if(item.id==="province"){ activeMode="province"; setStatus("Province mode selected"); }
  else if(item.id==="concession"||item.id==="proposed"){ activeMode="concession"; fimsMap.setLayerVisible("concession",true); const cb=document.querySelector('input[data-layer="concession"]'); if(cb) cb.checked=true; setStatus(`${item.label} mode selected`); }
}

function initializeUi(){
  $("#versionText").textContent=`${CONFIG.version}`;
  renderMenu($("#mainMenu"),handleMenu); renderLayerList(); renderProvinces(); renderFmus(); renderSummary(); renderReports();
  $("#provinceSearch").addEventListener("input",e=>renderProvinces(e.target.value));
  $("#homeExtentButton").addEventListener("click",()=>fimsMap.zoomToPng());
  $("#clearLayersButton").addEventListener("click",()=>{fimsMap.clearOverlays();document.querySelectorAll('input[data-layer]').forEach(c=>c.checked=false);});
  document.querySelectorAll(".tab-button").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active"));button.classList.add("active");activeMode=button.dataset.mode;setStatus(`${button.textContent} mode selected`);}));
  $("#updateZoneButton").addEventListener("click",()=>setStatus(selectedFmu?`Zone ${selectedFmu.zone}: update function reserved for backend API`:"Select an FMU first"));
  $("#updateFmuButton").addEventListener("click",()=>setStatus(selectedFmu?`FMU ${selectedFmu.id}: update function reserved for backend API`:"Select an FMU first"));
  const reportAction=(action)=>{const checked=document.querySelector('input[name="report"]:checked');const title=checked?REPORTS[Number(checked.value)][0]:"report";setStatus(`${action}: ${title} (backend/report engine connection pending)`);};
  $("#previewReportButton").addEventListener("click",()=>reportAction("Preview"));
  $("#exportReportButton").addEventListener("click",()=>reportAction("Export"));
  $("#summaryStatus").textContent=CONFIG.geoserver.wmsUrl?"GeoServer configured":"Prototype data";
}

function start(){
  try{
    fimsMap=new FimsMap({elementId:"map",config:CONFIG,onCoordinate:setCoordinate,onStatus:setStatus}); initializeUi();
    fimsMap.setLayerVisible("district",true); const cb=document.querySelector('input[data-layer="district"]'); if(cb) cb.checked=true;
    selectProvince(PROVINCES.find(p=>p.name==="West Sepik")||PROVINCES[0]); setStatus("FIMS Cloud ready");
  }catch(error){console.error(error);setStatus("FIMS Cloud failed to start. Check the browser console.");}
}
document.addEventListener("DOMContentLoaded",start);
