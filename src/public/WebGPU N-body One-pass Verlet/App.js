import * as THREE from "/modules/webgpu/three.webgpu.js";
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
} from "/modules/webgpu/three.tsl.js";

import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgpu.js";
import { GridHelper } from "/components/GridHelper.webgpu.js";

// Global Variables
let camera, scene, renderer, controls;
let createCompute, updateCompute;

// Buffers
const count = Math.pow(2, 10);
const positionBuffer = instancedArray(count, "vec3");
const velocityBuffer = instancedArray(count, "vec3");
const accelerationBuffer = instancedArray(count, "vec3");
const colorBuffer = instancedArray(count, "vec4");

// Uniforms
const uniforms = {
  timeScale: uniform(0.1),
  attractionStrength: uniform(0.02),
  repulsionStrength: uniform(0.01),
  dampening: uniform(0.001),
  colorIntensity: uniform(0.5),
};

//init params
const initPosSpread = vec3(2, 1, 2);

create();

function create() {
  initCamera();
  initScene();
  initRenderer();
  initControls();
  initHelpers();
  initGUI();

  setupComputeNodes();
  createParticles();
  // Explicitly force a resize event to correct the initial rendering
  window.dispatchEvent(new Event("resize"));
}

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3, 5, 8);
}

function initScene() {
  scene = new THREE.Scene();

  // Lights
  const ambientLight = new THREE.AmbientLight("#ffffff", 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
  directionalLight.position.set(4, 2, 0);
  scene.add(directionalLight);
}

function initRenderer() {
  const threeJsContainer = document.getElementById("threejs");
  if (!threeJsContainer) {
    console.error("Error: #threejs container not found!");
    return;
  }
  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeJsContainer.clientWidth, threeJsContainer.clientHeight);
  renderer.setAnimationLoop(update);
  renderer.setClearColor("#000000");
  threeJsContainer.appendChild(renderer.domElement);

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

function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;
}

function initHelpers() {
  new AxesHelper(scene);
  new GridHelper(scene);
}

function initGUI() {
  const gui = new GUI();

  gui.add(uniforms.timeScale, "value", -2, 2, 0.01).name("Time Scale");
  gui
    .add(uniforms.attractionStrength, "value", 0, 0.1, 0.001)
    .name("Attraction Strength");
  gui
    .add(uniforms.repulsionStrength, "value", 0, 0.1, 0.001)
    .name("Repulsion Strength");
  gui.add(uniforms.dampening, "value", 0, 1, 0.01).name("Dampening");
  gui.add(uniforms.colorIntensity, "value", 0, 2, 0.1).name("Color Intensity");
}

function setupComputeNodes() {
  const sphericalToVec3 = Fn(([phi, theta]) => {
    const sinPhiRadius = sin(phi);
    return vec3(
      sinPhiRadius.mul(sin(theta)),
      cos(phi),
      sinPhiRadius.mul(cos(theta))
    );
  });

  const velocityToColor = Fn(([velocity]) => {
    const speed = velocity.length();
    const normalizedSpeed = speed.div(0.1);

    const color = mix(
      vec3(0, 0, 1),
      vec3(1, 0, 0),
      normalizedSpeed.clamp(0, 1)
    );
    return mix(color, vec3(1, 1, 1), normalizedSpeed.clamp(1, 2).sub(1));
  });

  const create_WebGPU = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);
    const acceleration = accelerationBuffer.element(instanceIndex);
    const color = colorBuffer.element(instanceIndex);

    const basePosition = vec3(
      hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
      hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
      hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
    )
      .sub(0.5)
      .mul(vec3(initPosSpread.x, initPosSpread.y, initPosSpread.z));
    position.assign(basePosition);

    const phi = hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
      .mul(PI)
      .mul(2);
    const theta = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(
      PI
    );
    const baseVelocity = sphericalToVec3(phi, theta).mul(0.05);
    velocity.assign(baseVelocity);

    acceleration.assign(vec3(0));
    color.assign(velocityToColor(velocity));
  });

  const update_WebGPU = Fn(() => {
    const delta = float(1 / 60)
      .mul(uniforms.timeScale)
      .toVar();

    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);
    const acceleration = accelerationBuffer.element(instanceIndex);
    const color = colorBuffer.element(instanceIndex);

    const force = vec3(0).toVar();
    const idxVar = instanceIndex.toVar();

    Loop(count, ({ i }) => {
      If(i.notEqual(idxVar), () => {
        const otherPos = positionBuffer.element(i).toVec3().toVar();
        const deltaPos = position.sub(otherPos).toVar();
        const distSq = deltaPos.dot(deltaPos).toVar();
        const dir = deltaPos.normalize();

        const repulsion = dir
          .mul(uniforms.repulsionStrength)
          .div(distSq.add(0.05));

        const attraction = dir
          .mul(uniforms.attractionStrength)
          .div(distSq.add(0.05))
          .negate();

        // Accumulate forces
        force.addAssign(repulsion.add(attraction));
      });
    });

    const newAcceleration = force; // Compute new acceleration (a_{t+dt})
    position.addAssign(
      velocity.mul(delta).add(acceleration.mul(delta.pow(2).mul(0.5)))
    );
    velocity.addAssign(acceleration.add(newAcceleration).mul(0.5).mul(delta));
    velocity.mulAssign(float(1).sub(uniforms.dampening));
    acceleration.assign(newAcceleration);

    color.assign(velocityToColor(velocity));
  });
  

  createCompute = create_WebGPU().compute(count);
  updateCompute = update_WebGPU().compute(count);
  renderer.computeAsync(createCompute);
}

function createParticles() {
  const material = new THREE.SpriteNodeMaterial({
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  material.positionNode = positionBuffer.toAttribute();
  material.colorNode = colorBuffer.toAttribute();

  const geometry = new THREE.PlaneGeometry(0.05, 0.05);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  scene.add(mesh);
}

async function update() {
  controls.update();
  renderer.compute(updateCompute);
  renderer.render(scene, camera);
}
