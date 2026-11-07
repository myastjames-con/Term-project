// 1. Create map and set its initial view. The map is drawn in the <div> with id="map" in index.html.
// [52, -72] = latitude, longitude (roughly the middle of Québec). 5 = zoom level (bigger = closer).
// (Once the data loads, section 6 zooms the map to fit it.)
// The +/- zoom buttons go top left, under the menu button (added in section 10).
const map = L.map('map', { zoomControl: false }).setView([52, -72], 5);


// 2. Basemap
// Three basemaps to choose from (the layers button, top right). The light one starts: its quiet grey
// makes the coloured protected areas easy to see, which the green street map did not.
// The attribution text (bottom right) is required by the licences.
const osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const baseMaps = {
  // Esri's light grey map needs no key (the CARTO one now asks for an API key). It stops at zoom 16;
  // past that Leaflet stretches the last tiles instead of showing blanks.
  'Light map (easiest to read)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16, maxZoom: 19,
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
  }),
  'Street map (OpenStreetMap)': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: osmAttr
  }),
  'Satellite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
  })
};
baseMaps['Light map (easiest to read)'].addTo(map);
// The basemap is chosen from the "Background" pull-down in the top bar (index.html).
let currentBase = baseMaps['Light map (easiest to read)'];
(function () {
  const sel = document.getElementById('base-select');
  Object.keys(baseMaps).forEach(name => sel.add(new Option(name, name)));
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
const filters = { prov: null, unprot: null };
let allHabitat = [];                       // every habitat shape, shown or not

// DOTS. Many habitats are tiny, so zoomed out their shapes are almost invisible. Each habitat also gets a dot
// at its centre while the map is zoomed out (zoom 12 or less). The dot is in the species colour. A dark-purple
// ring means the habitat overlaps a protected area, a white ring means it does not. A dot opens the same popup.
const DOT_MAX_ZOOM = 12;
const dotGroup = L.layerGroup();
const dotOf = new Map();                   // habitat shape -> its dot
function makeDots() {
  allHabitat.forEach(l => {
    const p = l.feature.properties;
    const dot = L.circleMarker(l.getBounds().getCenter(), {
      pane: 'dotPane', radius: 7, weight: p.is_protected ? 3 : 2, color: p.is_protected ? '#3f007d' : '#ffffff',
      fillColor: colourFor(p.SNAME), fillOpacity: 1
    });
    dot.on('click', () => l.openPopup(dot.getLatLng()));
    dotOf.set(l, dot);
  });
}
function syncDots() {
  const zoomedOut = map.getZoom() <= DOT_MAX_ZOOM;
  allHabitat.forEach(l => {
    const dot = dotOf.get(l);
    if (!dot) return;
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
    el.innerHTML = '<span class="sw"></span>Only habitat with no protection <span class="n">' + nUn + '</span>';
    el.onclick = () => { filters.unprot = filters.unprot ? null : 'yes'; setFocus(!!filters.unprot); refreshHabitat(); };
    makeButton(el);
    bar.appendChild(el);
  }
  map.invalidateSize();                      // the bar changed height, so tell the map
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
      const where = (regions ? 'Area shown: ' + regions + '. ' : '') +
                    (meta.protected_scope === 'near' ? 'Protected areas shown: those within ' + meta.protected_near_km + ' km of a habitat.' : '');
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
    map.fitBounds(groups.habitat.getBounds(), { padding: [30, 30] });           // zoom to the data
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

const legend = L.control({ position: 'bottomleft' });
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'legend');

  // Build the legend HTML: title + minimize button, then each section and its rows.
  let html = '<div class="legend-head"><span class="legend-title">Legend <span class="legend-hint">(click a row to hide it)</span></span>' +
             '<button class="legend-min" title="Minimize" aria-label="Minimize legend">–</button></div>' +
             '<div class="legend-body">' +
             '<div class="legend-sub">Amphibian habitat</div><div id="legend-species"></div>' +
             '<div class="legend-note"><span class="ring-eg"></span> Dot = one site. Purple ring = protected.</div>' +
             '<div class="legend-sub">Protected areas</div><div id="legend-protected"></div>';
  legendSections.forEach(s => {
    html += '<div class="legend-sub">' + s.title + '</div>';        // section subtitle
    s.items.forEach(i => {
      html += '<div class="legend-item" data-key="' + i.key + '" style="--c:' + i.color + '">' +
              '<span class="box"></span>' + i.label + '</div>';     // one row with its colour box
    });
  });
  div.innerHTML = html + '</div>';
  div.querySelectorAll('.legend-item').forEach(makeButton);

  if (window.innerWidth < 700 || window.innerHeight < 650) div.classList.add('collapsed');   // on a phone or a short window the legend starts closed so the map is visible

  // Clicking the legend doesn't click the map behind it.
  L.DomEvent.disableClickPropagation(div);

  // Minimize / expand button: hides the rows and swaps – and +.

  // Minimize / expand button: hides the rows and swaps – and +.
  const btn = div.querySelector('.legend-min');
  if (div.classList.contains('collapsed')) btn.textContent = '+';
  btn.onclick = () => {
    const c = div.classList.toggle('collapsed');
    btn.textContent = c ? '+' : '–';
    if (!c) closeResults();                       // the list and the legend share the left side: one open at a time
  };

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
legend.addTo(map);


// "Go to" pull-down in the top bar: zoom to each region that has habitat (the notebook writes the region of each record).
// The regions can be far apart, so with all of them in view each one is small.
function addRegionButtons() {
  const byRegion = {};
  allHabitat.forEach(l => { const r = l.feature.properties.region || 'Other'; (byRegion[r] = byRegion[r] || []).push(l); });
  const regions = Object.keys(byRegion).sort((x, y) => byRegion[y].length - byRegion[x].length);
  const sel = document.getElementById('area-select');
  if (regions.length < 2) { sel.hidden = true; return; }          // one region: the pull-down would add nothing
  sel.add(new Option('Zoom to: all habitat', ''));
  regions.forEach(r => sel.add(new Option('Zoom to: ' + r + ' (' + byRegion[r].length + ')', r)));
  sel.onchange = () => {
    const ls = sel.value ? byRegion[sel.value] : allHabitat;
    // the ranking list is on the left, so keep the habitat clear of it
    map.fitBounds(L.featureGroup(ls).getBounds(), {
      paddingTopLeft: [window.innerWidth < 700 ? 20 : 380, 60], paddingBottomRight: [60, 60], maxZoom: 13 });
  };
}


// 10. RANKING LIST: "Which habitats have the largest share of their area protected?"
// The list sits top left, next to the menu button. The pull-down chooses how it is ranked
// (% protected, hectares protected, or habitat size). Clicking a result zooms to that habitat and opens its popup.
// The menu button (three lines) is its own control, top left. The ranking list is top right.
const menuCtl = L.control({ position: 'topleft' });
menuCtl.onAdd = () => {
  const div = L.DomUtil.create('div', 'menu-ctl');
  div.innerHTML = '<button class="menu-btn" id="menu-btn" title="About these amphibians" aria-label="Open the information panel">&#9776;</button>';
  L.DomEvent.disableClickPropagation(div);
  return div;
};
menuCtl.addTo(map);
L.control.zoom({ position: 'topleft' }).addTo(map);

const toolbar = L.control({ position: 'topleft' });
toolbar.onAdd = () => {
  const div = L.DomUtil.create('div', 'toolbar');
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
      '<div class="results-note" id="results-note"></div>' +
      '<ol id="results-list"></ol>' +
    '</div>';
  // Clicks and scrolling in the box don't move or zoom the map behind it.
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);
  return div;
};
toolbar.addTo(map);

// The menu button opens and closes the info panel (section 11).
document.getElementById('menu-btn').onclick = () => document.getElementById('info-panel').classList.toggle('open');

// Hide or show the results list.
function closeResults() {
  document.getElementById('results').classList.add('hidden');
  document.getElementById('results-toggle').textContent = '+';
}
document.getElementById('results-toggle').onclick = () => {
  const box = document.getElementById('results');
  const hidden = box.classList.toggle('hidden');
  document.getElementById('results-toggle').textContent = hidden ? '+' : '–';
  if (!hidden) {                                   // opening the list closes the legend (they share the left side)
    const lg = document.querySelector('.legend');
    if (lg && !lg.classList.contains('collapsed')) lg.querySelector('.legend-min').click();
  }
};
// the whole title bar of the list is a button too
document.querySelector('.toolbar-title').onclick = () => document.getElementById('results-toggle').click();

let highlight = null;     // the yellow outline around the habitat you clicked in the list
let highlightLayer = null; // the habitat that outline belongs to

// The yellow outline belongs to one answer. When a different popup opens (a click on the map),
// or that habitat's popup is closed, the outline goes too, so it never marks an old answer.
function clearHighlight() {
  if (highlight) map.removeLayer(highlight);
  highlight = null;
  highlightLayer = null;
}
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

  // The list shows the top 10. The button under it shows every habitat, and back again.
  let showAll = false;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'more-btn';
  list.insertAdjacentElement('afterend', more);
  more.onclick = () => { showAll = !showAll; render(); };

  function render() {
    let rows = records.slice();
    // Show only habitats that have some protection (unless ranking by size).
    if (rank.value !== 'size') rows = rows.filter(r => r.p.is_protected);
    rows.sort(sorters[rank.value]);

    note.textContent = rows.length === 0 ? 'No habitat to show.' :
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

document.getElementById('info-close').onclick = () => panel.classList.remove('open');
document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });

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
    html += '<p class="small">Protected areas that overlap the most habitat sites:</p><ul class="small">';
    top.forEach(([name, n]) => { html += '<li>' + esc(name) + ' (' + n + ')</li>'; });
    html += '</ul>';
  }
  document.getElementById('panel-overlap').innerHTML = html;
  // the colour dots next to the species names in the panel match the legend
  document.querySelectorAll('#info-panel .dot[data-sp]').forEach(d => { 
    d.style.background = colourFor(d.dataset.sp);
    const det = d.closest('details');
    if (det) det.style.borderLeft = '5px solid ' + colourFor(d.dataset.sp);
  });
}


// 12. scale bar
new L.Control.Scale({ position: 'bottomright' }).addTo(map);
