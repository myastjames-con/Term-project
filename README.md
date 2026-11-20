https://myastjames-con.github.io/Term-project/site/

> The sections below were written for A2 (Montérégie, Western chorus frogs). The A3 feature, its tests and its results are at the bottom, under "A3 feature". The current map covers Québec, shows three at-risk amphibians (the Western chorus frog, the Northern spring salamander and the Allegheny Mountain dusky salamander) and ranks their habitats by how much of their area is protected.

# GEOG 464: Threatened amphibians and protected areas in Québec (A2 map, A3 feature)

Core action: amphibian conservation groups can see which recorded Western chorus frog habitats in Montérégie overlap a protected area, and which do not.

## Five sentences
1. This project is for conservation groups that would like to assess where Western Chorus frogs live to enlarge conservation sites. 
2. The frog’s habitat is shrinking in Montérégie due to housing development and urban sprawl, which is why we need conservation sites to protect them.
3. The map shows the Western Chorus frogs habitats in the Montérégie area, with protected areas and other conservation measures recorded in Québec’s registry on top and a third layer of only the intersecting parts of the last two layers. 
4. The reader can click on the different habitas and zones to give more information on them, like the name, the year created, the scientific name of the frog, etc. 
5. The data is species-at-risk occurrences, the protected areas registry and the regional boundary.

```
Term-project/
  data/
    amphibians.geojson                  amphibian habitat, with is_protected, protected_by, nearest_name, nearest_km
    protected_areas.geojson             protected areas shown on the map
    amphibian_protected_overlap.geojson the parts of habitat inside a protected area
    meta.json                           counts and settings written by the notebook
    regions.geojson                     the outlines of the study regions (written by the notebook), used for the red region outline
    frog_protected_overlap.geojson, protected_monteregie.geojson, longueuil_order_lots.geojson   earlier (A2) files
    *.gpkg                              NOT included (over 20 MB), see "Data not included"
  notebooks/
    Amphibian.ipynb                     reads the data, cleans it, writes the GeoJSON files, ends with a check cell
  site/
    index.html  style.css  app.js       the page
    remember.js                         the Lab 9 file that saves the map view in the reader's browser
  README.md
```

## How to run it
To view the page (no downloads needed): open the live link at the top, or open `site/index.html` with Live Server (right-click, Open with Live Server). The GeoJSON files it uses are included in `data/`.

To re-run the notebook: download the three datasets listed under "Data not included" into `data/`, then open `notebooks/Amphibian.ipynb` and choose Run All. The last cell prints `CHECK PASSED`.
## Where the data comes from
| Dataset | Source | Licence | Accessed | What I changed |
|---|---|---|---|---|
| Occurrences d'espèces en situation précaire, layer `EMVS_publique` | CDPNQ, MELCCFP, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/occurrences-especes-en-situation-precaire | CC-BY 4.0 | September 29th, 2026 | Kept amphibians (matched on scientific name): 13,298 → 856 records. Clipped to Montérégie: 856 → 90 records (56 Western chorus frog). Converted from EPSG:32198 to EPSG:4326. |
| Registre des aires protégées et des AMCE au Québec, layer `AP_REG_S` | MELCCFP, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/aires-protegees-au-quebec | CC-BY 4.0 | September 29th, 2026| 5,611 areas → 266 touching Montérégie → 259 after removing plant habitat designations → 189 after removing bird, muskrat and heron designations. Converted from EPSG:32198 to EPSG:4326. |
| Découpages administratifs, layer `regio_s` | Ministère des Ressources naturelles et des Forêts, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs | CC-BY 4.0 | September 29th, 2026 | Kept the Montérégie region (1 polygon). Converted from EPSG:4269 to EPSG:4326. |
Basemaps: Esri, HERE, Garmin, © OpenStreetMap contributors (the light grey map, which the page starts with); © OpenStreetMap contributors (street map); Esri, Maxar, Earthstar Geographics (satellite).

## Testing
Check cell: the last cell of the notebook tests the count (90 records, 56 chorus frogs), the projection (EPSG:4326), the area (all records inside Montérégie), the columns the page uses, and that the overlap file now agrees with the `is_protected` column. It prints `CHECK PASSED`.

What it caught: Before I added the join, the page headline said none of the sites were protected because the `is_protected` column did not exist.

Stranger test: My sister zoomed into the map to look and the conservation zones and played with the legend to switch layers on and off while reading the story simultaneously. I changed some sizing of the text since it looked small and not easily readable and changed some of my colours since they didn't represent my theme. 

## Not in this iteration
- This map does not show housing and urban growth. Development is a major pressure on this habitat, but the map doesn’t show it because I couldn’t find a dataset that shows it yet.
- This map does not include other kinds of protection. “Protected” on the map only means the habitat zones overlap the protected areas data. It doesn’t include legal protections that don’t have a map (such as the wetland permit rules).
- This map does not have federal critical habitat areas for the chorus frog, because I couldn’t find a direct download of the map file yet.

Next thing I will build: A more in depth information panel with a photo, history, habitat details of this species, and a section explaining why they matter to wetland ecosystems. 

## Data not included
These three files are over 20 MB, So i left them out of the ZIP. (would need to Download the GPKG version of each from its link and save it in data/)

1. **`emvs_dq.gpkg`**: Occurrences d'espèces en situation précaire (MELCCFP). https://www.donneesquebec.ca/recherche/dataset/occurrences-especes-en-situation-precaire
   My filter: layer `EMVS_publique`; kept amphibian genera matched on the scientific name (`SNAME`); then kept records inside the Montérégie boundary. 13,298 → 856 → 90 records.
2. **`registre_aires_prot_GPKG/registre_aires_prot.gpkg`**: Registre des aires protégées et des AMCE au Québec (MELCCFP). https://www.donneesquebec.ca/recherche/dataset/aires-protegees-au-quebec
   My filter: layer `AP_REG_S`; kept areas touching Montérégie; removed designations containing "floristique", "oiseaux", "rat musqu" or "Héronni". 5,611 → 266 → 259 → 189 areas.
3. **`SDA.gpkg`**: Découpages administratifs (Ministère des Ressources naturelles et des Forêts). https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs
   My filter: layer `regio_s`; kept the region where `RES_NM_REG` contains "Montérégie" (1 polygon).

## AI disclosure
I used Claude AI (Sonnet 5.5, from my Claude app) for this project. I asked it to write and explain the GeoPandas steps in my notebook, since I realized that I didn't actually understand why I needed to do this or what it does. The AI helped me clip all my layers to the Montérégie area and helped me create the third clipped layer of the overlapping first and second layers. It also wrote some of the Leaflet code in app.js (the layers, stacking order, popups and clickable legend) and helped me write and understand the notebook’s check cell.

I did not accept everything. For example, I rejected a rectangular study area and decided to use the real Montérégie boundary. I chose to remove bird, muskrat and heron conservation areas because they aren’t aimed at amphibians, and I narrowed the map to the Western chorus frog. I also changed the legend to a filled colour box instead of a strike-through (which is what Claude initially did), and changed the colours to suit my theme.

I tested by running the notebook until the check cell passed. It caught that my page said no sites were protected because the protected-site column was missing. My sister also used the page, and I enlarged the text and changed colours because of it.

The topic, the scope decisions, the story on the page and the final checks were all mine. Claude suggested a sentence and sources for my lede, which I adapted. 

For A3 I also asked Claude to search for the amphibians at risk in Québec and who rates them (Québec, COSEWIC, SARA and the IUCN), and to draft the species and status text in the side panel from the government pages it found. The sources are linked in the panel, and I checked the statuses against them.

## After the demo
At my demo, I didn't have all my amphibina data in I only had Western Chorus forgs.
Today I will make my second layer (protected areas) coloured by which year they were established so that it answer the question of which one has been there the longest. 

## A3 data update: two species, and protected areas grouped by who protects them
**Species.** The map shows the three amphibians that Québec has designated threatened or vulnerable and that have a recorded habitat in the data: the Western chorus frog (*Pseudacris triseriata*, threatened), the Allegheny Mountain dusky salamander (*Desmognathus ochrophaeus*, Appalachian population, threatened) and the Northern spring salamander (*Gyrinophilus porphyriticus*, Adirondack / Appalachian population, vulnerable). The setting `SPECIES_STATUS` in the notebook lists them and the legal statuses (the `LOIEMV` column) that are kept. Four more amphibians are "likely to be designated" in Québec (Pickerel frog, Boreal chorus frog, Four-toed salamander and Northern dusky salamander) and are not on the map, because they have no legal status yet.

**The side panel compares four ways of saying a species is at risk:** Québec law, COSEWIC, the federal *Species at Risk Act* (Schedule 1) and the IUCN Red List. For each it says who decides, how they measure, what the labels mean and what each of the three species is rated, with the year when I could confirm it. The IUCN ratings (all Least Concern) are the least checked: the IUCN website did not open for me, so I took them from Wikipedia, which cites the IUCN (2022 for the Western chorus frog). Québec's page does not give the year of each designation.

**Changes from the A2 feedback.** (1) Classmates found the zones hard to see against the green basemap, so Québec parks and reserves are now purple, not green, and the zone outlines are thicker. (2) Luke suggested showing the nearest protected area to an unprotected site, so the notebook now measures it (`gpd.sjoin_nearest`, in metres in EPSG:32198) and the popup of an unprotected habitat says which protected area is nearest and how far away it is. (3) The ranking list has a "See all" button under the top 10, and the light basemap makes the zones easier to see than the green street map (the layers button switches between light, street and satellite). Two more helpers for reading the map: "Show only habitat with no protection" also hides the protected areas, and there is a zoom button for each region that has habitat, since the regions are far apart. (4) The notebook simplifies the shapes (the `TOLERANCES` setting) so the page loads quickly. Not done: older data over time, iNaturalist photos, and other amphibians for contrast (see "Not in this iteration").

**Area covered.** The map covers the Québec administrative regions where the three species are recorded: Outaouais (Gatineau, Shawville, Île du Grand Calumet), Montérégie (the Western chorus frog and Covey Hill), and Estrie, Chaudière-Appalaches and Centre-du-Québec (the salamanders) (the setting `STUDY_REGIONS` in the notebook; the boundaries come from `SDA.gpkg`). Habitat records and protected areas outside those regions are dropped, and the notebook prints how many records that removes.

**Protected areas shown.** The frogs are recorded in a small part of Québec (Outaouais and Montérégie), so inside those regions the map only shows the protected areas within 10 km of a recorded habitat (the setting `PROTECTED_SCOPE = "near"` and `PROTECTED_NEAR_KM` in the notebook). The other protected areas in Québec are far from any frog record and only slowed the page down. The percentages are not affected: they only count protected areas that overlap a habitat, and every one of those is within 10 km by definition.

**"Show only habitat with no protection."** A chip at the top shows only the habitat that no protected area covers, which is where a new conservation site would add the most. The top bar also gives three numbers: the habitat sites, how many overlap a protected area, and the share of the habitat area that is protected.

**Protected area groups.** The legend groups the registry's designations by who protects the land: federal parks, reserves and measures; Québec parks and reserves; Québec forest and wildlife refuges; private and voluntary conservation; and threatened-species habitat (Québec's designation for the habitat of a threatened or vulnerable species, plus the federal Emergency Order in Longueuil). This grouping is my own reading of the designation names, not a field in the data. The rule is the `protTypes` list in `app.js`, so it can be checked and changed in one place.

## A3 feature: the nearest protected area to a habitat that has no protection
Live site: https://myastjames-con.github.io/Term-project/site/
Repository: https://github.com/myastjames-con/Term-project

**Question it answers.** A conservation group looking at a habitat with no protection needs to know where the closest protected area is and how far away. The map used to show only that a habitat was unprotected. Now the popup of an unprotected habitat says which protected area is nearest and how many km away it is. (The page also has a ranking list, "Which habitats are most protected?", and a "no protection" filter chip. The nearest-area feature is the new feature I am being marked on.)

**Depth.** It computes. The notebook measures, for every habitat, the distance to the closest protected area (`gpd.sjoin_nearest`, in metres in EPSG:32198, saved as `nearest_km`) and keeps the area's name (`nearest_name`). The page then shows both in the popup. This came from Luke's suggestion on my A2 demo.

### The three test cases
Test 1. I click a Western chorus frog habitat that has no protection.
  Expected: the popup says "Protected by: none" and adds a line "Nearest protected area: [name] ([km] km away)".
  Result: passed. The popup for a 566.3 ha chorus frog habitat says "Nearest protected area: Boisé-Virginia (2.8 km away)".

Test 2. I click a habitat that is protected.
  Expected: the popup names the protecting area and does not show a "Nearest protected area" line, since it is already inside one.
  Result: passed. The popup for an 821.6 ha chorus frog habitat says "Protected by: Boisé-Pierre-Dansereau (Sec. Ville de Boucherville)" and has no nearest line.

Test 3 (edge case). The nearest-area information is missing for an unprotected habitat (I removed `nearest_name` and `nearest_km` from the data in the browser).
  Expected: the popup still opens with its other facts, there is no "Nearest protected area" line, no "undefined" or "null", and no console error.
  Result: passed. The popup shows the habitat size and "Protected by: none", with no nearest line, and the console showed no errors.

I ran all three on 8 November 2026 on the real data files with the page open in a headless Chrome. In the data, 119 of 571 habitat records are protected and 452 are not, and every one of them has a `nearest_name` and a `nearest_km`.

**Something the tests showed.** 6 of the 452 unprotected habitats have a nearest distance of 0.0 km, so their popup says "0 km away". The distance is measured from edge to edge, so a habitat that touches a protected area gets 0, while the notebook only counts a habitat as protected when the overlap is bigger than `MIN_OVERLAP_M2`. I have not changed this yet. It is a candidate for what I test next.

### Which lines do the work
- `notebooks/Amphibian.ipynb`, the code cell that starts with `sindex = protected_clean.sindex`, lines 26 to 31:
  - Line 27 (`gpd.sjoin_nearest`) joins each habitat to the closest protected area and gives the distance in metres.
  - Line 28 drops the duplicate row if two protected areas are equally near, so each habitat appears once.
  - Lines 29 and 30 save the area's name as `nearest_name` and the distance in km, rounded to 0.1, as `nearest_km`.
  - Line 31 prints the distances of the unprotected habitats so I can check them.
- The next code cell (the one that starts `amph_cols = [...]`) lists `nearest_name` and `nearest_km` among the columns written to `data/amphibians.geojson`.
- `site/app.js` line 317: the habitat popup. The condition `!p.is_protected && p.nearest_name` means the nearest-area line only appears for an unprotected habitat that has a name, which is why Test 3 shows no line and no error.
- `site/app.js` line 675: the same information in the ranking list, where an unprotected habitat shows "(nearest protected area X km away)".

### What I do not fully understand yet
I do not fully understand how `sjoin_nearest` finds the closest polygon without measuring against all of them (I think it uses the spatial index, `sindex`, but I could not explain it). I am also not sure that a straight-line distance means much for a frog, which moves over land and water, so the page's "km away" is only a rough guide.

### AI disclosure for A3
**Tool and model.** Claude (Sonnet 5.5, in the Claude app).

**What I asked for.** After Luke suggested showing the nearest protected area on my A2 demo, I asked Claude to help me add it: measure it in the notebook and show it in the popup of an unprotected habitat. I also asked for help with the page layout, the colours, the phone layout and the species text in the side panel.

**What came back.** The `sjoin_nearest` lines in the notebook (lines 26 to 31 of that cell), the popup line in `app.js` (line 317), the same information in the ranking list (line 675), and an explanation of what each line does.

**What I accepted, changed or rejected.** I accepted the nearest-area lines after checking the numbers in the notebook output (line 31) and in the popups. TODO: write one thing you changed or rejected, for example a colour, a layout choice or wording you did not keep, and why.

**How the tests checked it.** I wrote the three test cases above for this feature. Claude ran them on the real data files in a headless browser, and the results above are from that run. TODO: add "I also checked them on my phone on [date]" once you have.

**What stayed mine.** The question, the choice of the three species, the story and wording on the page, what the tests should cover, and what I will test next.

## Pre-flight report (Lab 7)

| Check | Result | What I did |
| --- | --- | --- |
| 1. Cold start |fault: red 404 in the console from a missing frog photo | fixed in commit "Fix: no 404 for the missing frog photo" |
| 2. Read every label | pass: no undefined, null or NaN in popups, list, legend or header | none needed |
| 3. Ask twice | fault: after picking from the list, clicking a habitat on the map left the old one outlined in yellow | fixed in commit "Fix: yellow outline stays on old answer after a map click" |
| 4. The edge | pass: unprotected habitat shows 0 ha and "Protected by: none"; clicking empty map and a tiny habitat gave no errors | none needed |
| 5. The data does not come | fault: if the habitat file failed to load, the page showed a developer message ("Open this page with Live Server") | fixed in commit "Fix: keyboard access, phone layout, plain-language error": the reader now sees a plain sentence and the page still works |
| 6. TODO: name of check 6 from the Lab 7 handout | TODO: pass, or fault and what you saw | TODO |
| 7. Mouse in my pocket (Tab key) | TODO: pass, or fault and what you could not reach | TODO |
| 8. Accessibility audit (Lighthouse) | TODO: score and main issue | TODO |

## Part 3: what I found in testing, and one fix


## What my map remembers
**What it remembers.** Three things: where the reader left the map (the centre and the zoom), the region they chose in "Zoom to region" (the pull-down and its red outline), and the popup they had open. A conservation worker usually keeps coming back to the same part of Québec, so the map reopens there and they do not have to zoom in again.
**Where it is kept.** Personal. It is saved in the reader's own browser, on their own device (`localStorage`). Nobody else sees it, there is no server and no account, and nothing is sent anywhere. A different device or a private window starts fresh, with the map zoomed to all the habitat.
**How a reader clears it.** "Reset view" (top left of the map) goes back to the view of all the habitat, and that new view is saved. Choosing "All regions" clears the region, and closing a popup clears the saved popup. Clearing the site's data in the browser removes everything.
**Which file does the work.** `site/remember.js` (from the Lab 9 handout) has the `rememberView(map)` function, which saves the view and puts the map back there. `site/app.js` calls it, and I used its `geog464Save` and `geog464Load` helpers to remember the region and the popup in the same way.
**One thing I understand about how it works.** What happens when the page loads, and why `fitAll()` (the automatic zoom to the data) had to wait for the saved view, because otherwise it zoomed to the data every time and undid the saved view.
**How I tested it.** On the live link I moved and zoomed the map, picked a region and opened a popup, then reloaded: all three were still there. I closed the popup and chose "All regions", reloaded, and they were gone. In a private window the map started fresh. The popups, filters, ranking list and legend still worked.


© 2026 Mya St-James. All rights reserved.