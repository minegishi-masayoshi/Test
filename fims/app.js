"use strict";

const SUPABASE_URL = "https://pncvddqeuxlkplwgvxgk.supabase.co";
const SUPABASE_KEY = "sb_publishable_bOTwr6mBCgp_jUS2FAF-DQ_WXlMvdrT";
const config = window.FIMS_CONFIG || {};
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  map: null,
  overlayLayers: new Map(),
  session: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function setStatus(message) {
  const target = $("#statusText");
  if (target) target.textContent = message;
}

async function requireSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) {
      window.location.replace(config.portalUrl || "../index.html");
      return false;
    }

    state.session = data.session;
    const email = data.session.user?.email || "Authorized user";
    $("#userLabel").textContent = email;
    $("#loadingScreen").hidden = true;
    $("#app").hidden = false;
    return true;
  } catch (_error) {
    window.location.replace(config.portalUrl || "../index.html");
    return false;
  }
}

function initializeMap() {
  const options = config.map || {};
  state.map = L.map("map", {
    center: options.center || [-6.5, 145],
    zoom: options.zoom || 6,
    minZoom: options.minZoom || 4,
    maxZoom: options.maxZoom || 18,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors"
  }).addTo(state.map);

  L.control.scale({ metric: true, imperial: false }).addTo(state.map);

  state.map.on("mousemove", (event) => {
    $("#coordinateText").textContent = `Lat: ${event.latlng.lat.toFixed(5)} / Lon: ${event.latlng.lng.toFixed(5)}`;
  });

  state.map.on("mouseout", () => {
    $("#coordinateText").textContent = "Lat: — / Lon: —";
  });
}

function fullLayerName(key) {
  const layerName = config.layers?.[key];
  if (!layerName) return null;
  return layerName.includes(":") ? layerName : `${config.workspace || "fims"}:${layerName}`;
}

function createWmsLayer(key) {
  if (!config.geoserverWmsUrl) return null;
  const layers = fullLayerName(key);
  if (!layers) return null;

  return L.tileLayer.wms(config.geoserverWmsUrl, {
    layers,
    format: "image/png",
    transparent: true,
    version: "1.1.1",
    tiled: true,
    attribution: "PNGFA FIMS"
  });
}

function setLayerVisible(key, visible) {
  if (!state.map) return;
  let layer = state.overlayLayers.get(key);

  if (!layer && visible) {
    layer = createWmsLayer(key);
    if (!layer) {
      setStatus(`Layer '${key}' is not connected. Set geoserverWmsUrl in config.js.`);
      return;
    }
    state.overlayLayers.set(key, layer);
  }

  if (visible && layer && !state.map.hasLayer(layer)) {
    layer.addTo(state.map);
    setStatus(`${key} layer displayed`);
  } else if (!visible && layer && state.map.hasLayer(layer)) {
    state.map.removeLayer(layer);
    setStatus(`${key} layer hidden`);
  }
}

function activateSummaryTarget(key) {
  const checkbox = document.querySelector(`input[data-layer="${key}"]`);
  if (checkbox) {
    checkbox.checked = true;
    setLayerVisible(key, true);
  }

  const labels = {
    concession: ["Forest Resources", "Concession areas"],
    fmu: ["Forest Resources", "Forest management units"],
    forestBaseMap: ["Forest Resources", "Forest Base Map"],
    protectedArea: ["Analysis", "Protected-area constraints"],
    loggingArea: ["Logging", "Logging areas"]
  };

  const [title, subtitle] = labels[key] || ["Map Explorer", "FIMS spatial information"];
  $("#viewTitle").textContent = title;
  $("#viewSubtitle").textContent = subtitle;
  state.map?.setView(config.map?.center || [-6.5, 145], config.map?.zoom || 6);
}

function bindEvents() {
  $("#logoutButton").addEventListener("click", async () => {
    try {
      await supabaseClient.auth.signOut();
    } finally {
      window.location.replace(config.portalUrl || "../index.html");
    }
  });

  $$(".menu-item").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".menu-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const label = button.textContent.trim();
      $("#viewTitle").textContent = label;
      $("#viewSubtitle").textContent = button.dataset.view === "map"
        ? "FIMS spatial information"
        : "This module will be implemented in the next development phase.";
      setStatus(`${label} selected`);
    });
  });

  $$("input[data-layer]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setLayerVisible(checkbox.dataset.layer, checkbox.checked);
    });
  });

  $$(".summary-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.link) {
        window.location.href = card.dataset.link;
        return;
      }
      activateSummaryTarget(card.dataset.target);
    });
  });

  $("#homeExtentButton").addEventListener("click", () => {
    state.map?.setView(config.map?.center || [-6.5, 145], config.map?.zoom || 6);
    setStatus("Map returned to Papua New Guinea extent");
  });

  $("#clearLayersButton").addEventListener("click", () => {
    state.overlayLayers.forEach((layer) => {
      if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
    });
    $$("input[data-layer]").forEach((checkbox) => { checkbox.checked = false; });
    setStatus("All FIMS overlays cleared");
  });
}

function initializePrototypeCounts() {
  // Placeholder values remain blank until API/database endpoints are connected.
  const connected = Boolean(config.geoserverWmsUrl);
  $("#summaryStatus").textContent = connected ? "GeoServer configured" : "Prototype data";
  $("#layerHint").hidden = connected;
}

async function start() {
  const authenticated = await requireSession();
  if (!authenticated) return;
  initializeMap();
  bindEvents();
  initializePrototypeCounts();
  setStatus("FIMS Cloud ready");
}

start();
