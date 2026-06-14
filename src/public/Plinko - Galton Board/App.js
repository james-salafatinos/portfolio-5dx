import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { Game } from "./Game.js";

let camera, scene, renderer, game;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initGUI();

  game = new Game(scene);
}

function update() {
  game.update();
  renderer.render(scene, camera);
}

function _initCamera() {
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a12);
}

function _initRenderer() {
  const container = document.getElementById("threejs");
  if (!container) return;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setAnimationLoop(update);
  container.appendChild(renderer.domElement);

  _resizeCamera(container);
  window.addEventListener("resize", () => _resizeCamera(container));
}

function _resizeCamera(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const aspect = w / h;
  renderer.setSize(w, h);

  // Keep the world coords -1..1 vertically, adjust horizontally
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
  guiContainer.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:10;";
  container.appendChild(guiContainer);

  const params = {
    dropRate: 8,
    gravity: 4.0,
    pegRows: 12,
    damping: 0.55,
    maxParticles: 5000,
    clear: () => game && game.clear(),
  };

  const gui = new GUI({ container: guiContainer });
  gui.add(params, "dropRate", 1, 60, 1).name("Drop Rate").onChange((v) => game && (game.dropRate = v));
  gui.add(params, "gravity", 0.5, 20, 0.1).name("Gravity").onChange((v) => game && (game.gravity = v));
  gui.add(params, "pegRows", 4, 20, 1).name("Peg Rows").onChange((v) => game && game.rebuildPegs(v));
  gui.add(params, "damping", 0.1, 0.95, 0.01).name("Damping").onChange((v) => game && (game.damping = v));
  gui.add(params, "maxParticles", 500, 10000, 100).name("Max Particles").onChange((v) => game && (game.maxParticles = v));
  gui.add(params, "clear").name("Clear");
}
