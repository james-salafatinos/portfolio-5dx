import * as THREE from "/modules/three.module.js";

class Game {

  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.particlePositions = [];
    this.particleVelocities = [];  // New property for particle velocities
    this.numParticles = 100; // You can adjust this number
    this.timeScale = 1000000
    this.initParticleSpread = 2
    this.dampening = .999

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
      const x = (Math.random() *2 - 1) * this.initParticleSpread;
      const y = (Math.random() *2 - 1) * this.initParticleSpread;
      const z = (Math.random() *2 - 1) * this.initParticleSpread;

      offsets.push(x, y, z);
      colors.push(Math.random(), Math.random(), Math.random());

      this.particlePositions.push(new THREE.Vector3(x, y, z));

      const vx = (Math.random() - 0.5) * 0//0.05;  // Random velocity x-component
      const vy = (Math.random() - 0.5) * 0//0.001;  // Random velocity y-component
      const vz = (Math.random() - 0.5) * 0//0.001;  // Random velocity z-component

      this.particleVelocities.push(new THREE.Vector3(vx, vy, vz));  // Store initial velocity
    }

    // Add instanced attributes to geometry
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));

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
      `
    });

    this.particles = new THREE.Mesh(geometry, material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  update() {
    const offsets = this.particles.geometry.attributes.offset.array;
    
    // Reusable Vector3 objects
    const r = new THREE.Vector3();
    const forceAccumulator = new THREE.Vector3();
  
    for (let i = 0; i < this.numParticles; i++) {
      const index_i = i * 3;
      const position_i = this.particlePositions[i];
  
      // Reset the force accumulator
      forceAccumulator.set(0, 0, 0);
  
      for (let j = 0; j < this.numParticles; j++) {
        if (i === j) continue;
  
        const position_j = this.particlePositions[j];
        
        // Vector from i to j
        r.subVectors(position_j, position_i);
  
        // Calculate the unit force based on distance
        const distanceSquared = r.lengthSq();
        if (distanceSquared < 0.1) continue; // To avoid extreme forces at very small distances
  
        r.normalize().multiplyScalar(1 / distanceSquared);
        
        // Accumulate force
        forceAccumulator.add(r);
      }
  
      // Get the velocity for this particle
      const velocity_i = this.particleVelocities[i];

      velocity_i.add(forceAccumulator.divideScalar(this.timeScale)); // Update velocity
      
      position_i.add(velocity_i); // Update position

      velocity_i.multiplyScalar(this.dampening)

      // Update instanced attribute data
      offsets[index_i] = position_i.x;
      offsets[index_i + 1] = position_i.y;
      offsets[index_i + 2] = position_i.z;
    }
  
    // Flag the changes for update
    this.particles.geometry.attributes.offset.needsUpdate = true;
  }
  
}

export { Game };
