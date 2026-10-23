// 1. Create map and set its initial view. The map is drawn in the <div> with id="map" in index.html.
const map = L.map('map').setView([45.42, -73.44], 11);

// 2. Basemap 
// OpenStreetMap tiles. The attribution text (bottom right) is required by their licence.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



// 3. Stacking order of the layers

// A higher zIndex is drawn on top. Bottom to top:
//   habitat (400) -> protected areas (450) -> overlap (500)
// The overlap sits on top so it stays clickable.
map.createPane('habitatPane');   map.getPane('habitatPane').style.zIndex = 400;
map.createPane('protectedPane'); map.getPane('protectedPane').style.zIndex = 450;
map.createPane('overlapPane');   map.getPane('overlapPane').style.zIndex = 500;


// 4. SETTINGS FOR THE LAYERS
// 'groups' stores each layer once it has loaded, so the legend can switch them on and off.
const groups = {};

// Scientific name of the Western chorus frog. Records of other species are skipped & have everything in English 
const frogName = 'Pseudacris triseriata';

const statusEnglish = {
  'Menacée': 'Threatened',
  'Vulnérable': 'Vulnerable'
};
const designationEnglish = {
  'Milieu naturel de conservation volontaire': 'Voluntary conservation natural area',
  'Réserve naturelle reconnue': 'Recognized nature reserve',
  'Réserve écologique': 'Ecological reserve',
  'Réserve nationale de faune': 'National wildlife reserve',
  'Parc national': 'National park',
  'Réserve de biodiversité projetée': 'Proposed biodiversity reserve',
  'Autres mesures de conservation efficaces': 'Other effective area-based conservation measure',
  'Autres mesures de conservation efficaces (fédérale)': 'Other effective area-based conservation measure (federal)'
};
const inEnglish = (table, value) => table[value] || value;

// Look of each layer: color = border, fillColor = inside, weight = border thickness 
const styles = {
  habitat:   { color: '#00305c', weight: 1, fillColor: '#00305c', fillOpacity: 0.8,  lineJoin: 'round' },
  protected: { color: '#640000', weight: 1, fillColor: '#640000', fillOpacity: 0.8,  lineJoin: 'round' },
  overlap:   { color: '#003c15', weight: 2, fillColor: '#003c15', fillOpacity: 0.8, lineJoin: 'round' }
};


// COLOUR BY A VALUE (Lab 5): the protected areas are coloured by the year they were established
// (DA_CREATIO looks like '1994-10-06'). Light = older, dark = newer. The legend (section 9)
// calls colourFor too, so the legend and the map can never disagree.
function colourFor(year) {
  if (year >= 2020) return '#cb181d';   // 2020 or later
  if (year >= 2010) return '#fb6a4a';   // 2010 to 2019
  if (year >= 2000) return '#fcae91';   // 2000 to 2009
  return '#fee5d9';                     // before 2000
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
              fillOpacity: Math.min(base.fillOpacity + 0.8, 1)
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
        'Could not load ' + url + '. Open this page with Live Server and check the file is in the data folder.';
    });
}


// 6. LAYER 1: Western chorus frog habitat (bottom)
addGroup('habitat', '../data/monteregie_amphibians.geojson', 'habitatPane', styles.habitat,

  // Popup text when you click a habitat
  p => '<b>' + p.GCOMNAME + '</b><br><i>' + p.SNAME + '</i><br>Status: ' + inEnglish(statusEnglish, p.LOIEMV) +
       '<br>Protected by: ' + (p.protected_by || 'none'),

  // Only draw chorus frog records (hides the other species)
  f => f.properties.SNAME === frogName,

  // After loading: write the headline under the title and zoom to the habitat
  data => {
    const frogs = data.features.filter(f => f.properties.SNAME === frogName);   // all chorus frog sites
    const prot = frogs.filter(f => f.properties.is_protected).length;           // sites touching a protected area
    document.getElementById('status').textContent =
      prot + ' of ' + frogs.length + ' recorded Western chorus frog sites overlap a protected area.';
    map.fitBounds(groups.habitat.getBounds(), { padding: [30, 30] });           // zoom to the data
  });


// 7. LAYER 2: Conservation areas (middle)
// Popup text when you click a protected area: name, type, creation date.
const protPopup = p => '<b>' + (p.NOM || 'Unnamed site') + '</b><br>' +  inEnglish(designationEnglish, p.DESIGNOM) +
                       '<br>Created: ' + (p.DA_CREATIO || 'n/a');

addGroup('protected', '../data/protected_monteregie.geojson', 'protectedPane', styles.protected, protPopup,
  undefined,        // no filter: draw every protected area

  // After loading: colour each area by the year it was established
  () => {
    groups.protected.options.style = f => ({ ...styles.protected, fillColor: colourFor(parseInt(f.properties.DA_CREATIO)), fillOpacity: 0.8 });
    groups.protected.setStyle(groups.protected.options.style);
  });



// 8. LAYER 3: Chorus frog habitat inside a protected area (top)
// The piece of habitat that overlaps a protected area (made in the notebook).
addGroup('overlap', '../data/frog_protected_overlap.geojson', 'overlapPane', styles.overlap,
  p => '<b>Chorus frog habitat inside a protected area</b><br>' + (p.NOM || '') + '<br>' +  inEnglish(designationEnglish, p.DESIGNOM));


// 9. Legend
const legendSections = [
  { title: 'Western chorus frog', items: [
    { key: 'habitat', label: 'Recorded habitat',                color: '#00305c' },
    { key: 'overlap', label: 'Habitat inside a protected area', color: '#003c15' } ] },
  { title: 'Conservation areas (colour = year established)', items: [
    { key: 'protected', label: 'Protected area, 2020 or later', color: colourFor(2020) },
    { key: 'protected', label: 'Protected area, 2010 to 2019',  color: colourFor(2010) },
    { key: 'protected', label: 'Protected area, 2000 to 2009',  color: colourFor(2000) },
    { key: 'protected', label: 'Protected area, before 2000',   color: colourFor(1990) } ] }
];

const legend = L.control({ position: 'bottomright' });
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'legend');

  // Build the legend HTML: title + minimize button, then each section and its rows.
  let html = '<div class="legend-head"><span class="legend-title">Click a row to switch it on or off</span>' +
             '<button class="legend-min" title="Minimize" aria-label="Minimize legend">–</button></div>' +
             '<div class="legend-body">';
  legendSections.forEach(s => {
    html += '<div class="legend-sub">' + s.title + '</div>';        // section subtitle
    s.items.forEach(i => {
      html += '<div class="legend-item" data-key="' + i.key + '" style="--c:' + i.color + '">' +
              '<span class="box"></span>' + i.label + '</div>';     // one row with its colour box
    });
  });
  div.innerHTML = html + '</div>';

  // Clicking the legend doesn't click the map behind it.
  L.DomEvent.disableClickPropagation(div);

  // Minimize / expand button: hides the rows and swaps – and +.
  const btn = div.querySelector('.legend-min');
  btn.onclick = () => {
    const c = div.classList.toggle('collapsed');
    btn.textContent = c ? '+' : '–';
  };

  // Clicking a row turns its layer on or off. The box goes hollow when it's off.
  div.querySelectorAll('.legend-item').forEach(el => {
    el.onclick = () => {
      const g = groups[el.dataset.key];       // find the layer for this row
      if (!g) return;                         // not loaded yet: do nothing
      const turnOn = !map.hasLayer(g);                                           // is it hidden right now?
      if (turnOn) map.addLayer(g); else map.removeLayer(g);                      // show it / hide it
      // every row of this layer (the four protected-area rows) goes hollow or filled together
      div.querySelectorAll('.legend-item[data-key="' + el.dataset.key + '"]')
         .forEach(r => r.classList.toggle('off', !turnOn));
    };
  });
  return div;
};
legend.addTo(map);


// 10. scale bar 
new L.Control.Scale().addTo(map);
