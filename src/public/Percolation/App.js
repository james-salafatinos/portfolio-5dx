import * as THREE from "/modules/three.webgpu.js";
import {
  float,
  If,
  PI,
  color,
  cos,
  instanceIndex,
  Loop,
  sqrt,
  mix,
  mod,
  sin,
  instancedArray,
  Fn,
  uint,
  uniform,
  uniformArray,
  hash,
  vec3,
  vec4,
} from "/modules/three.tsl.js";

import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgpu.js";
import { GridHelper } from "/components/GridHelper.webgpu.js";

import {Game} from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();
  _initHelpers();
  _initGUI();

    
  game = new Game(scene)
  game.create()
  
}

async function update() {
  controls.update();
  game.update()
  renderer.render(scene, camera);
}

function _initCamera() {
  camera = new THREE.PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3, 5, 8);
}

function _initScene() {
  scene = new THREE.Scene();

  // Lights
  const ambientLight = new THREE.AmbientLight("#ffffff", 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
  directionalLight.position.set(4, 2, 0);
  scene.add(directionalLight);
}

function _initRenderer() {
  // Find the #threejs container
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) {
    console.error("Error: #threejs container not found!");
    return;
  }

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeJsContainer.clientWidth, threeJsContainer.clientHeight);
  renderer.setAnimationLoop(update);
  renderer.setClearColor("#000000");

  // Attach the renderer to the #threejs container
  threeJsContainer.appendChild(renderer.domElement);

  // Set the camera aspect ratio and projection matrix
  if (camera) {
    camera.aspect = threeJsContainer.clientWidth / threeJsContainer.clientHeight;
    camera.updateProjectionMatrix();
  }

  // Explicitly force a resize event to correct the initial rendering
  window.dispatchEvent(new Event("resize"));

  // Handle resizing
  window.addEventListener("resize", () => {
    const width = threeJsContainer.clientWidth;
    const height = threeJsContainer.clientHeight;

    renderer.setSize(width, height);
    if (camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  });
}
function _initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;
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

  // Create a container for the GUI
  const guiContainer = document.createElement("div");
  guiContainer.style.position = "absolute";
  guiContainer.style.top = "10px";
  guiContainer.style.right = "10px";
  guiContainer.style.zIndex = "10";
  threeJsContainer.appendChild(guiContainer);

  // Initialize GUI and attach it to the container
  const gui = new GUI({ container: guiContainer });
}
