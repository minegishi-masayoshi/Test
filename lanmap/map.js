// =====================
// Supabase
// =====================
const SUPABASE_URL = "https://pncvddqeuxlkplwgvxgk.supabase.co";
const SUPABASE_KEY = "sb_publishable_bOTwr6mBCgp_jUS2FAF-DQ_WXlMvdrT";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLogin() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
      window.location.replace("../index.html");
      return false;
    }

    return true;
  } catch (_e) {
    window.location.replace("../index.html");
    return false;
  }
}

// =====================
// Map initialization
// =====================
const map = L.map("map", {
  center: [-6.5, 145],
  zoom: 6,
  zoomControl: false
});

// =====================
// Scale bar
// =====================
L.control.scale({
  position: "bottomleft",
  metric: true,
  imperial: false,
  maxWidth: 150
}).addTo(map);

// =====================
// Base Layers
// =====================
const osmLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }
).addTo(map);

// transparent 1x1 gif
const EMPTY_TILE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

// =====================
// Authenticated GridLayer for private Supabase Storage
// =====================
const AuthenticatedSupabaseTileLayer = L.GridLayer.extend({
  createTile: function (coords, done) {
    const tile = document.createElement("img");
    const tileSize = this.getTileSize();

    tile.alt = "";
    tile.width = tileSize.x;
    tile.height = tileSize.y;

    const z = coords.z;
    const x = coords.x;
    const y = coords.y;
    const yTms = (Math.pow(2, z) - 1) - y;

    (async () => {
      try {
        const tilePath = `tiles/${z}/${x}/${yTms}.png`;

        const { data: blob, error } = await supabaseClient
          .storage
          .from("lanmap_tiles")
          .download(tilePath);

        if (error) {
          console.error("Tile download error:", z, x, y, yTms, error);
          tile.src = EMPTY_TILE;
          done(null, tile);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);

        tile.onload = function () {
          setTimeout(function () {
            URL.revokeObjectURL(objectUrl);
          }, 1000);
          done(null, tile);
        };

        tile.onerror = function () {
          URL.revokeObjectURL(objectUrl);
          tile.src = EMPTY_TILE;
          done(null, tile);
        };

        tile.src = objectUrl;
      } catch (err) {
        console.error("Private tile load error:", z, x, y, yTms, err);
        tile.src = EMPTY_TILE;
        done(null, tile);
      }
    })();

    return tile;
  }
});

const restrictedBaseLayer = new AuthenticatedSupabaseTileLayer({
  tileSize: 256,
  minZoom: 0,
  maxNativeZoom: 12,
  maxZoom: 18,
  attribution: "Forest Base Map"
});

// =====================
// Pane settings
// =====================
map.createPane("concessionPane");
map.getPane("concessionPane").style.zIndex = 450;

map.createPane("drawPane");
map.getPane("drawPane").style.zIndex = 500;

// =====================
// Layer variables
// =====================
let concessionLayer = null;
let layerControl = null;
let drawControl = null;
let customSearchControl = null;
let titleControl = null;
let printControl = null;
let highlightedLayer = null;

let concessionSearchIndex = [];
let currentSuggestions = [];
let activeSuggestionIndex = -1;

// =====================
// Draw / Measurement layer
// =====================
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// =====================
// Helper functions
// =====================
function createZoomControl() {
  if (map._customZoomControl) return;

  map._customZoomControl = L.control.zoom({
    position: "topleft"
  });

  map._customZoomControl.addTo(map);
}

function createPrintControl() {
  if (printControl) return;

  printControl = L.control({ position: "topleft" });

  printControl.onAdd = function () {
    const div = L.DomUtil.create("div", "print-control");
    div.innerHTML = '<button type="button" class="print-map-button">Print</button>';

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    const btn = div.querySelector(".print-map-button");
    btn.addEventListener("click", function () {
      clearSuggestionList();
      setTimeout(function () {
        window.print();
      }, 150);
    });

    return div;
  };

  printControl.addTo(map);
}

function createMapTitleControl() {
  if (titleControl) return;

  titleControl = L.control({ position: "topright" });

  titleControl.onAdd = function () {
    const div = L.DomUtil.create("div", "map-title-control");
    div.innerHTML = "Restricted Module";
    L.DomEvent.disableClickPropagation(div);
    return div;
  };

  titleControl.addTo(map);
}

function createLayerControl() {
  if (layerControl) {
    map.removeControl(layerControl);
  }

  const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Alternate Base": restrictedBaseLayer
  };

  const overlayMaps = {};

  if (concessionLayer) {
    overlayMaps["Layer 1"] = concessionLayer;
  }

  layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false,
    position: "topright"
  }).addTo(map);
}

function createDrawControl() {
  if (drawControl) return;

  drawControl = new L.Control.Draw({
    position: "topleft",
    draw: {
      polyline: {
        shapeOptions: {
          color: "#ff6600",
          weight: 3,
          pane: "drawPane"
        }
      },
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: "#ff6600",
          weight: 3,
          fillColor: "#ffcc99",
          fillOpacity: 0.3,
          pane: "drawPane"
        }
      },
      rectangle: {
        shapeOptions: {
          color: "#ff6600",
          weight: 3,
          fillColor: "#ffcc99",
          fillOpacity: 0.3,
          pane: "drawPane"
        }
      },
      circle: {
        shapeOptions: {
          color: "#ff6600",
          weight: 3,
          fillColor: "#ffcc99",
          fillOpacity: 0.3,
          pane: "drawPane"
        }
      },
      marker: false,
      circlemarker: false
    },
    edit: {
      featureGroup: drawnItems,
      remove: true
    }
  });

  map.addControl(drawControl);
}

function initializeControls() {
  createCustomSearchControl();
  createPrintControl();
  createZoomControl();
  createDrawControl();
  createMapTitleControl();
  createLayerControl();
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
  return meters.toFixed(1) + " m";
}

function formatAreaSqMeters(areaSqMeters) {
  const hectares = areaSqMeters / 10000;
  const sqKm = areaSqMeters / 1000000;

  if (sqKm >= 1) return sqKm.toFixed(2) + " km² / " + hectares.toFixed(2) + " ha";
  if (hectares >= 1) return hectares.toFixed(2) + " ha / " + areaSqMeters.toFixed(0) + " m²";
  return areaSqMeters.toFixed(0) + " m²";
}

function geodesicDistance(latlngs) {
  let total = 0;
  for (let i = 1; i < latlngs.length; i++) {
    total += latlngs[i - 1].distanceTo(latlngs[i]);
  }
  return total;
}

function polygonAreaGeodesic(layer) {
  const latlngs = layer.getLatLngs();
  if (!latlngs || latlngs.length === 0) return 0;

  const ring = latlngs[0];
  if (!ring || ring.length < 3) return 0;

  return L.GeometryUtil.geodesicArea(ring);
}

function bindMeasurementPopup(layer) {
  let content = "";

  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
    content = '<div class="measure-popup"><b>Area</b><br>' + formatAreaSqMeters(polygonAreaGeodesic(layer)) + "</div>";
  } else if (layer instanceof L.Rectangle) {
    content = '<div class="measure-popup"><b>Area</b><br>' + formatAreaSqMeters(polygonAreaGeodesic(layer)) + "</div>";
  } else if (layer instanceof L.Polyline) {
    content = '<div class="measure-popup"><b>Distance</b><br>' + formatDistance(geodesicDistance(layer.getLatLngs())) + "</div>";
  } else if (layer instanceof L.Circle) {
    const radius = layer.getRadius();
    const circleArea = Math.PI * radius * radius;
    content =
      '<div class="measure-popup"><b>Radius</b><br>' +
      formatDistance(radius) +
      "<br><b>Area</b><br>" +
      formatAreaSqMeters(circleArea) +
      "</div>";
  }

  if (content) layer.bindPopup(content);
}

function buildFeaturePopup(props) {
  let html = "<b>Details</b><table>";

  for (const key in props) {
    if (key === "geometry") continue;

    const value = props[key];
    if (value === null || value === undefined || value === "") continue;

    html +=
      "<tr><td style='padding-right:10px; vertical-align:top;'><b>" +
      escapeHtml(key) +
      "</b></td><td>" +
      escapeHtml(value) +
      "</td></tr>";
  }

  html += "</table>";
  return html;
}

// =====================
// Search helpers
// =====================
function resetHighlight() {
  if (highlightedLayer && highlightedLayer.setStyle) {
    highlightedLayer.setStyle({
      color: "#008000",
      weight: 1,
      fillOpacity: 0.3
    });
  }
  highlightedLayer = null;
}

function zoomToFeature(layer) {
  if (!layer) return;

  resetHighlight();
  highlightedLayer = layer;

  if (layer.setStyle) {
    layer.setStyle({
      color: "#ffff00",
      weight: 4,
      fillColor: "#ffff00",
      fillOpacity: 0.15
    });
  }

  if (layer.getBounds && layer.getBounds().isValid()) {
    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
  }

  if (layer.openPopup) {
    layer.openPopup();
  }
}

function buildSearchIndex() {
  concessionSearchIndex = [];

  if (!concessionLayer) return;

  concessionLayer.eachLayer(function (layer) {
    const props = layer.feature && layer.feature.properties ? layer.feature.properties : {};
    const name = (props.name || "").toString().trim();
    const objectid = props.objectid ? props.objectid.toString() : "";
    const province = props.province ? props.province.toString() : "";

    if (name) {
      concessionSearchIndex.push({
        name: name,
        nameLower: name.toLowerCase(),
        objectid: objectid,
        province: province,
        layer: layer
      });
    }
  });

  concessionSearchIndex.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });
}

function getSearchSuggestions(keyword, maxResults) {
  const q = (keyword || "").trim().toLowerCase();
  if (!q) return [];

  const starts = [];
  const partials = [];

  for (let i = 0; i < concessionSearchIndex.length; i++) {
    const item = concessionSearchIndex[i];

    if (item.nameLower.indexOf(q) === 0) {
      starts.push(item);
    } else if (item.nameLower.indexOf(q) !== -1) {
      partials.push(item);
    }
  }

  return starts.concat(partials).slice(0, maxResults || 10);
}

function clearSuggestionList() {
  const list = document.getElementById("concession-search-suggestions");
  if (!list) return;

  list.innerHTML = "";
  list.style.display = "none";
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function updateSuggestionActiveState() {
  const list = document.getElementById("concession-search-suggestions");
  if (!list) return;

  const items = list.querySelectorAll(".search-suggestion-item");
  items.forEach(function (item, index) {
    if (index === activeSuggestionIndex) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function selectSuggestion(item) {
  const input = document.getElementById("concession-search-input");
  if (input) {
    input.value = item.name;
  }

  clearSuggestionList();
  zoomToFeature(item.layer);
}

function renderSuggestionList(items) {
  const list = document.getElementById("concession-search-suggestions");
  if (!list) return;

  list.innerHTML = "";
  currentSuggestions = items || [];
  activeSuggestionIndex = -1;

  if (!items || items.length === 0) {
    list.style.display = "none";
    return;
  }

  items.forEach(function (item, index) {
    const row = document.createElement("div");
    row.className = "search-suggestion-item";

    const metaParts = [];
    if (item.objectid) metaParts.push("ID: " + item.objectid);
    if (item.province) metaParts.push("Area: " + item.province);

    row.innerHTML =
      '<div class="search-suggestion-name">' + escapeHtml(item.name) + "</div>" +
      (metaParts.length
        ? '<div class="search-suggestion-meta">' + escapeHtml(metaParts.join(" | ")) + "</div>"
        : "");

    row.addEventListener("mouseenter", function () {
      activeSuggestionIndex = index;
      updateSuggestionActiveState();
    });

    row.addEventListener("click", function () {
      selectSuggestion(item);
    });

    list.appendChild(row);
  });

  list.style.display = "block";
}

function searchFeature(keyword) {
  const suggestions = getSearchSuggestions(keyword, 10);

  if (!suggestions.length) {
    alert("No matching record found.");
    return;
  }

  if (suggestions.length === 1) {
    selectSuggestion(suggestions[0]);
    return;
  }

  renderSuggestionList(suggestions);
}

function createCustomSearchControl() {
  if (customSearchControl) return;

  customSearchControl = L.control({ position: "topleft" });

  customSearchControl.onAdd = function () {
    const div = L.DomUtil.create("div", "custom-search-control");

    div.innerHTML =
      '<div class="search-box-wrapper">' +
        '<div class="search-row">' +
          '<input type="text" id="concession-search-input" placeholder="Search...">' +
          '<button type="button" id="concession-search-btn">Search</button>' +
        "</div>" +
        '<div id="concession-search-suggestions" class="search-suggestion-list" style="display:none;"></div>' +
      "</div>";

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };

  customSearchControl.addTo(map);

  setTimeout(function () {
    const input = document.getElementById("concession-search-input");
    const button = document.getElementById("concession-search-btn");
    const suggestionList = document.getElementById("concession-search-suggestions");

    if (input) {
      input.addEventListener("input", function () {
        const value = input.value.trim();

        if (!value) {
          clearSuggestionList();
          return;
        }

        renderSuggestionList(getSearchSuggestions(value, 10));
      });

      input.addEventListener("focus", function () {
        const value = input.value.trim();
        if (value) {
          renderSuggestionList(getSearchSuggestions(value, 10));
        }
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();

          if (currentSuggestions.length && activeSuggestionIndex >= 0) {
            selectSuggestion(currentSuggestions[activeSuggestionIndex]);
          } else {
            searchFeature(input.value);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!currentSuggestions.length) return;
          activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
          updateSuggestionActiveState();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!currentSuggestions.length) return;
          activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
          updateSuggestionActiveState();
        } else if (e.key === "Escape") {
          clearSuggestionList();
        }
      });
    }

    if (button) {
      button.addEventListener("click", function () {
        searchFeature(input.value);
      });
    }

    document.addEventListener("click", function (e) {
      const wrapper = document.querySelector(".search-box-wrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        clearSuggestionList();
      }
    });

    if (suggestionList) {
      suggestionList.addEventListener("mouseleave", function () {
        activeSuggestionIndex = -1;
        updateSuggestionActiveState();
      });
    }
  }, 0);
}

// =====================
// Draw events
// =====================
map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);

  if (layer.getBounds) {
    layer.openPopup(layer.getBounds().getCenter());
  } else if (layer.getLatLng) {
    layer.openPopup(layer.getLatLng());
  }
});

map.on(L.Draw.Event.EDITED, function (e) {
  e.layers.eachLayer(function (layer) {
    bindMeasurementPopup(layer);

    if (layer.getBounds) {
      layer.openPopup(layer.getBounds().getCenter());
    } else if (layer.getLatLng) {
      layer.openPopup(layer.getLatLng());
    }
  });
});

// =====================
// Load data from Supabase
// =====================
async function loadFeaturesFromSupabase() {
  const { data, error } = await supabaseClient
    .from("concessions_geojson")
    .select("*");

  if (error) {
    console.error("Supabase load error:", error);
    alert("Data could not be loaded.");
    return;
  }

  const features = data.map(function (row) {
    return {
      type: "Feature",
      properties: {
        fid: row.fid,
        objectid: row.objectid,
        plan_id: row.plan_id,
        name: row.name,
        purchase: row.purchase,
        exp: row.exp,
        constype: row.constype,
        province: row.province,
        remarks: row.remarks,
        remarks2: row.remarks2,
        shape_leng: row.shape_leng,
        shape_area: row.shape_area,
        area_ha: row.area_ha,
        status_21: row.status_21,
        status_23: row.status_23,
        status_24: row.status_24,
        prov: row.prov,
        tp_n0: row.tp_n0,
        startdate: row.startdate,
        expdate: row.expdate,
        term: row.term,
        permit_num: row.permit_num,
        prmt_hldr: row.prmt_hldr,
        remarks24: row.remarks24
      },
      geometry: row.geometry
    };
  });

  const geojson = {
    type: "FeatureCollection",
    features: features
  };

  concessionLayer = L.geoJSON(geojson, {
    pane: "concessionPane",
    style: function () {
      return {
        color: "#008000",
        weight: 1,
        fillOpacity: 0.3
      };
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(buildFeaturePopup(feature.properties));
    }
  }).addTo(map);

  buildSearchIndex();
  createLayerControl();

  if (concessionLayer.getBounds && concessionLayer.getBounds().isValid()) {
    map.fitBounds(concessionLayer.getBounds());
  }
}

// =====================
// Initialize
// =====================
async function initApp() {
  const ok = await checkLogin();
  if (!ok) return;

  initializeControls();
  await loadFeaturesFromSupabase();
}

initApp();
