import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";

import { Game } from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game;

// Half-extent of the world the camera covers (X and Y span [-50, 50]).
const VIEW_HALF = 50;

// Shared control object read by both the GUI and the Game each frame.
const controlsState = {
  p: 0.5,
  N: 200,
  "Motion": "Random Walk", // options: ["Lissajous", "Random Walk"]
  "Walk Speed": 1.0,
  Speed: 1.0,
  Play: true,
  Regenerate: () => {
    if (game) game.regenerate();
  },
  "Show Voronoi": true,
  "Show Delaunay": true,
  "Show Points": true,
};

create();

function create() {
  _initScene();
  _initCamera();
  _initRenderer();
  _initControls();
  _initStats();
  _initGUI();

  game = new Game(scene, controlsState);
}

function update() {
  controls.update();
  game.update();
  renderer.render(scene, camera);
}

function _initScene() {
  scene = new THREE.Scene();
}

function _initCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  // Orthographic frustum covering [-50, 50] in the shorter axis, widened by aspect.
  camera = new THREE.OrthographicCamera(
    -VIEW_HALF * aspect,
    VIEW_HALF * aspect,
    VIEW_HALF,
    -VIEW_HALF,
    0.1,
    1000
  );
  camera.position.set(0, 0, 100);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
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
  renderer.setClearColor(0x0a0e1a);
  renderer.setAnimationLoop(update);

  threeJsContainer.appendChild(renderer.domElement);

  _resize();
  window.addEventListener("resize", _resize);
}

function _resize() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer || !renderer || !camera) return;

  const width = threeJsContainer.clientWidth;
  const height = threeJsContainer.clientHeight;
  const aspect = width / height;

  renderer.setSize(width, height);

  camera.left = -VIEW_HALF * aspect;
  camera.right = VIEW_HALF * aspect;
  camera.top = VIEW_HALF;
  camera.bottom = -VIEW_HALF;
  camera.updateProjectionMatrix();
}

function _initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false; // top-down 2D — no rotation
  controls.enableZoom = true;
  controls.enableDamping = true;
}

// Dark semi-transparent stats panel, bottom-left of the #threejs container.
function _initStats() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) return;

  const stats = document.createElement("div");
  stats.id = "percolation-stats";
  stats.style.position = "absolute";
  stats.style.left = "10px";
  stats.style.bottom = "10px";
  stats.style.zIndex = "10";
  stats.style.padding = "10px 14px";
  stats.style.background = "rgba(10, 14, 26, 0.78)";
  stats.style.border = "1px solid rgba(255, 255, 255, 0.15)";
  stats.style.borderRadius = "6px";
  stats.style.color = "#cfd8e6";
  stats.style.font = "13px/1.5 monospace";
  stats.style.whiteSpace = "pre";
  stats.style.pointerEvents = "none";
  stats.textContent = "";
  threeJsContainer.appendChild(stats);
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

  gui.add(controlsState, "p", 0.0, 1.0, 0.01).name("p (threshold)");
  gui.add(controlsState, "N", 20, 2000, 1).name("N (sites)").onFinishChange(() => {
    if (game) game.reinit();
  });
  gui.add(controlsState, "Motion", ["Lissajous", "Random Walk"]).name("Motion Mode");
  gui.add(controlsState, "Walk Speed", 0.1, 10.0, 0.1).name("Walk Speed");
  gui.add(controlsState, "Speed", 0.1, 5.0, 0.1).name("Speed");
  gui.add(controlsState, "Play").name("Play / Pause");
  gui.add(controlsState, "Regenerate").name("Regenerate");
  gui.add(controlsState, "Show Voronoi").name("Show Voronoi");
  gui.add(controlsState, "Show Delaunay").name("Show Delaunay");
  gui.add(controlsState, "Show Points").name("Show Points");
}
