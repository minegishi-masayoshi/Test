/**
 * FIMS Cloud Ver.2.8.0 - Standalone Large Map MVP
 */
import { CONFIG } from "./config.js";
import * as DataModule from "./data.js";
import { FimsMap } from "./map.js";

const params = new URLSearchParams(window.location.search);
const requestedProvince = params.get("province");
const requestedProvinceName = params.get("provinceName");
const requestedFmu = params.get("fmu");

const dom = {
  province: document.getElementById("largeMapProvince"),
  fmu: document.getElementById("largeMapFmu"),
  layers: document.getElementById("largeMapLayerList"),
  message: document.getElementById("largeMapMessage"),
  status: document.getElementById("largeMapStatus"),
  coordinate: document.getElementById("largeMapCoordinate"),
  pngExtent: document.getElementById("pngExtentButton"),
  close: document.getElementById("closeLargeMapButton")
};

function setStatus(message) {
  dom.status.textContent = message;
  dom.message.textContent = message;
  dom.message.hidden = false;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    dom.message.hidden = true;
  }, 3000);
}

function getProvinceId(record) {
  return record?.provinceCode ?? record?.province ?? record?.code ?? record?.id ?? "";
}

function getProvinceName(record) {
  return record?.provinceName ?? record?.name ?? record?.label ?? `Province ${getProvinceId(record)}`;
}

function getFmuId(record) {
  return record?.fmuId ?? record?.fmu ?? record?.id ?? "";
}

function buildLayerControls(mapManager) {
  const preferred = ["forestBaseMap", "province", "fmu", "concession", "protectedArea", "loggingArea", "district"];
  dom.layers.replaceChildren();

  for (const key of preferred) {
    const definition = CONFIG.layers?.[key];
    if (!definition?.enabled) continue;

    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = ["province"].includes(key);
    input.addEventListener("change", () => {
      mapManager.setWmsLayerVisible(key, input.checked, { notify: false });
      setStatus(`${definition.label} ${input.checked ? "displayed" : "hidden"}.`);
    });
    label.append(input, document.createTextNode(definition.label));
    dom.layers.append(label);
  }
}

async function initialize() {
  const mapManager = new FimsMap({
    elementId: "largeMap",
    config: CONFIG,
    onCoordinate: (value) => { dom.coordinate.textContent = value; },
    onStatus: (value) => { dom.status.textContent = value; },
    onError: (message) => setStatus(message)
  });

  buildLayerControls(mapManager);
  dom.pngExtent.addEventListener("click", () => mapManager.zoomToPng({ notify: false }));
  dom.close.addEventListener("click", () => window.close());

  try {
    const provinceResult = await DataModule.loadProvinces();
    const provinces = provinceResult.records ?? [];
    mapManager.setProvinceData(provinces);

    let selectedProvince = null;
    if (requestedProvince) {
      selectedProvince = provinces.find((record) => String(getProvinceId(record)) === String(requestedProvince)) ?? null;
    }

    if (selectedProvince) {
      dom.province.textContent = `${getProvinceId(selectedProvince)} ${getProvinceName(selectedProvince)}`;
      mapManager.selectProvince(selectedProvince, { zoom: true, openPopup: false, notify: false });

      const fmuResult = await DataModule.loadFmusForProvince(selectedProvince);
      const fmus = fmuResult.records ?? [];
      mapManager.setFmuData(fmus, { fit: false });

      if (requestedFmu) {
        const selectedFmu = fmus.find((record) => String(getFmuId(record)) === String(requestedFmu));
        if (selectedFmu) {
          dom.fmu.textContent = String(getFmuId(selectedFmu));
          mapManager.selectFmu(selectedFmu, { zoom: true, openPopup: true, notify: false });
        }
      }

      setStatus(`Large Map ready for ${getProvinceName(selectedProvince)}.`);
    } else {
      dom.province.textContent = requestedProvinceName || "All Provinces";
      setStatus("Large Map ready. Select layers from Contents.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Large Map opened, but Province/FMUs vector data could not be loaded. WMS layers remain available.");
  }

  window.addEventListener("beforeunload", () => mapManager.destroy?.(), { once: true });
}

initialize();
