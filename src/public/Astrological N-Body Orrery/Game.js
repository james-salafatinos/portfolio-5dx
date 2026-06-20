import * as THREE from "/modules/three.module.js";

// ─── Planetary Data ──────────────────────────────────────────────────────────
// Orbital elements: semi-major axis (scaled: 1 AU = 10 units), eccentricity,
// inclination (deg). Mass in solar masses. Velocities via vis-viva + Kepler.
const BODY_DATA = [
  {
    name: "Sun", symbol: "☉", color: 0xffcc44, vr: 6.0,
    mass: 1.0, a: 0, e: 0, inc: 0,
    sign: "All Signs",
    desc: "The gravitational anchor of our system. In astrology, the Sun is your core self — the conscious identity you are here to express and the life force that animates all the other planetary drives."
  },
  {
    name: "Mercury", symbol: "☿", color: 0xaaaaaa, vr: 1.2,
    mass: 1.651e-7, a: 3.87, e: 0.206, inc: 7.0,
    sign: "Gemini & Virgo",
    desc: "Fastest planet, highest orbital eccentricity of all classical planets. Mercury governs the rational mind: language, logic, trade, travel. Its retrograde periods are famous for communication disruptions."
  },
  {
    name: "Venus", symbol: "♀", color: 0xffe0aa, vr: 1.9,
    mass: 2.447e-6, a: 7.23, e: 0.007, inc: 3.4,
    sign: "Taurus & Libra",
    desc: "The brightest natural object in the night sky after the Moon. Hottest planet despite not being closest to the Sun. Venus governs love, beauty, art, pleasure, and the things we find genuinely valuable."
  },
  {
    name: "Earth", symbol: "♁", color: 0x3399ff, vr: 2.0,
    mass: 3.003e-6, a: 10.0, e: 0.017, inc: 0.0,
    sign: "Observer",
    desc: "Our vantage point. All astrological positions are geocentric — measured from Earth's perspective. The rising sign (ascendant) is the zodiac constellation on the eastern horizon at the moment of birth."
  },
  {
    name: "Mars", symbol: "♂", color: 0xff4422, vr: 1.6,
    mass: 3.213e-7, a: 15.24, e: 0.093, inc: 1.85,
    sign: "Aries & Scorpio",
    desc: "The red planet. Mars has the largest dust storms in the solar system and a thin CO₂ atmosphere. In astrology it rules drive, ambition, sexuality, courage, and the capacity for conflict."
  },
  {
    name: "Jupiter", symbol: "♃", color: 0xffbb88, vr: 4.2,
    mass: 9.542e-4, a: 52.0, e: 0.049, inc: 1.3,
    sign: "Sagittarius & Pisces",
    desc: "The gas giant — more than twice as massive as all other planets combined. Jupiter's gravity shields the inner solar system from comet impacts. The great benefic: expansion, philosophy, luck, and abundance."
  },
  {
    name: "Saturn", symbol: "♄", color: 0xeedd99, vr: 3.5,
    mass: 2.857e-4, a: 95.4, e: 0.057, inc: 2.49,
    sign: "Capricorn & Aquarius",
    desc: "Ringed lord of time. Saturn's rings are made of ice and rock, spanning 282,000 km. Its 29.5-year orbit drives the \"Saturn Return\" — a life audit at ~29 and ~58. Governs discipline, structure, karma, and limits."
  },
  {
    name: "Uranus", symbol: "♅", color: 0x77ddff, vr: 2.8,
    mass: 4.366e-5, a: 192.0, e: 0.046, inc: 0.77,
    sign: "Aquarius",
    desc: "The tilted planet — its axial tilt is 97.77°, so it effectively rotates on its side. Discovered in 1781 by William Herschel. Uranus governs revolution, technology, sudden change, and liberation from the past."
  },
  {
    name: "Neptune", symbol: "♆", color: 0x4455ee, vr: 2.6,
    mass: 5.151e-5, a: 301.0, e: 0.010, inc: 1.77,
    sign: "Pisces",
    desc: "The supersonic-wind planet — winds exceed 2,100 km/h. Discovered via mathematical prediction before telescopic observation. Neptune governs dreams, the unconscious, spirituality, illusion, and collective ideals."
  },
  {
    name: "Pluto", symbol: "♇", color: 0xaa8899, vr: 0.9,
    mass: 6.55e-9, a: 395.0, e: 0.248, inc: 17.14,
    sign: "Scorpio",
    desc: "Dwarf planet with a heart-shaped nitrogen ice plain (Tombaugh Regio). Pluto's 248-year orbit and high eccentricity mean it sometimes comes inside Neptune's orbit. Governs transformation, shadow, power, and rebirth."
  },
];

const ZODIAC_NAMES = [
  "♈ Aries","♉ Taurus","♊ Gemini","♋ Cancer",
  "♌ Leo","♍ Virgo","♎ Libra","♏ Scorpio",
  "♐ Sagittarius","♑ Capricorn","♒ Aquarius","♓ Pisces"
];
const ZODIAC_COLORS = [
  "#ff4444","#88cc44","#ffdd22","#44bbff",
  "#ffaa00","#aaaaaa","#ff88cc","#aa2244",
  "#ff6600","#444488","#22aaff","#7744aa"
];

// G in units where 1 unit ≈ 1 AU, 1 year, solar mass: G = 4π²
const G = 4 * Math.PI * Math.PI;
const TRAIL_MAX = 500;

// ─── Kepler → Cartesian ──────────────────────────────────────────────────────
function keplerToState(a, e, incDeg, M0) {
  // Solve E from Kepler's equation M = E - e*sin(E)
  let E = M0;
  for (let i = 0; i < 15; i++)
    E -= (E - e * Math.sin(E) - M0) / (1 - e * Math.cos(E));

  const cosE = Math.cos(E), sinE = Math.sin(E);
  const x_orb = a * (cosE - e);
  const y_orb = a * Math.sqrt(1 - e * e) * sinE;

  // Orbital velocity (Gaussian units, G absorbed into vis-viva)
  const n = (2 * Math.PI) / Math.sqrt(a * a * a); // mean motion (rad/yr)
  const denom = 1 - e * cosE;
  const vx_orb = (-a * n * sinE) / denom;
  const vy_orb = (a * n * Math.sqrt(1 - e * e) * cosE) / denom;

  // Inclination rotation (around x-axis)
  const incR = (incDeg * Math.PI) / 180;
  const ci = Math.cos(incR), si = Math.sin(incR);

  return {
    px: x_orb,
    py: y_orb * ci,
    pz: y_orb * si,
    vx: vx_orb,
    vy: vy_orb * ci,
    vz: vy_orb * si,
  };
}

// ─── Game Class ──────────────────────────────────────────────────────────────
class Game {
  constructor(scene, params) {
    this.scene = scene;
    this.params = params;
    this.bodies = [];
    this.meshes = [];
    this.trails = [];
    this.zodiacGroup = new THREE.Group();
    this.trailFrame = 0;

    this._initBodies();
    this._initTrails();
    this._initZodiacBelt();
    this._computeAccelerations();
  }

  _initBodies() {
    BODY_DATA.forEach((bd) => {
      const M0 = Math.random() * 2 * Math.PI;
      const s = bd.a > 0 ? keplerToState(bd.a, bd.e, bd.inc, M0) : { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };

      const body = {
        ...bd,
        px: s.px, py: s.py, pz: s.pz,
        vx: s.vx, vy: s.vy, vz: s.vz,
        ax: 0, ay: 0, az: 0,
      };
      this.bodies.push(body);

      // Mesh
      const geo = new THREE.SphereGeometry(bd.vr, 32, 32);
      const mat = new THREE.MeshPhongMaterial({
        color: bd.color,
        emissive: bd.color,
        emissiveIntensity: bd.name === "Sun" ? 0.9 : 0.18,
        shininess: 35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.bodyData = body;

      // Sun glow
      if (bd.name === "Sun") {
        [1.6, 2.4].forEach((s, i) => {
          const g = new THREE.Mesh(
            new THREE.SphereGeometry(bd.vr * s, 16, 16),
            new THREE.MeshBasicMaterial({
              color: i === 0 ? 0xff8800 : 0xff4400,
              transparent: true,
              opacity: i === 0 ? 0.13 : 0.05,
              side: THREE.BackSide,
            })
          );
          mesh.add(g);
        });
      }

      // Saturn rings
      if (bd.name === "Saturn") {
        const rg = new THREE.RingGeometry(bd.vr * 1.45, bd.vr * 2.5, 64);
        const rm = new THREE.MeshBasicMaterial({
          color: 0xddcc88, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(rg, rm);
        ring.rotation.x = Math.PI * 0.42;
        mesh.add(ring);
      }

      // Uranus rings (near-vertical)
      if (bd.name === "Uranus") {
        const rg = new THREE.RingGeometry(bd.vr * 1.35, bd.vr * 1.85, 48);
        const rm = new THREE.MeshBasicMaterial({
          color: 0x77ddff, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(rg, rm);
        ring.rotation.z = Math.PI * 0.5;
        ring.rotation.x = Math.PI * 0.05;
        mesh.add(ring);
      }

      this.scene.add(mesh);
      this.meshes.push(mesh);
    });
  }

  _initTrails() {
    this.bodies.forEach((b, i) => {
      if (b.name === "Sun") {
        this.trails.push(null);
        return;
      }
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(TRAIL_MAX * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: b.color,
        transparent: true,
        opacity: 0.25,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.trails.push({ pts: [], geo, line });
    });
  }

  _initZodiacBelt() {
    const R = 480;
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(R, 0.7, 8, 200),
      new THREE.MeshBasicMaterial({ color: 0x6622bb, transparent: true, opacity: 0.35 })
    );
    torus.rotation.x = Math.PI / 2;
    this.zodiacGroup.add(torus);

    ZODIAC_NAMES.forEach((name, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(angle), cz = Math.sin(angle);

      // Tick
      const tick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 10, 6),
        new THREE.MeshBasicMaterial({ color: parseInt(ZODIAC_COLORS[i].replace("#", "0x")) })
      );
      tick.position.set(cx * R, 0, cz * R);
      tick.rotation.z = Math.PI / 2;
      this.zodiacGroup.add(tick);

      // Text sprite
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.font = "bold 20px Georgia";
      ctx.fillStyle = ZODIAC_COLORS[i];
      ctx.textAlign = "center";
      ctx.fillText(name, 128, 42);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true })
      );
      sprite.position.set(cx * (R + 18), 2, cz * (R + 18));
      sprite.scale.set(28, 7, 1);
      this.zodiacGroup.add(sprite);
    });

    this.scene.add(this.zodiacGroup);
  }

  _computeAccelerations() {
    this.bodies.forEach((b) => { b.ax = 0; b.ay = 0; b.az = 0; });
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bi = this.bodies[i], bj = this.bodies[j];
        const dx = bj.px - bi.px, dy = bj.py - bi.py, dz = bj.pz - bi.pz;
        const r2 = dx * dx + dy * dy + dz * dz;
        const eps2 = 0.25; // softening²
        const denom = Math.pow(r2 + eps2, 1.5);
        const f = G / denom;
        bi.ax += bj.mass * f * dx; bi.ay += bj.mass * f * dy; bi.az += bj.mass * f * dz;
        bj.ax -= bi.mass * f * dx; bj.ay -= bi.mass * f * dy; bj.az -= bi.mass * f * dz;
      }
    }
  }

  _stepVerlet(dt) {
    // Half-kick
    this.bodies.forEach((b) => {
      b.vx += 0.5 * b.ax * dt;
      b.vy += 0.5 * b.ay * dt;
      b.vz += 0.5 * b.az * dt;
    });
    // Drift
    this.bodies.forEach((b) => {
      b.px += b.vx * dt;
      b.py += b.vy * dt;
      b.pz += b.vz * dt;
    });
    // New accelerations
    this._computeAccelerations();
    // Half-kick
    this.bodies.forEach((b) => {
      b.vx += 0.5 * b.ax * dt;
      b.vy += 0.5 * b.ay * dt;
      b.vz += 0.5 * b.az * dt;
    });
  }

  update() {
    const DT = 0.00004 * this.params.timeScale;
    const SUB = Math.max(1, Math.round(this.params.timeScale * 3));
    for (let s = 0; s < SUB; s++) this._stepVerlet(DT / SUB);

    // Update mesh positions + rotation
    this.bodies.forEach((b, i) => {
      this.meshes[i].position.set(b.px, b.py, b.pz);
      this.meshes[i].rotation.y += 0.004;
    });

    // Trails (every other frame)
    if (this.params.showTrails && this.trailFrame % 2 === 0) {
      this.bodies.forEach((b, i) => {
        const t = this.trails[i];
        if (!t) return;
        t.pts.push(b.px, b.py, b.pz);
        if (t.pts.length > TRAIL_MAX * 3) t.pts.splice(0, 3);
        const arr = t.geo.attributes.position.array;
        for (let j = 0; j < t.pts.length; j++) arr[j] = t.pts[j];
        t.geo.attributes.position.needsUpdate = true;
        t.geo.setDrawRange(0, t.pts.length / 3);
      });
    }

    this.trailFrame++;
  }

  setTrails(visible) {
    this.trails.forEach((t) => { if (t) t.line.visible = visible; });
  }

  setZodiacBelt(visible) {
    this.zodiacGroup.visible = visible;
  }

  getMeshes() {
    return this.meshes;
  }
}

export { Game };
