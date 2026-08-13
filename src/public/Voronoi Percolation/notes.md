# Voronoi Percolation

## Overview

This visualization brings together two ideas from earlier projects — the
**Voronoi tessellation / Delaunay graph** and **percolation via Union-Find
coloring** — into a single continuum-percolation demo.

Space is partitioned into ~20 Voronoi cells (17 fixed sites plus 3 slowly
drifting Lissajous points). Each cell is assigned a fixed random *threshold*
`u ∈ Uniform(0, 1)` once, at construction. A global probability `p` (the
slider) then decides which cells are **open**: a cell is open when `u ≤ p`.

As you drag `p` from 0 → 1, open cells appear one by one. Two open cells that
are **Delaunay neighbors** (share a Voronoi edge) belong to the same connected
cluster. Watch what happens near `p ≈ 0.5`: a **giant connected cluster**
snaps into existence and suddenly spans the whole box — the *percolation phase
transition*.

Because each cell's threshold `u` is frozen, sweeping `p` is monotone: a cell
that opens stays open as `p` grows, and clusters only ever merge. This is
exactly the classic "occupied-with-probability-`p`" percolation process,
realized on the random Voronoi/Delaunay graph rather than a regular lattice.

## Historical Context

- **Broadbent & Hammersley (1957)** introduced percolation theory to model
  fluid spreading through a random porous medium (originally, gas masks). They
  framed the central question: below some critical density the fluid is
  trapped in small pockets; above it, it permeates the entire medium.

- **The phase transition.** Percolation is the canonical model of a sharp
  threshold. For `p < p_c` all clusters are finite (with high probability);
  for `p > p_c` an infinite / spanning cluster exists. `p_c` is the
  *critical probability* (or *percolation threshold*).

- **Kesten's theorem (1980).** Harry Kesten proved rigorously that for
  **bond percolation on the 2D square lattice**, `p_c = 1/2`. This confirmed a
  long-conjectured exact value and became a landmark result in the field.

- **Continuum / Voronoi percolation.** When sites are thrown down as a
  *Poisson point process* and cells are colored open/closed independently, one
  gets **Voronoi percolation**. Bollobás & Riordan (2006) proved that for this
  2D model the critical probability is exactly **`p_c = 1/2`**, mirroring the
  square lattice — a consequence of a self-duality argument (the closed cells
  percolate exactly when the open ones don't). With only ~20 sites clipped to a
  finite box, this demo won't nail `1/2` precisely — finite-size effects and a
  deterministic (non-Poisson) site layout shift the apparent threshold — but
  the qualitative behavior is unmistakable: nothing spans, then suddenly
  everything does, right around the middle of the slider.

- **The giant component.** The spanning cluster is the geometric analogue of
  the *giant component* in random graph theory (Erdős–Rényi): a single cluster
  that captures a finite fraction of the whole system the moment connectivity
  crosses its critical density.

## How It Works

**1. Sites and thresholds.** 17 static sites are hand-placed for a stable
layout; 3 more move along Lissajous curves (pause them with Play/Pause). Every
site gets a fixed `u ~ Uniform(0,1)` — these are the "coin flips" and they do
**not** change when you move `p`. Only *Regenerate* draws fresh values.

**2. Delaunay triangulation (Bowyer–Watson).** Each frame we retriangulate the
current sites with the incremental Bowyer–Watson algorithm. Insert points one
at a time; delete every triangle whose circumcircle contains the new point;
re-fill the resulting hole by connecting its boundary edges to the new point. A
big enclosing "supertriangle" bootstraps the process and is discarded at the
end. The Delaunay edges are the adjacency graph of the Voronoi cells.

**3. Voronoi cells (half-plane clipping).** The Voronoi cell of a site is the
intersection of half-planes — the region closer to it than to any other site.
We start from the bounding box and clip by the perpendicular bisector against
every other site (Sutherland–Hodgman clip), then fan-triangulate the resulting
convex polygon for rendering.

**4. Union-Find coloring.** Each frame we build a fresh `UnionFind(N)` from
scratch (path compression + union by rank). For every Delaunay edge `(i, j)`,
if **both** cells `i` and `j` are open we `union(i, j)`. After processing all
edges, every open cell's `find(i)` gives its component root. Each root is
assigned a stable vivid HSL color (`hue = root / N`, sat 0.7, light 0.55), so
cells in the same cluster share a color. Closed cells (`u > p`) are drawn dark
and semi-transparent, behind the open cells.

**5. Percolation detection.** For each open cell we scan its clipped Voronoi
polygon's vertices and tag which of the four box boundaries it comes within 2
units of (left / right / top / bottom). Those tags are OR-ed into the cell's
component. A component that touches **both** the left and right walls means the
open region **percolates left–right**; touching top and bottom means
**top–bottom**. The stats panel reports both.

## Future Applications

- **Material science.** Percolation predicts when a composite becomes
  conductive: mix enough conductive filler into an insulator and at a critical
  loading a spanning network forms and resistance collapses. Voronoi cells are
  a natural model for grains/domains in a polycrystalline material.

- **Epidemiology.** Contact networks percolate: an outbreak becomes an epidemic
  precisely when the infected cluster spans the population. `p_c` corresponds
  to a critical transmissibility / herd-immunity threshold.

- **Network resilience.** Random failure of nodes/links is site/bond
  percolation in reverse. The giant component's survival tells you whether a
  power grid, internet backbone, or road network stays globally connected under
  attrition.

- **Geology & hydrology.** Fluid, oil, or groundwater flow through fractured
  rock and porous media is the original percolation problem — does the pore
  network connect across the sample?

## Controls Reference

| Control          | Effect                                                             |
|------------------|--------------------------------------------------------------------|
| **p (threshold)**| Probability `0–1`. A cell is open when its fixed `u ≤ p`. Does **not** rerandomize thresholds. |
| **Speed**        | Animation speed of the 3 drifting Lissajous points (`0.1–5.0`).    |
| **Play / Pause** | Toggle motion of the moving points (default: playing).             |
| **Regenerate**   | Reassign every cell's random threshold `u` and reset time to 0.    |
| **Show Voronoi** | Toggle the filled cells + white Voronoi edges.                     |
| **Show Delaunay**| Toggle the cyan Delaunay adjacency graph.                          |
| **Show Points**  | Toggle the white site dots.                                        |

### Reading the stats panel (bottom-left)

- **Open sites** — how many of the `N` cells are currently open.
- **Components** — number of distinct open clusters (Union-Find roots).
- **Largest** — cell count of the biggest cluster (the emerging giant component).
- **Percolates LR / TB** — YES (green) if a single open cluster spans the box
  left↔right / top↔bottom, NO (red) otherwise.
