import * as THREE from "/modules/three.module.js";

import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgl.js";
import { GridHelper } from "/components/GridHelper.webgl.js";

import { Game } from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game, hud;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();
  _initHelpers();

  game = new Game(scene);

  _initGUI();
  _initHUD();
}

function update() {
  controls.update();
  game.update();
  _updateHUD();
  renderer.render(scene, camera);
}

function _initCamera() {
  // Perspective view of the 3D graph; OrbitControls let the user fly around it.
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 0);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#050a12");

  // Lighting for the shaded spheres: soft ambient + a single point light so the
  // MeshPhong nodes pick up directional shading and the emissive glow reads.
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1.5);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);
}

function _initRenderer() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) {
    console.error("Error: #threejs container not found!");
    return;
  }

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeJsContainer.clientWidth, threeJsContainer.clientHeight);
  renderer.setAnimationLoop(update);
  renderer.setClearColor("#050a12");

  threeJsContainer.appendChild(renderer.domElement);

  _resizeCamera(threeJsContainer);
  window.addEventListener("resize", () => _resizeCamera(threeJsContainer));
}

function _resizeCamera(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function _initControls() {
  // Full orbit: rotate, pan, and zoom around the graph.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 3;
  controls.maxDistance = 80;
  controls.target.set(0, 0, 0);
}

function _initHelpers() {
  new AxesHelper(scene);
  new GridHelper(scene);
}

function _initGUI() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) {
    console.error("Error: #threejs container not found!");
    return;
  }

  const guiContainer = document.createElement("div");
  guiContainer.style.position = "absolute";
  guiContainer.style.top = "10px";
  guiContainer.style.right = "10px";
  guiContainer.style.zIndex = "10";
  threeJsContainer.appendChild(guiContainer);

  const gui = new GUI({ container: guiContainer });

  const params = {
    graphType: "Small World",
    nodeCount: 60,
    edgeProbability: 0.08,
    rule: "Majority",
    stepMode: "Auto",
    stepSpeed: 3,
    seedPercent: 0.35,
    restart: () => game && game.restart(),
    step: () => game && game.step(),
  };

  gui
    .add(params, "graphType", [
      "Random",
      "Small World",
      "Scale Free",
      "Grid",
      "Ring",
    ])
    .name("Graph Type")
    .onChange((v) => game && game.setGraphType(v));

  gui
    .add(params, "nodeCount", 20, 300, 1)
    .name("Node Count")
    .onChange((v) => game && game.setNodeCount(v));

  gui
    .add(params, "edgeProbability", 0, 1, 0.01)
    .name("Edge Probability")
    .onChange((v) => game && game.setEdgeProbability(v));

  gui
    .add(params, "rule", ["Conway-like B3/S23", "Majority", "Parity", "Custom"])
    .name("Rule")
    .onChange((v) => game && game.setRule(v));

  gui
    .add(params, "stepMode", ["Auto", "Manual"])
    .name("Step Mode")
    .onChange((v) => game && game.setStepMode(v));

  gui
    .add(params, "stepSpeed", 1, 30, 1)
    .name("Step Speed")
    .onChange((v) => game && game.setStepSpeed(v));

  gui
    .add(params, "seedPercent", 0, 1, 0.01)
    .name("Seed %")
    .onChange((v) => game && game.setSeedPercent(v));

  gui.add(params, "restart").name("Restart");
  gui.add(params, "step").name("Step");
}

function _initHUD() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) return;

  hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.bottom = "12px";
  hud.style.left = "12px";
  hud.style.zIndex = "10";
  hud.style.padding = "10px 14px";
  hud.style.borderRadius = "6px";
  hud.style.font = "13px/1.5 monospace";
  hud.style.color = "#00ffcc";
  hud.style.background = "rgba(5, 10, 18, 0.7)";
  hud.style.border = "1px solid rgba(0, 255, 204, 0.25)";
  hud.style.pointerEvents = "none";
  hud.style.whiteSpace = "pre";
  threeJsContainer.appendChild(hud);
}

function _updateHUD() {
  if (!hud || !game) return;
  const s = game.getStats();
  hud.textContent =
    `Generation: ${s.generation}\n` +
    `Alive:      ${s.alive} / ${s.total}\n` +
    `Rule:       ${s.rule}\n` +
    `Graph:      ${s.graphType}`;
}
