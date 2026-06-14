import * as THREE from "/modules/three.module.js";

import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgl.js";
import { GridHelper } from "/components/GridHelper.webgl.js";

import { Game } from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game;

// Orthographic half-height (world units). Grid is 10x10 (±5), graph fits ±4.
const FRUSTUM = 5.2;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();
  _initHelpers();

  game = new Game(scene);

  _initGUI();
}

function update() {
  controls.update();
  game.update();
  renderer.render(scene, camera);
}

function _initCamera() {
  // Top-down orthographic view looking straight down the -Y axis.
  // Content lives in the XZ plane (y = 0), matching the GridHelper orientation.
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(
    -aspect * FRUSTUM,
    aspect * FRUSTUM,
    FRUSTUM,
    -FRUSTUM,
    0.1,
    100
  );
  camera.position.set(0, 10, 0);
  camera.up.set(0, 0, -1); // keep +X to the right when looking down
  camera.lookAt(0, 0, 0);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#050a12");

  // Soft ambient so the unlit basic materials read cleanly
  const ambientLight = new THREE.AmbientLight("#ffffff", 0.8);
  scene.add(ambientLight);
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
  const aspect = w / h;
  renderer.setSize(w, h);

  camera.left = -aspect * FRUSTUM;
  camera.right = aspect * FRUSTUM;
  camera.top = FRUSTUM;
  camera.bottom = -FRUSTUM;
  camera.updateProjectionMatrix();
}

function _initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableRotate = false; // lock to top-down — pan & zoom only
  controls.minZoom = 0.3;
  controls.maxZoom = 6;
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
    graphType: "Random",
    nodeCount: 80,
    edgeProbability: 0.08,
    rule: "Conway-like B3/S23",
    stepMode: "Auto",
    stepSpeed: 4,
    seedPercent: 0.3,
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
