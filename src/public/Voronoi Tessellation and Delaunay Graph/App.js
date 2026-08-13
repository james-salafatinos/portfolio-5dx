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
  Speed: 1.0,
  "Show Delaunay": true,
  "Show Voronoi": true,
  "Show Points": true,
};

create();

function create() {
  _initScene();
  _initCamera();
  _initRenderer();
  _initControls();
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

  gui.add(controlsState, "Speed", 0.1, 5.0, 0.1).name("Speed");
  gui.add(controlsState, "Show Delaunay").name("Show Delaunay");
  gui.add(controlsState, "Show Voronoi").name("Show Voronoi");
  gui.add(controlsState, "Show Points").name("Show Points");
}
