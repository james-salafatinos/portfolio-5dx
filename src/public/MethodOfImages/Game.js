import * as THREE from "/modules/three.module.js";

// ===========================================================================
// Method of Images — interactive electrostatics
//
// A point charge +q sits at height h above a grounded conductor (the plane
// z = 0, V = 0). The "method of images" replaces the conductor with a mirror
// image charge -q at depth -h. Above the plane the two-charge field is the
// real solution (uniqueness theorem).
//
// Coordinate mapping for this 2D view:
//   world x  ->  physical x  (along the conductor)
//   world y  ->  physical z  (height above the conductor; y = 0 is the plane)
// The orthographic camera spans y in [-1, +1], x in [-aspect, +aspect].
// ===========================================================================

const K = 1.0; // Coulomb constant (arbitrary units — only ratios matter here)

// Visual constants -----------------------------------------------------------
const CHARGE_R       = 0.05;   // drawn radius of a charge
const HIT_R          = 0.13;   // grab radius for dragging the +q charge
const CONDUCTOR_T    = 0.012;  // half-thickness of the conductor bar
const SIGMA_AMP      = 0.20;   // world height of the induced-charge profile curve

const H_MIN          = 0.06;   // charge can't touch the plane
const H_MAX          = 0.95;

// Field-line tracing ---------------------------------------------------------
const TRACE_STEP     = 0.012;  // Euler step length (world units)
const TRACE_MAX      = 900;    // max steps per line
const TRACE_BOUND    = 3.0;    // abort a line once it wanders this far out
const START_OFFSET   = 0.045;  // launch field lines just outside the charge

// Equipotential grid (marching squares) --------------------------------------
const GRID_NX        = 110;
const GRID_NY        = 64;
const GRID_YMAX      = 1.25;
const EQUI_LEVELS    = [0.25, 0.45, 0.75, 1.2, 1.9, 3.0, 4.8, 7.5]; // multiplied by q

// Colors ---------------------------------------------------------------------
const COL_FIELD_NEAR = new THREE.Color(0xfff2c0); // strong field -> warm white
const COL_FIELD_FAR  = new THREE.Color(0x2a6aff); // weak field   -> blue
const COL_COND_BASE  = new THREE.Color(0x5a6678); // conductor, far from charge
const COL_COND_PEAK  = new THREE.Color(0x123fb0); // conductor, directly below +q

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ---------------------------------------------------------------------------
// Text label as a camera-facing sprite backed by a canvas texture
// ---------------------------------------------------------------------------
function makeLabel(text, cssColor, worldHeight = 0.07) {
  const pad = 8;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = "bold 48px monospace";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = 64;
  canvas.width = w;
  canvas.height = h;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = cssColor;
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(worldHeight * (w / h), worldHeight, 1);
  sprite.renderOrder = 20;
  return sprite;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor(scene) {
    this.scene = scene;

    // Physical state -------------------------------------------------------
    this.q  = 2.0;        // charge magnitude
    this.h  = 0.5;        // height of +q above the conductor
    this.cx = 0.0;        // x-position of +q

    // Toggles / params (App's GUI writes these) ----------------------------
    this.showEquip     = true;
    this.showField     = true;
    this.showImage     = true;
    this.fieldLineCount = 16;

    // View ------------------------------------------------------------------
    this.bound = 1.0;     // half-width of the visible world (= camera.right)
    this.camera = null;
    this.dom = null;
    this.hud = null;

    this.dragging = false;
    this.dirty = true;    // recompute the heavy geometry only when state changes

    this._buildStatic();
  }

  // ---- physical field --------------------------------------------------
  // E-field at (x, y) from +q at (cx, h) and image -q at (cx, -h).
  // Writes into the provided out = {ex, ey, mag}.
  _fieldAt(x, y, out) {
    const dxp = x - this.cx, dyp = y - this.h;
    const dxm = x - this.cx, dym = y + this.h;
    const dp2 = dxp * dxp + dyp * dyp;
    const dm2 = dxm * dxm + dym * dym;
    const dp3 = Math.max(dp2 * Math.sqrt(dp2), 1e-6);
    const dm3 = Math.max(dm2 * Math.sqrt(dm2), 1e-6);
    const kq = K * this.q;
    const ex = kq * dxp / dp3 - kq * dxm / dm3;
    const ey = kq * dyp / dp3 - kq * dym / dm3;
    out.ex = ex;
    out.ey = ey;
    out.mag = Math.hypot(ex, ey);
  }

  // Potential at (x, y) — V = kq(1/d+ - 1/d-)
  _potentialAt(x, y) {
    const dp = Math.hypot(x - this.cx, y - this.h);
    const dm = Math.hypot(x - this.cx, y + this.h);
    return K * this.q * (1 / Math.max(dp, 1e-4) - 1 / Math.max(dm, 1e-4));
  }

  // Induced surface charge density at conductor x-coordinate `x`.
  // sigma(r) = -q h / (2 pi (r^2 + h^2)^(3/2)),  r = |x - cx|
  _sigmaAt(x) {
    const r = x - this.cx;
    const denom = Math.pow(r * r + this.h * this.h, 1.5);
    return -this.q * this.h / (2 * Math.PI * denom);
  }

  _strengthColor(mag, out) {
    // log-mapped strength: warm white near the charges, blue far away
    const s = clamp((Math.log10(mag + 1e-6) + 1.0) / 3.5, 0, 1);
    out.copy(COL_FIELD_FAR).lerp(COL_FIELD_NEAR, s);
    return out;
  }

  // ---- static scene objects -------------------------------------------
  _buildStatic() {
    // Conductor bar (vertex-colored strip rebuilt on `dirty`)
    this.conductorMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.conductorMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.conductorMat);
    this.conductorMesh.position.z = 0.0;
    this.scene.add(this.conductorMesh);

    // Bright baseline so the plane reads as a crisp line even where neutral
    this.baselineGeo = new THREE.BufferGeometry();
    this.baselineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    this.baseline = new THREE.Line(
      this.baselineGeo,
      new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.5 })
    );
    this.baseline.position.z = 0.01;
    this.scene.add(this.baseline);

    // Induced-charge profile curve sigma(r)
    this.sigmaGeo = new THREE.BufferGeometry();
    this.sigmaCurve = new THREE.Line(
      this.sigmaGeo,
      new THREE.LineBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.85 })
    );
    this.sigmaCurve.position.z = 0.02;
    this.scene.add(this.sigmaCurve);

    // Field lines (additive glow, vertex-colored)
    this.fieldGeo = new THREE.BufferGeometry();
    this.fieldLines = new THREE.LineSegments(
      this.fieldGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.fieldLines.position.z = 0.08;
    this.scene.add(this.fieldLines);

    // Equipotential contours
    this.equiGeo = new THREE.BufferGeometry();
    this.equiLines = new THREE.LineSegments(
      this.equiGeo,
      new THREE.LineBasicMaterial({ color: 0x36ff8a, transparent: true, opacity: 0.38 })
    );
    this.equiLines.position.z = 0.05;
    this.scene.add(this.equiLines);

    // Real +q charge: filled disc + glow ring
    this.realCharge = new THREE.Mesh(
      new THREE.CircleGeometry(CHARGE_R, 40),
      new THREE.MeshBasicMaterial({ color: 0xffb43a })
    );
    this.realCharge.position.z = 0.3;
    this.realGlow = new THREE.Mesh(
      new THREE.CircleGeometry(CHARGE_R * 1.7, 40),
      new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.realGlow.position.z = 0.28;
    this.scene.add(this.realGlow);
    this.scene.add(this.realCharge);

    // Image -q charge: dashed outline + faint fill (looks "virtual")
    const ringPts = [];
    const SEG = 48;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * CHARGE_R, Math.sin(a) * CHARGE_R, 0));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    this.imageRing = new THREE.Line(
      ringGeo,
      new THREE.LineDashedMaterial({ color: 0x5aa0ff, dashSize: 0.025, gapSize: 0.02,
        transparent: true, opacity: 0.8 })
    );
    this.imageRing.computeLineDistances();
    this.imageFill = new THREE.Mesh(
      new THREE.CircleGeometry(CHARGE_R, 40),
      new THREE.MeshBasicMaterial({ color: 0x3a6fff, transparent: true, opacity: 0.18 })
    );
    this.imageGroup = new THREE.Group();
    this.imageGroup.position.z = 0.25;
    this.imageGroup.add(this.imageFill);
    this.imageGroup.add(this.imageRing);
    this.scene.add(this.imageGroup);

    // Labels
    this.labelPlus  = makeLabel("+q", "#ffd070", 0.075);
    this.labelMinus = makeLabel("-q (image)", "#8ec0ff", 0.06);
    this.labelCond  = makeLabel("Grounded Conductor  (V = 0)", "#c8d6f0", 0.06);
    this.labelSigma = makeLabel("induced  σ(r)", "#7fe4ff", 0.05);
    this.scene.add(this.labelPlus, this.labelMinus, this.labelCond, this.labelSigma);
  }

  // ---- input wiring ----------------------------------------------------
  initInput(dom, camera) {
    this.dom = dom;
    this.camera = camera;
    const opts = { passive: false };
    dom.addEventListener("pointerdown", (e) => this._onPointerDown(e), opts);
    dom.addEventListener("pointermove", (e) => this._onPointerMove(e), opts);
    window.addEventListener("pointerup",   () => { this.dragging = false; });
    window.addEventListener("pointercancel", () => { this.dragging = false; });
  }

  _toWorld(e) {
    const rect = this.dom.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const v = new THREE.Vector3(ndcX, ndcY, 0).unproject(this.camera);
    return { x: v.x, y: v.y };
  }

  _onPointerDown(e) {
    if (!this.camera) return;
    const p = this._toWorld(e);
    if (Math.hypot(p.x - this.cx, p.y - this.h) < HIT_R) {
      this.dragging = true;
      e.preventDefault();
    }
  }

  _onPointerMove(e) {
    if (!this.dragging) return;
    e.preventDefault();
    const p = this._toWorld(e);
    this.cx = clamp(p.x, -this.bound + 0.02, this.bound - 0.02);
    this.h  = clamp(p.y, H_MIN, H_MAX);
    this.dirty = true;
  }

  // ---- GUI setters -----------------------------------------------------
  setHeight(v)        { this.h = clamp(v, H_MIN, H_MAX); this.dirty = true; }
  setMagnitude(v)     { this.q = v; this.dirty = true; }
  setFieldCount(v)    { this.fieldLineCount = Math.round(v); this.dirty = true; }
  setShowEquip(v)     { this.showEquip = v; }
  setShowField(v)     { this.showField = v; }
  setShowImage(v)     { this.showImage = v; }
  setHUD(el)          { this.hud = el; }

  reset() {
    this.q = 2.0; this.h = 0.5; this.cx = 0.0;
    this.fieldLineCount = 16;
    this.showEquip = this.showField = this.showImage = true;
    this.dirty = true;
  }

  onResize(camera) {
    this.camera = camera;
    this.bound = camera.right;
    this.dirty = true;
  }

  // ---- per-frame -------------------------------------------------------
  update(/* dt */) {
    // Charge positions
    this.realCharge.position.set(this.cx, this.h, 0.3);
    this.realGlow.position.set(this.cx, this.h, 0.28);
    this.imageGroup.position.set(this.cx, -this.h, 0.25);
    this.imageGroup.visible = this.showImage;

    // Labels track the charges
    this.labelPlus.position.set(this.cx, this.h + CHARGE_R + 0.06, 0.5);
    this.labelMinus.position.set(this.cx, -this.h - CHARGE_R - 0.07, 0.5);
    this.labelMinus.visible = this.showImage;
    this.labelCond.position.set(-this.bound + 0.42, 0.085, 0.5);
    this.labelSigma.position.set(this.cx + 0.0, -SIGMA_AMP - 0.06, 0.5);

    // Visibility toggles
    this.fieldLines.visible = this.showField;
    this.equiLines.visible = this.showEquip;

    if (this.dirty) {
      this._rebuildConductor();
      this._rebuildSigmaCurve();
      this._rebuildFieldLines();
      this._rebuildEquipotentials();
      this._updateHUD();
      this.dirty = false;
    }
  }

  // ---- conductor bar + baseline ---------------------------------------
  _rebuildConductor() {
    const b = this.bound;
    const N = 160;
    const sigma0 = Math.abs(this._sigmaAt(this.cx)) || 1e-6;

    const pos = new Float32Array((N + 1) * 2 * 3);
    const col = new Float32Array((N + 1) * 2 * 3);
    const c = new THREE.Color();
    for (let i = 0; i <= N; i++) {
      const x = -b + (2 * b) * (i / N);
      const t = clamp(Math.abs(this._sigmaAt(x)) / sigma0, 0, 1);
      c.copy(COL_COND_BASE).lerp(COL_COND_PEAK, t);
      const base = i * 6;
      // top vertex
      pos[base + 0] = x; pos[base + 1] = CONDUCTOR_T; pos[base + 2] = 0;
      // bottom vertex
      pos[base + 3] = x; pos[base + 4] = -CONDUCTOR_T; pos[base + 5] = 0;
      col[base + 0] = c.r; col[base + 1] = c.g; col[base + 2] = c.b;
      col[base + 3] = c.r; col[base + 4] = c.g; col[base + 5] = c.b;
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2, bb = i * 2 + 1, cc = (i + 1) * 2, d = (i + 1) * 2 + 1;
      idx.push(a, bb, cc, bb, d, cc);
    }
    const g = this.conductorMesh.geometry;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.attributes.position.needsUpdate = true;

    // Baseline endpoints
    const bp = this.baselineGeo.attributes.position.array;
    bp[0] = -b; bp[1] = 0; bp[2] = 0;
    bp[3] = b;  bp[4] = 0; bp[5] = 0;
    this.baselineGeo.attributes.position.needsUpdate = true;
  }

  // ---- induced-charge profile curve -----------------------------------
  _rebuildSigmaCurve() {
    const b = this.bound;
    const N = 220;
    const sigma0 = Math.abs(this._sigmaAt(this.cx)) || 1e-6;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = -b + (2 * b) * (i / N);
      const frac = clamp(Math.abs(this._sigmaAt(x)) / sigma0, 0, 1);
      pts.push(new THREE.Vector3(x, -frac * SIGMA_AMP, 0)); // dips down where most negative
    }
    this.sigmaGeo.setFromPoints(pts);
  }

  // ---- field lines (Euler tracing) ------------------------------------
  _rebuildFieldLines() {
    const positions = [];
    const colors = [];
    const n = this.fieldLineCount;
    const E = { ex: 0, ey: 0, mag: 0 };
    const col = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.001;
      let x = this.cx + Math.cos(ang) * START_OFFSET;
      let y = this.h + Math.sin(ang) * START_OFFSET;

      // Lines launched below the charge would immediately cross the plane if
      // the charge is very low; tracing still handles that gracefully.
      let prevX = x, prevY = y;
      let started = false;

      for (let step = 0; step < TRACE_MAX; step++) {
        this._fieldAt(x, y, E);
        if (E.mag < 1e-7) break;
        let nx = x + (E.ex / E.mag) * TRACE_STEP;
        let ny = y + (E.ey / E.mag) * TRACE_STEP;

        // Hit the conductor: clip the last segment to y = 0 and stop.
        if (ny <= 0) {
          const t = y / (y - ny);
          nx = x + (nx - x) * t;
          ny = 0;
        }

        if (started || y > 0) {
          this._strengthColor(E.mag, col);
          positions.push(prevX, prevY, 0, nx, ny, 0);
          colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
        started = true;

        prevX = nx; prevY = ny;
        x = nx; y = ny;

        if (ny <= 0) break;
        if (Math.abs(x) > TRACE_BOUND || y > TRACE_BOUND) break;
      }
    }

    this.fieldGeo.setAttribute("position",
      new THREE.BufferAttribute(new Float32Array(positions), 3));
    this.fieldGeo.setAttribute("color",
      new THREE.BufferAttribute(new Float32Array(colors), 3));
    this.fieldGeo.setDrawRange(0, positions.length / 3);
  }

  // ---- equipotentials (marching squares) ------------------------------
  _rebuildEquipotentials() {
    const b = this.bound;
    const x0 = -b, x1 = b, y0 = 0.005, y1 = GRID_YMAX;
    const nx = GRID_NX, ny = GRID_NY;
    const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;

    // Sample V on the grid once.
    const V = new Float32Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        V[j * (nx + 1) + i] = this._potentialAt(x0 + i * dx, y0 + j * dy);
      }
    }

    const seg = []; // flat x,y,x,y per segment
    for (const f of EQUI_LEVELS) {
      const level = f * this.q; // contours independent of q magnitude
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const vBL = V[j * (nx + 1) + i];
          const vBR = V[j * (nx + 1) + i + 1];
          const vTR = V[(j + 1) * (nx + 1) + i + 1];
          const vTL = V[(j + 1) * (nx + 1) + i];
          this._msCell(x0 + i * dx, y0 + j * dy, dx, dy,
            vBL, vBR, vTR, vTL, level, seg);
        }
      }
    }

    const arr = new Float32Array(seg.length / 2 * 3);
    for (let k = 0, w = 0; k < seg.length; k += 2) {
      arr[w++] = seg[k]; arr[w++] = seg[k + 1]; arr[w++] = 0;
    }
    this.equiGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.equiGeo.setDrawRange(0, arr.length / 3);
  }

  // One marching-squares cell. Corners are BL,BR,TR,TL; pushes segment
  // endpoints (x,y,x,y) into `out`.
  _msCell(bx, by, dx, dy, vBL, vBR, vTR, vTL, lv, out) {
    let idx = 0;
    if (vBL > lv) idx |= 1;
    if (vBR > lv) idx |= 2;
    if (vTR > lv) idx |= 4;
    if (vTL > lv) idx |= 8;
    if (idx === 0 || idx === 15) return;

    const xL = bx, xR = bx + dx, yB = by, yT = by + dy;
    // Interpolated crossing on each edge
    const B = () => [lerp(xL, xR, (lv - vBL) / (vBR - vBL)), yB];
    const R = () => [xR, lerp(yB, yT, (lv - vBR) / (vTR - vBR))];
    const T = () => [lerp(xL, xR, (lv - vTL) / (vTR - vTL)), yT];
    const L = () => [xL, lerp(yB, yT, (lv - vBL) / (vTL - vBL))];
    const push = (p, q) => { out.push(p[0], p[1], q[0], q[1]); };

    switch (idx) {
      case 1:  push(L(), B()); break;
      case 2:  push(B(), R()); break;
      case 3:  push(L(), R()); break;
      case 4:  push(R(), T()); break;
      case 5:  push(L(), B()); push(R(), T()); break;
      case 6:  push(B(), T()); break;
      case 7:  push(L(), T()); break;
      case 8:  push(T(), L()); break;
      case 9:  push(B(), T()); break;
      case 10: push(B(), R()); push(T(), L()); break;
      case 11: push(R(), T()); break;
      case 12: push(L(), R()); break;
      case 13: push(B(), R()); break;
      case 14: push(L(), B()); break;
    }
  }

  // ---- HUD -------------------------------------------------------------
  _updateHUD() {
    if (!this.hud) return;
    const sigma0 = this._sigmaAt(this.cx); // most negative, at r = 0
    this.hud.innerHTML =
      `<b style="color:#ffd070">Method of Images</b><br>` +
      `replace conductor with mirror charge &minus;q<br>` +
      `<span style="color:#8ec0ff">&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;</span><br>` +
      `+q position: (${this.cx.toFixed(2)}, ${this.h.toFixed(2)})<br>` +
      `height above plane h: ${this.h.toFixed(3)}<br>` +
      `charge magnitude q: ${this.q.toFixed(2)}<br>` +
      `&sigma;&#8320; (under charge): ${sigma0.toFixed(3)}<br>` +
      `force on +q: ${(-K * this.q * this.q / (4 * this.h * this.h)).toFixed(3)} (attractive)`;
  }
}

export { Game };
