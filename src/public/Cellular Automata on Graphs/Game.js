import * as THREE from "/modules/three.module.js";

// ---------------------------------------------------------------------------
// Cellular Automata on Graphs
//
// A cellular automaton where the "lattice" is an arbitrary graph. Each node
// holds a binary state (0 dead / 1 alive). Every step, all nodes read the
// CURRENT state of their neighbours and write to a buffer, then we swap — a
// fully synchronous update. Different rules (Conway-like, Majority, Parity,
// Custom) produce wildly different emergent behaviour depending on the
// topology (random, small-world, scale-free, grid, ring).
//
// The graph is laid out and rendered in full 3D: nodes are shaded spheres
// (glowing when alive), edges are coloured line segments, and the camera
// orbits freely around the structure.
// ---------------------------------------------------------------------------

const MAX_NODES = 300;          // hard performance cap
const NODE_RADIUS = 0.18;       // base sphere radius (world units)
const WORLD_EXTENT = 5.0;       // graph is scaled to fit roughly ±5 world units

const COLOR_ALIVE = new THREE.Color("#00ffcc"); // neon cyan
const COLOR_ALIVE_EMISSIVE = new THREE.Color("#00ffcc");
const COLOR_DEAD = new THREE.Color("#112233");  // dark
const COLOR_DEAD_EMISSIVE = new THREE.Color("#000000");

// Edge colours. We bake the desired "opacity" into the colour brightness and
// render with additive blending, so alive-alive edges read brighter than the
// dim dead edges over the dark background.
const COLOR_EDGE_ALIVE = new THREE.Color("#00ffcc");
const COLOR_EDGE_DEAD = new THREE.Color("#1a3a6a");
const EDGE_ALIVE_OPACITY = 0.4;
const EDGE_DEAD_OPACITY = 0.2;

// Pulse animation: a node that just changed state pops to this scale and
// relaxes back to 1.0 over PULSE_TIME seconds.
const PULSE_SCALE = 1.4;
const PULSE_TIME = 0.3;

// Layout (force-directed) parameters
const FR_ITERATIONS = 50;

class Game {
  constructor(scene) {
    this.scene = scene;

    // ── Parameters (mirrored from the GUI) ──
    this.graphType = "Small World";
    this.nodeCount = 60;
    this.edgeProbability = 0.08;
    this.rule = "Majority";
    this.stepMode = "Auto";
    this.stepSpeed = 3;          // steps / second
    this.seedPercent = 0.35;

    // ── Simulation timing ──
    this._lastTime = null;
    this._accum = 0;             // accumulated seconds for auto-stepping
    this.generation = 0;

    // ── Graph data (allocated on build) ──
    this.N = 0;
    this.adj = [];               // adjacency list: adj[i] = [neighbour indices]
    this.edges = [];             // [[a,b], ...]
    this.posX = null;            // Float32Array of node x
    this.posY = null;            // Float32Array of node y
    this.posZ = null;            // Float32Array of node z (full 3D layout)
    this.degree = null;          // Int32Array of node degree
    this.state = null;           // Uint8Array current state
    this.nextState = null;       // Uint8Array buffer

    // ── Three.js objects ──
    this._nodeGeo = null;        // shared SphereGeometry
    this._nodeMeshes = [];       // one Mesh per node (per-node emissive + pulse)
    this._edgeLines = null;
    this._baseScale = null;      // Float32Array degree-based base scale
    this._pulse = null;          // Float32Array current pulse multiplier
    this._tmpColor = new THREE.Color();

    this.restart();
  }

  // ── GUI setters ────────────────────────────────────────────────────────
  setGraphType(v) { this.graphType = v; this.restart(); }
  setNodeCount(v) { this.nodeCount = Math.min(MAX_NODES, Math.max(1, Math.round(v))); this.restart(); }
  setEdgeProbability(v) { this.edgeProbability = v; this.restart(); }
  setRule(v) { this.rule = v; }
  setStepMode(v) { this.stepMode = v; this._accum = 0; }
  setStepSpeed(v) { this.stepSpeed = v; }
  setSeedPercent(v) { this.seedPercent = v; this._reseed(); this._updateNodeColors(); this._updateEdgeColors(); }

  // ── Stats for the HUD overlay ────────────────────────────────────────────
  getStats() {
    let alive = 0;
    if (this.state) for (let i = 0; i < this.N; i++) alive += this.state[i];
    return {
      generation: this.generation,
      alive,
      total: this.N,
      rule: this.rule,
      graphType: this.graphType,
    };
  }

  // ── Build / rebuild everything ───────────────────────────────────────────
  restart() {
    this._buildGraph();
    this._layout();
    this._reseed();
    this._buildMeshes();
    this._accum = 0;
  }

  // =========================================================================
  // GRAPH GENERATION
  // =========================================================================
  _buildGraph() {
    switch (this.graphType) {
      case "Small World": this._buildSmallWorld(); break;
      case "Scale Free":  this._buildScaleFree();  break;
      case "Grid":        this._buildGrid();       break;
      case "Ring":        this._buildRing();       break;
      case "Random":
      default:            this._buildRandom();     break;
    }
    this._finalizeGraph();
  }

  // Turn an edge set into adjacency lists + degree array.
  _finalizeGraph() {
    this.adj = [];
    for (let i = 0; i < this.N; i++) this.adj.push([]);
    this.degree = new Int32Array(this.N);
    for (const [a, b] of this.edges) {
      this.adj[a].push(b);
      this.adj[b].push(a);
      this.degree[a]++;
      this.degree[b]++;
    }
    this.state = new Uint8Array(this.N);
    this.nextState = new Uint8Array(this.N);
  }

  // Erdős–Rényi: N nodes, each pair connected with probability p.
  _buildRandom() {
    this.N = Math.min(MAX_NODES, this.nodeCount);
    this.edges = [];
    const p = this.edgeProbability;
    for (let i = 0; i < this.N; i++) {
      for (let j = i + 1; j < this.N; j++) {
        if (Math.random() < p) this.edges.push([i, j]);
      }
    }
  }

  // Watts–Strogatz: ring lattice (k nearest on each side), rewire with p = 0.1.
  _buildSmallWorld() {
    this.N = Math.min(MAX_NODES, this.nodeCount);
    const N = this.N;
    const kEach = 2;           // neighbours on each side → degree 4 before rewiring
    const rewireP = 0.1;
    const edgeSet = new Set();
    const key = (a, b) => (a < b ? a * MAX_NODES + b : b * MAX_NODES + a);
    const addEdge = (a, b) => {
      if (a === b) return false;
      const k = key(a, b);
      if (edgeSet.has(k)) return false;
      edgeSet.add(k);
      return true;
    };

    // Ring lattice
    const ringEdges = [];
    for (let i = 0; i < N; i++) {
      for (let d = 1; d <= kEach; d++) {
        const j = (i + d) % N;
        if (addEdge(i, j)) ringEdges.push([i, j]);
      }
    }

    // Rewire one endpoint of each lattice edge with probability rewireP
    this.edges = [];
    for (let [a, b] of ringEdges) {
      if (Math.random() < rewireP) {
        edgeSet.delete(key(a, b));
        let tries = 0, target = b;
        do {
          target = Math.floor(Math.random() * N);
          tries++;
        } while ((target === a || edgeSet.has(key(a, target))) && tries < 20);
        if (addEdge(a, target)) { this.edges.push([a, target]); }
        else { addEdge(a, b); this.edges.push([a, b]); }
      } else {
        this.edges.push([a, b]);
      }
    }
  }

  // Barabási–Albert: preferential attachment, m = 2 new edges per node.
  _buildScaleFree() {
    this.N = Math.min(MAX_NODES, this.nodeCount);
    const N = this.N;
    const m = 2;
    this.edges = [];
    const m0 = Math.min(N, m + 1);

    // Seed: small fully-connected core
    const targetsPool = []; // repeated node ids → preferential attachment weight
    for (let i = 0; i < m0; i++) {
      for (let j = i + 1; j < m0; j++) {
        this.edges.push([i, j]);
        targetsPool.push(i, j);
      }
    }

    for (let v = m0; v < N; v++) {
      const chosen = new Set();
      let guard = 0;
      while (chosen.size < Math.min(m, v) && guard < 200) {
        guard++;
        const t = targetsPool.length
          ? targetsPool[Math.floor(Math.random() * targetsPool.length)]
          : Math.floor(Math.random() * v);
        if (t !== v) chosen.add(t);
      }
      for (const t of chosen) {
        this.edges.push([v, t]);
        targetsPool.push(v, t);
      }
    }
  }

  // Grid: side×side grid with 4-connectivity (side = round(sqrt(N))).
  _buildGrid() {
    const side = Math.max(2, Math.round(Math.sqrt(Math.min(MAX_NODES, this.nodeCount))));
    this._gridSide = side;
    this.N = side * side;
    this.edges = [];
    const idx = (r, c) => r * side + c;
    for (let r = 0; r < side; r++) {
      for (let c = 0; c < side; c++) {
        if (c + 1 < side) this.edges.push([idx(r, c), idx(r, c + 1)]);
        if (r + 1 < side) this.edges.push([idx(r, c), idx(r + 1, c)]);
      }
    }
  }

  // Ring: nodes on a circle, each connected to its 2 nearest neighbours (±1).
  _buildRing() {
    this.N = Math.min(MAX_NODES, this.nodeCount);
    const N = this.N;
    this.edges = [];
    for (let i = 0; i < N; i++) {
      this.edges.push([i, (i + 1) % N]);
    }
  }

  // =========================================================================
  // LAYOUT (3D)
  // =========================================================================
  _layout() {
    this.posX = new Float32Array(this.N);
    this.posY = new Float32Array(this.N);
    this.posZ = new Float32Array(this.N);

    if (this.graphType === "Grid") {
      this._layoutGrid();
    } else if (this.graphType === "Ring") {
      this._layoutRing();
    } else {
      this._layoutForceDirected();
    }
    this._normalizePositions();
  }

  // Flat grid in the XY plane facing the camera (z = 0).
  _layoutGrid() {
    const side = this._gridSide;
    let i = 0;
    for (let r = 0; r < side; r++) {
      for (let c = 0; c < side; c++) {
        this.posX[i] = c;
        this.posY[i] = r;
        this.posZ[i] = 0;
        i++;
      }
    }
  }

  // Ring laid in the XZ plane (y = 0) — reads as a halo when viewed from above.
  _layoutRing() {
    const N = this.N;
    const radius = 1;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      this.posX[i] = Math.cos(a) * radius;
      this.posY[i] = 0;
      this.posZ[i] = Math.sin(a) * radius;
    }
  }

  // Fruchterman–Reingold force-directed layout in 3D (50 iterations).
  _layoutForceDirected() {
    const N = this.N;
    if (N === 0) return;

    // Random initial placement: x/y in a unit disk, z spread through [-3, 3].
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      this.posX[i] = Math.cos(a) * r;
      this.posY[i] = Math.sin(a) * r;
      this.posZ[i] = (Math.random() * 2 - 1) * 3;
    }

    const area = 1.0;                       // unit working area
    const k = Math.sqrt(area / Math.max(1, N)); // ideal edge length
    const dispX = new Float32Array(N);
    const dispY = new Float32Array(N);
    const dispZ = new Float32Array(N);
    let temp = 0.1;                         // starting "temperature"
    const cool = temp / (FR_ITERATIONS + 1);

    for (let it = 0; it < FR_ITERATIONS; it++) {
      dispX.fill(0);
      dispY.fill(0);
      dispZ.fill(0);

      // Repulsive forces between all pairs
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          let dx = this.posX[i] - this.posX[j];
          let dy = this.posY[i] - this.posY[j];
          let dz = this.posZ[i] - this.posZ[j];
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
          const rep = (k * k) / dist;
          const ux = dx / dist, uy = dy / dist, uz = dz / dist;
          dispX[i] += ux * rep; dispY[i] += uy * rep; dispZ[i] += uz * rep;
          dispX[j] -= ux * rep; dispY[j] -= uy * rep; dispZ[j] -= uz * rep;
        }
      }

      // Attractive forces along edges (springs)
      for (const [a, b] of this.edges) {
        let dx = this.posX[a] - this.posX[b];
        let dy = this.posY[a] - this.posY[b];
        let dz = this.posZ[a] - this.posZ[b];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
        const att = (dist * dist) / k;
        const ux = dx / dist, uy = dy / dist, uz = dz / dist;
        dispX[a] -= ux * att; dispY[a] -= uy * att; dispZ[a] -= uz * att;
        dispX[b] += ux * att; dispY[b] += uy * att; dispZ[b] += uz * att;
      }

      // Limit displacement by temperature, then cool
      for (let i = 0; i < N; i++) {
        const d = Math.sqrt(
          dispX[i] * dispX[i] + dispY[i] * dispY[i] + dispZ[i] * dispZ[i]
        ) || 1e-4;
        const lim = Math.min(d, temp);
        this.posX[i] += (dispX[i] / d) * lim;
        this.posY[i] += (dispY[i] / d) * lim;
        this.posZ[i] += (dispZ[i] / d) * lim;
      }
      temp -= cool;
    }
  }

  // Center each axis and scale it independently to fill ±WORLD_EXTENT, so the
  // graph occupies all three dimensions. Flat axes (grid z, ring y) stay flat.
  _normalizePositions() {
    const N = this.N;
    if (N === 0) return;
    this._normalizeAxis(this.posX);
    this._normalizeAxis(this.posY);
    this._normalizeAxis(this.posZ);
  }

  _normalizeAxis(arr) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < this.N; i++) {
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
    const span = max - min;
    const center = (min + max) / 2;
    // A flat axis (span ~0) stays centered at 0 rather than blowing up.
    const scale = span > 1e-6 ? (WORLD_EXTENT * 2) / span : 0;
    for (let i = 0; i < this.N; i++) {
      arr[i] = (arr[i] - center) * scale;
    }
  }

  // =========================================================================
  // STATE
  // =========================================================================
  _reseed() {
    this.generation = 0;
    if (!this.state) return;
    for (let i = 0; i < this.N; i++) {
      this.state[i] = Math.random() < this.seedPercent ? 1 : 0;
    }
  }

  // =========================================================================
  // RULES (synchronous update)
  // =========================================================================
  step() {
    const N = this.N;
    const state = this.state;
    const next = this.nextState;

    for (let i = 0; i < N; i++) {
      const neigh = this.adj[i];
      let alive = 0;
      for (let n = 0; n < neigh.length; n++) alive += state[neigh[n]];
      next[i] = this._applyRule(state[i], alive, neigh.length);
    }

    // Pop a pulse on every node whose state changed this step (compare against
    // the still-current `state` before we swap buffers).
    if (this._pulse) {
      for (let i = 0; i < N; i++) {
        if (next[i] !== state[i]) this._pulse[i] = PULSE_SCALE;
      }
    }

    // Swap buffers
    this.state = next;
    this.nextState = state;
    this.generation++;

    this._updateNodeColors();
    this._updateEdgeColors();
  }

  _applyRule(cur, alive, deg) {
    switch (this.rule) {
      case "Majority":
        // Alive if a strict majority of neighbours are alive
        return alive * 2 > deg ? 1 : 0;
      case "Parity":
        // Flip state when an odd number of neighbours are alive
        return (alive & 1) ? (cur ? 0 : 1) : cur;
      case "Custom":
        // Born if 2–4 alive neighbours; survive if 1–3
        if (cur) return (alive >= 1 && alive <= 3) ? 1 : 0;
        return (alive >= 2 && alive <= 4) ? 1 : 0;
      case "Conway-like B3/S23":
      default:
        // Classic Game of Life carried onto the graph
        if (cur) return (alive === 2 || alive === 3) ? 1 : 0;
        return alive === 3 ? 1 : 0;
    }
  }

  // =========================================================================
  // RENDERING
  // =========================================================================
  _buildMeshes() {
    this._disposeMeshes();

    // ── Edges: a single LineSegments with per-vertex colours ──
    const edgePos = new Float32Array(this.edges.length * 6);
    let e = 0;
    for (const [a, b] of this.edges) {
      edgePos[e++] = this.posX[a]; edgePos[e++] = this.posY[a]; edgePos[e++] = this.posZ[a];
      edgePos[e++] = this.posX[b]; edgePos[e++] = this.posY[b]; edgePos[e++] = this.posZ[b];
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(this.edges.length * 6), 3)
    );
    this._edgeLines = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this._edgeLines);

    // ── Nodes: one shaded sphere Mesh each (per-node emissive glow + pulse) ──
    this._nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 12, 8);

    // Per-node degree-based scale (hubs slightly larger — visible on scale-free)
    let maxDeg = 1;
    for (let i = 0; i < this.N; i++) maxDeg = Math.max(maxDeg, this.degree[i]);
    this._baseScale = new Float32Array(this.N);
    this._pulse = new Float32Array(this.N);
    this._nodeMeshes = [];

    for (let i = 0; i < this.N; i++) {
      const base = 0.85 + 0.9 * (this.degree[i] / maxDeg);
      this._baseScale[i] = base;
      this._pulse[i] = 1;

      const mat = new THREE.MeshPhongMaterial({ shininess: 40 });
      const mesh = new THREE.Mesh(this._nodeGeo, mat);
      mesh.position.set(this.posX[i], this.posY[i], this.posZ[i]);
      mesh.scale.setScalar(base);
      this.scene.add(mesh);
      this._nodeMeshes.push(mesh);
    }

    this._updateNodeColors();
    this._updateEdgeColors();
  }

  _updateNodeColors() {
    if (!this._nodeMeshes.length) return;
    for (let i = 0; i < this.N; i++) {
      const mat = this._nodeMeshes[i].material;
      if (this.state[i]) {
        mat.color.copy(COLOR_ALIVE);
        mat.emissive.copy(COLOR_ALIVE_EMISSIVE);
        mat.emissiveIntensity = 0.8;
      } else {
        mat.color.copy(COLOR_DEAD);
        mat.emissive.copy(COLOR_DEAD_EMISSIVE);
        mat.emissiveIntensity = 1.0;
      }
    }
  }

  _updateEdgeColors() {
    if (!this._edgeLines) return;
    const colors = this._edgeLines.geometry.getAttribute("color");
    const arr = colors.array;
    let o = 0;
    for (const [a, b] of this.edges) {
      const both = this.state[a] && this.state[b];
      if (both) {
        this._tmpColor.copy(COLOR_EDGE_ALIVE).multiplyScalar(EDGE_ALIVE_OPACITY);
      } else {
        this._tmpColor.copy(COLOR_EDGE_DEAD).multiplyScalar(EDGE_DEAD_OPACITY);
      }
      arr[o++] = this._tmpColor.r; arr[o++] = this._tmpColor.g; arr[o++] = this._tmpColor.b;
      arr[o++] = this._tmpColor.r; arr[o++] = this._tmpColor.g; arr[o++] = this._tmpColor.b;
    }
    colors.needsUpdate = true;
  }

  // Ease every pulsing node back toward its base scale (1.4 → 1.0 over ~0.3s).
  _updatePulses(dt) {
    if (!this._pulse) return;
    const t = Math.min(1, dt / PULSE_TIME);
    for (let i = 0; i < this.N; i++) {
      if (this._pulse[i] > 1.0001) {
        this._pulse[i] += (1 - this._pulse[i]) * t;
        if (this._pulse[i] <= 1.0001) this._pulse[i] = 1;
        this._nodeMeshes[i].scale.setScalar(this._baseScale[i] * this._pulse[i]);
      }
    }
  }

  _disposeMeshes() {
    if (this._edgeLines) {
      this.scene.remove(this._edgeLines);
      this._edgeLines.geometry.dispose();
      this._edgeLines.material.dispose();
      this._edgeLines = null;
    }
    if (this._nodeMeshes.length) {
      for (const mesh of this._nodeMeshes) {
        this.scene.remove(mesh);
        mesh.material.dispose();
      }
      this._nodeMeshes = [];
    }
    if (this._nodeGeo) {
      this._nodeGeo.dispose();
      this._nodeGeo = null;
    }
  }

  // =========================================================================
  // MAIN LOOP
  // =========================================================================
  update() {
    const now = performance.now() / 1000;
    if (this._lastTime === null) { this._lastTime = now; return; }
    const dt = Math.min(now - this._lastTime, 0.1);
    this._lastTime = now;

    if (this.stepMode === "Auto") {
      this._accum += dt;
      const interval = 1 / this.stepSpeed;
      // Guard against huge bursts after a tab regains focus
      let steps = 0;
      while (this._accum >= interval && steps < 4) {
        this.step();
        this._accum -= interval;
        steps++;
      }
      if (steps === 4) this._accum = 0;
    }
    // Manual mode: stepping is driven by the GUI "Step" button only.

    // Pulse easing runs every frame regardless of step cadence.
    this._updatePulses(dt);
  }
}

export { Game };
