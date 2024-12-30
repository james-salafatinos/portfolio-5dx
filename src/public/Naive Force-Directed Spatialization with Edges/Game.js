import * as THREE from "/modules/three.module.js";

class Game {
  constructor(scene) {
    this.scene = scene;

    this.particles = null;
    this.particlePositions = [];
    this.particleVelocities = [];
    this.particleAccelerations = [];
    this.particlePreviousPositions = [];
    this.numParticles = 150;
    this.timeScale = 100000;
    this.dampening = 0.95;
    this.initParticleSpread = 5.5;
    this.particleRadius = 0.05;
    this.cubeSize = 10;

    // ---------------------------------------------
    //  A) Add user-tweakable parameters:
    // ---------------------------------------------

    this.repulsionStrength = 0.5; // For particle-particle repulsion
    this.attractionStrength = 0.01; // For spring attraction along edges
    this.wallRepulsionStrength = 0.01; // Repulsion from walls

    // ------------------------
    // B) Graph/edge data:
    // ------------------------
    this.edges = []; // Will store { line, i, j }
    this.adjacency = []; // adjacency[i][j] = true/false
    this.edgesGroup = new THREE.Group();
    this.scene.add(this.edgesGroup);

    this.createParticles();
    this.createBoundingBox();

    // Initialize edges (randomly)
    this.initEdges(0.1); // 10% chance of an edge
  }

  setRepulsionStrength(value) {
    this.repulsionStrength = value;
  }
  setAttractionStrength(value) {
    this.attractionStrength = value;
  }
  setWallRepulsionStrength(value) {
    this.wallRepulsionStrength = value;
  }

  createParticles() {
    const geometry = new THREE.InstancedBufferGeometry();
    const baseGeometry = new THREE.IcosahedronGeometry(this.particleRadius, 3);
    geometry.index = baseGeometry.index;
    geometry.attributes.position = baseGeometry.attributes.position;
    geometry.attributes.uv = baseGeometry.attributes.uv;

    const offsets = [];
    const colors = [];
    // NEW: array for scales (1 float per instance)
    this.scales = new Float32Array(this.numParticles); // store here so we can update later
    this.scaledRadii = new Float32Array(this.numParticles); // one float per particle
    for (let i = 0; i < this.numParticles; i++) {
      // Random spherical placement:
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.random() * this.initParticleSpread;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      offsets.push(x, y, z);
      colors.push(Math.random(), Math.random(), Math.random());
      // init scale to 1.0 for now
      this.scales[i] = 1.0;
      this.scaledRadii[i] = this.particleRadius;

      this.particlePositions.push(new THREE.Vector3(x, y, z));
      this.particleVelocities.push(new THREE.Vector3(0, 0, 0));
      this.particlePreviousPositions.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < this.numParticles; i++) {
      this.particleAccelerations.push(new THREE.Vector3(0, 0, 0));
    }

    geometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3)
    );
    // IMPORTANT: add scale attribute
    geometry.setAttribute(
      "instanceScale",
      new THREE.InstancedBufferAttribute(this.scales, 1)
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 offset;
        attribute vec3 color;
        attribute float instanceScale;   // NEW
        varying vec3 vColor;
    
        void main() {
          vColor = color;
          // scale the local 'position' by instanceScale
          vec3 scaledPosition = position * instanceScale;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition + offset, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
    });

    this.particles = new THREE.Mesh(geometry, material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  createBoundingBox() {
    const boxGeometry = new THREE.BoxGeometry(
      this.cubeSize,
      this.cubeSize,
      this.cubeSize
    );
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    this.scene.add(line);
  }

  // ---------------------------------------------------------
  // C) Initialize random edges (Graph)
  // ---------------------------------------------------------
  initEdges() {
    // Clear out any existing edges or adjacency
    this.edges = [];
    this.edgesGroup.clear();

    // Re-initialize adjacency
    this.adjacency = Array.from({ length: this.numParticles }, () =>
      new Array(this.numParticles).fill(false)
    );

    this.degrees = new Array(this.numParticles).fill(0);

    // -----
    // 1) Example: pick a "hub" particle, connect it to many others
    // -----
    const hubIndex = 0; // Let’s assume particle #0 is the "hub"
    // Connect it to, say, 10 or so other particles (or fewer if numParticles < 12)
    const numConnectionsFromHub = Math.min(10, this.numParticles - 1);

    // We’ll choose particles #1 through #numConnectionsFromHub as the leaves
    for (let i = 1; i <= numConnectionsFromHub; i++) {
      this.addEdge(hubIndex, i);
    }

    // -----
    // 2) Example: create a few small clusters. For instance,
    //    a small cluster of 3 nodes (fully connected triangle),
    //    then maybe another cluster of 2 nodes (just a single edge).
    // -----
    // Let’s define cluster1 = {11, 12, 13} (3 nodes if they exist)
    // and cluster2 = {14, 15} (2 nodes if they exist).
    const cluster1 = [11, 12, 13,14,15,16,17,18];
    if (cluster1.every((idx) => idx < this.numParticles)) {
      // Connect 11–12, 12–13, 11–13
      this.addEdge(11, 12);
      this.addEdge(12, 13);
      this.addEdge(11, 13);
      this.addEdge(11, 14);
      this.addEdge(11, 16);
      this.addEdge(12, 14);
      this.addEdge(12, 15);
      this.addEdge(12, 16);
    }

    const cluster2 = [14, 15,16,17];
    if (cluster2.every((idx) => idx < this.numParticles)) {
      // Connect 14–15
      this.addEdge(14, 15);
    }

    // -----
    // 3) Example: a few “leaf” nodes that only have a single connection
    //    to some random node. Let’s say we choose 5 random leaves
    // -----
    const numLeafNodes = 5;
    for (let i = 0; i < numLeafNodes; i++) {
      const leafIndex = Math.floor(Math.random() * this.numParticles);
      const connectToIndex = Math.floor(Math.random() * this.numParticles);
      // We don’t want the leaf to be the same as the hub necessarily,
      // but let’s just show the idea:
      if (leafIndex !== connectToIndex) {
        this.addEdge(leafIndex, connectToIndex);
      }
    }

    // (Optional) If you want to ensure some random pair edges for variety:
    // for (let i = 0; i < 10; i++) {
    //   const a = Math.floor(Math.random() * this.numParticles);
    //   const b = Math.floor(Math.random() * this.numParticles);
    //   if (a !== b) {
    //     this.addEdge(a, b);
    //   }
    // }

    // -----
    // 4) Finally, update the particle scale based on degrees,
    //    and mark attributes for update
    // -----
    for (let i = 0; i < this.numParticles; i++) {
      this.scales[i] = 1.0 + 0.2 * this.degrees[i];
      this.scaledRadii[i] = this.particleRadius * this.scales[i];
    }
    this.particles.geometry.attributes.instanceScale.needsUpdate = true;
  }

  /**
   * Helper function to add an edge between i and j,
   * and update adjacency, degrees, and the visualization line.
   */
  addEdge(i, j) {
    // If it’s already set, do nothing
    if (this.adjacency[i][j] || this.adjacency[j][i]) return;

    // Mark adjacency
    this.adjacency[i][j] = true;
    this.adjacency[j][i] = true;

    // Increment degrees
    this.degrees[i]++;
    this.degrees[j]++;

    // Create a line object
    const geo = new THREE.BufferGeometry().setFromPoints([
      this.particlePositions[i],
      this.particlePositions[j],
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geo, mat);
    this.edgesGroup.add(line);

    this.edges.push({ line, i, j });
  }

  // ---------------------------------------------------------
  // D) Update loop (modified to update edges & forces)
  // ---------------------------------------------------------
  update() {
    const offsets = this.particles.geometry.attributes.offset.array;

    // 1) Handle collisions among particles
    this.handleParticleCollisions();

    // 2) Compute old accelerations
    for (let i = 0; i < this.numParticles; i++) {
      this.particleAccelerations[i].copy(this.computeAcceleration(i));
    }

    // 3) Update positions
    for (let i = 0; i < this.numParticles; i++) {
      const oldVel = this.particleVelocities[i].clone();
      oldVel.addScaledVector(this.particleAccelerations[i], 0.5);
      this.particlePositions[i].add(oldVel);

      // Hard-collision with walls if you want to keep it:
      this.handleCollision(i);
    }

    // 4) Recompute accelerations after positions updated
    const newAccelerations = [];
    for (let i = 0; i < this.numParticles; i++) {
      newAccelerations[i] = this.computeAcceleration(i);
    }

    // 5) Update velocities
    for (let i = 0; i < this.numParticles; i++) {
      const avgAccel = this.particleAccelerations[i]
        .clone()
        .add(newAccelerations[i])
        .multiplyScalar(0.5);

      this.particleVelocities[i].add(avgAccel);
      this.particleVelocities[i].multiplyScalar(this.dampening);

      // store for next frame
      this.particleAccelerations[i].copy(newAccelerations[i]);
    }

    // 6) Update the offset attribute for instanced geometry
    for (let i = 0; i < this.numParticles; i++) {
      const idx = i * 3;
      offsets[idx] = this.particlePositions[i].x;
      offsets[idx + 1] = this.particlePositions[i].y;
      offsets[idx + 2] = this.particlePositions[i].z;
    }
    this.particles.geometry.attributes.offset.needsUpdate = true;

    // 7) Update edge line positions
    for (let edge of this.edges) {
      edge.line.geometry.setFromPoints([
        this.particlePositions[edge.i],
        this.particlePositions[edge.j],
      ]);
    }
  }

  // ---------------------------------------------------------
  // E) Compute total acceleration on particle i
  //    (including repulsion, attraction, and wall repulsion)
  // ---------------------------------------------------------
  computeAcceleration(index) {
    const forceAccumulator = new THREE.Vector3();
    const position_i = this.particlePositions[index];

    // 1) Repulsion from other particles
    for (let j = 0; j < this.numParticles; j++) {
      if (j === index) continue;

      const r_ij = new THREE.Vector3().subVectors(
        this.particlePositions[j],
        position_i
      );
      const distSq = r_ij.lengthSq();

      if (distSq < 0.0001) continue; // avoid singularities
      // Repulsive force ~ (repulsionStrength / dist^2)
      // direction = r_ij normalized, magnitude = 1/dist^2
      r_ij.normalize().multiplyScalar(
        this.repulsionStrength / distSq
      );
      forceAccumulator.add(r_ij);
    }

    // 2) Attraction along edges (like a spring)
    //    For each edge i-j, we pull them together
    for (let j = 0; j < this.numParticles; j++) {
      if (!this.adjacency[index][j]) continue;

      const delta = new THREE.Vector3().subVectors(
        this.particlePositions[j],
        position_i
      );
      const dist = delta.length();
      if (dist < 0.0001) continue;

      // Spring-like force: F = -k * (dist - rest_length) * direction
      // For simplicity, assume rest_length=0 => F ~ -k * dist
      // => direction = delta.normalized(), magnitude = dist
      delta.normalize();
      const k = this.attractionStrength; // "spring constant"
      // We'll just do a simple linear: F = k * dist
      delta.multiplyScalar(k * dist);

      // We want to pull *towards* j, so we add +delta
      forceAccumulator.add(delta);
    }

    // 3) Repulsion from walls (soft boundary)
    //    Think of the walls as big "charges" that repel the particles
    const halfSize = this.cubeSize / 2;
    // x-direction walls
    let distToWall = halfSize - Math.abs(position_i.x);
    if (distToWall < 0.0001) distToWall = 0.0001;
    // If close to +x wall
    if (position_i.x > 0) {
      // direction points negative x
      const strength = this.wallRepulsionStrength / (distToWall * distToWall);
      forceAccumulator.x -= strength;
    } else {
      // close to -x wall: direction is positive x
      const strength = this.wallRepulsionStrength / (distToWall * distToWall);
      forceAccumulator.x += strength;
    }
    // y-direction walls
    let distToYWall = halfSize - Math.abs(position_i.y);
    if (distToYWall < 0.0001) distToYWall = 0.0001;
    if (position_i.y > 0) {
      const strength = this.wallRepulsionStrength / (distToYWall * distToYWall);
      forceAccumulator.y -= strength;
    } else {
      const strength = this.wallRepulsionStrength / (distToYWall * distToYWall);
      forceAccumulator.y += strength;
    }
    // z-direction walls
    let distToZWall = halfSize - Math.abs(position_i.z);
    if (distToZWall < 0.0001) distToZWall = 0.0001;
    if (position_i.z > 0) {
      const strength = this.wallRepulsionStrength / (distToZWall * distToZWall);
      forceAccumulator.z -= strength;
    } else {
      const strength = this.wallRepulsionStrength / (distToZWall * distToZWall);
      forceAccumulator.z += strength;
    }

    // 4) Convert total force => acceleration
    //    "timeScale" is effectively scaling for your simulation
    forceAccumulator.divideScalar(this.timeScale);

    return forceAccumulator;
  }


  // -------------------------------------------------
  // Collision handling (unchanged from your code)
  // -------------------------------------------------
  handleCollision(i) {
    const halfSize = this.cubeSize / 2;
    const particle = this.particlePositions[i];
    const velocity = this.particleVelocities[i];

    // The actual radius of this particle
    const r = this.scaledRadii[i];

    // x-axis check
    if (particle.x + r > halfSize) {
      particle.x = halfSize - r;
      velocity.x = -Math.abs(velocity.x);
    } else if (particle.x - r < -halfSize) {
      particle.x = -halfSize + r;
      velocity.x = Math.abs(velocity.x);
    }

    // y-axis check
    if (particle.y + r > halfSize) {
      particle.y = halfSize - r;
      velocity.y = -Math.abs(velocity.y);
    } else if (particle.y - r < -halfSize) {
      particle.y = -halfSize + r;
      velocity.y = Math.abs(velocity.y);
    }

    // z-axis check
    if (particle.z + r > halfSize) {
      particle.z = halfSize - r;
      velocity.z = -Math.abs(velocity.z);
    } else if (particle.z - r < -halfSize) {
      particle.z = -halfSize + r;
      velocity.z = Math.abs(velocity.z);
    }
  }

  handleParticleCollisions() {
    // unchanged from your code
    const collisionNormal = new THREE.Vector3();
    const relativeVelocity = new THREE.Vector3();
    const e = 0.8;

    for (let i = 0; i < this.numParticles; i++) {
      for (let j = i + 1; j < this.numParticles; j++) {
        const p1 = this.particlePositions[i];
        const p2 = this.particlePositions[j];

        collisionNormal.subVectors(p2, p1);
        const distance = collisionNormal.length();

        if (distance < this.scaledRadii[i] + this.scaledRadii[j]) {
          collisionNormal.normalize();
          relativeVelocity.subVectors(
            this.particleVelocities[j],
            this.particleVelocities[i]
          );
          const velocityAlongNormal = relativeVelocity.dot(collisionNormal);

          if (velocityAlongNormal < 0) {
            const impulseMagnitude = -((1 + e) * velocityAlongNormal) / 2;
            const impulse = collisionNormal
              .clone()
              .multiplyScalar(impulseMagnitude);
            this.particleVelocities[i].add(impulse.clone().multiplyScalar(-1));
            this.particleVelocities[j].add(impulse);

            const overlap =
              this.scaledRadii[i] + this.scaledRadii[j] - distance;
            const separation = overlap * 0.51;
            p1.sub(collisionNormal.clone().multiplyScalar(separation));
            p2.add(collisionNormal.clone().multiplyScalar(separation));
          }
        }
      }
    }
  }
}

export { Game };
