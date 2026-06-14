import * as THREE from "/modules/webgpu/three.webgpu.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgpu.js";
import { GridHelper } from "/components/GridHelper.webgpu.js";

import { Game } from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();
  _initHelpers();

  game = new Game(scene);
}

async function update() {
  controls.update();
  game.update();
  renderer.render(scene, camera);
}

function _initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5, 4, 8);
}

function _initScene() {
  scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight("#ffffff", 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
  directionalLight.position.set(4, 6, 3);
  scene.add(directionalLight);
}

function _initRenderer() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) {
    console.error("Error: #threejs container not found!");
    return;
  }

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeJsContainer.clientWidth, threeJsContainer.clientHeight);
  renderer.setAnimationLoop(update);
  renderer.setClearColor("#111111");

  threeJsContainer.appendChild(renderer.domElement);

  if (camera) {
    camera.aspect = threeJsContainer.clientWidth / threeJsContainer.clientHeight;
    camera.updateProjectionMatrix();
  }

  window.dispatchEvent(new Event("resize"));

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
  controls.minDistance = 1;
  controls.maxDistance = 50;
}

function _initHelpers() {
  new AxesHelper(scene);
  new GridHelper(scene);
}
