import * as THREE from "/modules/three.module.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { Game } from "./Game.js";

// Global Variables
let camera, scene, renderer, controls, game;

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();

  game = new Game(scene);
  game.create();
}

function update() {
  controls.update();
  game.update();
  renderer.render(scene, camera);
}

function _initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 4);
}

function _initScene() {
  scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight("#ffffff", 0.4);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight("#6ab0ff", 80, 20);
  pointLight.position.set(3, 3, 3);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight("#ff6a88", 40, 20);
  pointLight2.position.set(-3, -2, 2);
  scene.add(pointLight2);
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
  renderer.setClearColor("#0a0a0f");
  renderer.setAnimationLoop(update);

  threeJsContainer.appendChild(renderer.domElement);

  if (camera) {
    camera.aspect = threeJsContainer.clientWidth / threeJsContainer.clientHeight;
    camera.updateProjectionMatrix();
  }

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
  controls.maxDistance = 20;
}
