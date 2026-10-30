https://myastjames-con.github.io/Term-project/site/

# GEOG 464 A2: Western chorus frog habitat and protected areas in Montérégie

Core action: amphibian conservation groups can see which recorded Western chorus frog habitats in Montérégie overlap a protected area, and which do not.

## Five sentences
1. This project is for conservation groups that would like to assess where Western Chorus frogs live to enlarge conservation sites. 
2. The frog’s habitat is shrinking in Montérégie due to housing development and urban sprawl, which is why we need conservation sites to protect them.
3. The map shows the Western Chorus frogs habitats in the Montérégie area, with protected areas and other conservation measures recorded in Québec’s registry on top and a third layer of only the intersecting parts of the last two layers. 
4. The reader can click on the different habitas and zones to give more information on them, like the name, the year created, the scientific name of the frog, etc. 
5. The data is species-at-risk occurrences, the protected areas registry and the regional boundary.

```
term-project/
    data/
    monteregie_amphibians.geojson    included: amphibian records in Montérégie, with is_protected / protected_by
    protected_monteregie.geojson     included: protected areas touching Montérégie, filtered
    frog_protected_overlap.geojson   included: chorus frog habitat inside a protected area
    emvs_dq.gpkg                     NOT included (over 20 MB), see "Data not included"
    SDA.gpkg                         NOT included (over 20 MB), see "Data not included"
    registre_aires_prot.gpkg         NOT included (over 20 MB), see "Data not included"
  notebooks/
    Amphibian.ipynb                  reads the data, cleans it, writes the GeoJSON files, ends with a check cell
  site/
    index.html  style.css  app.js    the page
  README.md
```

## How to run it
To view the page (no downloads needed): open `site/index.html` with Live Server (right-click, Open with Live Server). The three GeoJSON files it uses are included in `data/`.

To re-run the notebook: download the three datasets listed under "Data not included" into `data/`, then open `notebooks/Amphibian.ipynb` and choose Run All. The last cell prints `CHECK PASSED`.
## Where the data comes from
| Dataset | Source | Licence | Accessed | What I changed |
|---|---|---|---|---|
| Occurrences d'espèces en situation précaire, layer `EMVS_publique` | CDPNQ, MELCCFP, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/occurrences-especes-en-situation-precaire | CC-BY 4.0 | September 29th, 2026 | Kept amphibians (matched on scientific name): 13,298 → 856 records. Clipped to Montérégie: 856 → 90 records (56 Western chorus frog). Converted from EPSG:32198 to EPSG:4326. |
| Registre des aires protégées et des AMCE au Québec, layer `AP_REG_S` | MELCCFP, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/aires-protegees-au-quebec | CC-BY 4.0 | September 29th, 2026| 5,611 areas → 266 touching Montérégie → 259 after removing plant habitat designations → 189 after removing bird, muskrat and heron designations. Converted from EPSG:32198 to EPSG:4326. |
| Découpages administratifs, layer `regio_s` | Ministère des Ressources naturelles et des Forêts, Gouvernement du Québec. https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs | CC-BY 4.0 | September 29th, 2026 | Kept the Montérégie region (1 polygon). Converted from EPSG:4269 to EPSG:4326. |
Basemap: © OpenStreetMap contributors.

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

## After the demo
At my demo, I didn't have all my amphibina data in I only had Western Chorus forgs.
Today I will make my second layer (protected areas) coloured by which year they were established so that it answer the question of which one has been there the longest. 

## A3 feature: [a short name]
For A3 I will add a way to show which habitats are the most protected, so that my reader can see the percentage and hectars of a habitat inside a conservation zone.
It has depth because it (computes / responds / brings in) responds to which habitats are not protected at all and their sizes.
I will know it works when I can see all the sizes and percentages of the habitats and conservations zones.
My edge case is that there are a lot of little habitat aones athat are either 100% covered or 100% not so there will be a lot of those.

Test 1. I [do something a normal reader would do].
  Expected: [exactly what appears or changes].
Test 2. I [do it again, differently].
  Expected: [...]
Test 3. I [the edge case].
  Expected: [a message the reader understands; no console error].

© 2026 Mya St-James. All rights reserved.