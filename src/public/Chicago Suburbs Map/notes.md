# Greater Chicago Suburbs — Interactive Choropleth Map

## Overview

A fully self-contained WebGL (Three.js) choropleth of **44 communities** across the
greater Chicago suburban ring — from Zion and Libertyville in the north down to
Joliet and Plainfield in the south, and from Evanston/Skokie on the lakefront west
to the Fox River towns of St. Charles, Geneva, and Batavia.

Each suburb is rendered as a **flat-top hexagon** whose **size encodes population**
(radius ∝ √population, normalized to 14–50 world units so the visual area scales
roughly linearly with people) and whose **color encodes a chosen metric**. Five data
layers can be toggled live; hovering any hex raises a rich tooltip with the full
demographic profile and that community's rank for the active metric.

The map is a 2D overhead orthographic projection. Lat/lng are projected to screen
space with a simple cosine-corrected equirectangular mapping (good enough at this
small geographic extent that distortion is imperceptible). There are **no external
APIs or tiles** — every value is embedded directly in `Game.js`.

## Data Layers

| # | Layer | Encoding | Color ramp |
|---|-------|----------|------------|
| 0 | 💰 Median Income | sequential | indigo → blue → green → yellow → orange |
| 1 | 🧑 Median Age | sequential | blue → green → chartreuse → orange → red |
| 2 | 🏠 Home Value | sequential | teal → blue → violet → magenta → pink |
| 3 | 📋 Property Tax | sequential | green → lime → gold → orange → red |
| 4 | 📈 Pop. Growth (10yr) | **diverging** | red (−10%) → white (0%) → green (+20%) |

The growth layer is diverging because the sign matters: shrinking lake-county
industrial towns (Waukegan, North Chicago) read red, stable inner-ring suburbs read
near-white, and the exploding exurban frontier (Plainfield +18.5%, Naperville +12.5%,
Aurora +8.2%) reads deep green.

## Historical Context

**The streetcar & rail era (pre-1945).** Chicago's first suburbs grew along
commuter rail lines — Oak Park, Evanston, Highland Park, and the North Shore
"emerald necklace" of wealthy lakefront towns date to the late 19th century. Lake
Forest (median home value ~$680k here, the highest on the map) was platted as a
planned railroad suburb in 1857.

**The postwar boom (1950s–1970s).** The interstate program and FHA/VA mortgages
detonated suburban growth. Schaumburg went from farmland to a regional edge city
anchored by Woodfield Mall (1971). Arlington Heights, Mount Prospect, Des Plaines,
and the rest of the "Northwest suburbs" filled in as bedroom communities for
O'Hare-area employment. Naperville and Aurora began their transformation from Fox
River mill towns into tech-corridor giants.

**The exurban wave (1980s–2000s).** Growth leapfrogged outward along I-88
(the "Illinois Research & Development Corridor") and I-55. Will and Kane counties
boomed; Plainfield, Bolingbrook, and Bartlett saw double-digit decade growth as
cornfields became subdivisions. Naperville crossed 100,000 residents and became a
perennial "best place to live" fixture.

**Stagnation & divergence (2010s–post-COVID).** The 2008 housing crash hit the
exurban frontier hardest, then the 2020s reshuffled the deck again. Remote work
revived demand for space and good schools — outer collar-county towns with growth
runway (Plainfield, Aurora, Naperville) kept climbing, while older industrial
lakefront cities (Waukegan −2.1%, North Chicago −1.5%) and built-out inner-ring
suburbs (Elk Grove Village −1.8%, Oak Lawn −1.2%) flatlined or shrank. Illinois'
nation-leading **property-tax burden** is visible across the whole map: even
modest-value homes carry four- and five-figure annual bills, and the highest-value
North Shore towns (Lake Forest ~$15.8k, Highland Park ~$13.2k) top the tax layer.

## Data Sources

Values are **approximate** and embedded for illustration, synthesized from publicly
reported figures circa 2020–2024:

- **U.S. Census Bureau / American Community Survey (ACS) 5-year estimates** —
  population, median household income, median age.
- **Zillow Home Value Index (ZHVI)** — typical home values.
- **Cook / DuPage / Lake / Will / Kane County Assessor & Treasurer data** —
  approximate median property-tax bills.
- **Decennial Census 2010 → 2020 + ACS** — 10-year population growth.

These are rounded, representative figures meant for visualization, not authoritative
statistics. Do not cite them for policy or financial decisions.

## Controls

| Control | Action |
|---------|--------|
| **Metric** (dropdown) | Switch the active choropleth layer (Income / Age / Home Value / Property Tax / Growth) |
| **Fill Opacity** | Hex fill alpha, 0.30 – 1.00 |
| **Show Labels** | Toggle suburb-name sprites |
| **Show Glow** | Toggle the soft additive halo behind each hex |
| **Left-drag / Right-drag** | Pan the map |
| **Scroll** | Zoom (orthographic dolly) |
| **Hover** | Raise tooltip + enlarge the hovered hex 1.15× |

Rotation is intentionally disabled — this is a flat map, not a 3D scene.

## Implementation Notes

- **Hexagons** use `THREE.CircleGeometry(r, 6)`; with the default `thetaStart = 0`
  the first vertex sits at angle 0, yielding a flat-top hex (flat top/bottom edges).
- **Three meshes per suburb**: a `MeshBasicMaterial` fill (the raycast target), a
  1.22×-scaled glow behind it (`depthWrite:false`, low opacity), and a white
  `LineLoop` stroke on top.
- **Color** is computed by `interpolateColor(t, stops)` — piecewise-linear RGB
  interpolation across evenly spaced stops. Sequential layers map `t` from the
  metric's min→max; the growth layer maps `t` through a custom diverging transfer
  function pinned at −10 / 0 / +20.
- **Hover** is handled in `Game.update()` via a single `THREE.Raycaster` against the
  fill meshes; the tooltip is a fixed-position HTML card that follows the cursor.
- **Legend** redraws a 24×200 gradient bar onto a canvas and embeds it as a data-URL
  image whenever the layer changes.

## Future Applications

- **Zoning & land-use overlay** — shade hexes by single-family vs. multifamily share
  to visualize exclusionary zoning patterns across the metro.
- **School district ratings** — bind a layer to district-level test scores or
  per-pupil spending; the income/home-value correlation would jump out immediately.
- **Commute times** — encode average travel time to the Loop (Metra line + drive),
  revealing the transit-rich North Shore vs. car-dependent exurbs.
- **Time slider** — interpolate decade-by-decade census data to animate the
  postwar → exurban → post-COVID growth waves described above.
- **True precinct/municipal polygons** — swap the hex abstraction for real
  TIGER/Line boundary geometry for a cartographically accurate choropleth.
- **Affordability index** — derive a composite (income vs. home value vs. tax) layer
  to highlight cost-burden hotspots.
