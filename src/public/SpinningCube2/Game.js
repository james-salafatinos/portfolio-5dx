import * as THREE from "/modules/webgpu/three.webgpu.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.cubes = [];
    this.create();
  }

  create() {
    const colors = [0xff4444, 0x44aaff, 0x44ff88, 0xffaa00, 0xcc44ff, 0xff44cc];

    const positions = [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(-3, 1, -1),
      new THREE.Vector3(3, 0.75, -1),
      new THREE.Vector3(-1.5, 1.5, -3),
      new THREE.Vector3(1.5, 0.5, -3),
      new THREE.Vector3(0, 2, -5),
    ];

    const speeds = [0.005, 0.012, 0.008, 0.015, 0.010, 0.007];
    const axes = [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 1, 0).normalize(),
      new THREE.Vector3(0, 1, 1).normalize(),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(1, 1, 1).normalize(),
      new THREE.Vector3(0, 1, 0),
    ];

    for (let i = 0; i < positions.length; i++) {
      const size = 0.5 + Math.random() * 0.8;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.4,
        metalness: 0.2,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.copy(positions[i]);
      this.scene.add(cube);
      this.cubes.push({ mesh: cube, axis: axes[i], speed: speeds[i] });
    }
  }

  update() {
    for (const { mesh, axis, speed } of this.cubes) {
      mesh.rotateOnWorldAxis(axis, speed);
    }
  }
}

export { Game };
