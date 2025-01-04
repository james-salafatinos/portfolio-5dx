import * as THREE from "/modules/webgpu/three.webgpu.js";
import { FontLoader } from "/modules/webgpu/FontLoader.js";
import { TextGeometry } from "/modules/webgpu/TextGeometry.js";

class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.objects = [];
    this.hoveredObject = null;
    this.database = {};
    this.font = null;

    // Position camera above the origin, looking down
    this.camera.position.set(0, 25, 0);
    this.camera.lookAt(0, 0, 0);

    this.create();
    this.setupInteractivity();
  }

  async create() {
    // Load font last (will already have used createTextMesh, but that's fine
    // if the geometry is created after the font resolves).
    this.font = await this.loadFont();
    // The 4 rings (concentric): inner -> outer
    // Adjust radii and ringWidth as desired.
    const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.0009; // Base radius scaled
    const ringWidth = Math.min(window.innerWidth, window.innerHeight) * 0.002; // Base radius scaled

    // Each ring covers 8 wedges, but the 4th ring is "offset."
    // We'll define the emotions for each ring in arrays of 8.
    // In Plutchik’s standard depiction:
    //   Ring 1: ecstasy, admiration, terror, amazement, grief, loathing, rage, vigilance
    //   Ring 2: joy, trust, fear, surprise, sadness, disgust, anger, anticipation
    //   Ring 3: serenity, acceptance, apprehension, distraction, pensiveness, boredom, annoyance, interest
    //   Ring 4 (in-between or “mixed”): love, submission, awe, disapproval, remorse, contempt, aggressiveness, optimism

    // Feel free to tweak the exact color codes to match the diagram more precisely.
    const ring1 = [
      { name: "ecstasy", color: "#FFD700" },
      { name: "admiration", color: "#ADFF2F" },
      { name: "terror", color: "#7FFFD4" },
      { name: "amazement", color: "#87CEEB" },
      { name: "grief", color: "#BA55D3" },
      { name: "loathing", color: "#9932CC" },
      { name: "rage", color: "#FF4500" },
      { name: "vigilance", color: "#FFA500" },
    ];

    const ring2 = [
      { name: "joy", color: "#FFE066" },
      { name: "trust", color: "#B6EC53" },
      { name: "fear", color: "#32C7C7" },
      { name: "surprise", color: "#64B5F6" },
      { name: "sadness", color: "#CE93D8" },
      { name: "disgust", color: "#AB47BC" },
      { name: "anger", color: "#FF7043" },
      { name: "anticipation", color: "#FFB74D" },
    ];

    const ring3 = [
      { name: "serenity", color: "#FFF8E1" },
      { name: "acceptance", color: "#DCEDC8" },
      { name: "apprehension", color: "#B2EBF2" },
      { name: "distraction", color: "#BBDEFB" },
      { name: "pensiveness", color: "#E1BEE7" },
      { name: "boredom", color: "#D1C4E9" },
      { name: "annoyance", color: "#FFCCBC" },
      { name: "interest", color: "#FFE0B2" },
    ];

    // The 'in-between' ring: these 8 are placed in slices offset by half a wedge
    const ring4 = [
      { name: "love", color: "#E6EE9C" },
      { name: "submission", color: "#80DEEA" },
      { name: "awe", color: "#90CAF9" },
      { name: "disapproval", color: "#D7BDE2" },
      { name: "remorse", color: "#B39DDB" },
      { name: "contempt", color: "#F48FB1" },
      { name: "aggressiveness", color: "#FFCA28" },
      { name: "optimism", color: "#FFE082" },
    ];

    // For each ring, we draw 8 wedges that total 360 degrees.
    const wedgeCount = 8;
    const wedgeAngle = (Math.PI * 2) / wedgeCount;

    // The 4 rings are stacked from inside to outside
    // ringIndex 0 -> ring1, ringIndex 1 -> ring2, ringIndex 2 -> ring3, ringIndex 3 -> ring4
    // Inner to outer radius for each ring:
    //   ring1: [0.25, 1.25],
    //   ring2: [1.25, 2.25],
    //   ring3: [2.25, 3.25],
    //   ring4: [3.25, 4.25]  (just examples; adjust if you like)
    for (let ringIndex = 0; ringIndex < 4; ringIndex++) {
      const innerR = baseRadius + ringIndex * ringWidth;
      const outerR = innerR + ringWidth;

      // For ring4, we add a half-wedge offset so each 'mixed' emotion
      // sits between the main 8 slices of the other rings.
      const halfOffset = ringIndex === 3 ? wedgeAngle / 2 : 0;

      // Choose which data array
      let ringData;
      switch (ringIndex) {
        case 0:
          ringData = ring1;
          break;
        case 1:
          ringData = ring2;
          break;
        case 2:
          ringData = ring3;
          break;
        case 3:
          ringData = ring4;
          break;
      }

      // Build 8 wedges for this ring
      for (let i = 0; i < wedgeCount; i++) {
        const startAngle = i * wedgeAngle + halfOffset;
        const emotion = ringData[i]; // one emotion per wedge here

        // Create the ring segment
        const geometry = new THREE.RingGeometry(
          innerR,
          outerR,
          32, // radial segments
          1, // tubular segments
          startAngle,
          wedgeAngle
        );
        const material = new THREE.MeshBasicMaterial({
          color: emotion.color,
          side: THREE.DoubleSide,
        });
        const wedgeMesh = new THREE.Mesh(geometry, material);
        wedgeMesh.rotation.x = Math.PI / 2;
        wedgeMesh.userData = { emotion: emotion.name, color: emotion.color };
        this.scene.add(wedgeMesh);
        this.objects.push(wedgeMesh);

        // Add text label in the middle of the wedge’s arc
        const labelAngle = startAngle + wedgeAngle / 2;
        const textMesh = this.createTextMesh(
          emotion.name,
          labelAngle,
          innerR,
          outerR
        );
        this.scene.add(textMesh);
        this.objects.push(textMesh);
      }
    }
  }

  createTextMesh(text, angle, innerRadius, outerRadius) {
    // We'll place text at the midpoint radial distance.
    const radius = (innerRadius + outerRadius) / 2;
    const screenScale = Math.min(window.innerWidth, window.innerHeight) * 0.001;
    // Create a black material for text
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  
    // If the font hasn't loaded yet, return an empty group
    if (!this.font) {
      return new THREE.Group();
    }
  
    // Create the text geometry
    const textGeometry = new TextGeometry(text, {
      font: this.font,
      size: screenScale *.45, // Dynamically scale text size  
      depth: 0.015,
    });
  
    // IMPORTANT: center the geometry so text doesn’t offset from origin
    textGeometry.center();
  
    // Create the Mesh
    const mesh = new THREE.Mesh(textGeometry, textMaterial);
    
    // Store original color & emotion so we can highlight/un-highlight properly
    mesh.userData = {
      emotion: text,
      color: 0x000000, // black
    };
  
    // Convert polar to Cartesian
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
  
    mesh.position.set(x, 1, z);
  
    // Make sure it's always “feet down” (look towards some negative Y)
    mesh.lookAt(x, 100, z);
  
    return mesh;
  }
  

  loadFont() {
    const loader = new FontLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        "/modules/helvetiker_regular.typeface.json",
        (font) => {
          resolve(font);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  setupInteractivity() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener("mousemove", (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.objects);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (
          this.hoveredObject !== intersectedObject &&
          intersectedObject.material
        ) {
          // Reset old hovered
          if (this.hoveredObject && this.hoveredObject.material) {
            console.log(this.hoveredObject);
            this.hoveredObject.material.color.set(
              this.hoveredObject.userData.color
            );
          }
          // Highlight new
          intersectedObject.material.color.set(0x888888);
          this.hoveredObject = intersectedObject;
        }
      } else {
        // Nothing hovered
        if (this.hoveredObject && this.hoveredObject.material) {
          this.hoveredObject.material.color.set(
            this.hoveredObject.userData.color
          );
          this.hoveredObject = null;
        }
      }
    });

    window.addEventListener("click", () => {
      if (this.hoveredObject) {
        const emotion = this.hoveredObject.userData.emotion;
        if (emotion) {
          this.database[emotion] = (this.database[emotion] || 0) + 1;
          console.log(`Emotion clicked: ${emotion}`, this.database);
        }
      }
    });
  }

  update() {
    // Any per-frame logic here
  }
}

export { Game };
