import * as THREE from "/modules/three.module.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.particlePositions = [];
    this.particleVelocities = []; // New property for particle velocities
    this.numParticles = 100; // You can adjust this numbert
    this.timescale = 100;
    this.dampening = 0.999;
    this.initParticleSpread = 2;
    this.createParticles();
  }

  createParticles() {
    // Create an instanced buffer geometry
    const geometry = new THREE.InstancedBufferGeometry();
    const baseGeometry = new THREE.IcosahedronGeometry(0.05, 3); // 0.05 radius and no subdivision

    geometry.index = baseGeometry.index;
    geometry.attributes.position = baseGeometry.attributes.position;
    geometry.attributes.uv = baseGeometry.attributes.uv;

    // Instanced attributes
    const offsets = [];
    const colors = [];

    for (let i = 0; i < this.numParticles; i++) {
      const x = (Math.random() * 2 - 1) * this.initParticleSpread;
      const y = (Math.random() * 2 - 1) * this.initParticleSpread;
      const z = (Math.random() * 2 - 1) * this.initParticleSpread;

      offsets.push(x, y, z);
      colors.push(Math.random(), Math.random(), Math.random());

      this.particlePositions.push(new THREE.Vector3(x, y, z));

      const vx = (Math.random() - 0.5) * 0; //0.05;  // Random velocity x-component
      const vy = (Math.random() - 0.5) * 0; //0.001;  // Random velocity y-component
      const vz = (Math.random() - 0.5) * 0; //0.001;  // Random velocity z-component

      this.particleVelocities.push(new THREE.Vector3(vx, vy, vz)); // Store initial velocity
    }

    // Add instanced attributes to geometry
    geometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3)
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 offset;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position + offset, 1.0 );
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4( vColor, 1.0 );
        }
      `,
    });

    this.particles = new THREE.Mesh(geometry, material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  computeForces(particle) {
    const r = new THREE.Vector3();
    const forceAccumulator = new THREE.Vector3();

    for (let j = 0; j < this.numParticles; j++) {
      if (particle === this.particlePositions[j]) continue;

      const position_j = this.particlePositions[j];
      r.subVectors(position_j, particle);

      const distanceSquared = r.lengthSq();
      if (distanceSquared < 0.1) continue;

      const softening = 2; // or some small value
      r.normalize().multiplyScalar(1 / (distanceSquared + softening));
      forceAccumulator.add(r);
    }
    return forceAccumulator;
  }

  update() {
    const offsets = this.particles.geometry.attributes.offset.array;

    const dt = 0.01; // assuming unit time step
    const half_dt = dt * 0.5;

    for (let i = 0; i < this.numParticles; i++) {
      const position = this.particlePositions[i].clone();
      const velocity = this.particleVelocities[i].clone();
      velocity.multiplyScalar(this.dampening);

      // 1st evaluation
      const k1_v = this.computeForces(position).divideScalar(this.timescale);
      const k1_p = velocity.clone();

      // 2nd evaluation
      const k2_v = this.computeForces(
        position.addScaledVector(k1_p, half_dt)
      ).divideScalar(this.timescale);
      const k2_p = velocity.addScaledVector(k1_v, half_dt);

      // 3rd evaluation
      const k3_v = this.computeForces(
        position.addScaledVector(k2_p, half_dt)
      ).divideScalar(this.timescale);
      const k3_p = velocity.addScaledVector(k2_v, half_dt);

      // 4th evaluation
      const k4_v = this.computeForces(
        position.addScaledVector(k3_p, dt)
      ).divideScalar(this.timescale);
      const k4_p = velocity.addScaledVector(k3_v, dt);

      // Update velocity
      velocity.addScaledVector(
        k1_v.add(k2_v.multiplyScalar(2)).add(k3_v.multiplyScalar(2)).add(k4_v),
        dt / 6
      );
      this.particleVelocities[i].copy(velocity);

      // Update position
      position.addScaledVector(
        k1_p.add(k2_p.multiplyScalar(2)).add(k3_p.multiplyScalar(2)).add(k4_p),
        dt / 6
      );
      this.particlePositions[i].copy(position);

      // Update instanced attribute data
      const index = i * 3;
      offsets[index] = position.x;
      offsets[index + 1] = position.y;
      offsets[index + 2] = position.z;
    }

    this.particles.geometry.attributes.offset.needsUpdate = true;
  }
}

export { Game };
