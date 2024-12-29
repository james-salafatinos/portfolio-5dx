import * as THREE from "/modules/webgpu/three.webgpu.js";


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
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.bob = new THREE.Mesh(geometry, material);
    this.scene.add(this.bob);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.sin(this.theta) * this.l,
        -Math.cos(this.theta) * this.l,
        0
      ),
    ]);
    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(this.line);

    // Initialize the trail
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    // Create a buffer large enough for 100 points
    const maxPoints = 100;
    this.trailPoints = new Float32Array(maxPoints * 3); // Each point has x, y, z
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.trailPoints, 3)
    );
    this.trailGeometry.setDrawRange(0, 0); // Start with no points

    this.trail = new THREE.Line(this.trailGeometry, trailMaterial);
    this.scene.add(this.trail);
  }

  update(delta) {
    // Euler's method to update theta and thetaDot based on the Lagrangian equations of motion
    const thetaDotDot = -(this.g / this.l) * Math.sin(this.theta);
    this.thetaDot += thetaDotDot * delta;
    this.theta += this.thetaDot * delta;

    // Update pendulum bob and line position
    this.bob.position.set(
      Math.sin(this.theta) * this.l,
      -Math.cos(this.theta) * this.l,
      0
    );

    this.line.geometry.setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.sin(this.theta) * this.l,
        -Math.cos(this.theta) * this.l,
        0
      ),
    ]);
    this.line.geometry.attributes.position.needsUpdate = true;

    // Update the trail
    const point = new THREE.Vector3(
      Math.sin(this.theta) * this.l,
      -Math.cos(this.theta) * this.l,
      0
    );

    // Add the new point and shift old ones
    const positionAttr = this.trailGeometry.attributes.position;
    const numPoints = Math.min(this.trailPoints.length / 3, 100);

    for (let i = 0; i < (numPoints - 1) * 3; i++) {
      this.trailPoints[i] = this.trailPoints[i + 3]; // Shift existing points
    }

    // Add the new point at the end
    this.trailPoints[(numPoints - 1) * 3] = point.x;
    this.trailPoints[(numPoints - 1) * 3 + 1] = point.y;
    this.trailPoints[(numPoints - 1) * 3 + 2] = point.z;

    // Update the buffer and set the draw range
    positionAttr.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, numPoints);
  }
}

export { Game };
