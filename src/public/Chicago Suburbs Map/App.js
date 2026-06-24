import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { Game } from "./Game.js";

let camera, scene, renderer, controls, game;

const guiParams = {
  layer: 0,        // 0 Income · 1 Age · 2 Home Value · 3 Property Tax · 4 Growth
  opacity: 0.85,
  showLabels: true,
  showGlow: true,
};

// Camera-fit state — declared before create() runs to avoid a temporal-dead-zone
// access (create() → _fitCamera() assigns these during module evaluation).
let _worldW = 1000, _worldH = 1000, _centerX = 0, _centerY = 0;

create();

function create() {
  _initScene();
  _initCamera();
  _initRenderer();
  _initControls();
  _fitCamera();              // frame all suburbs (needs game.bounds → built below)
  _initOverlays();
  _initGUI();
}

function update() {
  if (game) game.update();
  renderer.render(scene, camera);
}

// ── Scene + Game (Game builds geometry, so it must exist before camera fit) ──
function _initScene() {
  scene = new THREE.Scene();
}

function _initCamera() {
  // Placeholder frustum; _fitCamera() recomputes once bounds are known.
  camera = new THREE.OrthographicCamera(-500, 500, 500, -500, -1000, 1000);
  camera.position.set(0, 0, 100);
  camera.up.set(0, 1, 0);
}

function _initRenderer() {
  const container = document.getElementById("threejs");
  if (!container) {
    console.error("Error: #threejs container not found!");
    return;
  }

  // Anchor absolutely-positioned overlays (legend, tooltip) to the canvas area
  // so they clip to the map and stay visible on mobile (a page header sits
  // above the canvas, so a viewport-fixed legend would fall off-screen).
  container.style.position = "relative";

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0a0e1a, 1);
  renderer.setAnimationLoop(update);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    _applyFrustum(w / h);
  });
}

function _initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;       // 2D map — no tumbling
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  // Mobile: one finger pans, two fingers pinch-zoom + pan.
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
}

// Build the Game (and thus geometry) here so bounds exist, then frame them.
function _fitCamera() {
  const container = document.getElementById("threejs");
  const tooltipEl = _makeTooltip(container);
  const legendEl = _makeLegend(container);

  game = new Game({
    scene, camera, controls,
    domElement: renderer.domElement,
    params: guiParams,
    tooltipEl, legendEl,
  });

  const b = game.getBounds();
  _worldW = (b.maxX - b.minX) * 1.1;
  _worldH = (b.maxY - b.minY) * 1.1;
  _centerX = b.centerX;
  _centerY = b.centerY;

  camera.position.set(_centerX, _centerY, 100);
  controls.target.set(_centerX, _centerY, 0);
  _applyFrustum(container.clientWidth / container.clientHeight);
  controls.update();
}

function _applyFrustum(aspect) {
  // Expand the world box to match viewport aspect with 10% padding preserved.
  let w = _worldW, h = _worldH;
  if (aspect > w / h) w = h * aspect;
  else h = w / aspect;

  camera.left = _centerX - w / 2;
  camera.right = _centerX + w / 2;
  camera.top = _centerY + h / 2;
  camera.bottom = _centerY - h / 2;
  camera.updateProjectionMatrix();
}

// ── HTML overlays ────────────────────────────────────────────────────────────
function _makeTooltip(container) {
  const el = document.createElement("div");
  el.id = "suburb-tooltip";
  el.style.cssText = `
    position:absolute; display:none; pointer-events:none; z-index:10;
    background:#111827; color:#ffffff; border:1px solid #374151;
    border-radius:12px; padding:14px; min-width:200px;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif;
    box-shadow:0 8px 30px rgba(0,0,0,0.55);`;
  container.appendChild(el);
  return el;
}

function _makeLegend(container) {
  const el = document.createElement("div");
  el.id = "suburb-legend";
  el.style.cssText = `
    position:absolute; left:50%; bottom:12px; transform:translateX(-50%);
    z-index:10; width:180px; background:rgba(10,14,26,0.82);
    border-radius:8px; padding:6px 10px;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif;`;
  container.appendChild(el);
  return el;
}

function _initOverlays() {
  const container = document.getElementById("threejs");
  if (!container) return;
  const title = document.createElement("div");
  title.style.cssText = `
    position:absolute; left:18px; top:16px; z-index:10;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#e5e7eb;
    text-shadow:0 2px 8px rgba(0,0,0,0.7); pointer-events:none;`;
  title.innerHTML = `
    <div style="font-size:20px;font-weight:800;letter-spacing:.3px;">Greater Chicago Suburbs</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
      Interactive choropleth · 44 communities · hover a hex for details</div>`;
  container.appendChild(title);
}

function _initGUI() {
  const container = document.getElementById("threejs");
  if (!container) return;

  const guiContainer = document.createElement("div");
  guiContainer.style.cssText = "position:absolute;top:10px;right:10px;z-index:10;";
  container.appendChild(guiContainer);

  const gui = new GUI({ container: guiContainer, title: "Map Layers" });

  gui.add(guiParams, "layer", {
    "💰 Income": 0,
    "🧑 Median Age": 1,
    "🏠 Home Value": 2,
    "📋 Property Tax": 3,
    "📈 Pop. Growth (10yr)": 4,
  }).name("Metric").onChange((v) => game && game.setLayer(Number(v)));

  gui.add(guiParams, "opacity", 0.3, 1.0, 0.05).name("Fill Opacity")
    .onChange((v) => game && game.setOpacity(v));

  gui.add(guiParams, "showLabels").name("Show Labels")
    .onChange((v) => game && game.setShowLabels(v));

  gui.add(guiParams, "showGlow").name("Show Glow")
    .onChange((v) => game && game.setShowGlow(v));
}
