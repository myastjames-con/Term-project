// 1. Create map and set its initial view. The map is drawn in the <div> with id="map" in index.html.
// [52, -72] = latitude, longitude (roughly the middle of Québec). 5 = zoom level (bigger = closer).
// (Once the data loads, section 6 zooms the map to fit it.)
// The +/- zoom buttons go top left, under the menu button (added in section 10).
const isPhone = () => window.innerWidth < 700;

// PHONE TOP BAR. On a phone the bar is just the title and one "Options" button. The numbers, the filter
// chips and the two pull-downs sit in a box that opens under the button and closes when you press the button again,
// pick a region or basemap, tap the map, or press Escape.
(function () {
  if (!isPhone()) return;
  const bar = document.getElementById('topbar');
  const box = document.createElement('div');
  box.id = 'bar-options';
  ['filter-note', 'status'].forEach(id => box.appendChild(document.getElementById(id)));
  box.appendChild(bar.querySelector('.bar-bottom'));
  bar.appendChild(box);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'opt-btn';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'bar-options');
  btn.innerHTML = '<span class="opt-icon" aria-hidden="true">&#9776;</span><span id="opt-text">Options</span>';
  bar.querySelector('.bar-top').appendChild(btn);
  window.setOptions = open => {
    bar.classList.toggle('opts-open', open);
    btn.setAttribute('aria-expanded', open);
    document.getElementById('opt-text').textContent = open ? 'Close' : 'Options';
  };
  btn.onclick = () => window.setOptions(!bar.classList.contains('opts-open'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.setOptions(false); });
  ['base-select', 'area-select'].forEach(id => document.getElementById(id).addEventListener('change', () => window.setOptions(false)));
})();
// On a phone, keep popups narrow and below the buttons at the top of the map.
L.Popup.mergeOptions({ maxWidth: 260, autoPanPaddingTopLeft: [10, 60], autoPanPaddingBottomRight: [10, 100] });
const map = L.map('map', { zoomControl: false, zoomSnap: 0.25 }).setView([52, -72], 5);   // zoomSnap 0.25: the first view can zoom in a little closer than whole steps


// 2. Basemap
// Three basemaps to choose from (the layers button, top right). The light one starts: its quiet grey
// makes the coloured protected areas easy to see, which the green street map did not.
// The attribution text (bottom right) is required by the licences.
const osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const baseMaps = {
  // Esri's light grey map needs no key (the CARTO one now asks for an API key). It stops at zoom 16;
  // past that Leaflet stretches the last tiles instead of showing blanks.
  'Street map (OpenStreetMap)': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: osmAttr
  }),
  'Light map (no colors)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16, maxZoom: 19,
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
  }),
  'Satellite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
  })
};
baseMaps['Street map (OpenStreetMap)'].addTo(map);
// The basemap is chosen from the "Background" pull-down in the top bar (index.html).
let currentBase = baseMaps['Street map (OpenStreetMap)'];
(function () {
  const sel = document.getElementById('base-select');
  Object.keys(baseMaps).forEach(name => sel.add(new Option(name.replace(/ \(.*\)$/, ''), name)));   // short label, full name as the value
  sel.onchange = () => {
    map.removeLayer(currentBase);
    currentBase = baseMaps[sel.value].addTo(map);
    currentBase.bringToBack();
  };
})();


// 3. Stacking order of the layers

// A higher zIndex is drawn on top. Bottom to top:
//   habitat (400) -> protected areas (450) -> overlap (500)
// The overlap sits on top so it stays clickable.
map.createPane('habitatPane');   map.getPane('habitatPane').style.zIndex = 400;
map.createPane('protectedPane'); map.getPane('protectedPane').style.zIndex = 450;
map.createPane('overlapPane');   map.getPane('overlapPane').style.zIndex = 500;
map.createPane('dotPane');       map.getPane('dotPane').style.zIndex = 600;     // the dots (section 4) sit above everything
map.createPane('regionPane');    map.getPane('regionPane').style.zIndex = 610;  // the red outline of a region
map.getPane('regionPane').style.pointerEvents = 'none';


// 4. SETTINGS FOR THE LAYERS
// 'groups' stores each layer once it has loaded, so the legend and the search box can use them.
const groups = {};

// Everything on the page is in English. These tables turn the French words in the data into English.
// A word that is not in a table is shown in French, so nothing disappears.
// To translate another one, add a line:  'French': 'English',
const statusEnglish = {
  'Menacée': 'Threatened',
  'Vulnérable': 'Vulnerable',
  'Susceptible': 'Likely to be designated threatened or vulnerable'
};
const designationEnglish = {
  'Milieu naturel de conservation volontaire': 'Voluntary conservation natural area',
  'Réserve naturelle reconnue': 'Recognized nature reserve',
  'Réserve écologique': 'Ecological reserve',
  'Réserve écologique projetée': 'Proposed ecological reserve',
  'Réserve nationale de faune': 'National wildlife reserve',
  'Parc national': 'National park',
  'Parc national du Canada': 'National park of Canada',
  'Réserve de parc national': 'National park reserve',
  'Parc régional': 'Regional park',
  'Parc marin': 'Marine park',
  'Réserve de biodiversité': 'Biodiversity reserve',
  'Réserve de biodiversité projetée': 'Proposed biodiversity reserve',
  'Réserve aquatique': 'Aquatic reserve',
  'Réserve aquatique projetée': 'Proposed aquatic reserve',
  'Réserve faunique': 'Wildlife reserve',
  'Refuge faunique': 'Wildlife refuge',
  'Habitat faunique': 'Wildlife habitat',
  'Habitat du poisson': 'Fish habitat',
  'Écosystème forestier exceptionnel': 'Exceptional forest ecosystem',
  'Paysage humanisé': 'Humanized landscape',
  'Paysage humanisé projeté': 'Proposed humanized landscape',
  "Réserve de territoire aux fins d'aire protégée": 'Land reserve for protected-area purposes',
  'Ordonnance d\'urgence (LEP)': 'Emergency order (Species at Risk Act)',
  'Autres mesures de conservation efficaces': 'Other effective area-based conservation measure',
  'Autres mesures de conservation efficaces (fédérale)': 'Other effective area-based conservation measure (federal)',
  'Refuge biologique': 'Biological refuge',
  'Forêt ancienne': 'Old-growth forest',
  'Forêt rare': 'Rare forest',
  'Forêt refuge': 'Refuge forest',
  'Aire de confinement du cerf de Virginie': 'White-tailed deer yard',
  "Habitat d'une espèce faunique menacée ou vulnérable": 'Habitat of a threatened or vulnerable wildlife species',
  'Territoire mis en réserve': 'Land set aside as a reserve',
  'Vasière': 'Tidal mudflat',
  'Réserve de parc national du Québec': 'National park reserve (Québec)',
  'Réserve de parc national du Canada': 'National park reserve (Canada)',
  'Parc de la Commission de la capitale nationale (Canada)': 'National Capital Commission park (Canada)',
  'Parc marin du Saguenay - Saint-Laurent': 'Saguenay–St. Lawrence Marine Park',
  'Réserve marine': 'Marine reserve'
};
// Looks a value up in a table. Curly apostrophes count as straight ones.
const inEnglish = (table, value) => table[value] || table[String(value).replace(/’/g, "'")] || value || 'Unknown';

// Makes text safe to put inside HTML.
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Makes a clickable element reachable with the keyboard: Tab reaches it, Enter or Space presses it.
function makeButton(el) {
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
}
// Writes a number the way a reader expects: 1,234.5
// Values under 10 keep two decimals, so a small habitat shows as 0.42 ha and not 0 ha.
const num = (v, digits) => v == null ? 'n/a' :
  Number(v).toLocaleString('en-CA', { maximumFractionDigits: digits != null ? digits : (Math.abs(v) < 10 ? 2 : 1) });
// A short version of a list of protected area names: the first two, then "+3 more".
const shortNames = s => {
  const names = String(s || '').split('; ').filter(Boolean);
  return names.slice(0, 2).join('; ') + (names.length > 2 ? ' +' + (names.length - 2) + ' more' : '');
};

// Look of each layer: color = border, fillColor = inside, weight = border thickness
const styles = {
  habitat:   { color: '#00305c', weight: 1, fillColor: '#00305c', fillOpacity: 0.2,  lineJoin: 'round' },
  protected: { color: '#640000', weight: 1, fillColor: '#640000', fillOpacity: 0.2,  lineJoin: 'round' },
  overlap:   { color: '#240046', weight: 2, fillColor: '#240046', fillOpacity: 0.85, lineJoin: 'round' }
};

// ONE COLOUR PER SPECIES. The habitat is coloured by species, and the legend reads the same colours,
// so the legend and the map can never disagree. The species are given colours from this list in order
// (the species with the most records gets the first colour). The list has no purples, so the
// habitat does not look like the protected areas (purples) or the overlap (dark purple).
// These are colour-blind-safe colours (Okabe and Ito) that stay apart from each other. The protected
// areas use purples, black and grey only, so no species colour can be mistaken for a protected area.
const palette = ['#0072b2', '#d55e00', '#e69f00', '#56b4e9', '#f0e442'];
const speciesColour = {};        // filled in when the data loads: { 'Pseudacris triseriata': '#1f78b4', ... }
// The data can add a suffix to the name (for example 'Desmognathus ochrophaeus pop. 2'), so a name also
// matches a colour when one name starts with the other.
const colourFor = sname => {
  if (speciesColour[sname]) return speciesColour[sname];
  const k = Object.keys(speciesColour).find(k => k.startsWith(sname) || String(sname).startsWith(k));
  return k ? speciesColour[k] : '#999999';
};


// Québec's own status (LOIEMV in the data)
const provLevels = [
  { code: 'Menacée',     label: 'Threatened',  color: '#d73027' },
  { code: 'Vulnérable',  label: 'Vulnerable',  color: '#fc8d59' },
  { code: 'Susceptible', label: 'Likely to be designated', color: '#fee08b' }
];

// Which filters are on (null = no filter). The habitat shows a shape only if it passes all of them.
const filters = { prov: null, unprot: null, zones: null };
let allHabitat = [];                       // every habitat shape, shown or not

// DOTS. Many habitats are tiny, so zoomed out their shapes are almost invisible. Each habitat also gets a dot
// at its centre while the map is zoomed out (zoom 12 or less). The dot is in the species colour. A dark-purple
// ring means the habitat overlaps a protected area, a white ring means it does not. A dot opens the same popup.
const DOT_MAX_ZOOM = 10;                    // above this zoom the dots are gone and only the shapes show
// The dot gets smaller as you zoom in.
const dotRadius = z => Math.max(2, 3.5 - (z - 5) * 0.3);
const dotGroup = L.layerGroup();
const dotOf = new Map();                   // habitat shape -> its dot
function makeDots() {
  allHabitat.forEach(l => {
    const p = l.feature.properties;
    const dot = L.circleMarker(l.getBounds().getCenter(), {
      pane: 'dotPane', radius: dotRadius(map.getZoom()), weight: p.is_protected ? 2 : 1.5, color: p.is_protected ? '#3f007d' : '#ffffff',
      fillColor: colourFor(p.SNAME), fillOpacity: 1
    });
    dot.on('click', () => l.openPopup(dot.getLatLng()));
    dotOf.set(l, dot);
  });
}
function syncDots() {
  const zoomedOut = map.getZoom() <= DOT_MAX_ZOOM;
  const r = dotRadius(map.getZoom());
  allHabitat.forEach(l => {
    const dot = dotOf.get(l);
    if (!dot) return;
    dot.setRadius(r);
    const want = zoomedOut && groups.habitat.hasLayer(l);
    if (want && !dotGroup.hasLayer(dot)) dotGroup.addLayer(dot);
    if (!want && dotGroup.hasLayer(dot)) dotGroup.removeLayer(dot);
  });
}
map.on('zoomend', syncDots);
dotGroup.addTo(map);

function refreshHabitat() {
  allHabitat.forEach(l => {
    const p = l.feature.properties;
    const show = !hiddenSpecies.has(p.SNAME) &&
                 (!filters.prov || p.LOIEMV === filters.prov) &&
                 (!filters.unprot || !p.is_protected);
    if (show && !groups.habitat.hasLayer(l)) groups.habitat.addLayer(l);
    if (!show && groups.habitat.hasLayer(l)) groups.habitat.removeLayer(l);
  });
  syncDots();
  document.querySelectorAll('.chip[data-kind]').forEach(el =>
    el.classList.toggle('on', filters[el.dataset.kind] === el.dataset.code));
}

// The clickable chips across the top. Click a chip to show only that group, click it again to clear.
// The Québec status chips only appear when the data has more than one level (with one species there is just one).
// The "no protection" chip shows only the habitat that no protected area covers: where a new site would help most.
function buildFilterBar(sites) {
  const bar = document.getElementById('filter-bar');
  const count = code => sites.filter(f => f.properties.LOIEMV === code).length;
  const levels = provLevels.filter(lv => count(lv.code) > 0);          // only the levels in the data
  if (levels.length > 1) {
    const lab = document.createElement('span');
    lab.className = 'chip-label'; lab.textContent = 'Québec status:'; lab.title = 'Status under Québec law (from the data)';
    bar.appendChild(lab);
    levels.forEach(lv => {
      const n = count(lv.code);
      const el = document.createElement('span');
      el.className = 'chip';
      el.dataset.kind = 'prov'; el.dataset.code = lv.code;
      el.style.setProperty('--c', '#555');
      el.title = n + ' habitat sites. Click to show only these, click again to show all.';
      el.innerHTML = '<span class="sw"></span>' + lv.label + ' <span class="n">' + n + '</span>';
      el.onclick = () => { filters.prov = filters.prov === lv.code ? null : lv.code; refreshHabitat(); };
      makeButton(el);
      bar.appendChild(el);
    });
  }
  const nUn = sites.filter(f => !f.properties.is_protected).length;
  if (nUn > 0) {
    const lab2 = document.createElement('span');
    lab2.className = 'chip-label'; lab2.textContent = 'Focus:';
    bar.appendChild(lab2);
    const el = document.createElement('span');
    el.className = 'chip';
    el.dataset.kind = 'unprot'; el.dataset.code = 'yes';
    el.style.setProperty('--c', '#555');
    el.title = 'Show only the habitat that no protected area covers. Click again to show all.';
    el.innerHTML = '<span class="sw"></span>' + (window.innerWidth < 700 ? 'No protection' : 'Only habitat with no protection') + ' <span class="n">' + nUn + '</span>';
    el.onclick = () => { if (!filters.unprot) setZonesOnly(false); filters.unprot = filters.unprot ? null : 'yes'; setFocus(!!filters.unprot); refreshHabitat(); };
    makeButton(el);
    bar.appendChild(el);
  }
  // "Only protection zones": hides the habitat and shows just the protected areas.
  const zel = document.createElement('span');
  zel.className = 'chip';
  zel.dataset.kind = 'zones'; zel.dataset.code = 'yes';
  zel.style.setProperty('--c', '#555');
  zel.title = 'Show only the protection zones (no habitat). Click again to show all.';
  zel.innerHTML = '<span class="sw"></span>Only protection zones';
  zel.onclick = () => {
    if (!filters.zones && filters.unprot) { filters.unprot = null; setFocus(false); }
    setZonesOnly(!filters.zones); refreshHabitat();
  };
  makeButton(zel);
  bar.appendChild(zel);
  map.invalidateSize();                      // the bar changed height, so tell the map
}

// "Only protection zones" hides the habitat (shapes, dots) and the overlap, so only the protected areas are left.
const hiddenForZones = [];
function setZonesOnly(on) {
  filters.zones = on ? 'yes' : null;
  if (on) {
    [groups.habitat, groups.overlap].forEach(g => { if (g && map.hasLayer(g)) { map.removeLayer(g); hiddenForZones.push(g); } });
    map.removeLayer(dotGroup);
    map.closePopup();
  } else {
    hiddenForZones.splice(0).forEach(g => map.addLayer(g));
    if (!map.hasLayer(dotGroup)) dotGroup.addTo(map);
  }
  const lg = document.querySelector('.legend');
  if (lg) lg.classList.toggle('zones', on);
}

// "Show only habitat with no protection" also hides the protected areas and the overlap, so only the
// unprotected habitat is left on the map. Turning it off brings back whatever was showing before.
const hiddenForFocus = [];
function setFocus(on) {
  if (on) {
    [groups.protected, groups.overlap].forEach(g => { if (g && map.hasLayer(g)) { map.removeLayer(g); hiddenForFocus.push(g); } });
  } else {
    hiddenForFocus.splice(0).forEach(g => map.addLayer(g));
  }
  const lg = document.querySelector('.legend');
  if (lg) lg.classList.toggle('focus', on);
}


// 5. HELPER FUNCTION: load a GeoJSON file and add it to the map as a layer. The function takes several arguments:
// key      = the layer's name in 'groups' (used by the legend)
// url      = which file to load
// pane     = which stacking level to draw on
// base     = the style from section 4
// popupFn  = a function that builds the popup text from the shape's data
// filterFn = (optional) only draw shapes where this returns true
// after    = (optional) code to run once the data has loaded
function addGroup(key, url, pane, base, popupFn, filterFn, after) {
  fetch(url)                                  // download the file
    .then(r => {
      if (!r.ok) throw new Error(r.status + ' ' + url);   // file not found, etc.
      return r.json();                        // read it as data
    })
    .then(data => {
      groups[key] = L.geoJSON(data, {
        pane: pane,
        filter: filterFn || (() => true),     // no filter = draw everything
        style: () => base,                    // apply the look
        onEachFeature: (f, layer) => {        // runs once for every shape
          layer.bindPopup(popupFn(f.properties));   // click a shape = popup
          layer.on({
            // hover: thicker border and slightly more solid
            mouseover: e => e.target.setStyle({
              weight: base.weight + 1.5,
              fillOpacity: Math.min(base.fillOpacity + 0.2, 1)
            }),
            // stop hovering: back to normal
            mouseout: e => groups[key].resetStyle(e.target)
          });
        }
      }).addTo(map);
      if (after) after(data);                 // run the extra code, if there is any
    })
    .catch(err => {
      // If a file can't load, say so plainly instead of staying on "Loading..."
      console.error(err);
      document.getElementById('status').textContent =
        'The map data did not load, so the map is empty. Check your internet connection and reload the page. If it keeps happening, the data file is missing from the site.';
    });
}


// FIRST VIEW. Zoom to all the habitat, keeping it clear of the cards on the left (desktop) or at the bottom (phone).
// The top bar can change height after the page loads (fonts, wrapping chips), which used to leave the habitat too high.
// So the map re-checks its size and re-fits a few times, until you move the map yourself.
let userMoved = false;
['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(ev => map.getContainer().addEventListener(ev, () => { userMoved = true; }, { passive: true }));
function fitAll() {
  if (userMoved || !allHabitat.length) return;
  map.invalidateSize();
  map.fitBounds(groups.habitat.getBounds(), isPhone()
    ? { paddingTopLeft: [10, 56], paddingBottomRight: [10, 100] }
    : { paddingTopLeft: [50, 70], paddingBottomRight: [50, 40] });
}
window.addEventListener('load', () => setTimeout(fitAll, 150));
window.addEventListener('resize', () => setTimeout(fitAll, 150));
if (window.ResizeObserver) new ResizeObserver(() => { map.invalidateSize(); }).observe(document.getElementById('map'));


// 6. LAYER 1: Amphibian habitat (bottom)
addGroup('habitat', '../data/amphibians.geojson', 'habitatPane', styles.habitat,

  // Popup text when you click a habitat
  p => '<b>' + esc(p.GCOMNAME || p.SCOMNAME || p.SNAME) + '</b><br><i>' + esc(p.SNAME) + '</i>' +
       '<br>Status: ' + esc(inEnglish(statusEnglish, p.LOIEMV)) +
       '<br>Habitat size: ' + num(p.habitat_ha) + ' ha' +
       '<br>Protected: ' + num(p.protected_ha) + ' ha (' + num(p.pct_protected, 1) + '% of the habitat)' +
       '<br>Protected by: ' + esc(p.protected_by || 'none') +
       (!p.is_protected && p.nearest_name ? '<br>Nearest protected area: ' + esc(p.nearest_name) + ' (' + num(p.nearest_km, 1) + ' km away)' : ''),

  // No filter: all species are drawn
  undefined,

  // After loading: headline, search box, info panel numbers, and zoom to the habitat
  data => {
    const sites = data.features;
    const nProtected = sites.filter(f => f.properties.is_protected).length;     // sites that overlap a protected area
    const nSpecies = new Set(sites.map(f => f.properties.SNAME)).size;
    const sumHa = k => sites.reduce((t, f) => t + (f.properties[k] || 0), 0);
    const pctArea = sumHa('habitat_ha') > 0 ? 100 * sumHa('protected_ha') / sumHa('habitat_ha') : 0;

    // meta.json (written by the notebook) says which protected areas the map shows.
    fetch('../data/meta.json').then(r => r.json()).catch(() => ({})).then(meta => {
      const stat = (n, text) => '<span class="stat"><b>' + n + '</b><span>' + text + '</span></span>';
      document.getElementById('status').innerHTML =
        stat(sites.length, 'habitat sites' + (nSpecies > 1 ? ', ' + nSpecies + ' species' : '')) +
        stat(nProtected, 'overlap a protected area') +
        stat(num(pctArea, 1) + '%', 'of habitat area protected');
      const regions = (meta.regions || []).join(' and ');
      const where = meta.protected_scope === 'near' ? 'Protected areas shown: those within ' + meta.protected_near_km + ' km of a habitat.' : '';
      document.getElementById('filter-note').textContent = where;
      const note = document.getElementById('scope-note');
      if (note) note.textContent = ' ' + (regions || 'see the notebook') + ' (Québec administrative regions)' +
                                   (meta.protected_scope === 'near' ? ', with the protected areas within ' + meta.protected_near_km + ' km of a habitat' : '');
    });

    // Give each species a colour (most records first) and colour its shapes with it.
    const counts = {};
    sites.forEach(f => { counts[f.properties.SNAME] = (counts[f.properties.SNAME] || 0) + 1; });
    const speciesList = Object.keys(counts).sort((x, y) => counts[y] - counts[x]);
    speciesList.forEach((sname, i) => { speciesColour[sname] = palette[i % palette.length]; });
    groups.habitat.options.style = f => {
      const c = colourFor(f.properties.SNAME);
      return { ...styles.habitat, color: c, fillColor: c, weight: 2.5, fillOpacity: 0.6 };
    };
    groups.habitat.setStyle(groups.habitat.options.style);
    allHabitat = groups.habitat.getLayers();
    makeDots();
    buildFilterBar(sites);
    groups.habitat.eachLayer(l => { (speciesLayers[l.feature.properties.SNAME] = speciesLayers[l.feature.properties.SNAME] || []).push(l); });

    // One legend row per species, with its colour and its number of records.
    const names = {};
    sites.forEach(f => { names[f.properties.SNAME] = f.properties.GCOMNAME || f.properties.SCOMNAME || f.properties.SNAME; });
    addSpeciesRows(speciesList.map(s => ({ sname: s, label: names[s], n: counts[s] })));

    setUpSearch();                                       // section 10
    fillPanel(sites);                                    // section 11
    fitAll();                                                                   // zoom to the data (and again once the page has settled)
    syncDots();
    addRegionButtons();
  });


// 7. LAYER 2: Conservation areas (middle)
// Popup text when you click a protected area: name, type, creation date.
// A small colour square plus the group's name, worded exactly as in the legend.
const typeChip = d => { const t = protTypeOf(d); return '<span class="pchip" style="background:' + t.color + '"></span><b>' + esc(t.label) + '</b>'; };
const protPopup = p => '<b>' + esc(p.NOM || 'Unnamed site') + '</b><br>' + esc(inEnglish(designationEnglish, p.DESIGNOM)) +
                       '<br>Legend group: ' + typeChip(p.DESIGNOM) +
                       '<br>Created: ' + esc((p.DA_CREATIO || 'n/a').slice(0, 10));

// PROTECTED AREA TYPES. Each designation in the data (national park, ecological reserve, ...) is put in one
// group, and each group has its own colour. The legend reads this same list, so legend and map match.
// To change a group, edit its 'test' (a word found in the French designation) or its colour.
// The groups are checked from the top, and a designation goes in the FIRST group it matches.
// They sort the registry by who protects the land: species-at-risk habitat, the federal government,
// Québec, or private owners. They are my reading of the designation names (see the README).
const protTypes = [
  { id: 'species',  label: 'Threatened-species habitat', color: '#000000', test: /Ordonnance d.urgence|espèce faunique menacée/ },
  { id: 'federal',  label: 'Federal parks and reserves',   color: '#54278f', test: /Canada|fédérale|Réserve nationale de faune|Réserve marine|Parc marin/ },
  { id: 'provincial', label: 'Québec parks and reserves',            color: '#8c6bb1', test: /^Parc national|Réserve de parc|Réserve (écologique|de biodiversité|aquatique)|territoire|Paysage humanisé/i },
  { id: 'refuges',  label: 'Québec wildlife and forest refuges',     color: '#bcb0d9', test: /Refuge|Forêt|cerf|Vasière|faune|faunique|poisson/ },
  { id: 'private',  label: 'Private and voluntary conservation',     color: '#e2dcef', test: /naturelle reconnue|conservation volontaire/ },
  { id: 'other',    label: 'Other conservation measures',            color: '#bdbdbd', test: /Autres mesures/ },
  { id: 'unknown',  label: 'Other designation',                      color: '#bdbdbd', test: /./ }
];
const protTypeOf = designation => protTypes.find(t => t.test.test(String(designation || ''))) || protTypes[protTypes.length - 1];
const protLayers = {};                 // shapes of each type, so a legend row can show or hide a type
const hiddenTypes = new Set();
function setProtType(id, on) {
  (protLayers[id] || []).forEach(l => on ? groups.protected.addLayer(l) : groups.protected.removeLayer(l));
  on ? hiddenTypes.delete(id) : hiddenTypes.add(id);
  document.querySelector('.legend-item[data-ptype="' + id + '"]').classList.toggle('off', !on);
}

addGroup('protected', '../data/protected_areas.geojson', 'protectedPane', styles.protected, protPopup, undefined,
  data => {
    groups.protected.options.style = f => {
      // fill = the type's colour; the border is one dark purple (black for species habitat) so pale types still show
      const t = protTypeOf(f.properties.DESIGNOM);
      return { ...styles.protected, color: t.id === 'species' ? '#000000' : t.id === 'other' || t.id === 'unknown' ? '#737373' : '#3f007d',
               fillColor: t.color, weight: 0.8, fillOpacity: 0.75 };
    };
    groups.protected.setStyle(groups.protected.options.style);
    const counts = {};
    groups.protected.eachLayer(l => {
      const t = protTypeOf(l.feature.properties.DESIGNOM);
      (protLayers[t.id] = protLayers[t.id] || []).push(l);
      counts[t.id] = (counts[t.id] || 0) + 1;
    });
    // one legend row per type that is in the data
    const box = document.getElementById('legend-protected');
    protTypes.filter(t => counts[t.id]).forEach(t => {
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.dataset.ptype = t.id;
      row.style.setProperty('--c', t.color);
      row.innerHTML = '<span class="box"></span><span class="grow">' + t.label + '</span><span class="count">' + counts[t.id] + '</span>';
      row.onclick = () => setProtType(t.id, hiddenTypes.has(t.id));
      makeButton(row);
      box.appendChild(row);
    });
  });


// 8. LAYER 3: Amphibian habitat inside a protected area (top)
// The piece of habitat that overlaps a protected area (made in the notebook).
addGroup('overlap', '../data/amphibian_protected_overlap.geojson', 'overlapPane', styles.overlap,
  p => '<b>' + esc(p.GCOMNAME || p.SNAME) + ' habitat inside a protected area</b><br>' + esc(p.NOM || '') + '<br>' +
       esc(inEnglish(designationEnglish, p.DESIGNOM)) + '<br>Legend group: ' + typeChip(p.DESIGNOM));


// 9. Legend
// Each row is one clickable entry. 'key' links a row to a layer in 'groups' (section 5).
// 'color' is the box colour: for the protected areas it comes from colourFor, so it matches the map.
const legendSections = [
  { title: 'Overlap', items: [
    { key: 'overlap',   label: 'Habitat inside a protected area', color: '#240046' } ] }
];

// The species rows (one colour each) are added by addSpeciesRows once the data has loaded.
// speciesLayers lists the shapes of each species, so a row can show or hide its species.
const speciesLayers = {};
const hiddenSpecies = new Set();
function setSpecies(sname, on) {
  on ? hiddenSpecies.delete(sname) : hiddenSpecies.add(sname);
  refreshHabitat();
  document.querySelectorAll('.legend-item[data-species]').forEach(el => {
    if (el.dataset.species === sname) el.classList.toggle('off', !on);
  });
}
function addSpeciesRows(list) {
  const box = document.getElementById('legend-species');
  list.forEach(s => {
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.dataset.species = s.sname;
    row.style.setProperty('--c', colourFor(s.sname));
    row.title = s.sname;
    row.innerHTML = '<span class="box"></span><span class="grow">' + esc(String(s.label).replace(/\s[-–]\s.*$/, '')) + '</span><span class="count">' + s.n + '</span>';
    row.onclick = () => setSpecies(s.sname, hiddenSpecies.has(s.sname));      // click = hide or show this species
    makeButton(row);
    box.appendChild(row);
  });
}

// On a phone the legend sits at the bottom, so when both cards are open the middle of the map stays visible.
const legend = L.control({ position: isPhone() ? 'bottomleft' : 'topleft' });
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'legend');

  // Build the legend HTML: title + minimize button, then each section and its rows.
  let html = '<div class="legend-head"><span class="legend-title">Legend <span class="legend-hint">(click a row to hide it)</span></span>' +
             '<button class="legend-min" title="Minimize" aria-label="Minimize legend">–</button></div>' +
             '<div class="legend-body">' +
             '<div class="legend-sub">Amphibian habitat</div><div id="legend-species"></div>' +
             '<div class="legend-note"><span class="ring-eg"></span> Round dot = one habitat site. Purple ring = it overlaps a protected area.</div>' +
             '<div class="legend-sub">Protected areas</div>' +
             '<div id="legend-protected"></div>';
  legendSections.forEach(s => {
    html += '<div class="legend-sub">' + s.title + '</div>';        // section subtitle
    s.items.forEach(i => {
      html += '<div class="legend-item" data-key="' + i.key + '" style="--c:' + i.color + '">' +
              '<span class="box"></span>' + i.label + '</div>';     // one row with its colour box
    });
  });
  div.innerHTML = html + '</div>';
  div.querySelectorAll('.legend-item').forEach(makeButton);

  div.classList.add('collapsed');   // the legend starts closed so the map is clear

  // Clicking the legend doesn't click the map behind it.
  L.DomEvent.disableClickPropagation(div);

  // Minimize / expand button: hides the rows and swaps – and +.

  // Minimize / expand button: hides the rows and swaps – and +.
  const btn = div.querySelector('.legend-min');
  if (div.classList.contains('collapsed')) btn.textContent = '+';
  btn.setAttribute('aria-expanded', !div.classList.contains('collapsed'));
  btn.onclick = () => {
    const c = div.classList.toggle('collapsed');
    btn.textContent = c ? '+' : '–';
    btn.setAttribute('aria-expanded', !c);
  };
  // the word "Legend" opens and closes it too, not only the + button
  div.querySelector('.legend-title').onclick = () => btn.click();

  // Clicking a row turns its layer on or off. The box goes hollow when it's off.
  div.querySelectorAll('.legend-item[data-key]').forEach(el => {
    el.onclick = () => {
      const g = groups[el.dataset.key];       // find the layer for this row
      if (!g) return;                         // not loaded yet: do nothing
      const turnOn = !map.hasLayer(g);                                           // is it hidden right now?
      if (turnOn) map.addLayer(g); else map.removeLayer(g);                      // show it / hide it
      // every row of this layer goes hollow or filled together
      div.querySelectorAll('.legend-item[data-key="' + el.dataset.key + '"]')
         .forEach(r => r.classList.toggle('off', !turnOn));
    };
  });
  return div;
};


// "Zoom to region" pull-down in the top bar: zoom to each region that has habitat (the notebook writes the region of each record).
// The regions can be far apart, so with all of them in view each one is small.
// When you pick a region it gets a red outline. The outline is the real regional boundary if data/regions.geojson
// exists (the notebook writes it). If that file is missing, it is drawn from the habitat records instead (dashed).
let regionOutline = null;
let regionToken = 0;                         // a newer pick cancels an older one that is still loading
let regionFile = null;                       // the promise for regions.geojson, loaded once
const plain = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const loadRegionFile = () => regionFile || (regionFile = fetch('../data/regions.geojson').then(r => r.ok ? r.json() : null).catch(() => null));
// Convex hull (the smallest outline that contains every point), used when the boundary file is missing.
function hullOf(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = list => { const h = []; list.forEach(p => { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }); h.pop(); return h; };
  return build(pts).concat(build(pts.slice().reverse()));
}
function clearRegionOutline() {
  regionToken++;
  if (regionOutline) map.removeLayer(regionOutline);
  regionOutline = null;
  const note = document.getElementById('filter-note');
  if (note && note.dataset.keep != null) { note.textContent = note.dataset.keep; delete note.dataset.keep; }
}
function showRegion(name, layers, fit) {
  clearRegionOutline();
  const token = regionToken;
  loadRegionFile().then(data => {
    if (token !== regionToken) return;
    let shape = null, official = false;
    const feats = data ? data.features.filter(f => { const n = plain(f.properties.name); return n && (n.includes(plain(name)) || plain(name).includes(n)); }) : [];
    if (feats.length) { shape = { type: 'FeatureCollection', features: feats }; official = true; }
    else {
      const pts = [];
      layers.forEach(l => (function walk(a) { a.forEach(x => Array.isArray(x) ? walk(x) : pts.push([x.lng, x.lat])); })(l.getLatLngs()));
      const h = hullOf(pts);
      if (h.length >= 3) shape = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [h.concat([h[0]])] } };
    }
    if (!shape) { fit(L.featureGroup(layers).getBounds()); return; }
    regionOutline = L.geoJSON(shape, { pane: 'regionPane', interactive: false,
      style: { color: '#d7191c', weight: 1.5, opacity: .9, dashArray: official ? null : '5 5', fillColor: '#d7191c', fillOpacity: 0.03 } }).addTo(map);
    const note = document.getElementById('filter-note');
    if (note) {
      note.dataset.keep = note.textContent;
      note.textContent = 'Red outline: ' + name + (official ? ' region.' : ' (drawn around its habitat records, not the official boundary).');
    }
    fit(official ? regionOutline.getBounds() : L.featureGroup(layers).getBounds().extend(regionOutline.getBounds()));
  });
}
function addRegionButtons() {
  const byRegion = {};
  allHabitat.forEach(l => { const r = l.feature.properties.region || 'Other'; (byRegion[r] = byRegion[r] || []).push(l); });
  const regions = Object.keys(byRegion).sort((x, y) => byRegion[y].length - byRegion[x].length);
  const sel = document.getElementById('area-select');
  if (regions.length < 2) { document.getElementById('area-pick').hidden = true; return; }   // one region: the pull-down would add nothing
  sel.add(new Option('All regions', ''));
  regions.forEach(r => sel.add(new Option(r + ' (' + byRegion[r].length + ')', r)));
  // the ranking list is on the left, so keep the habitat clear of it
  const fit = (bounds, maxZoom) => map.fitBounds(bounds, {
    paddingTopLeft: [window.innerWidth < 700 ? 20 : 380, 60], paddingBottomRight: [60, 60], maxZoom: maxZoom || 13 });
  sel.onchange = () => {
    if (!sel.value) { clearRegionOutline(); fit(L.featureGroup(allHabitat).getBounds()); return; }
    showRegion(sel.value, byRegion[sel.value], b => fit(b));
  };
}


// 10. RANKING LIST: "Which habitats have the largest share of their area protected?"
// The list sits top left, next to the menu button. The pull-down chooses how it is ranked
// (% protected, hectares protected, or habitat size). Clicking a result zooms to that habitat and opens its popup.
// Top left: the menu button (three lines) with the ranking list beside it, then the legend underneath.
// The zoom buttons are top right.
L.control.zoom({ position: 'topright' }).addTo(map);

// On a phone the menu button is alone at the top left, and the list and legend are stacked together at the bottom.
const menuHtml = '<button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="info-panel" aria-label="Learn about the amphibians and data" title="Learn about the amphibians and data"><span aria-hidden="true">i</span></button>';
const toolbar = L.control({ position: isPhone() ? 'bottomleft' : 'topleft' });
toolbar.onAdd = () => {
  const outer = L.DomUtil.create('div', 'topleft-row');
  const div = L.DomUtil.create('div', 'toolbar', outer);
  div.innerHTML =
    '<div class="toolbar-row">' +
      '<span class="toolbar-title">Which habitats are most protected?</span>' +
      '<button class="toolbar-min" id="results-toggle" title="Hide or show the results" aria-label="Hide or show the results">+</button>' +
    '</div>' +
    '<div class="results hidden" id="results">' +
      '<label class="rank">Rank by <select id="rank">' +
        '<option value="pct">% of the habitat protected</option>' +
        '<option value="ha">hectares protected</option>' +
        '<option value="size">habitat size</option>' +
      '</select></label>' +
      '<details class="sp-pick" id="sp-pick"><summary id="sp-summary">Amphibians: all</summary><div class="sp-list" id="sp-list"></div></details>' +
      '<div class="results-note" id="results-note"></div>' +
      '<ol id="results-list"></ol>' +
    '</div>';
  // Clicks and scrolling in the box don't move or zoom the map behind it.
  L.DomEvent.disableClickPropagation(outer);
  L.DomEvent.disableScrollPropagation(outer);
  return outer;
};
// the "Learn about the amphibians and data" button is the first control at the top left, on every screen size
const menuCtl = L.control({ position: 'topleft' });
menuCtl.onAdd = () => { const d = L.DomUtil.create('div', 'menu-ctl'); d.innerHTML = menuHtml; L.DomEvent.disableClickPropagation(d); return d; };
menuCtl.addTo(map);
if (isPhone()) {
  legend.addTo(map);               // bottom corner: the control added last sits on top, so the legend goes first (lowest)
  toolbar.addTo(map);
} else {
  toolbar.addTo(map);
  legend.addTo(map);               // added after the list, so it sits right under it
}

// The menu button opens and closes the info panel (section 11).
function setPanelOpen(open) {
  document.getElementById('info-panel').classList.toggle('open', open);
  document.getElementById('menu-btn').setAttribute('aria-expanded', open);
}
document.getElementById('menu-btn').onclick = () => setPanelOpen(!document.getElementById('info-panel').classList.contains('open'));

// Hide or show the results list.
document.getElementById('results-toggle').onclick = () => {
  const box = document.getElementById('results');
  const hidden = box.classList.toggle('hidden');
  document.getElementById('results-toggle').textContent = hidden ? '+' : '–';
  document.getElementById('results-toggle').setAttribute('aria-expanded', !hidden);
};
// the whole title bar of the list is a button too
document.querySelector('.toolbar-title').onclick = () => document.getElementById('results-toggle').click();
// on a big window the list starts open; on a phone or a short window it starts as one bar
// the list starts closed too (press its bar to open it)

let highlight = null;     // the yellow outline around the habitat you clicked in the list
let highlightLayer = null; // the habitat that outline belongs to

// The yellow outline belongs to one answer. When a different popup opens (a click on the map),
// or that habitat's popup is closed, the outline goes too, so it never marks an old answer.
function clearHighlight() {
  if (highlight) map.removeLayer(highlight);
  highlight = null;
  highlightLayer = null;
}
// On a phone the list and legend would sit on top of a popup, so fold both up when a popup opens.
map.on('popupopen', () => {
  if (!isPhone()) return;
  const lg = document.querySelector('.legend');
  if (lg && !lg.classList.contains('collapsed')) lg.querySelector('.legend-min').click();
  if (!document.getElementById('results').classList.contains('hidden')) document.getElementById('results-toggle').click();
});
map.on('click', () => { if (window.setOptions) window.setOptions(false); });
map.on('popupopen', e => { if (highlightLayer && e.popup._source !== highlightLayer) clearHighlight(); });
map.on('popupclose', e => { if (highlightLayer && e.popup._source === highlightLayer) clearHighlight(); });

// Runs once the habitat data has loaded.
function setUpSearch() {
  const rank = document.getElementById('rank');
  const list = document.getElementById('results-list');
  const note = document.getElementById('results-note');

  // One entry per habitat: its shape on the map and its data.
  const records = [];
  groups.habitat.eachLayer(layer => records.push({ layer: layer, p: layer.feature.properties }));

  // How the list is sorted. The tie-break matters: many small habitats are 100% protected,
  // so the one with more protected hectares comes first.
  const sorters = {
    pct:  (a, b) => (b.p.pct_protected - a.p.pct_protected) || (b.p.protected_ha - a.p.protected_ha),
    ha:   (a, b) => (b.p.protected_ha - a.p.protected_ha) || (b.p.pct_protected - a.p.pct_protected),
    size: (a, b) => b.p.habitat_ha - a.p.habitat_ha
  };

  // The amphibian pull-down: tick the amphibians you want in the list, or "All amphibians".
  const spNames = new Map();
  records.forEach(r => spNames.set(r.p.SNAME, String(r.p.GCOMNAME || r.p.SCOMNAME || r.p.SNAME).replace(/\s[-–]\s.*$/, '')));
  const chosen = new Set(spNames.keys());
  const spList = document.getElementById('sp-list');
  const allLab = document.createElement('label'); allLab.className = 'sp-row sp-all';
  const allBox = document.createElement('input'); allBox.type = 'checkbox'; allBox.checked = true;
  allLab.append(allBox, document.createTextNode(' All amphibians'));
  spList.appendChild(allLab);
  const spBoxes = [];
  spNames.forEach((name, sname) => {
    const lab = document.createElement('label'); lab.className = 'sp-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.value = sname;
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = colourFor(sname);
    lab.append(cb, dot, document.createTextNode(name));
    cb.onchange = () => { cb.checked ? chosen.add(sname) : chosen.delete(sname); spChanged(); };
    spBoxes.push(cb); spList.appendChild(lab);
  });
  allBox.onchange = () => {
    spBoxes.forEach(cb => { cb.checked = allBox.checked; allBox.checked ? chosen.add(cb.value) : chosen.delete(cb.value); });
    spChanged();
  };
  function spChanged() {
    allBox.checked = chosen.size === spNames.size;
    allBox.indeterminate = chosen.size > 0 && chosen.size < spNames.size;
    document.getElementById('sp-summary').textContent = 'Amphibians: ' +
      (chosen.size === spNames.size ? 'all' : chosen.size === 0 ? 'none' : chosen.size === 1 ? spNames.get([...chosen][0]) : chosen.size + ' of ' + spNames.size);
    showAll = false; render(); list.scrollTop = 0;
  }

  // The list shows the top 10. The button under it shows every habitat, and back again.
  let showAll = false;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'more-btn';
  list.insertAdjacentElement('afterend', more);
  more.onclick = () => { showAll = !showAll; render(); };

  function render() {
    let rows = records.filter(r => chosen.has(r.p.SNAME));
    // Show only habitats that have some protection (unless ranking by size).
    if (rank.value !== 'size') rows = rows.filter(r => r.p.is_protected);
    rows.sort(sorters[rank.value]);

    note.textContent = chosen.size === 0 ? 'Tick at least one amphibian.' : rows.length === 0 ? 'No habitat to show.' :
      rows.length + (rank.value === 'size' ? ' habitats' : ' habitats have some protection') +
      (rows.length > 10 && !showAll ? ' (top 10 shown)' : '');

    more.hidden = rows.length <= 10;
    more.textContent = showAll ? 'Show only the top 10' : 'See all ' + rows.length + ' habitats';

    list.innerHTML = '';
    rows.slice(0, showAll ? rows.length : 10).forEach(r => {
      const li = document.createElement('li');
      li.innerHTML =
        '<span class="dot" style="background:' + colourFor(r.p.SNAME) + '"></span>' +
        '<b>' + esc(r.p.GCOMNAME || r.p.SCOMNAME || r.p.SNAME) + '</b> ' +
        '<span class="pct">' + num(r.p.pct_protected, 1) + '% protected</span>' +
        '<div class="small">' + num(r.p.protected_ha) + ' of ' + num(r.p.habitat_ha) + ' ha' +
        (r.p.protected_by ? ' · ' + esc(shortNames(r.p.protected_by)) :
          ' · not protected' + (r.p.nearest_km != null ? ' (nearest protected area ' + num(r.p.nearest_km, 1) + ' km away)' : '')) + '</div>';
      li.onclick = () => showHabitat(r);
      makeButton(li);
      list.appendChild(li);
    });
  }

  // Zoom to a habitat from the list, outline it in yellow and open its popup.
  function showHabitat(r) {
    if (filters.zones) { setZonesOnly(false); refreshHabitat(); }      // "only protection zones" is on: bring the habitat back
    if (!map.hasLayer(groups.habitat)) map.addLayer(groups.habitat);
    // in case the legend or a chip hid this habitat, show it again
    if (!groups.habitat.hasLayer(r.layer)) { hiddenSpecies.delete(r.p.SNAME); filters.prov = null; filters.unprot = null; setFocus(false); refreshHabitat(); }
    document.querySelectorAll('.legend-item[data-species]').forEach(el => el.classList.toggle('off', hiddenSpecies.has(el.dataset.species)));
    clearHighlight();
    highlight = L.geoJSON(r.layer.feature, {
      pane: 'overlapPane', interactive: false,
      style: { color: '#ffb000', weight: 4, fill: false }
    }).addTo(map);
    highlightLayer = r.layer;
    // paddingTopLeft keeps the habitat clear of the list on the left, so its popup is not hidden behind it
    map.fitBounds(r.layer.getBounds(), { paddingTopLeft: [380, 60], paddingBottomRight: [60, 60], maxZoom: 14 });
    r.layer.openPopup();
  }

  rank.onchange = () => { showAll = false; render(); list.scrollTop = 0; };
  render();
}


// 11. INFO PANEL (opens from the round menu button, top left)
// Finds the panel written in index.html and moves it inside the map so it slides over it.
const panel = document.getElementById('info-panel');
map.getContainer().appendChild(panel);

// Clicks and scrolling inside the panel don't move or zoom the map behind it.
L.DomEvent.disableClickPropagation(panel);
L.DomEvent.disableScrollPropagation(panel);

// Tabs: show one section of the panel at a time.
document.querySelectorAll('#info-panel .tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('#info-panel .tab').forEach(x => {
      const on = x === t;
      x.classList.toggle('on', on); x.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('#info-panel .tabpane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + t.dataset.tab));
    panel.scrollTop = 0;
  };
});

// Buttons inside the panel that zoom the map to a region (they use the "Zoom to" pull-down in the top bar).
document.querySelectorAll('#info-panel .zoom-link').forEach(b => {
  b.onclick = () => {
    const sel = document.getElementById('area-select');
    const opt = [...sel.options].find(o => o.value && o.value.startsWith(b.dataset.region));
    document.getElementById('info-close').click();                  // close the panel so the map is visible
    if (opt) { sel.value = opt.value; sel.onchange(); }
    else if (allHabitat.length) map.fitBounds(groups.habitat.getBounds(), { padding: [40, 40] });
  };
});

document.getElementById('info-close').onclick = () => setPanelOpen(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape') setPanelOpen(false); });

// A drag bar on the right edge of the panel makes it wider or narrower (arrow keys work too). Not on a phone, where it is full width.
const mapBox = map.getContainer();
const handle = document.createElement('div');
handle.id = 'panel-resize';
handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
handle.setAttribute('aria-label', 'Panel width. Drag, or use the left and right arrow keys');
handle.title = 'Drag to make the panel wider or narrower';
handle.tabIndex = 0;
mapBox.appendChild(handle);
L.DomEvent.disableClickPropagation(handle);
function setPanelWidth(w) {
  w = Math.max(340, Math.min(w, Math.min(900, mapBox.clientWidth * 0.9)));
  mapBox.style.setProperty('--panel-w', w + 'px');
  handle.setAttribute('aria-valuenow', Math.round(w));
  try { localStorage.setItem('panelWidth', Math.round(w)); } catch (e) {}
}
try { const saved = Number(localStorage.getItem('panelWidth')); if (saved) setPanelWidth(saved); } catch (e) {}
let resizing = false;
handle.addEventListener('pointerdown', e => { resizing = true; handle.setPointerCapture(e.pointerId); mapBox.classList.add('resizing'); e.preventDefault(); });
handle.addEventListener('pointermove', e => { if (resizing) setPanelWidth(e.clientX - mapBox.getBoundingClientRect().left); });
const stopResize = () => { resizing = false; mapBox.classList.remove('resizing'); };
handle.addEventListener('pointerup', stopResize);
handle.addEventListener('pointercancel', stopResize);
handle.addEventListener('keydown', e => {
  const w = panel.getBoundingClientRect().width;
  if (e.key === 'ArrowRight') { setPanelWidth(w + 30); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { setPanelWidth(w - 30); e.preventDefault(); }
});

// Fills the "Conservation sites overlapping" section from the data: one row per species,
// then the protected areas that overlap the most habitat sites.
function fillPanel(sites) {
  const bySpecies = new Map();
  const areas = new Map();
  sites.forEach(f => {
    const p = f.properties;
    const row = bySpecies.get(p.SNAME) || { sname: p.SNAME, name: p.GCOMNAME || p.SCOMNAME || p.SNAME, n: 0, prot: 0, ha: 0, haProt: 0 };
    row.n++; row.ha += p.habitat_ha || 0; row.haProt += p.protected_ha || 0;
    if (p.is_protected) row.prot++;
    bySpecies.set(p.SNAME, row);
    (p.protected_by || '').split('; ').filter(Boolean).forEach(a => areas.set(a, (areas.get(a) || 0) + 1));
  });

  let html = '<table class="mini"><tr><th>Species</th><th>Sites</th><th>Protected</th><th>Area protected</th></tr>';
  [...bySpecies.values()].sort((a, b) => b.n - a.n).forEach(r => {
    html += '<tr><td><span class="dot" style="background:' + colourFor(r.sname) + '"></span>' + esc(r.name) + '</td><td>' + r.n + '</td><td>' + r.prot + '</td><td>' +
            num(r.ha ? 100 * r.haProt / r.ha : 0, 1) + '%</td></tr>';
  });
  html += '</table>';
  const top = [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) {
    html += '<h3 class="grp">Protected areas that overlap the most habitat sites</h3><table class="mini sys"><tr><th>Protected area</th><th>Sites</th></tr>';
    top.forEach(([name, n]) => { html += '<tr><td>' + esc(name) + '</td><td>' + n + '</td></tr>'; });
    html += '</table>';
  }
  document.getElementById('panel-overlap').innerHTML = html;
  const totalHa = sites.reduce((t, f) => t + (f.properties.habitat_ha || 0), 0);
  const protHa = sites.reduce((t, f) => t + (f.properties.protected_ha || 0), 0);
  const nProt = sites.filter(f => f.properties.is_protected).length;
  const card = (n, text, bad) => '<div class="fact' + (bad ? ' bad' : '') + '"><b>' + n + '</b><span>' + text + '</span></div>';
  document.getElementById('panel-facts').innerHTML =
    card(sites.length, 'habitat sites on the map') +
    card(nProt, 'sites overlap a protected area') +
    card(num(totalHa ? 100 * protHa / totalHa : 0, 1) + '%', 'of all the habitat area is protected', true);
  // the colour dots next to the species names in the panel match the legend
  document.querySelectorAll('#info-panel .dot[data-sp]').forEach(d => { 
    d.style.background = colourFor(d.dataset.sp);
    const det = d.closest('details');
    if (det) det.style.borderLeft = '5px solid ' + colourFor(d.dataset.sp);
  });
}


// 12. scale bar
new L.Control.Scale({ position: 'bottomright' }).addTo(map);
