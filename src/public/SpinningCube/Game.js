import * as THREE from "/modules/three.module.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.particles = null;
    this.clock = new THREE.Clock();
  }

  create() {
    // Cube with solid + wireframe overlay
    const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a3a5c,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x6ab0ff,
      wireframe: true,
    });

    const cube = new THREE.Mesh(geometry, material);
    const wire = new THREE.Mesh(geometry, wireMaterial);

    this.group = new THREE.Group();
    this.group.add(cube);
    this.group.add(wire);
    this.scene.add(this.group);

    // Background particles
    const particleCount = 400;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 30;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0x334466,
      size: 0.05,
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);
  }

  update() {
    const t = this.clock.getElapsedTime();

    if (this.group) {
      this.group.rotation.x += 0.004;
      this.group.rotation.y += 0.006;

      // Subtle breathe/pulse
      const scale = 1 + Math.sin(t * 0.8) * 0.04;
      this.group.scale.set(scale, scale, scale);
    }

    if (this.particles) {
      this.particles.rotation.y = t * 0.02;
    }
  }
}

export { Game };
