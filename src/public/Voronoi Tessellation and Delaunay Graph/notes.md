# Voronoi Tessellation and Delaunay Graph

A real-time, interactive 2D visualization of the two most fundamental structures in
computational geometry — the **Voronoi diagram** and its dual, the **Delaunay
triangulation** — recomputed from scratch every frame as three "seed" points drift
along smooth Lissajous paths.

---

## Overview

Given a set of points in the plane (called **sites** or **seeds**), two classic
geometric structures fall out:

- **Voronoi tessellation** — partitions the plane into one region ("cell") per site.
  A point belongs to a site's cell if that site is its *nearest* seed. Every cell is a
  convex polygon whose boundaries are the perpendicular bisectors between neighboring
  sites. It answers the question: *"For any location, which seed is closest?"*

- **Delaunay triangulation** — connects the sites into triangles such that no site
  lies inside the circumcircle of any triangle (the "empty circumcircle" property).
  This produces the "fattest," most well-conditioned triangles possible, avoiding
  slivers — which is exactly why it dominates mesh generation.

These two are **geometric duals** of one another: build one and you essentially have
the other for free.

---

## Historical context

- **Georgy Voronoi (1908)** — the Ukrainian/Russian mathematician formalized the
  general *n*-dimensional diagram now bearing his name, generalizing earlier work by
  Dirichlet (1850, "Dirichlet tessellation") and even Descartes (1644, informal
  regions of celestial influence).
- **Boris Delaunay (1934)** — a student of Voronoi, defined the dual triangulation and
  proved its empty-circumcircle characterization. (His name is also transliterated
  "Delone.")
- **Fortune's algorithm (1987)** — Steven Fortune's celebrated *sweep-line* method
  computes the Voronoi diagram directly in optimal **O(n log n)** time, using a
  "beach line" of parabolic arcs. It remains the gold standard for large point sets.

This visualization instead uses the **Bowyer–Watson** incremental algorithm
(Bowyer and Watson, independently, 1981) because it is compact, intuitive, and easily
written from scratch — perfect for a live-updating demo with only ~20 points.

---

## How Bowyer–Watson works

An **incremental** construction: insert points one at a time, repairing the
triangulation locally after each insertion.

1. **Supertriangle.** Begin with one huge triangle guaranteed to contain every site.
2. **Insert each point `p`:**
   - Find all **"bad" triangles** whose *circumcircle contains `p`*. By the empty-circle
     property these triangles can no longer be Delaunay.
   - The union of bad triangles forms a **star-shaped polygonal hole**. Its boundary is
     the set of edges belonging to exactly **one** bad triangle (shared edges are
     interior and get discarded).
   - Delete the bad triangles and **re-triangulate the hole** by connecting `p` to every
     boundary edge.
3. **Cleanup.** Remove every triangle that still references a supertriangle vertex.

What remains is the Delaunay triangulation as a list of triangles `{a, b, c}`. The
naive version is **O(n²)**; with fast point location it reaches **O(n log n)**. For 20
points, naive is instantaneous — this demo re-runs the *entire* algorithm each frame.

---

## The duality: circumcenters ↔ Voronoi vertices

The bridge between the two structures:

> **The circumcenter of each Delaunay triangle is a vertex of the Voronoi diagram.**

From that single fact the Voronoi diagram is recovered directly:

- **Interior Voronoi edge** — every Delaunay edge shared by **two** triangles maps to a
  segment connecting those two triangles' **circumcenters**.
- **Boundary Voronoi edge** — a Delaunay edge on the convex hull belongs to only **one**
  triangle, so its Voronoi edge is an **infinite ray** shot from that circumcenter,
  perpendicular to the hull edge and pointing outward. Here it is clamped to the canvas.
- **Voronoi cell** — the polygon formed by the circumcenters surrounding a site; equal
  to the intersection of the perpendicular-bisector half-planes between that site and
  its neighbors.

More correspondences:
| Voronoi | Delaunay |
|---|---|
| cell (region) | vertex (site) |
| edge | edge (rotated 90°) |
| vertex | triangle (its circumcenter) |
| adjacent cells | connected sites |

**Implementation note.** This demo builds the crisp filled cells with a robust
**half-plane / Sutherland–Hodgman clip** (intersect the bounding box with each
perpendicular bisector), while the white Voronoi *edge* lines are drawn straight from
the Delaunay circumcenters. Because Voronoi geometry is unique, both methods agree.

---

## Applications

- **Computational geometry** — nearest-neighbor queries, closest-pair, largest empty
  circle, convex hulls (the Delaunay hull *is* the convex hull).
- **Mesh generation (FEM/CFD)** — Delaunay's fat triangles give numerically stable
  finite-element meshes; a cornerstone of engineering simulation.
- **Robotics & path planning** — the Voronoi diagram traces routes maximally distant
  from all obstacles (the "generalized Voronoi diagram" / roadmap).
- **GIS & spatial analysis** — service-area maps ("which hospital/store is nearest"),
  rainfall interpolation (Thiessen polygons), territory modeling.
- **Nearest-neighbor search** — Voronoi cells answer *k*-NN queries geometrically.
- **Cell / crystal growth & biology** — modeling epithelial tissue, crystal grains,
  ecological territories, and foam structures.
- **Graphics & procedural generation** — organic textures, shattering/fracture, stippling,
  cellular ("Worley") noise, and stylized map generation.

---

## What you see in this visualization

- **20 site points** — 17 fixed (deterministic, stable across reloads) plus **3 animated**
  seeds tracing smooth sinusoidal/Lissajous orbits through the center.
- **Filled Voronoi cells** — each site's nearest-neighbor region, tinted with a unique
  soft pastel hue (low-saturation HSL). Cells belonging to the animated seeds are drawn
  slightly brighter.
- **Delaunay edges** — cyan/aqua lines connecting the triangulated sites.
- **Voronoi edges** — white boundary lines (opacity 0.6) separating adjacent cells.
- **Site dots** — bright white points marking every seed.

Every frame, the three animated points advance, and the **entire** Delaunay
triangulation and Voronoi tessellation are recomputed and redrawn — so you watch cells
grow, shrink, split, and merge, and Delaunay edges flip, in real time.

---

## Controls reference

Open the panel (top-right):

| Control | Range / Type | Default | Effect |
|---|---|---|---|
| **Speed** | 0.1 – 5.0 | 1.0 | Speed of the three animated Lissajous seeds. |
| **Show Delaunay** | boolean | on | Toggle the cyan triangulation edges. |
| **Show Voronoi** | boolean | on | Toggle the filled cells + white Voronoi edges. |
| **Show Points** | boolean | on | Toggle the white site dots. |

Camera: **scroll / pinch to zoom**, **drag to pan**. Rotation is disabled — the view is
locked top-down (orthographic) over the region `[-50, 50] × [-50, 50]`.

---

## The animated site paths

Given elapsed time `t` (seconds) and `speed` from the GUI:

```
Point A:  x = 15·sin(t·speed·0.7 + 0.0)    y = 20·cos(t·speed·0.5 + 1.0)
Point B:  x = -10·sin(t·speed·0.4 + 2.0)   y = -15·cos(t·speed·0.9 + 0.5)
Point C:  x =  25·cos(t·speed·0.6 + 3.0)   y =   5·sin(t·speed·0.8 + 1.5)
```

Their incommensurate frequency ratios keep the orbits from ever exactly repeating,
giving continuously varying tessellations.
