import * as THREE from "/modules/three.module.js";

// ─────────────────────────────────────────────────────────────────────────────
//  SUBURB DATA  (approximate, ACS / Zillow / Cook County Assessor 2020–2024)
// ─────────────────────────────────────────────────────────────────────────────
const SUBURBS = [
  // Lake County (north)
  { name: "Libertyville",     lat: 42.283, lng: -87.953, pop: 20730,  medianIncome: 102000, medianAge: 41, homeValue: 385000, propertyTax: 10200, popGrowth10yr: 3.1 },
  { name: "Vernon Hills",     lat: 42.221, lng: -87.961, pop: 25700,  medianIncome: 95000,  medianAge: 38, homeValue: 350000, propertyTax: 9800,  popGrowth10yr: 5.2 },
  { name: "Gurnee",           lat: 42.370, lng: -87.928, pop: 31000,  medianIncome: 82000,  medianAge: 37, homeValue: 290000, propertyTax: 8600,  popGrowth10yr: 2.0 },
  { name: "Waukegan",         lat: 42.364, lng: -87.845, pop: 87901,  medianIncome: 51000,  medianAge: 30, homeValue: 170000, propertyTax: 5200,  popGrowth10yr: -2.1 },
  { name: "North Chicago",    lat: 42.325, lng: -87.841, pop: 32574,  medianIncome: 44000,  medianAge: 28, homeValue: 148000, propertyTax: 4600,  popGrowth10yr: -1.5 },
  { name: "Lake Forest",      lat: 42.259, lng: -87.840, pop: 19375,  medianIncome: 175000, medianAge: 45, homeValue: 680000, propertyTax: 15800, popGrowth10yr: 1.8 },
  { name: "Highland Park",    lat: 42.181, lng: -87.800, pop: 29525,  medianIncome: 120000, medianAge: 44, homeValue: 510000, propertyTax: 13200, popGrowth10yr: -0.5 },
  { name: "Zion",             lat: 42.446, lng: -87.835, pop: 24413,  medianIncome: 48000,  medianAge: 31, homeValue: 155000, propertyTax: 4900,  popGrowth10yr: 1.2 },
  { name: "Round Lake Beach", lat: 42.370, lng: -88.090, pop: 28175,  medianIncome: 57000,  medianAge: 32, homeValue: 188000, propertyTax: 5600,  popGrowth10yr: 4.1 },

  // Northwest suburbs (Cook/Lake border)
  { name: "Buffalo Grove",      lat: 42.166, lng: -87.959, pop: 41400, medianIncome: 97000,  medianAge: 40, homeValue: 340000, propertyTax: 9400,  popGrowth10yr: 0.8 },
  { name: "Arlington Heights",  lat: 42.088, lng: -87.980, pop: 77676, medianIncome: 88000,  medianAge: 41, homeValue: 340000, propertyTax: 8900,  popGrowth10yr: 1.5 },
  { name: "Mount Prospect",     lat: 42.066, lng: -87.937, pop: 54394, medianIncome: 78000,  medianAge: 39, homeValue: 295000, propertyTax: 7900,  popGrowth10yr: 1.2 },
  { name: "Palatine",          lat: 42.110, lng: -88.034, pop: 68557, medianIncome: 80000,  medianAge: 38, homeValue: 295000, propertyTax: 7800,  popGrowth10yr: 0.7 },
  { name: "Schaumburg",        lat: 42.033, lng: -88.083, pop: 78723, medianIncome: 79000,  medianAge: 37, homeValue: 280000, propertyTax: 7400,  popGrowth10yr: 1.1 },
  { name: "Hoffman Estates",   lat: 42.060, lng: -88.080, pop: 51895, medianIncome: 82000,  medianAge: 38, homeValue: 285000, propertyTax: 7600,  popGrowth10yr: 0.3 },
  { name: "Elk Grove Village", lat: 42.003, lng: -87.997, pop: 33127, medianIncome: 71000,  medianAge: 41, homeValue: 265000, propertyTax: 7000,  popGrowth10yr: -1.8 },
  { name: "Des Plaines",       lat: 42.034, lng: -87.883, pop: 58918, medianIncome: 69000,  medianAge: 39, homeValue: 265000, propertyTax: 6800,  popGrowth10yr: 0.4 },
  { name: "Glenview",          lat: 42.070, lng: -87.830, pop: 48900, medianIncome: 113000, medianAge: 42, homeValue: 450000, propertyTax: 11200, popGrowth10yr: 3.0 },
  { name: "Northbrook",        lat: 42.125, lng: -87.827, pop: 35000, medianIncome: 115000, medianAge: 44, homeValue: 480000, propertyTax: 11800, popGrowth10yr: 1.4 },
  { name: "Wheeling",          lat: 42.138, lng: -87.929, pop: 37648, medianIncome: 65000,  medianAge: 36, homeValue: 245000, propertyTax: 6500,  popGrowth10yr: 2.2 },
  { name: "Bartlett",          lat: 41.995, lng: -88.185, pop: 41600, medianIncome: 91000,  medianAge: 37, homeValue: 315000, propertyTax: 8400,  popGrowth10yr: 7.5 },

  // Near north (inner ring)
  { name: "Evanston",          lat: 42.045, lng: -87.688, pop: 78110, medianIncome: 78000,  medianAge: 33, homeValue: 410000, propertyTax: 9800,  popGrowth10yr: 2.3 },
  { name: "Skokie",            lat: 42.033, lng: -87.733, pop: 64784, medianIncome: 69000,  medianAge: 39, homeValue: 310000, propertyTax: 8100,  popGrowth10yr: 0.1 },

  // West suburbs (DuPage / Kane)
  { name: "Elgin",             lat: 42.037, lng: -88.281, pop: 114797, medianIncome: 62000,  medianAge: 32, homeValue: 225000, propertyTax: 6200,  popGrowth10yr: 3.5 },
  { name: "St. Charles",       lat: 41.914, lng: -88.308, pop: 33166,  medianIncome: 92000,  medianAge: 39, homeValue: 340000, propertyTax: 9100,  popGrowth10yr: 4.2 },
  { name: "Geneva",            lat: 41.888, lng: -88.305, pop: 21858,  medianIncome: 98000,  medianAge: 41, homeValue: 365000, propertyTax: 9800,  popGrowth10yr: 3.8 },
  { name: "Batavia",           lat: 41.850, lng: -88.312, pop: 26600,  medianIncome: 90000,  medianAge: 39, homeValue: 320000, propertyTax: 8800,  popGrowth10yr: 5.0 },
  { name: "Aurora",            lat: 41.760, lng: -88.320, pop: 180542, medianIncome: 66000,  medianAge: 31, homeValue: 240000, propertyTax: 6500,  popGrowth10yr: 8.2 },
  { name: "Carol Stream",      lat: 41.912, lng: -88.134, pop: 39921,  medianIncome: 78000,  medianAge: 37, homeValue: 280000, propertyTax: 7200,  popGrowth10yr: 1.5 },
  { name: "Bloomingdale",      lat: 41.951, lng: -88.081, pop: 22018,  medianIncome: 89000,  medianAge: 40, homeValue: 320000, propertyTax: 8300,  popGrowth10yr: 0.2 },
  { name: "Wheaton",           lat: 41.866, lng: -88.107, pop: 53648,  medianIncome: 96000,  medianAge: 41, homeValue: 375000, propertyTax: 9600,  popGrowth10yr: 2.5 },
  { name: "Lisle",             lat: 41.800, lng: -88.071, pop: 23985,  medianIncome: 88000,  medianAge: 39, homeValue: 320000, propertyTax: 8000,  popGrowth10yr: 0.7 },
  { name: "Downers Grove",     lat: 41.808, lng: -88.011, pop: 49670,  medianIncome: 94000,  medianAge: 40, homeValue: 360000, propertyTax: 8900,  popGrowth10yr: 2.0 },
  { name: "Westmont",          lat: 41.795, lng: -87.975, pop: 24685,  medianIncome: 72000,  medianAge: 39, homeValue: 290000, propertyTax: 7100,  popGrowth10yr: 1.1 },
  { name: "Naperville",        lat: 41.785, lng: -88.147, pop: 148449, medianIncome: 115000, medianAge: 37, homeValue: 430000, propertyTax: 10800, popGrowth10yr: 12.5 },
  { name: "Bolingbrook",       lat: 41.698, lng: -88.068, pop: 73366,  medianIncome: 79000,  medianAge: 34, homeValue: 275000, propertyTax: 7000,  popGrowth10yr: 6.8 },
  { name: "Plainfield",        lat: 41.632, lng: -88.202, pop: 46600,  medianIncome: 96000,  medianAge: 36, homeValue: 340000, propertyTax: 8500,  popGrowth10yr: 18.5 },

  // Southwest / south suburbs (Cook / Will)
  { name: "Orland Park",       lat: 41.603, lng: -87.854, pop: 58590,  medianIncome: 89000,  medianAge: 41, homeValue: 320000, propertyTax: 7800,  popGrowth10yr: 3.5 },
  { name: "Tinley Park",       lat: 41.573, lng: -87.786, pop: 56703,  medianIncome: 78000,  medianAge: 40, homeValue: 280000, propertyTax: 6900,  popGrowth10yr: 2.8 },
  { name: "Oak Lawn",          lat: 41.719, lng: -87.755, pop: 55245,  medianIncome: 65000,  medianAge: 40, homeValue: 240000, propertyTax: 6200,  popGrowth10yr: -1.2 },
  { name: "Cicero",            lat: 41.846, lng: -87.754, pop: 81797,  medianIncome: 46000,  medianAge: 29, homeValue: 185000, propertyTax: 4800,  popGrowth10yr: 0.5 },
  { name: "Berwyn",            lat: 41.850, lng: -87.794, pop: 56657,  medianIncome: 58000,  medianAge: 33, homeValue: 215000, propertyTax: 5600,  popGrowth10yr: 1.8 },
  { name: "Oak Park",          lat: 41.885, lng: -87.781, pop: 51878,  medianIncome: 88000,  medianAge: 37, homeValue: 380000, propertyTax: 10200, popGrowth10yr: 1.5 },
  { name: "Joliet",            lat: 41.525, lng: -88.082, pop: 150362, medianIncome: 63000,  medianAge: 33, homeValue: 218000, propertyTax: 5800,  popGrowth10yr: 5.2 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  LAYER DEFINITIONS  (5 choropleth metrics)
// ─────────────────────────────────────────────────────────────────────────────
const moneyFmt   = (v) => "$" + Math.round(v).toLocaleString("en-US");
const pctFmt     = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

const LAYERS = [
  {
    id: 0, label: "Median Income", icon: "💰", field: "medianIncome",
    stops: ["#200040", "#0044cc", "#00cc66", "#ffee00", "#ff6600"],
    fmt: moneyFmt, diverging: false,
  },
  {
    id: 1, label: "Median Age", icon: "🧑", field: "medianAge",
    stops: ["#0088ff", "#00bb44", "#cccc00", "#ff8800", "#cc2200"],
    fmt: (v) => v.toFixed(0) + " yrs", diverging: false,
  },
  {
    id: 2, label: "Home Value", icon: "🏠", field: "homeValue",
    stops: ["#004444", "#0044bb", "#6600cc", "#aa00aa", "#ff00cc"],
    fmt: moneyFmt, diverging: false,
  },
  {
    id: 3, label: "Property Tax", icon: "📋", field: "propertyTax",
    stops: ["#006622", "#88cc00", "#ffcc00", "#ff6600", "#cc0000"],
    fmt: (v) => moneyFmt(v) + "/yr", diverging: false,
  },
  {
    id: 4, label: "Pop. Growth (10yr)", icon: "📈", field: "popGrowth10yr",
    stops: ["#cc0000", "#ffffff", "#00aa44"], // diverging red → white → green
    fmt: pctFmt, diverging: true, divMin: -10, divMid: 0, divMax: 20,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  COLOR HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// t in [0,1], colorStops = array of "#rrggbb", evenly spaced. Returns THREE.Color.
function interpolateColor(t, colorStops) {
  t = Math.max(0, Math.min(1, t));
  const n = colorStops.length - 1;
  const scaled = t * n;
  const i = Math.min(Math.floor(scaled), n - 1);
  const f = scaled - i;
  const a = hexToRgb(colorStops[i]);
  const b = hexToRgb(colorStops[i + 1]);
  const r = (a.r + (b.r - a.r) * f) / 255;
  const g = (a.g + (b.g - a.g) * f) / 255;
  const bl = (a.b + (b.b - a.b) * f) / 255;
  return new THREE.Color(r, g, bl);
}

// ─────────────────────────────────────────────────────────────────────────────
//  GAME
// ─────────────────────────────────────────────────────────────────────────────
class Game {
  constructor({ scene, camera, controls, domElement, params, tooltipEl, legendEl }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.domElement = domElement;
    this.params = params;
    this.tooltipEl = tooltipEl;
    this.legendEl = legendEl;

    this.activeLayer = params.layer ?? 0;
    this.opacity = params.opacity ?? 0.85;
    this.showLabels = params.showLabels ?? true;
    this.showGlow = params.showGlow ?? true;

    this.hexMeshes = [];   // raycast targets (fill)
    this.records = [];     // per-suburb bundle of meshes + data

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-2, -2); // off-screen until first move
    this.mouseClient = { x: 0, y: 0 };
    this.hovered = null;

    this._computeStats();
    this._project();
    this._buildGrid();
    this._buildSuburbs();
    this._initPointer();

    this.setLayer(this.activeLayer);
    this.setOpacity(this.opacity);
    this.setShowLabels(this.showLabels);
    this.setShowGlow(this.showGlow);
  }

  // ── Precompute min/max & rankings per metric ──────────────────────────────
  _computeStats() {
    this.stats = {};
    for (const layer of LAYERS) {
      const vals = SUBURBS.map((s) => s[layer.field]);
      this.stats[layer.field] = {
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    }
    // population span for hex-radius scaling
    this.popSqrtMin = Math.sqrt(Math.min(...SUBURBS.map((s) => s.pop)));
    this.popSqrtMax = Math.sqrt(Math.max(...SUBURBS.map((s) => s.pop)));
  }

  // ── Project lat/lng → world XY (simple equirectangular, cos-corrected) ─────
  _project() {
    const lats = SUBURBS.map((s) => s.lat);
    const lngs = SUBURBS.map((s) => s.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const SCALE = 1400; // world units per degree of latitude

    this.positions = SUBURBS.map((s) => ({
      x: (s.lng - centerLng) * cosLat * SCALE,
      y: (s.lat - centerLat) * SCALE,
    }));

    const xs = this.positions.map((p) => p.x);
    const ys = this.positions.map((p) => p.y);
    this.bounds = {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    };
    this.bounds.centerX = (this.bounds.minX + this.bounds.maxX) / 2;
    this.bounds.centerY = (this.bounds.minY + this.bounds.maxY) / 2;
  }

  getBounds() { return this.bounds; }

  _hexRadius(pop) {
    const t = (Math.sqrt(pop) - this.popSqrtMin) / (this.popSqrtMax - this.popSqrtMin);
    return 14 + t * (50 - 14);
  }

  // ── Faint canvas grid backdrop ────────────────────────────────────────────
  _buildGrid() {
    const b = this.bounds;
    const w = (b.maxX - b.minX) * 1.6;
    const h = (b.maxY - b.minY) * 1.6;

    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.strokeStyle = "rgba(26,37,64,1)";
    ctx.lineWidth = 1.5;
    const step = 1024 / 24;
    for (let i = 0; i <= 24; i++) {
      const p = Math.round(i * step) + 0.5;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(1024, p); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.12, depthWrite: false })
    );
    plane.position.set(b.centerX, b.centerY, -5);
    this.scene.add(plane);
  }

  // ── Build hex fill + glow + stroke + label for each suburb ─────────────────
  _buildSuburbs() {
    SUBURBS.forEach((data, i) => {
      const pos = this.positions[i];
      const r = this._hexRadius(data.pop);

      // flat-top hexagon = CircleGeometry(6 segments), first vertex at angle 0
      const fillGeo = new THREE.CircleGeometry(r, 6);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: this.opacity,
      });
      const fill = new THREE.Mesh(fillGeo, fillMat);
      fill.position.set(pos.x, pos.y, 0);
      fill.userData = { index: i, data };

      // glow (slightly larger, behind)
      const glowGeo = new THREE.CircleGeometry(r * 1.22, 6);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(pos.x, pos.y, -1);

      // white perimeter stroke (LineLoop)
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const strokeGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const strokeMat = new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.7,
      });
      const stroke = new THREE.LineLoop(strokeGeo, strokeMat);
      stroke.position.set(pos.x, pos.y, 0.2);

      // name label sprite
      const label = this._makeLabel(data.name, r);
      label.position.set(pos.x, pos.y + r * 1.25, 1);

      this.scene.add(glow, fill, stroke, label);
      this.hexMeshes.push(fill);
      this.records.push({ fill, glow, stroke, label, data, index: i, radius: r });
    });
  }

  _makeLabel(text, r) {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const fontPx = 48;
    ctx.font = `600 ${fontPx}px -apple-system, Segoe UI, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    const h = fontPx + 24;
    c.width = w; c.height = h;
    // redo after resize
    ctx.font = `600 ${fontPx}px -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#f5f7fb";
    ctx.fillText(text, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const worldH = r * 0.55;
    sprite.scale.set((w / h) * worldH, worldH, 1);
    return sprite;
  }

  // ── Compute normalized t for a value under a layer ────────────────────────
  _tForValue(layer, value) {
    if (layer.diverging) {
      if (value <= layer.divMid) {
        const lo = (value - layer.divMin) / (layer.divMid - layer.divMin); // 0..1
        return 0.5 * Math.max(0, Math.min(1, lo));
      }
      const hi = (value - layer.divMid) / (layer.divMax - layer.divMid); // 0..1
      return 0.5 + 0.5 * Math.max(0, Math.min(1, hi));
    }
    const st = this.stats[layer.field];
    return (value - st.min) / (st.max - st.min);
  }

  // ── Public layer / display setters ────────────────────────────────────────
  setLayer(n) {
    this.activeLayer = n;
    const layer = LAYERS[n];
    for (const rec of this.records) {
      const t = this._tForValue(layer, rec.data[layer.field]);
      const col = interpolateColor(t, layer.stops);
      rec.fill.material.color.copy(col);
      rec.glow.material.color.copy(col);
    }
    this._updateLegend();
  }

  setOpacity(v) {
    this.opacity = v;
    for (const rec of this.records) {
      rec.fill.material.opacity = v;
      rec.glow.material.opacity = this.showGlow ? Math.min(0.25, v * 0.3) : 0;
    }
  }

  setShowLabels(b) {
    this.showLabels = b;
    for (const rec of this.records) rec.label.visible = b;
  }

  setShowGlow(b) {
    this.showGlow = b;
    for (const rec of this.records) rec.glow.visible = b;
  }

  // ── Legend overlay (gradient bar + min/max) ───────────────────────────────
  _updateLegend() {
    if (!this.legendEl) return;
    const layer = LAYERS[this.activeLayer];

    const barH = 200, barW = 24;
    const cv = document.createElement("canvas");
    cv.width = barW; cv.height = barH;
    const ctx = cv.getContext("2d");
    for (let y = 0; y < barH; y++) {
      const t = 1 - y / (barH - 1); // top = high
      const col = interpolateColor(t, layer.stops);
      ctx.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
      ctx.fillRect(0, y, barW, 1);
    }

    let topLabel, midLabel, botLabel;
    if (layer.diverging) {
      topLabel = pctFmt(layer.divMax);
      midLabel = pctFmt(layer.divMid);
      botLabel = pctFmt(layer.divMin);
    } else {
      const st = this.stats[layer.field];
      topLabel = layer.fmt(st.max);
      botLabel = layer.fmt(st.min);
      midLabel = null;
    }

    this.legendEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:#f9fafb;margin-bottom:8px;letter-spacing:.3px;">
        ${layer.icon} ${layer.label}
      </div>
      <div style="display:flex;gap:10px;align-items:stretch;">
        <img src="${cv.toDataURL()}" width="${barW}" height="${barH}"
             style="border-radius:5px;border:1px solid #2a3550;display:block;"/>
        <div style="display:flex;flex-direction:column;justify-content:space-between;
                    font-size:11px;color:#cbd5e1;padding:1px 0;">
          <span>${topLabel}</span>
          ${midLabel !== null ? `<span style="color:#94a3b8;">${midLabel}</span>` : ""}
          <span>${botLabel}</span>
        </div>
      </div>`;
  }

  // ── Pointer tracking for raycast hover ────────────────────────────────────
  _initPointer() {
    const el = this.domElement;
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseClient.x = e.clientX;
      this.mouseClient.y = e.clientY;
    });
    el.addEventListener("mouseleave", () => {
      this.pointer.set(-2, -2);
      this._clearHover();
    });
  }

  _clearHover() {
    if (this.hovered) {
      this.hovered.fill.scale.set(1, 1, 1);
      this.hovered.glow.scale.set(1, 1, 1);
      this.hovered.stroke.scale.set(1, 1, 1);
      this.hovered = null;
    }
    if (this.tooltipEl) this.tooltipEl.style.display = "none";
  }

  _rankOf(field, value) {
    // rank 1 = highest value
    const sorted = [...SUBURBS].map((s) => s[field]).sort((a, b) => b - a);
    return sorted.indexOf(value) + 1;
  }

  _showTooltip(rec) {
    if (!this.tooltipEl) return;
    const d = rec.data;
    const layer = LAYERS[this.activeLayer];
    const rank = this._rankOf(layer.field, d[layer.field]);
    const growthColor = d.popGrowth10yr >= 0 ? "#34d399" : "#f87171";

    const row = (icon, label, value, color) => `
      <div style="display:flex;justify-content:space-between;gap:14px;margin:4px 0;font-size:12px;">
        <span style="color:#9ca3af;">${icon} ${label}</span>
        <span style="color:${color || "#e5e7eb"};font-weight:600;">${value}</span>
      </div>`;

    this.tooltipEl.innerHTML = `
      <div style="font-size:18px;font-weight:700;color:#f9fafb;">${d.name}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px;">
        Population ${d.pop.toLocaleString("en-US")}
      </div>
      <div style="height:1px;background:#374151;margin:10px 0;"></div>
      ${row("💰", "Median Income", moneyFmt(d.medianIncome))}
      ${row("🧑", "Median Age", d.medianAge + " yrs")}
      ${row("🏠", "Home Value", moneyFmt(d.homeValue))}
      ${row("📋", "Property Tax", moneyFmt(d.propertyTax) + "/yr")}
      ${row("📈", "10yr Growth", pctFmt(d.popGrowth10yr), growthColor)}
      <div style="height:1px;background:#374151;margin:10px 0 8px;"></div>
      <div style="font-size:10.5px;color:#94a3b8;letter-spacing:.2px;">
        Ranks <span style="color:#fbbf24;font-weight:700;">#${rank}</span>
        of ${SUBURBS.length} for ${layer.icon} ${layer.label}
      </div>`;
    this.tooltipEl.style.display = "block";
    this.tooltipEl.style.left = this.mouseClient.x + 15 + "px";
    this.tooltipEl.style.top = this.mouseClient.y - 10 + "px";
  }

  // ── Per-frame update ──────────────────────────────────────────────────────
  update() {
    if (this.controls) this.controls.update();

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hexMeshes, false);

    if (hits.length > 0) {
      const rec = this.records[hits[0].object.userData.index];
      if (this.hovered !== rec) {
        this._clearHover();
        this.hovered = rec;
        rec.fill.scale.set(1.15, 1.15, 1);
        rec.glow.scale.set(1.15, 1.15, 1);
        rec.stroke.scale.set(1.15, 1.15, 1);
      }
      this._showTooltip(rec);
    } else if (this.hovered) {
      this._clearHover();
    }
  }
}

export { Game };
