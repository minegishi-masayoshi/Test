// =====================
// Supabase
// =====================
const SUPABASE_URL = "https://pncvddqeuxlkplwgvxgk.supabase.co";
const SUPABASE_KEY = "sb_publishable_bOTwr6mBCgp_jUS2FAF-DQ_WXlMvdrT";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================
// Map initialization
// =====================
var map = L.map('map', {
  center: [-6.5, 145],
  zoom: 6,
  zoomControl: false
});

// =====================
// Scale bar
// =====================
L.control.scale({
  position: 'bottomleft',
  metric: true,
  imperial: false,
  maxWidth: 150
}).addTo(map);

// =====================
// Base Layers
// =====================
var osmLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }
).addTo(map);

// 後でForest BaseMapをSupabase/private bucket対応に差し替え
var forestLayer = L.layerGroup();

// =====================
// Pane settings
// =====================
map.createPane('concessionPane');
map.getPane('concessionPane').style.zIndex = 450;

map.createPane('drawPane');
map.getPane('drawPane').style.zIndex = 500;

// =====================
// Layer variables
// =====================
var concessionLayer = null;
var layerControl = null;
var drawControl = null;
var customSearchControl = null;
var titleControl = null;
var printControl = null;
var highlightedLayer = null;

var concessionSearchIndex = [];
var currentSuggestions = [];
var activeSuggestionIndex = -1;

// =====================
// Draw / Measurement layer
// =====================
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// =====================
// Helper functions
// =====================
function createZoomControl() {
  if (map._customZoomControl) return;

  map._customZoomControl = L.control.zoom({
    position: 'topleft'
  });

  map._customZoomControl.addTo(map);
}

function createPrintControl() {
  if (printControl) return;

  printControl = L.control({ position: 'topleft' });

  printControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'print-control');
    div.innerHTML = '<button type="button" class="print-map-button">Print</button>';

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    var btn = div.querySelector('.print-map-button');
    btn.addEventListener('click', function () {
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

  titleControl = L.control({ position: 'topright' });

  titleControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'map-title-control');
    div.innerHTML = 'LANMAP – Forest Map Viewer';
    L.DomEvent.disableClickPropagation(div);
    return div;
  };

  titleControl.addTo(map);
}

function createLayerControl() {
  if (layerControl) {
    map.removeControl(layerControl);
  }

  var baseMaps = {
    "OpenStreetMap": osmLayer,
    "Forest BaseMap": forestLayer
  };

  var overlayMaps = {};
  if (concessionLayer) overlayMaps["Concession"] = concessionLayer;
  overlayMaps["Measurements"] = drawnItems;

  layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false,
    position: 'topright'
  }).addTo(map);
}

function createDrawControl() {
  if (drawControl) return;

  drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polyline: {
        shapeOptions: {
          color: '#ff6600',
          weight: 3,
          pane: 'drawPane'
        }
      },
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: '#ff6600',
          weight: 3,
          fillColor: '#ffcc99',
          fillOpacity: 0.3,
          pane: 'drawPane'
        }
      },
      rectangle: {
        shapeOptions: {
          color: '#ff6600',
          weight: 3,
          fillColor: '#ffcc99',
          fillOpacity: 0.3,
          pane: 'drawPane'
        }
      },
      circle: {
        shapeOptions: {
          color: '#ff6600',
          weight: 3,
          fillColor: '#ffcc99',
          fillOpacity: 0.3,
          pane: 'drawPane'
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
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return meters.toFixed(1) + ' m';
}

function formatAreaSqMeters(areaSqMeters) {
  var hectares = areaSqMeters / 10000;
  var sqKm = areaSqMeters / 1000000;

  if (sqKm >= 1) return sqKm.toFixed(2) + ' km² / ' + hectares.toFixed(2) + ' ha';
  if (hectares >= 1) return hectares.toFixed(2) + ' ha / ' + areaSqMeters.toFixed(0) + ' m²';
  return areaSqMeters.toFixed(0) + ' m²';
}

function geodesicDistance(latlngs) {
  var total = 0;
  for (var i = 1; i < latlngs.length; i++) {
    total += latlngs[i - 1].distanceTo(latlngs[i]);
  }
  return total;
}

function polygonAreaGeodesic(layer) {
  var latlngs = layer.getLatLngs();
  if (!latlngs || latlngs.length === 0) return 0;

  var ring = latlngs[0];
  if (!ring || ring.length < 3) return 0;

  return L.GeometryUtil.geodesicArea(ring);
}

function bindMeasurementPopup(layer) {
  var content = '';

  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
    content = '<div class="measure-popup"><b>Area</b><br>' + formatAreaSqMeters(polygonAreaGeodesic(layer)) + '</div>';
  } else if (layer instanceof L.Rectangle) {
    content = '<div class="measure-popup"><b>Area</b><br>' + formatAreaSqMeters(polygonAreaGeodesic(layer)) + '</div>';
  } else if (layer instanceof L.Polyline) {
    content = '<div class="measure-popup"><b>Distance</b><br>' + formatDistance(geodesicDistance(layer.getLatLngs())) + '</div>';
  } else if (layer instanceof L.Circle) {
    var radius = layer.getRadius();
    var circleArea = Math.PI * radius * radius;
    content =
      '<div class="measure-popup"><b>Radius</b><br>' +
      formatDistance(radius) +
      '<br><b>Area</b><br>' +
      formatAreaSqMeters(circleArea) +
      '</div>';
  }

  if (content) layer.bindPopup(content);
}

function buildConcessionPopup(props) {
  var rows = [];

  function addRow(label, value) {
    if (value !== null && value !== undefined && value !== '') {
      rows.push(
        '<tr><th style="text-align:left;padding-right:8px;vertical-align:top;">' +
        escapeHtml(label) +
        '</th><td>' +
        escapeHtml(value) +
        '</td></tr>'
      );
    }
  }

  addRow('Name', props.name);
  addRow('Province', props.province);
  addRow('Area (ha)', props.area_ha);

  return (
    '<div style="min-width:220px;">' +
      '<b>Concession</b>' +
      '<table style="margin-top:6px;border-collapse:collapse;">' +
        rows.join('') +
      '</table>' +
    '</div>'
  );
}

// =====================
// Search helpers
// =====================
function resetHighlight() {
  if (highlightedLayer && highlightedLayer.setStyle) {
    highlightedLayer.setStyle({
      color: '#008000',
      weight: 1,
      fillOpacity: 0.3
    });
  }
  highlightedLayer = null;
}

function zoomToConcession(layer) {
  if (!layer) return;

  resetHighlight();
  highlightedLayer = layer;

  if (layer.setStyle) {
    layer.setStyle({
      color: '#ffff00',
      weight: 4,
      fillColor: '#ffff00',
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

function buildConcessionSearchIndex() {
  concessionSearchIndex = [];

  if (!concessionLayer) return;

  concessionLayer.eachLayer(function (layer) {
    var props = layer.feature && layer.feature.properties ? layer.feature.properties : {};
    var name = (props.name || '').toString().trim();
    var id = props.id ? props.id.toString() : '';
    var province = props.province ? props.province.toString() : '';

    if (name) {
      concessionSearchIndex.push({
        name: name,
        nameLower: name.toLowerCase(),
        id: id,
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
  var q = (keyword || '').trim().toLowerCase();
  if (!q) return [];

  var starts = [];
  var partials = [];

  for (var i = 0; i < concessionSearchIndex.length; i++) {
    var item = concessionSearchIndex[i];

    if (item.nameLower.indexOf(q) === 0) {
      starts.push(item);
    } else if (item.nameLower.indexOf(q) !== -1) {
      partials.push(item);
    }
  }

  return starts.concat(partials).slice(0, maxResults || 10);
}

function clearSuggestionList() {
  var list = document.getElementById('concession-search-suggestions');
  if (!list) return;

  list.innerHTML = '';
  list.style.display = 'none';
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function updateSuggestionActiveState() {
  var list = document.getElementById('concession-search-suggestions');
  if (!list) return;

  var items = list.querySelectorAll('.search-suggestion-item');
  items.forEach(function (item, index) {
    if (index === activeSuggestionIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function selectSuggestion(item) {
  var input = document.getElementById('concession-search-input');
  if (input) {
    input.value = item.name;
  }

  clearSuggestionList();
  zoomToConcession(item.layer);
}

function renderSuggestionList(items) {
  var list = document.getElementById('concession-search-suggestions');
  if (!list) return;

  list.innerHTML = '';
  currentSuggestions = items || [];
  activeSuggestionIndex = -1;

  if (!items || items.length === 0) {
    list.style.display = 'none';
    return;
  }

  items.forEach(function (item, index) {
    var row = document.createElement('div');
    row.className = 'search-suggestion-item';

    var metaParts = [];
    if (item.id) metaParts.push('ID: ' + item.id);
    if (item.province) metaParts.push('Province: ' + item.province);

    row.innerHTML =
      '<div class="search-suggestion-name">' + escapeHtml(item.name) + '</div>' +
      (metaParts.length
        ? '<div class="search-suggestion-meta">' + escapeHtml(metaParts.join(' | ')) + '</div>'
        : '');

    row.addEventListener('mouseenter', function () {
      activeSuggestionIndex = index;
      updateSuggestionActiveState();
    });

    row.addEventListener('click', function () {
      selectSuggestion(item);
    });

    list.appendChild(row);
  });

  list.style.display = 'block';
}

function searchConcession(keyword) {
  var suggestions = getSearchSuggestions(keyword, 10);

  if (!suggestions.length) {
    alert('Concession not found.');
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

  customSearchControl = L.control({ position: 'topleft' });

  customSearchControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'custom-search-control');

    div.innerHTML =
      '<div class="search-box-wrapper">' +
        '<div class="search-row">' +
          '<input type="text" id="concession-search-input" placeholder="Search concession...">' +
          '<button type="button" id="concession-search-btn">Search</button>' +
        '</div>' +
        '<div id="concession-search-suggestions" class="search-suggestion-list" style="display:none;"></div>' +
      '</div>';

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };

  customSearchControl.addTo(map);

  setTimeout(function () {
    var input = document.getElementById('concession-search-input');
    var button = document.getElementById('concession-search-btn');
    var suggestionList = document.getElementById('concession-search-suggestions');

    if (input) {
      input.addEventListener('input', function () {
        var value = input.value.trim();

        if (!value) {
          clearSuggestionList();
          return;
        }

        renderSuggestionList(getSearchSuggestions(value, 10));
      });

      input.addEventListener('focus', function () {
        var value = input.value.trim();
        if (value) {
          renderSuggestionList(getSearchSuggestions(value, 10));
        }
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();

          if (currentSuggestions.length && activeSuggestionIndex >= 0) {
            selectSuggestion(currentSuggestions[activeSuggestionIndex]);
          } else {
            searchConcession(input.value);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!currentSuggestions.length) return;
          activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
          updateSuggestionActiveState();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!currentSuggestions.length) return;
          activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
          updateSuggestionActiveState();
        } else if (e.key === 'Escape') {
          clearSuggestionList();
        }
      });
    }

    if (button) {
      button.addEventListener('click', function () {
        searchConcession(input.value);
      });
    }

    document.addEventListener('click', function (e) {
      var wrapper = document.querySelector('.search-box-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        clearSuggestionList();
      }
    });

    if (suggestionList) {
      suggestionList.addEventListener('mouseleave', function () {
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
  var layer = e.layer;
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
// Load concessions from Supabase
// =====================
async function loadConcessionsFromSupabase() {
  const { data, error } = await supabaseClient
    .from('concessions_geojson')
    .select('*');

  if (error) {
    console.error('Supabase error:', error);
    alert('Failed to load concessions from Supabase.');
    return;
  }

  const features = data.map(function (row) {
    return {
      type: 'Feature',
      properties: {
        id: row.id,
        name: row.name,
        province: row.province,
        area_ha: row.area_ha
      },
      geometry: row.geometry
    };
  });

  const geojson = {
    type: 'FeatureCollection',
    features: features
  };

  concessionLayer = L.geoJSON(geojson, {
    pane: 'concessionPane',
    style: function () {
      return {
        color: '#008000',
        weight: 1,
        fillOpacity: 0.3
      };
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(buildConcessionPopup(feature.properties));
    }
  }).addTo(map);

  buildConcessionSearchIndex();
  createLayerControl();

  if (concessionLayer.getBounds && concessionLayer.getBounds().isValid()) {
    map.fitBounds(concessionLayer.getBounds());
  }
}

// =====================
// Initialize
// =====================
initializeControls();
loadConcessionsFromSupabase();
