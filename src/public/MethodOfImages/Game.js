import * as THREE from "/modules/three.module.js";

// ===========================================================================
// Method of Images — interactive 3D electrostatics
//
// A point charge +q floats at height h above a grounded conducting plane
// (the plane y = 0, V = 0). The "method of images" replaces the conductor
// with a mirror image charge -q at depth -h directly below. Above the plane
// the two-charge field IS the real solution (uniqueness theorem).
//
// Coordinates here are true 3D world coordinates:
//   - the conductor is the horizontal plane y = 0 (the XZ plane)
//   - the +q charge lives at (cx, h, cz),  the image -q at (cx, -h, cz)
// The camera orbits the scene; the user drags the charge across the XZ plane.
// ===========================================================================

const K = 1.0; // Coulomb constant (arbitrary units — only ratios matter)

// Geometry / visual constants ------------------------------------------------
const PLANE_SIZE   = 6;      // conductor plane is PLANE_SIZE x PLANE_SIZE
const HALF         = PLANE_SIZE / 2;
const CHARGE_R     = 0.08;   // drawn sphere radius of a charge
const HIT_R        = 0.35;   // grab radius for picking the +q charge while dragging
const XZ_BOUND     = HALF - 0.2;

const H_MIN        = 0.2;    // charge can't touch the plane
const H_MAX        = 2.5;

// Field-line tracing ---------------------------------------------------------
const TRACE_STEP   = 0.02;   // Euler step length (world units)
const TRACE_MAX    = 1200;   // max steps per line
const TRACE_DIST   = 6.0;    // abort a line once it wanders this far from +q
const START_OFFSET = 0.12;   // launch field lines just outside the charge sphere
const UP_LINES     = 6;      // field lines that escape upward, away from the plane

// Equipotential rings (horizontal circles at fixed heights) ------------------
const EQUI_HEIGHTS = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1];
const RING_SEG     = 96;

// Induced-charge plane resolution --------------------------------------------
const SIGMA_SEG    = 40;

// Colors ---------------------------------------------------------------------
const COL_FIELD_NEAR = new THREE.Color(0xfff5cc); // strong field -> warm white
const COL_FIELD_FAR  = new THREE.Color(0x2aa0ff); // weak field   -> cyan/blue
const COL_SIGMA_PEAK = new THREE.Color(0x1f5fd0); // most negative sigma (under +q)
const COL_SIGMA_FAR  = new THREE.Color(0x55606e); // neutral gray, far away

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ---------------------------------------------------------------------------
// Text label as a camera-facing sprite backed by a canvas texture
// ---------------------------------------------------------------------------
function makeLabel(text, cssColor, worldHeight = 0.18) {
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
    this.q  = 2.0;   // charge magnitude
    this.h  = 1.2;   // height of +q above the conductor
    this.cx = 0.0;   // x-position of +q
    this.cz = 0.0;   // z-position of +q

    // Toggles / params (App's GUI writes these) ----------------------------
    this.showEquip      = true;
    this.showField      = true;
    this.showImage      = true;
    this.fieldLineCount = 24;

    // Wiring ---------------------------------------------------------------
    this.camera   = null;
    this.dom      = null;
    this.controls = null;
    this.hud      = null;

    this.dragging = false;
    this.dirty    = true; // recompute heavy geometry only when state changes

    // Reusable scratch objects --------------------------------------------
    this._raycaster = new THREE.Raycaster();
    this._ndc       = new THREE.Vector2();
    this._dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit       = new THREE.Vector3();

    this._buildStatic();
  }

  // ---- physical field --------------------------------------------------
  // E-field at world point p (Vector3) from +q at (cx,h,cz) and image -q at
  // (cx,-h,cz). Returns into `out` (Vector3) and returns its magnitude.
  _fieldAt(p, out) {
    const kq = K * this.q;

    // real +q
    let rx = p.x - this.cx, ry = p.y - this.h, rz = p.z - this.cz;
    let d2 = rx * rx + ry * ry + rz * rz;
    let d3 = Math.max(d2 * Math.sqrt(d2), 1e-6);
    let ex = kq * rx / d3, ey = kq * ry / d3, ez = kq * rz / d3;

    // image -q
    rx = p.x - this.cx; ry = p.y + this.h; rz = p.z - this.cz;
    d2 = rx * rx + ry * ry + rz * rz;
    d3 = Math.max(d2 * Math.sqrt(d2), 1e-6);
    ex -= kq * rx / d3; ey -= kq * ry / d3; ez -= kq * rz / d3;

    out.set(ex, ey, ez);
    return out.length();
  }

  // Potential at a cylindrical radius r and height y (axial symmetry about
  // the vertical axis through the charge): V = kq(1/d+ - 1/d-).
  _potentialRY(r, y) {
    const dp = Math.hypot(r, y - this.h);
    const dm = Math.hypot(r, y + this.h);
    return K * this.q * (1 / Math.max(dp, 1e-4) - 1 / Math.max(dm, 1e-4));
  }

  // Induced surface charge density on the conductor at radial distance r from
  // the foot of the charge:  sigma(r) = -q h / (2 pi (r^2 + h^2)^(3/2)).
  _sigmaAt(r) {
    const denom = Math.pow(r * r + this.h * this.h, 1.5);
    return -this.q * this.h / (2 * Math.PI * denom);
  }

  // ---- static scene objects -------------------------------------------
  _buildStatic() {
    // Lighting -------------------------------------------------------------
    this.scene.add(new THREE.AmbientLight(0x223344, 0.8));

    this.chargeLight = new THREE.PointLight(0xffaa44, 2, 10);
    this.imageLight  = new THREE.PointLight(0x4488ff, 1, 10);
    this.scene.add(this.chargeLight, this.imageLight);

    // Grounded conductor plane (semi-transparent dark slab in the XZ plane) -
    const condGeo = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);
    condGeo.rotateX(-Math.PI / 2); // lay flat in XZ at y = 0
    this.conductor = new THREE.Mesh(
      condGeo,
      new THREE.MeshStandardMaterial({
        color: 0x112233, opacity: 0.7, transparent: true, side: THREE.DoubleSide,
        roughness: 0.9, metalness: 0.1,
      })
    );
    this.scene.add(this.conductor);

    // Subtle grid on the plane --------------------------------------------
    this.grid = new THREE.GridHelper(PLANE_SIZE, 12, 0x1a3a5c, 0x0d1f2e);
    this.grid.position.y = 0.001;
    this.scene.add(this.grid);

    // Induced surface-charge density plane (vertex-colored, just above) ----
    const sigGeo = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, SIGMA_SEG, SIGMA_SEG);
    sigGeo.rotateX(-Math.PI / 2);
    const vcount = sigGeo.attributes.position.count;
    sigGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vcount * 3), 3));
    this.sigmaPlane = new THREE.Mesh(
      sigGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      })
    );
    this.sigmaPlane.position.y = 0.004;
    this.scene.add(this.sigmaPlane);

    // Real +q charge: glowing sphere --------------------------------------
    this.realCharge = new THREE.Mesh(
      new THREE.SphereGeometry(CHARGE_R, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 1.4,
        roughness: 0.35, metalness: 0.0,
      })
    );
    this.scene.add(this.realCharge);

    // Image -q charge: blue, semi-transparent -----------------------------
    this.imageCharge = new THREE.Mesh(
      new THREE.SphereGeometry(CHARGE_R, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff, emissive: 0x2255cc, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.5, roughness: 0.4,
      })
    );
    this.scene.add(this.imageCharge);

    // Field lines (each a THREE.Line, regrouped on rebuild) ----------------
    this.fieldGroup = new THREE.Group();
    this.scene.add(this.fieldGroup);

    // Equipotential rings --------------------------------------------------
    this.equiGroup = new THREE.Group();
    this.scene.add(this.equiGroup);

    // Labels ---------------------------------------------------------------
    this.labelPlus  = makeLabel("+q", "#ffd070", 0.2);
    this.labelMinus = makeLabel("-q (image)", "#8ec0ff", 0.16);
    this.labelCond  = makeLabel("Grounded Conductor  V = 0", "#c8d6f0", 0.16);
    this.labelCond.position.set(0, 0.08, -HALF + 0.05);
    this.scene.add(this.labelPlus, this.labelMinus, this.labelCond);
  }

  // ---- input wiring ----------------------------------------------------
  initInput(dom, camera, controls) {
    this.dom = dom;
    this.camera = camera;
    this.controls = controls;
    const opts = { passive: false };
    dom.addEventListener("pointerdown", (e) => this._onPointerDown(e), opts);
    dom.addEventListener("pointermove", (e) => this._onPointerMove(e), opts);
    window.addEventListener("pointerup", () => this._endDrag());
    window.addEventListener("pointercancel", () => this._endDrag());
  }

  // Build a ray from the pointer event into the scene.
  _ray(e) {
    const rect = this.dom.getBoundingClientRect();
    this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.camera);
  }

  _onPointerDown(e) {
    if (!this.camera) return;
    this._ray(e);
    // Pick against an invisible horizontal plane at the charge's height.
    this._dragPlane.constant = -this.h;
    if (this._raycaster.ray.intersectPlane(this._dragPlane, this._hit)) {
      const dx = this._hit.x - this.cx, dz = this._hit.z - this.cz;
      if (Math.hypot(dx, dz) < HIT_R) {
        this.dragging = true;
        if (this.controls) this.controls.enabled = false; // don't orbit while dragging
        e.preventDefault();
      }
    }
  }

  _onPointerMove(e) {
    if (!this.dragging) return;
    e.preventDefault();
    this._ray(e);
    this._dragPlane.constant = -this.h; // keep y fixed (height controlled by slider)
    if (this._raycaster.ray.intersectPlane(this._dragPlane, this._hit)) {
      this.cx = clamp(this._hit.x, -XZ_BOUND, XZ_BOUND);
      this.cz = clamp(this._hit.z, -XZ_BOUND, XZ_BOUND);
      this.dirty = true;
    }
  }

  _endDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.controls) this.controls.enabled = true;
  }

  // ---- GUI setters -----------------------------------------------------
  setHeight(v)     { this.h = clamp(v, H_MIN, H_MAX); this.dirty = true; }
  setMagnitude(v)  { this.q = v; this.dirty = true; }
  setFieldCount(v) { this.fieldLineCount = Math.round(v); this.dirty = true; }
  setShowEquip(v)  { this.showEquip = v; }
  setShowField(v)  { this.showField = v; }
  setShowImage(v)  { this.showImage = v; }
  setHUD(el)       { this.hud = el; }

  reset() {
    this.q = 2.0; this.h = 1.2; this.cx = 0.0; this.cz = 0.0;
    this.fieldLineCount = 24;
    this.showEquip = this.showField = this.showImage = true;
    this.dirty = true;
  }

  // ---- per-frame -------------------------------------------------------
  update(/* dt */) {
    // Charge + image + lights track the state.
    this.realCharge.position.set(this.cx, this.h, this.cz);
    this.imageCharge.position.set(this.cx, -this.h, this.cz);
    this.chargeLight.position.set(this.cx, this.h, this.cz);
    this.imageLight.position.set(this.cx, -this.h, this.cz);

    this.imageCharge.visible = this.showImage;
    this.imageLight.visible  = this.showImage;

    // Labels track the charges.
    this.labelPlus.position.set(this.cx, this.h + CHARGE_R + 0.16, this.cz);
    this.labelMinus.position.set(this.cx, -this.h - CHARGE_R - 0.16, this.cz);
    this.labelMinus.visible = this.showImage;

    // Visibility toggles.
    this.fieldGroup.visible = this.showField;
    this.equiGroup.visible  = this.showEquip;

    if (this.dirty) {
      this._rebuildSigmaPlane();
      this._rebuildFieldLines();
      this._rebuildEquipotentials();
      this._updateHUD();
      this.dirty = false;
    }
  }

  // ---- induced-charge plane vertex colors ------------------------------
  _rebuildSigmaPlane() {
    const geo = this.sigmaPlane.geometry;
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    const sigma0 = Math.abs(this._sigmaAt(0)) || 1e-6;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x - this.cx, z - this.cz);
      const t = clamp(Math.abs(this._sigmaAt(r)) / sigma0, 0, 1);
      c.copy(COL_SIGMA_FAR).lerp(COL_SIGMA_PEAK, t);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  // ---- field lines (3D Euler tracing) ----------------------------------
  _rebuildFieldLines() {
    // Dispose previous lines.
    for (const child of this.fieldGroup.children) child.geometry.dispose();
    this.fieldGroup.clear();

    const nDown = this.fieldLineCount;
    const origin = new THREE.Vector3(this.cx, this.h, this.cz);

    // Downward cone of directions (hemisphere biased toward -y).
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < nDown; i++) {
      const t = (i + 0.5) / nDown;
      const yc = -(0.15 + 0.85 * t);            // mostly downward
      const rad = Math.sqrt(Math.max(0, 1 - yc * yc));
      const phi = i * golden;
      const dir = new THREE.Vector3(rad * Math.cos(phi), yc, rad * Math.sin(phi));
      this._traceLine(origin, dir);
    }

    // A few lines escaping upward, away from the conductor, for completeness.
    for (let i = 0; i < UP_LINES; i++) {
      const t = (i + 0.5) / UP_LINES;
      const yc = 0.25 + 0.7 * t;
      const rad = Math.sqrt(Math.max(0, 1 - yc * yc));
      const phi = i * golden + 0.5;
      const dir = new THREE.Vector3(rad * Math.cos(phi), yc, rad * Math.sin(phi));
      this._traceLine(origin, dir);
    }
  }

  // Trace a single field line from the charge along an initial direction.
  _traceLine(origin, dir) {
    const p = origin.clone().addScaledVector(dir.normalize(), START_OFFSET);
    const E = new THREE.Vector3();
    const pts = [p.clone()];

    for (let step = 0; step < TRACE_MAX; step++) {
      const mag = this._fieldAt(p, E);
      if (mag < 1e-7) break;
      E.multiplyScalar(TRACE_STEP / mag); // unit step along the field

      // Clip the final segment to the conductor plane y = 0.
      if (p.y + E.y <= 0) {
        const tHit = p.y / (p.y - (p.y + E.y));
        pts.push(new THREE.Vector3(p.x + E.x * tHit, 0, p.z + E.z * tHit));
        break;
      }

      p.add(E);
      pts.push(p.clone());

      if (p.distanceTo(origin) > TRACE_DIST) break;
    }

    if (pts.length < 2) return;

    // Color: warm white near the charge, fading to cyan/blue far away.
    const colors = new Float32Array(pts.length * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pts.length; i++) {
      const d = pts[i].distanceTo(origin);
      const s = clamp(d / 2.0, 0, 1);
      c.copy(COL_FIELD_NEAR).lerp(COL_FIELD_FAR, s);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.fieldGroup.add(line);
  }

  // ---- equipotential rings ---------------------------------------------
  _rebuildEquipotentials() {
    for (const child of this.equiGroup.children) child.geometry.dispose();
    this.equiGroup.clear();

    for (const y of EQUI_HEIGHTS) {
      // Equipotential level for this height = half the on-axis potential.
      // V(r,y) is maximal on the axis (r=0) and decays to 0 as r grows, so a
      // crossing always exists and a bisection finds it robustly.
      const vAxis = this._potentialRY(0, y);
      if (vAxis <= 1e-5) continue;
      const target = vAxis * 0.5;
      const r = this._solveRadius(target, y);
      if (r <= 0) continue;

      const pts = [];
      for (let i = 0; i <= RING_SEG; i++) {
        const a = (i / RING_SEG) * Math.PI * 2;
        pts.push(new THREE.Vector3(this.cx + Math.cos(a) * r, y, this.cz + Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const ring = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x36ff8a, transparent: true, opacity: 0.45 })
      );
      this.equiGroup.add(ring);
    }
  }

  // Bisection: find radius r where V(r,y) == target (V monotonically
  // decreasing in r for fixed y).
  _solveRadius(target, y) {
    let lo = 0, hi = HALF * 1.5;
    if (this._potentialRY(hi, y) > target) return -1; // ring larger than scene
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) * 0.5;
      if (this._potentialRY(mid, y) > target) lo = mid; else hi = mid;
    }
    return (lo + hi) * 0.5;
  }

  // ---- HUD -------------------------------------------------------------
  _updateHUD() {
    if (!this.hud) return;
    const sigma0 = this._sigmaAt(0); // most negative, directly under the charge
    const force = -K * this.q * this.q / (4 * this.h * this.h); // attractive toward plane
    this.hud.innerHTML =
      `<b style="color:#ffd070">Method of Images</b><br>` +
      `replace conductor with mirror charge &minus;q<br>` +
      `<span style="color:#8ec0ff">&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;</span><br>` +
      `+q position (x, z): (${this.cx.toFixed(2)}, ${this.cz.toFixed(2)})<br>` +
      `height above conductor h: ${this.h.toFixed(3)}<br>` +
      `charge magnitude q: ${this.q.toFixed(2)}<br>` +
      `&sigma;&#8320; (under charge): ${sigma0.toFixed(3)}<br>` +
      `force toward conductor: ${force.toFixed(3)}`;
  }
}

export { Game };
