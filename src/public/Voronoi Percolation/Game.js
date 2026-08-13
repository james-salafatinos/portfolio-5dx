import * as THREE from "/modules/three.module.js";

// World bounds — everything is clipped to this box.
const BOUND = 50;

// Distance (in world units) from a boundary within which a Voronoi vertex is
// considered to "touch" that side, used for percolation detection.
const TOUCH_EPS = 2;

// ---------------------------------------------------------------------------
// Union-Find (path compression + union by rank) — inlined from the
// "Phase Transitions, Percolation, and Union Find Coloring" project.
// ---------------------------------------------------------------------------
class UnionFind {
  constructor(size) {
    this.parent = new Array(size).fill(0).map((_, index) => index);
    this.rank = new Array(size).fill(0);
  }

  find(u) {
    if (this.parent[u] === u) {
      return u;
    }
    this.parent[u] = this.find(this.parent[u]); // Path compression
    return this.parent[u];
  }

  union(u, v) {
    u = this.find(u);
    v = this.find(v);
    if (u === v) {
      return;
    }

    // Union by rank
    if (this.rank[u] > this.rank[v]) {
      [u, v] = [v, u];
    }
    this.parent[u] = v;
    if (this.rank[u] === this.rank[v]) {
      this.rank[v]++;
    }
  }
}

class Game {
  constructor(scene, controls) {
    this.scene = scene;
    this.controls = controls; // shared GUI state object

    this.time = 0;
    this.lastNow = null;
    this.playing = true;
    this._dt = 0;

    // Sites, thresholds, and per-site motion parameters.
    this._initSites();

    // ---- Open Voronoi cells (vertex-colored by connected component) ----
    this.cellGeom = new THREE.BufferGeometry();
    this.cellMesh = new THREE.Mesh(
      this.cellGeom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      })
    );
    this.cellMesh.position.z = -0.05;
    this.scene.add(this.cellMesh);

    // ---- Closed Voronoi cells (flat dark, rendered behind open cells) ----
    this.closedGeom = new THREE.BufferGeometry();
    this.closedMesh = new THREE.Mesh(
      this.closedGeom,
      new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.4,
      })
    );
    this.closedMesh.position.z = -0.1;
    this.scene.add(this.closedMesh);

    // ---- Voronoi edges (white line segments) ----
    this.voronoiGeom = new THREE.BufferGeometry();
    this.voronoiLines = new THREE.LineSegments(
      this.voronoiGeom,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      })
    );
    this.voronoiLines.position.z = 0.0;
    this.scene.add(this.voronoiLines);

    // ---- Delaunay edges (cyan line segments) ----
    this.delaunayGeom = new THREE.BufferGeometry();
    this.delaunayLines = new THREE.LineSegments(
      this.delaunayGeom,
      new THREE.LineBasicMaterial({ color: 0x00e5ff })
    );
    this.delaunayLines.position.z = 0.05;
    this.scene.add(this.delaunayLines);

    // ---- Site points ----
    this.pointsGeom = new THREE.BufferGeometry();
    this.pointsObj = new THREE.Points(
      this.pointsGeom,
      new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false })
    );
    this.pointsObj.position.z = 0.1;
    this.scene.add(this.pointsObj);

    // Stats overlay div (created by App.js).
    this.statsDiv = document.getElementById("percolation-stats");
  }

  // Allocate sites, thresholds, and per-site motion parameters based on
  // the current N control. Called on construction and whenever N changes.
  _initSites() {
    const N = this.controls.N;
    this.N = N;

    // Fixed random threshold u ~ Uniform(0,1) per site. These NEVER change
    // when p changes — only on construction, reinit, or a regenerate().
    this.thresholds = new Float32Array(N);
    for (let i = 0; i < N; i++) this.thresholds[i] = Math.random();

    // ---- Lissajous parameters (one per site) ----
    this.lissA = new Float32Array(N);   // x amplitude ∈ [10, 45]
    this.lissAy = new Float32Array(N);  // y amplitude ∈ [10, 45]
    this.lissWx = new Float32Array(N);  // x angular freq ∈ [0.3, 1.5]
    this.lissWy = new Float32Array(N);  // y angular freq ∈ [0.3, 1.5]
    this.lissPhiX = new Float32Array(N); // x phase ∈ [0, 2π]
    this.lissPhiY = new Float32Array(N); // y phase ∈ [0, 2π]
    for (let i = 0; i < N; i++) {
      this.lissA[i] = 10 + Math.random() * 35;
      this.lissAy[i] = 10 + Math.random() * 35;
      this.lissWx[i] = 0.3 + Math.random() * 1.2;
      this.lissWy[i] = 0.3 + Math.random() * 1.2;
      this.lissPhiX[i] = Math.random() * Math.PI * 2;
      this.lissPhiY[i] = Math.random() * Math.PI * 2;
    }

    // ---- Random walk state (position + velocity per site) ----
    this.wx = new Float32Array(N);
    this.wy = new Float32Array(N);
    this.wvx = new Float32Array(N); // starts at zero
    this.wvy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.wx[i] = Math.random() * 80 - 40;
      this.wy[i] = Math.random() * 80 - 40;
    }

    this.time = 0;
  }

  // Rebuild the site set for a new N, then regenerate thresholds/time.
  reinit() {
    this._initSites();
    this.regenerate();
  }

  // Reassign all thresholds and reset time. Called by the GUI "Regenerate".
  regenerate() {
    for (let i = 0; i < this.N; i++) this.thresholds[i] = Math.random();
    this.time = 0;
  }

  // Return the full list of {x,y} sites at the current time.
  _sites() {
    const N = this.N;

    if (this.controls.Motion === "Lissajous") {
      const speed = this.controls.Speed;
      const t = this.time;
      const sites = new Array(N);
      for (let i = 0; i < N; i++) {
        sites[i] = {
          x: this.lissA[i] * Math.sin(this.lissWx[i] * t * speed + this.lissPhiX[i]),
          y: this.lissAy[i] * Math.sin(this.lissWy[i] * t * speed + this.lissPhiY[i]),
        };
      }
      return sites;
    }

    // Random Walk mode — integrate velocity-perturbed positions each frame.
    const walkSpeed = this.controls["Walk Speed"];
    const impulse = walkSpeed * 80;
    const damping = 0.92;
    const WALL = BOUND - 1;
    const dt = this._dt;
    const sites = new Array(N);
    for (let i = 0; i < N; i++) {
      this.wvx[i] += (Math.random() - 0.5) * impulse * dt;
      this.wvy[i] += (Math.random() - 0.5) * impulse * dt;
      this.wvx[i] *= damping;
      this.wvy[i] *= damping;
      this.wx[i] += this.wvx[i] * dt;
      this.wy[i] += this.wvy[i] * dt;

      // Bounce off walls.
      if (this.wx[i] < -WALL) { this.wx[i] = -WALL; this.wvx[i] = Math.abs(this.wvx[i]); }
      if (this.wx[i] >  WALL) { this.wx[i] =  WALL; this.wvx[i] = -Math.abs(this.wvx[i]); }
      if (this.wy[i] < -WALL) { this.wy[i] = -WALL; this.wvy[i] = Math.abs(this.wvy[i]); }
      if (this.wy[i] >  WALL) { this.wy[i] =  WALL; this.wvy[i] = -Math.abs(this.wvy[i]); }

      sites[i] = { x: this.wx[i], y: this.wy[i] };
    }
    return sites;
  }

  update() {
    // Rebuild sites if N changed without going through onFinishChange.
    if (this.controls.N !== this.N) this.reinit();

    // Advance time using a wall-clock delta so Speed scales real motion.
    const now = performance.now();
    if (this.lastNow === null) this.lastNow = now;
    const dt = Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.playing = this.controls.Play;
    if (this.playing) this.time += dt;
    this._dt = this.playing ? dt : 0;

    const sites = this._sites();
    const { triangles, verts } = triangulate(sites);

    // ---- Delaunay adjacency: Map<siteIndex, Set<siteIndex>> ----
    const adjacency = new Map();
    for (let i = 0; i < sites.length; i++) adjacency.set(i, new Set());
    const addAdj = (u, v) => {
      if (u >= sites.length || v >= sites.length) return;
      adjacency.get(u).add(v);
      adjacency.get(v).add(u);
    };
    for (const t of triangles) {
      addAdj(t.a, t.b);
      addAdj(t.b, t.c);
      addAdj(t.c, t.a);
    }

    // ---- Open / closed state per site ----
    const p = this.controls.p;
    const open = new Array(sites.length);
    for (let i = 0; i < sites.length; i++) open[i] = this.thresholds[i] <= p;

    // ---- Union-Find over open cells joined by Delaunay edges ----
    const uf = new UnionFind(sites.length);
    for (const [i, nbrs] of adjacency) {
      if (!open[i]) continue;
      for (const j of nbrs) {
        if (open[j]) uf.union(i, j);
      }
    }

    // ---- Stable vivid color per component root ----
    const compColors = new Map();
    for (let i = 0; i < sites.length; i++) {
      if (!open[i]) continue;
      const root = uf.find(i);
      if (!compColors.has(root)) {
        const c = new THREE.Color();
        c.setHSL((root % sites.length) / sites.length, 0.7, 0.55);
        compColors.set(root, c);
      }
    }

    // ---- Voronoi polygons (half-plane intersection, neighbors only) ----
    const polygons = this._voronoiPolygons(sites, triangles, adjacency);

    // ---- Boundary-touch detection per component ----
    // Bit flags: 1=left, 2=right, 4=top, 8=bottom.
    const compTouches = new Map();
    for (let i = 0; i < sites.length; i++) {
      if (!open[i]) continue;
      const poly = polygons[i];
      if (!poly || poly.length < 3) continue;
      let flags = 0;
      for (const v of poly) {
        if (v.x <= -BOUND + TOUCH_EPS) flags |= 1;
        if (v.x >= BOUND - TOUCH_EPS) flags |= 2;
        if (v.y >= BOUND - TOUCH_EPS) flags |= 4;
        if (v.y <= -BOUND + TOUCH_EPS) flags |= 8;
      }
      const root = uf.find(i);
      compTouches.set(root, (compTouches.get(root) || 0) | flags);
    }

    let percolatesLR = false;
    let percolatesTB = false;
    for (const flags of compTouches.values()) {
      if ((flags & 1) && (flags & 2)) percolatesLR = true;
      if ((flags & 4) && (flags & 8)) percolatesTB = true;
    }

    // ---- Component sizes / stats ----
    let openCount = 0;
    const compSize = new Map();
    for (let i = 0; i < sites.length; i++) {
      if (!open[i]) continue;
      openCount++;
      const root = uf.find(i);
      compSize.set(root, (compSize.get(root) || 0) + 1);
    }
    let largest = 0;
    for (const s of compSize.values()) largest = Math.max(largest, s);
    const components = compSize.size;

    // ---- Push geometry ----
    this._buildCells(sites, open, uf, compColors, polygons);
    this._buildDelaunay(adjacency, sites);
    this._buildVoronoiEdges(triangles);
    this._buildPoints(sites);

    // ---- Stats overlay ----
    this._updateStats(openCount, sites.length, components, largest, percolatesLR, percolatesTB);

    // Toggle visibility from GUI booleans.
    this.delaunayLines.visible = this.controls["Show Delaunay"];
    this.voronoiLines.visible = this.controls["Show Voronoi"];
    this.cellMesh.visible = this.controls["Show Voronoi"];
    this.closedMesh.visible = this.controls["Show Voronoi"];
    this.pointsObj.visible = this.controls["Show Points"];
  }

  // Compute every site's Voronoi polygon (clipped convex region).
  //
  // A site's Voronoi cell is bounded only by the bisectors it shares with its
  // Delaunay neighbors, so we clip against those ~6 neighbors instead of all
  // N sites. This makes the pass O(N·K) ≈ O(N) rather than O(N²).
  _voronoiPolygons(sites, triangles, adjacency) {
    const polygons = new Array(sites.length);
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      let poly = [
        { x: -BOUND, y: -BOUND },
        { x: BOUND, y: -BOUND },
        { x: BOUND, y: BOUND },
        { x: -BOUND, y: BOUND },
      ];
      const nbrs = adjacency.get(i);
      if (nbrs) {
        for (const j of nbrs) {
          if (!poly.length) break;
          const o = sites[j];
          const n = { x: o.x - s.x, y: o.y - s.y };
          const mid = { x: (s.x + o.x) / 2, y: (s.y + o.y) / 2 };
          poly = clipHalfPlane(poly, mid, n);
        }
      }
      polygons[i] = poly;
    }
    return polygons;
  }

  _buildCells(sites, open, uf, compColors, polygons) {
    // Open cells: vertex-colored by component. Closed cells: flat dark.
    const openPos = [];
    const openCol = [];
    const closedPos = [];

    for (let i = 0; i < sites.length; i++) {
      const poly = polygons[i];
      if (!poly || poly.length < 3) continue;

      // Fan-triangulate the convex cell from its centroid.
      let cx = 0, cy = 0;
      for (const pt of poly) {
        cx += pt.x;
        cy += pt.y;
      }
      cx /= poly.length;
      cy /= poly.length;

      if (open[i]) {
        const col = compColors.get(uf.find(i));
        for (let k = 0; k < poly.length; k++) {
          const p1 = poly[k];
          const p2 = poly[(k + 1) % poly.length];
          openPos.push(cx, cy, 0, p1.x, p1.y, 0, p2.x, p2.y, 0);
          for (let v = 0; v < 3; v++) openCol.push(col.r, col.g, col.b);
        }
      } else {
        for (let k = 0; k < poly.length; k++) {
          const p1 = poly[k];
          const p2 = poly[(k + 1) % poly.length];
          closedPos.push(cx, cy, 0, p1.x, p1.y, 0, p2.x, p2.y, 0);
        }
      }
    }

    this.cellGeom.setAttribute("position", new THREE.Float32BufferAttribute(openPos, 3));
    this.cellGeom.setAttribute("color", new THREE.Float32BufferAttribute(openCol, 3));
    this.cellGeom.computeBoundingSphere();

    this.closedGeom.setAttribute("position", new THREE.Float32BufferAttribute(closedPos, 3));
    this.closedGeom.computeBoundingSphere();
  }

  _buildDelaunay(adjacency, sites) {
    // Collect unique Delaunay edges as line segments from the adjacency map.
    const seen = new Set();
    const pos = [];
    for (const [u, nbrs] of adjacency) {
      for (const v of nbrs) {
        const k = u < v ? u + "_" + v : v + "_" + u;
        if (seen.has(k)) continue;
        seen.add(k);
        const a = sites[u];
        const b = sites[v];
        pos.push(a.x, a.y, 0, b.x, b.y, 0);
      }
    }
    this.delaunayGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.delaunayGeom.computeBoundingSphere();
  }

  _buildVoronoiEdges(triangles) {
    // Map each Delaunay edge -> the triangles sharing it.
    const edgeMap = new Map();
    const addEdge = (u, v, tri) => {
      const k = u < v ? u + "_" + v : v + "_" + u;
      if (!edgeMap.has(k)) edgeMap.set(k, { u, v, tris: [] });
      edgeMap.get(k).tris.push(tri);
    };
    for (const t of triangles) {
      if (!t.cc) continue;
      addEdge(t.a, t.b, t);
      addEdge(t.b, t.c, t);
      addEdge(t.c, t.a, t);
    }

    const pos = [];
    for (const { u, v, tris } of edgeMap.values()) {
      if (tris.length === 2) {
        // Interior Voronoi edge: connect the two circumcenters.
        const seg = clipSegment(tris[0].cc, tris[1].cc);
        if (seg) pos.push(seg.a.x, seg.a.y, 0, seg.b.x, seg.b.y, 0);
      } else if (tris.length === 1) {
        // Boundary edge: shoot a ray from the circumcenter outward,
        // perpendicular to the Delaunay edge, away from the 3rd vertex.
        const t = tris[0];
        const A = t.pa, B = t.pb;
        const other = _thirdPoint(t, u, v);
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        let dir = { x: -(B.y - A.y), y: B.x - A.x };
        if ((other.x - mid.x) * dir.x + (other.y - mid.y) * dir.y > 0) {
          dir = { x: -dir.x, y: -dir.y };
        }
        const far = {
          x: t.cc.x + dir.x * 1e4,
          y: t.cc.y + dir.y * 1e4,
        };
        const seg = clipSegment(t.cc, far);
        if (seg) pos.push(seg.a.x, seg.a.y, 0, seg.b.x, seg.b.y, 0);
      }
    }

    this.voronoiGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.voronoiGeom.computeBoundingSphere();
  }

  _buildPoints(sites) {
    const pos = [];
    for (const s of sites) pos.push(s.x, s.y, 0);
    this.pointsGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.pointsGeom.computeBoundingSphere();
  }

  _updateStats(openCount, N, components, largest, percolatesLR, percolatesTB) {
    if (!this.statsDiv) return;
    const yes = '<span style="color:#3dff7a">YES</span>';
    const no = '<span style="color:#7a2a2a">NO</span>';
    this.statsDiv.innerHTML =
      `Open sites: ${openCount} / ${N}\n` +
      `Components: ${components}\n` +
      `Largest:    ${largest} cells\n` +
      `Percolates LR: ${percolatesLR ? yes : no}\n` +
      `Percolates TB: ${percolatesTB ? yes : no}`;
  }
}

// ---------------------------------------------------------------------------
// Bowyer–Watson incremental Delaunay triangulation
// ---------------------------------------------------------------------------

function circumcenter(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x: ux, y: uy };
}

function makeTri(ia, ib, ic, verts) {
  const cc = circumcenter(verts[ia], verts[ib], verts[ic]);
  let r2 = Infinity;
  if (cc) {
    const dx = verts[ia].x - cc.x;
    const dy = verts[ia].y - cc.y;
    r2 = dx * dx + dy * dy;
  }
  return {
    a: ia, b: ib, c: ic,
    pa: verts[ia], pb: verts[ib], pc: verts[ic],
    cc, r2, bad: false,
  };
}

function inCircumcircle(tri, p) {
  if (!tri.cc) return false;
  const dx = p.x - tri.cc.x;
  const dy = p.y - tri.cc.y;
  return dx * dx + dy * dy < tri.r2 - 1e-9;
}

function triangulate(points) {
  const verts = points.map((p) => ({ x: p.x, y: p.y }));

  // Supertriangle large enough to enclose everything.
  const M = 1e5;
  const s0 = verts.length;
  verts.push({ x: -M, y: -M });
  verts.push({ x: M, y: -M });
  verts.push({ x: 0, y: M });
  const s1 = s0 + 1;
  const s2 = s0 + 2;

  let triangles = [makeTri(s0, s1, s2, verts)];

  for (let i = 0; i < points.length; i++) {
    const p = verts[i];

    // Find triangles whose circumcircle contains p.
    const edgeMap = new Map();
    for (const t of triangles) {
      t.bad = inCircumcircle(t, p);
      if (!t.bad) continue;
      for (const e of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
        const k = e[0] < e[1] ? e[0] + "_" + e[1] : e[1] + "_" + e[0];
        if (edgeMap.has(k)) edgeMap.get(k).count++;
        else edgeMap.set(k, { u: e[0], v: e[1], count: 1 });
      }
    }

    // Remove bad triangles.
    triangles = triangles.filter((t) => !t.bad);

    // Re-triangulate the hole: each boundary edge (count === 1) + p.
    for (const { u, v, count } of edgeMap.values()) {
      if (count === 1) triangles.push(makeTri(u, v, i, verts));
    }
  }

  // Drop any triangle touching a supertriangle vertex.
  triangles = triangles.filter(
    (t) =>
      t.a < s0 && t.b < s0 && t.c < s0 &&
      t.a !== s1 && t.b !== s1 && t.c !== s1
  );

  return { triangles, verts };
}

// The vertex of `tri` that is not on edge (u, v).
function _thirdPoint(tri, u, v) {
  if (tri.a !== u && tri.a !== v) return tri.pa;
  if (tri.b !== u && tri.b !== v) return tri.pb;
  return tri.pc;
}

// ---------------------------------------------------------------------------
// Clipping helpers
// ---------------------------------------------------------------------------

// Sutherland–Hodgman clip of a convex polygon by the half-plane
// dot(P - mid, n) <= 0 (the side of the bisector nearer the reference site).
function clipHalfPlane(poly, mid, n) {
  const out = [];
  const inside = (p) => (p.x - mid.x) * n.x + (p.y - mid.y) * n.y <= 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ina = inside(a);
    const inb = inside(b);
    if (ina) out.push(a);
    if (ina !== inb) {
      const da = (a.x - mid.x) * n.x + (a.y - mid.y) * n.y;
      const db = (b.x - mid.x) * n.x + (b.y - mid.y) * n.y;
      const t = da / (da - db);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}

// Liang–Barsky clip of segment a->b to the [-BOUND, BOUND] box.
function clipSegment(a, b) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x + BOUND, BOUND - a.x, a.y + BOUND, BOUND - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null; // parallel and outside
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return {
    a: { x: a.x + t0 * dx, y: a.y + t0 * dy },
    b: { x: a.x + t1 * dx, y: a.y + t1 * dy },
  };
}

export { Game };
