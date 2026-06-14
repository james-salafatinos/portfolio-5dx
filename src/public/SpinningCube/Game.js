import * as THREE from "/modules/three.module.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.particles = null;
    this.clock = new THREE.Clock();

    // HTML-in-Canvas face inputs
    this.faceCanvases = [];
    this.faceContexts = [];
    this.faceInputs = [];
    this.faceTextures = [];
    this.drawElementSupported = false;
  }

  create() {
    // Build the 6 HTML-in-Canvas face textures first
    const materials = this._createFaceMaterials();

    // Cube using the per-face textured materials
    const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const cube = new THREE.Mesh(geometry, materials);

    // Wireframe overlay for a bit of style
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x6ab0ff,
      wireframe: true,
    });
    const wire = new THREE.Mesh(geometry, wireMaterial);

    this.group = new THREE.Group();
    this.group.add(cube);
    this.group.add(wire);
    this.group.position.y = 5;
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

  _createFaceMaterials() {
    const materials = [];

    // Detect support once using a throwaway 2d context.
    const probe = document.createElement("canvas").getContext("2d");
    this.drawElementSupported =
      probe && typeof probe.drawElementImage === "function";

    for (let i = 0; i < 6; i++) {
      // Offscreen canvas with layoutsubtree so it can host live HTML children.
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      canvas.setAttribute("layoutsubtree", "");

      // Park the canvas off-screen but keep it in the document so the
      // browser lays out its HTML children.
      canvas.style.position = "fixed";
      canvas.style.left = "-9999px";
      canvas.style.top = "0";
      canvas.style.width = "256px";
      canvas.style.height = "256px";
      canvas.style.pointerEvents = "none";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Face " + (i + 1);
      input.style.boxSizing = "border-box";
      input.style.width = "224px";
      input.style.height = "44px";
      input.style.margin = "106px 16px";
      input.style.padding = "0 12px";
      input.style.background = "#1a1a2e";
      input.style.border = "2px solid #6ab0ff";
      input.style.borderRadius = "8px";
      input.style.color = "#ffffff";
      input.style.font = "16px sans-serif";
      input.style.outline = "none";

      canvas.appendChild(input);
      document.body.appendChild(canvas);

      const ctx = canvas.getContext("2d");

      this.faceCanvases.push(canvas);
      this.faceContexts.push(ctx);
      this.faceInputs.push(input);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.faceTextures.push(texture);

      materials.push(new THREE.MeshBasicMaterial({ map: texture }));

      // Initial paint.
      this._drawFace(i);
    }

    return materials;
  }

  _drawFace(i) {
    const ctx = this.faceContexts[i];
    const canvas = this.faceCanvases[i];
    const input = this.faceInputs[i];

    // Clear with the dark face background.
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.drawElementSupported) {
      // Render the live <input> element into the canvas.
      ctx.drawElementImage(input, 0, 0);
    } else {
      // Graceful fallback for browsers without the canvas-draw-element flag.
      ctx.fillStyle = "#6ab0ff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Face " + (i + 1), canvas.width / 2, 60);

      ctx.fillStyle = "#cccccc";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      const lines = [
        "HTML-in-Canvas not supported -",
        "enable canvas-draw-element flag",
        "in Chrome Canary",
      ];
      lines.forEach((line, idx) => {
        ctx.fillText(line, canvas.width / 2, 120 + idx * 22);
      });
    }

    this.faceTextures[i].needsUpdate = true;
  }

  update() {
    const t = this.clock.getElapsedTime();

    if (this.group) {
      // ~10% of the original rotation speed.
      this.group.rotation.x += 0.0004;
      this.group.rotation.y += 0.0006;

      // Subtle breathe/pulse
      const scale = 1 + Math.sin(t * 0.8) * 0.04;
      this.group.scale.set(scale, scale, scale);
    }

    // Re-render each face's HTML so live typing shows up on the cube.
    for (let i = 0; i < this.faceCanvases.length; i++) {
      this._drawFace(i);
    }

    if (this.particles) {
      this.particles.rotation.y = t * 0.02;
    }
  }
}

export { Game };
