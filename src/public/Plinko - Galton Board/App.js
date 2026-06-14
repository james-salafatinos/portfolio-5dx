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
  _initDropButton();

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

  const params = {
    maxHoldRate: 30,
    gravity: 4.0,
    pegRows: 12,
    damping: 0.55,
    maxParticles: 5000,
    clear: () => game && game.clear(),
  };

  const gui = new GUI({ container: guiContainer });
  gui.add(params, "maxHoldRate", 1, 100, 1).name("Max Hold Rate").onChange((v) => game && (game.maxHoldRate = v));
  gui.add(params, "gravity", 0.5, 20, 0.1).name("Gravity").onChange((v) => game && (game.gravity = v));
  gui.add(params, "pegRows", 4, 20, 1).name("Peg Rows").onChange((v) => game && game.rebuildPegs(v));
  gui.add(params, "damping", 0.1, 0.95, 0.01).name("Damping").onChange((v) => game && (game.damping = v));
  gui.add(params, "maxParticles", 500, 10000, 100).name("Max Particles").onChange((v) => game && (game.maxParticles = v));
  gui.add(params, "clear").name("Clear");
}

function _initDropButton() {
  const container = document.getElementById("threejs");
  if (!container) return;

  const btn = document.createElement("button");
  btn.textContent = "DROP BALLS";
  btn.style.cssText = `
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    padding: 14px 40px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.12em;
    font-family: monospace;
    color: #a8d8ff;
    background: rgba(10, 25, 55, 0.85);
    border: 1.5px solid #2a6aaa;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: 0 0 14px rgba(60,140,255,0.25), inset 0 0 8px rgba(60,140,255,0.05);
    transition: box-shadow 0.1s, background 0.1s, color 0.1s;
    outline: none;
  `;

  // Pressed style
  const pressStyle = () => {
    btn.style.background = "rgba(20, 55, 120, 0.95)";
    btn.style.color = "#d0eeff";
    btn.style.boxShadow = "0 0 28px rgba(60,160,255,0.55), inset 0 0 12px rgba(60,160,255,0.15)";
  };
  const releaseStyle = () => {
    btn.style.background = "rgba(10, 25, 55, 0.85)";
    btn.style.color = "#a8d8ff";
    btn.style.boxShadow = "0 0 14px rgba(60,140,255,0.25), inset 0 0 8px rgba(60,140,255,0.05)";
  };

  // Mouse
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pressStyle();
    game && game.startHold();
  });
  window.addEventListener("mouseup", () => {
    releaseStyle();
    game && game.stopHold();
  });

  // Touch
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressStyle();
    game && game.startHold();
  }, { passive: false });
  window.addEventListener("touchend", () => {
    releaseStyle();
    game && game.stopHold();
  });

  container.appendChild(btn);
}
