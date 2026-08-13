import * as THREE from "/modules/three.module.js";

// World bounds — everything is clipped to this box.
const BOUND = 50;

// 17 deterministic "static" sites, hand-placed across [-40, 40]^2 so the
// tessellation is stable across reloads (no Math.random()).
const STATIC_SITES = [
  { x: -38, y: 34 },
  { x: -12, y: 40 },
  { x: 22, y: 37 },
  { x: 39, y: 20 },
  { x: 6, y: 24 },
  { x: -28, y: 12 },
  { x: 34, y: -4 },
  { x: 12, y: -2 },
  { x: -6, y: -18 },
  { x: -35, y: -14 },
  { x: -20, y: -36 },
  { x: 4, y: -38 },
  { x: 28, y: -30 },
  { x: 40, y: -40 },
  { x: 18, y: 8 },
  { x: -40, y: -38 },
  { x: -18, y: 20 },
];

// Number of animated Lissajous sites appended after the static ones.
const N_ANIMATED = 3;

class Game {
  constructor(scene, controls) {
    this.scene = scene;
    this.controls = controls; // shared GUI state object

    this.total = STATIC_SITES.length + N_ANIMATED;
    this.time = 0;
    this.lastNow = null;

    // Precompute a soft pastel color per site index.
    this.baseColors = [];
    for (let i = 0; i < this.total; i++) {
      const c = new THREE.Color();
      const animated = i >= STATIC_SITES.length;
      c.setHSL(i / this.total, 0.4, animated ? 0.5 : 0.35);
      this.baseColors.push(c);
    }

    // ---- Voronoi filled cells (vertex-colored mesh) ----
    this.cellGeom = new THREE.BufferGeometry();
    this.cellMesh = new THREE.Mesh(
      this.cellGeom,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })
    );
    this.cellMesh.position.z = -0.1;
    this.scene.add(this.cellMesh);

    // ---- Voronoi edges (white line segments) ----
    this.voronoiGeom = new THREE.BufferGeometry();
    this.voronoiLines = new THREE.LineSegments(
      this.voronoiGeom,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
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
  }

  // Return the full list of {x,y} sites at the current time.
  _sites() {
    const speed = this.controls.Speed;
    const t = this.time;
    const sites = STATIC_SITES.map((p) => ({ x: p.x, y: p.y }));

    // Point A
    sites.push({
      x: 15 * Math.sin(t * speed * 0.7 + 0.0),
      y: 20 * Math.cos(t * speed * 0.5 + 1.0),
    });
    // Point B
    sites.push({
      x: -10 * Math.sin(t * speed * 0.4 + 2.0),
      y: -15 * Math.cos(t * speed * 0.9 + 0.5),
    });
    // Point C
    sites.push({
      x: 25 * Math.cos(t * speed * 0.6 + 3.0),
      y: 5 * Math.sin(t * speed * 0.8 + 1.5),
    });

    return sites;
  }

  update() {
    // Advance time using a wall-clock delta so Speed scales real motion.
    const now = performance.now();
    if (this.lastNow === null) this.lastNow = now;
    const dt = Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.time += dt;

    const sites = this._sites();
    const { triangles, verts } = triangulate(sites);

    this._buildDelaunay(triangles, verts);
    this._buildVoronoiEdges(triangles);
    this._buildCells(sites);
    this._buildPoints(sites);

    // Toggle visibility from GUI booleans.
    this.delaunayLines.visible = this.controls["Show Delaunay"];
    this.voronoiLines.visible = this.controls["Show Voronoi"];
    this.cellMesh.visible = this.controls["Show Voronoi"];
    this.pointsObj.visible = this.controls["Show Points"];
  }

  _buildDelaunay(triangles, verts) {
    // Collect unique Delaunay edges as line segments.
    const seen = new Set();
    const pos = [];
    const pushEdge = (u, v) => {
      const k = u < v ? u + "_" + v : v + "_" + u;
      if (seen.has(k)) return;
      seen.add(k);
      const a = verts[u];
      const b = verts[v];
      pos.push(a.x, a.y, 0, b.x, b.y, 0);
    };
    for (const t of triangles) {
      pushEdge(t.a, t.b);
      pushEdge(t.b, t.c);
      pushEdge(t.c, t.a);
    }
    this.delaunayGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pos, 3)
    );
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
        const A = t.pa, B = t.pb; // endpoints of this Delaunay edge
        // resolve which stored point is the "other" vertex
        const other = _thirdPoint(t, u, v);
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        let dir = { x: -(B.y - A.y), y: B.x - A.x };
        // orient away from the triangle interior (the third vertex)
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

    this.voronoiGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pos, 3)
    );
    this.voronoiGeom.computeBoundingSphere();
  }

  _buildCells(sites) {
    // Compute each Voronoi cell as the intersection of half-planes: start
    // from the bounding box and clip by the perpendicular bisector between
    // this site and every other site (Sutherland–Hodgman half-plane clip).
    const box = [
      { x: -BOUND, y: -BOUND },
      { x: BOUND, y: -BOUND },
      { x: BOUND, y: BOUND },
      { x: -BOUND, y: BOUND },
    ];

    const positions = [];
    const colors = [];

    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      let poly = box;
      for (let j = 0; j < sites.length && poly.length; j++) {
        if (i === j) continue;
        const o = sites[j];
        // Keep the half-plane closer to s: dot(P - mid, o - s) <= 0.
        const n = { x: o.x - s.x, y: o.y - s.y };
        const mid = { x: (s.x + o.x) / 2, y: (s.y + o.y) / 2 };
        poly = clipHalfPlane(poly, mid, n);
      }
      if (poly.length < 3) continue;

      // Fan-triangulate the convex cell from its centroid.
      let cx = 0, cy = 0;
      for (const p of poly) {
        cx += p.x;
        cy += p.y;
      }
      cx /= poly.length;
      cy /= poly.length;

      const col = this.baseColors[i];
      for (let k = 0; k < poly.length; k++) {
        const p1 = poly[k];
        const p2 = poly[(k + 1) % poly.length];
        positions.push(cx, cy, 0, p1.x, p1.y, 0, p2.x, p2.y, 0);
        for (let v = 0; v < 3; v++) colors.push(col.r, col.g, col.b);
      }
    }

    this.cellGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.cellGeom.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    this.cellGeom.computeBoundingSphere();
  }

  _buildPoints(sites) {
    const pos = [];
    for (const s of sites) pos.push(s.x, s.y, 0);
    this.pointsGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pos, 3)
    );
    this.pointsGeom.computeBoundingSphere();
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
