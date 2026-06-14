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
// ---------------------------------------------------------------------------

const MAX_NODES = 300;          // hard performance cap
const NODE_RADIUS = 0.12;       // base circle radius (world units)
const WORLD_EXTENT = 4.0;       // graph is scaled to fit roughly ±4 world units

const COLOR_ALIVE = new THREE.Color("#00ffcc"); // neon cyan
const COLOR_DEAD = new THREE.Color("#112233");  // dark
const EDGE_COLOR = 0x1a3a6a;

// Layout (force-directed) parameters
const FR_ITERATIONS = 50;

class Game {
  constructor(scene) {
    this.scene = scene;

    // ── Parameters (mirrored from the GUI) ──
    this.graphType = "Random";
    this.nodeCount = 80;
    this.edgeProbability = 0.08;
    this.rule = "Conway-like B3/S23";
    this.stepMode = "Auto";
    this.stepSpeed = 4;          // steps / second
    this.seedPercent = 0.3;

    // ── Simulation timing ──
    this._lastTime = null;
    this._accum = 0;             // accumulated seconds for auto-stepping

    // ── Graph data (allocated on build) ──
    this.N = 0;
    this.adj = [];               // adjacency list: adj[i] = [neighbour indices]
    this.edges = [];             // [[a,b], ...]
    this.posX = null;            // Float32Array of node x
    this.posZ = null;            // Float32Array of node z (we lay out in XZ plane)
    this.degree = null;          // Int32Array of node degree
    this.state = null;           // Uint8Array current state
    this.nextState = null;       // Uint8Array buffer

    // ── Three.js objects ──
    this._nodeMesh = null;
    this._edgeLines = null;
    this._dummy = new THREE.Object3D();
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
  setSeedPercent(v) { this.seedPercent = v; this._reseed(); this._updateNodeColors(); }

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
  // LAYOUT
  // =========================================================================
  _layout() {
    this.posX = new Float32Array(this.N);
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

  _layoutGrid() {
    const side = this._gridSide;
    let i = 0;
    for (let r = 0; r < side; r++) {
      for (let c = 0; c < side; c++) {
        this.posX[i] = c;
        this.posZ[i] = r;
        i++;
      }
    }
  }

  _layoutRing() {
    const N = this.N;
    const radius = 1;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      this.posX[i] = Math.cos(a) * radius;
      this.posZ[i] = Math.sin(a) * radius;
    }
  }

  // Fruchterman–Reingold force-directed layout (50 iterations).
  _layoutForceDirected() {
    const N = this.N;
    if (N === 0) return;

    // Random initial placement in a disk
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      this.posX[i] = Math.cos(a) * r;
      this.posZ[i] = Math.sin(a) * r;
    }

    const area = 1.0;                       // unit working area
    const k = Math.sqrt(area / Math.max(1, N)); // ideal edge length
    const dispX = new Float32Array(N);
    const dispZ = new Float32Array(N);
    let temp = 0.1;                         // starting "temperature"
    const cool = temp / (FR_ITERATIONS + 1);

    for (let it = 0; it < FR_ITERATIONS; it++) {
      dispX.fill(0);
      dispZ.fill(0);

      // Repulsive forces between all pairs
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          let dx = this.posX[i] - this.posX[j];
          let dz = this.posZ[i] - this.posZ[j];
          let dist = Math.sqrt(dx * dx + dz * dz) || 1e-4;
          const rep = (k * k) / dist;
          const ux = dx / dist, uz = dz / dist;
          dispX[i] += ux * rep; dispZ[i] += uz * rep;
          dispX[j] -= ux * rep; dispZ[j] -= uz * rep;
        }
      }

      // Attractive forces along edges (springs)
      for (const [a, b] of this.edges) {
        let dx = this.posX[a] - this.posX[b];
        let dz = this.posZ[a] - this.posZ[b];
        let dist = Math.sqrt(dx * dx + dz * dz) || 1e-4;
        const att = (dist * dist) / k;
        const ux = dx / dist, uz = dz / dist;
        dispX[a] -= ux * att; dispZ[a] -= uz * att;
        dispX[b] += ux * att; dispZ[b] += uz * att;
      }

      // Limit displacement by temperature, then cool
      for (let i = 0; i < N; i++) {
        const d = Math.sqrt(dispX[i] * dispX[i] + dispZ[i] * dispZ[i]) || 1e-4;
        const lim = Math.min(d, temp);
        this.posX[i] += (dispX[i] / d) * lim;
        this.posZ[i] += (dispZ[i] / d) * lim;
      }
      temp -= cool;
    }
  }

  // Center and scale node coordinates to fit within ±WORLD_EXTENT.
  _normalizePositions() {
    const N = this.N;
    if (N === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < N; i++) {
      if (this.posX[i] < minX) minX = this.posX[i];
      if (this.posX[i] > maxX) maxX = this.posX[i];
      if (this.posZ[i] < minZ) minZ = this.posZ[i];
      if (this.posZ[i] > maxZ) maxZ = this.posZ[i];
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    const scale = (WORLD_EXTENT * 2) / span;
    for (let i = 0; i < N; i++) {
      this.posX[i] = (this.posX[i] - cx) * scale;
      this.posZ[i] = (this.posZ[i] - cz) * scale;
    }
  }

  // =========================================================================
  // STATE
  // =========================================================================
  _reseed() {
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

    // Swap buffers
    this.state = next;
    this.nextState = state;

    this._updateNodeColors();
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

    // ── Edges: a single static LineSegments ──
    const edgePos = new Float32Array(this.edges.length * 6);
    let e = 0;
    for (const [a, b] of this.edges) {
      edgePos[e++] = this.posX[a]; edgePos[e++] = -0.01; edgePos[e++] = this.posZ[a];
      edgePos[e++] = this.posX[b]; edgePos[e++] = -0.01; edgePos[e++] = this.posZ[b];
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
    this._edgeLines = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: EDGE_COLOR })
    );
    this.scene.add(this._edgeLines);

    // ── Nodes: InstancedMesh of flat circles facing up (+Y) ──
    const circle = new THREE.CircleGeometry(NODE_RADIUS, 18);
    circle.rotateX(-Math.PI / 2); // lay flat in the XZ plane, facing the camera
    const mat = new THREE.MeshBasicMaterial();
    this._nodeMesh = new THREE.InstancedMesh(circle, mat, Math.max(1, this.N));
    this._nodeMesh.count = this.N;
    this._nodeMesh.frustumCulled = false;
    this.scene.add(this._nodeMesh);

    // Per-node degree-based scale (hubs slightly larger — visible on scale-free)
    let maxDeg = 1;
    for (let i = 0; i < this.N; i++) maxDeg = Math.max(maxDeg, this.degree[i]);
    this._nodeScale = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) {
      this._nodeScale[i] = 0.85 + 0.9 * (this.degree[i] / maxDeg);
    }

    const d = this._dummy;
    for (let i = 0; i < this.N; i++) {
      d.position.set(this.posX[i], 0, this.posZ[i]);
      d.scale.setScalar(this._nodeScale[i]);
      d.updateMatrix();
      this._nodeMesh.setMatrixAt(i, d.matrix);
    }
    this._nodeMesh.instanceMatrix.needsUpdate = true;

    this._updateNodeColors();
  }

  _updateNodeColors() {
    if (!this._nodeMesh) return;
    for (let i = 0; i < this.N; i++) {
      this._tmpColor.copy(this.state[i] ? COLOR_ALIVE : COLOR_DEAD);
      this._nodeMesh.setColorAt(i, this._tmpColor);
    }
    if (this._nodeMesh.instanceColor) this._nodeMesh.instanceColor.needsUpdate = true;
  }

  _disposeMeshes() {
    if (this._edgeLines) {
      this.scene.remove(this._edgeLines);
      this._edgeLines.geometry.dispose();
      this._edgeLines.material.dispose();
      this._edgeLines = null;
    }
    if (this._nodeMesh) {
      this.scene.remove(this._nodeMesh);
      this._nodeMesh.geometry.dispose();
      this._nodeMesh.material.dispose();
      this._nodeMesh.dispose();
      this._nodeMesh = null;
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
  }
}

export { Game };
