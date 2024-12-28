import * as THREE from "/modules/three.webgpu.js";
import { GLTFLoader } from "/modules/GLTFLoader.js";
import {
  texture,
  uv,
  mix,
  time,
  sin,
  vec4,
  vec3,
  cos,
  uniform,
  modelWorldMatrix,
  positionLocal,
  positionWorld,
  positionView,
  positionViewDirection,
  positionWorldDirection,
  positionGeometry,
} from "/modules/three.tsl.js";

class Game {

  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.theta = Math.PI / 1.01; // Initial angle
    this.thetaDot = 0; // Initial angular velocity
    this.m = 1; // Mass
    this.l = 1; // Length
    this.g = 9.81; // Acceleration due to gravity

    this.trailPoints = []; // To store the trail points

    this.create();
  }

  create() {
    // Create pendulum bob and line
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    this.bob = new THREE.Mesh(geometry, material);
    this.scene.add(this.bob);

    const lineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.sin(this.theta) * this.l, -Math.cos(this.theta) * this.l, 0)
    ]);
    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(this.line);

    // Initialize the trail
    const trailMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
    this.trailGeometry = new THREE.BufferGeometry();
    this.trail = new THREE.Line(this.trailGeometry, trailMaterial);
    this.scene.add(this.trail);
  }

  update(delta) {
    // Euler's method to update theta and thetaDot based on the Lagrangian equations of motion
    const thetaDotDot = -(this.g / this.l) * Math.sin(this.theta);
    this.thetaDot += thetaDotDot * delta;
    this.theta += this.thetaDot * delta;

    // Update pendulum bob and line position
    this.bob.position.set(Math.sin(this.theta) * this.l, -Math.cos(this.theta) * this.l, 0);

    this.line.geometry.setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.sin(this.theta) * this.l, -Math.cos(this.theta) * this.l, 0)
    ]);
    this.line.geometry.attributes.position.needsUpdate = true;

    // Update the trail
    this.trailPoints.push(new THREE.Vector3(
      Math.sin(this.theta) * this.l,
      -Math.cos(this.theta) * this.l,
      0
    ));

    // Limit the trail length to the last 100 points
    while (this.trailPoints.length > 20) {
      this.trailPoints.shift();
    }

    this.trailGeometry.setFromPoints(this.trailPoints);
    this.trailGeometry.attributes.position.needsUpdate = true;
  }
}

export { Game };
