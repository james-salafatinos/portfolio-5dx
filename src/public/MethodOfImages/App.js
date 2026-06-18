import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { Game } from "./Game.js";

let camera, scene, renderer, game, clock, heightCtrl, params;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();

  game = new Game(scene);
  game.initInput(renderer.domElement, camera);

  _initGUI();
  _initHUD();

  clock = new THREE.Clock();
}

function update() {
  const dt = clock.getDelta();
  game.update(dt);

  // Keep the height slider in sync while the charge is dragged.
  if (params && heightCtrl && Math.abs(params.height - game.h) > 1e-4) {
    params.height = game.h;
    heightCtrl.updateDisplay();
  }

  renderer.render(scene, camera);
}

function _initCamera() {
  // Orthographic, world coordinates: y in [-1, +1], x scaled by aspect.
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080f);
}

function _initRenderer() {
  const container = document.getElementById("threejs");
  if (!container) return;

  container.style.touchAction = "none";
  container.style.overflow = "hidden";

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setAnimationLoop(update);
  container.appendChild(renderer.domElement);

  container.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  _resizeCamera(container);
  window.addEventListener("resize", () => _resizeCamera(container));
}

function _resizeCamera(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const aspect = w / h;
  renderer.setSize(w, h);

  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();

  if (game) game.onResize(camera);
}

function _initGUI() {
  const container = document.getElementById("threejs");
  if (!container) return;

  const guiContainer = document.createElement("div");
  guiContainer.style.cssText = "position:absolute;top:10px;right:10px;z-index:10;";
  container.appendChild(guiContainer);

  params = {
    showEquip: true,
    showField: true,
    showImage: true,
    height: 0.5,
    q: 2.0,
    fieldLines: 16,
    reset: () => {
      game.reset();
      params.showEquip = params.showField = params.showImage = true;
      params.height = game.h; params.q = game.q; params.fieldLines = game.fieldLineCount;
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
  };

  const gui = new GUI({ container: guiContainer, title: "Method of Images" });
  gui.add(params, "showEquip").name("Show Equipotentials").onChange((v) => game.setShowEquip(v));
  gui.add(params, "showField").name("Show Field Lines").onChange((v) => game.setShowField(v));
  gui.add(params, "showImage").name("Show Image Charge").onChange((v) => game.setShowImage(v));
  heightCtrl = gui.add(params, "height", 0.1, 0.9, 0.01).name("Charge Height").onChange((v) => game.setHeight(v));
  gui.add(params, "q", 1, 5, 0.1).name("Charge Magnitude q").onChange((v) => game.setMagnitude(v));
  gui.add(params, "fieldLines", 8, 32, 1).name("Field Line Count").onChange((v) => game.setFieldCount(v));
  gui.add(params, "reset").name("Reset");
}

function _initHUD() {
  const container = document.getElementById("threejs");
  if (!container) return;

  const hud = document.createElement("div");
  hud.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 10;
    max-width: 340px;
    padding: 10px 14px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #a8d8ff;
    background: rgba(8, 18, 40, 0.78);
    border: 1px solid #2a6aaa;
    border-radius: 6px;
    box-shadow: 0 0 14px rgba(60,140,255,0.18);
    pointer-events: none;
    user-select: none;
  `;
  container.appendChild(hud);
  game.setHUD(hud);
  game.dirty = true; // force a first HUD render
}
