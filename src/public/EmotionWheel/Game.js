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

    // The Group that contains all wedges & text
    this.wheelGroup = new THREE.Group();
    this.scene.add(this.wheelGroup);

    this.camera.position.set(0, 25, 0);
    this.camera.lookAt(0, 0, 0);

    this.isDragging = false;
    this.previousPointerPosition = { x: 0, y: 0 };

    this.create();
    this.setupInteractivity();
    this.setupDragToRotate();
  }

  async create() {
    this.font = await this.loadFont();
    const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.001;
    const ringWidth = 0.9;

    // define your ring arrays...
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

    const wedgeCount = 8;
    const wedgeAngle = (Math.PI * 2) / wedgeCount;

    for (let ringIndex = 0; ringIndex < 4; ringIndex++) {
      const innerR = baseRadius + ringIndex * ringWidth;
      const outerR = innerR + ringWidth;
      const halfOffset = ringIndex === 3 ? wedgeAngle / 2 : 0;

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

      for (let i = 0; i < wedgeCount; i++) {
        const startAngle = i * wedgeAngle + halfOffset;
        const emotion = ringData[i];

        // wedge geometry
        const geometry = new THREE.RingGeometry(
          innerR,
          outerR,
          32,
          1,
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
        this.wheelGroup.add(wedgeMesh); // <--- add to wheelGroup
        this.objects.push(wedgeMesh);

        // text label
        const labelAngle = startAngle + wedgeAngle / 2;
        const textMesh = this.createTextMesh(
          emotion.name,
          labelAngle,
          innerR,
          outerR
        );
        this.wheelGroup.add(textMesh); // <--- add to wheelGroup
        this.objects.push(textMesh);
      }
    }
  }

  

  createTextMesh(text, angle, innerRadius, outerRadius) {
    const radius = (innerRadius + outerRadius) / 2;
    const screenScale = Math.min(window.innerWidth, window.innerHeight) * 0.0008;
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    if (!this.font) {
      return new THREE.Group(); // empty placeholder if font not loaded yet
    }

    const textGeometry = new TextGeometry(text, {
      font: this.font,
      size: screenScale * 0.45,
      depth: 0.015,
      curveSegments: 12,
    });
    textGeometry.center();

    const mesh = new THREE.Mesh(textGeometry, textMaterial);
    mesh.userData = { emotion: text, color: 0x000000 };

    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    mesh.position.set(x, 1, z);

    // Initial orientation so it's upright
    mesh.lookAt(x, 100, z);

    return mesh;
  }

  loadFont() {
    const loader = new FontLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        "/modules/helvetiker_regular.typeface.json",
        (font) => resolve(font),
        undefined,
        (err) => reject(err)
      );
    });
  }
  setupInteractivity() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const element = document.querySelector("#threejs");
  
    // We’ll track how much the pointer has moved
    let pointerDownX = 0;
    let pointerDownY = 0;
    const draggingThreshold = 5; // pixel threshold
  
    const onPointerDown = (event) => {
      pointerDownX = event.clientX;
      pointerDownY = event.clientY;
    };
  
    const onPointerUp = (event) => {
      const moveX = Math.abs(event.clientX - pointerDownX);
      const moveY = Math.abs(event.clientY - pointerDownY);
    
      if (moveX < draggingThreshold && moveY < draggingThreshold) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, this.camera);
        const intersects = raycaster.intersectObjects(this.objects);
    
        if (intersects.length > 0) {
          const intersectedObject = intersects[0].object;
          const emotion = intersectedObject.userData.emotion;
          if (emotion) {
            this.database[emotion] = (this.database[emotion] || 0) + 1;
            console.log(`Emotion tapped: ${emotion}`, this.database);
    
            // Animate darken and lighten transition
            const originalColor = new THREE.Color(intersectedObject.userData.color);
            const darkenedColor = new THREE.Color(0.2, 0.2, 0.2); // Darkened color
            let progress = 0; // Animation progress (0 to 1)
            const duration = 0.7; // Total duration in seconds
            const clock = new THREE.Clock(); // Create a clock for timing
    
            const animateColor = () => {
              const delta = clock.getDelta(); // Time elapsed since last frame
              progress += delta / duration; // Increment progress based on duration
    
              if (progress < 0.5) {
                // First half of the animation: darkening
                const t = progress / 0.5; // Normalize progress for the first half
                intersectedObject.material.color.lerpColors(
                  originalColor,
                  darkenedColor,
                  t
                );
              } else if (progress < 1) {
                // Second half of the animation: lightening
                const t = (progress - 0.5) / 0.5; // Normalize progress for the second half
                intersectedObject.material.color.lerpColors(
                  darkenedColor,
                  originalColor,
                  t
                );
              } else {
                // End of animation
                intersectedObject.material.color.copy(originalColor); // Ensure final color is accurate
                return; // Exit animation
              }
    
              requestAnimationFrame(animateColor); // Continue animation loop
            };
    
            clock.start(); // Start the clock
            requestAnimationFrame(animateColor); // Start the animation loop
          }
        }
      }
    };
    
    // We can still do hover on desktop if you want:
    const onPointerMove = (event) => {
      // Only apply hover on desktop (i.e., mouse pointers).
      if (event.pointerType !== "mouse") {
        return;
      }
    
      // Otherwise, proceed with the raycasting/hover highlight logic:
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
    
      pointer.x = (x / rect.width) * 2 - 1;
      pointer.y = -(y / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
    
      const intersects = raycaster.intersectObjects(this.objects);
      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (
          this.hoveredObject !== intersectedObject &&
          intersectedObject.material
        ) {
          // Restore color of old hovered object
          if (this.hoveredObject && this.hoveredObject.material) {
            this.hoveredObject.material.color.set(
              this.hoveredObject.userData.color
            );
          }
          // Highlight the new object
          intersectedObject.material.color.set(0x888888);
          this.hoveredObject = intersectedObject;
        }
      } else {
        // Nothing hovered
        if (this.hoveredObject && this.hoveredObject.material) {
          this.hoveredObject.material.color.set(this.hoveredObject.userData.color);
        }
        this.hoveredObject = null;
      }
    };
    
  
    element.addEventListener("pointerdown", onPointerDown, { passive: false });
    element.addEventListener("pointerup", onPointerUp, { passive: false });
    element.addEventListener("pointermove", onPointerMove, { passive: false });
  }
  
  setupDragToRotate() {
    const element = document.querySelector("#threejs");
    element.style.touchAction = "none";
    element.style.userSelect = "none";
  
    let isDragging = false;
    let lastAngle = 0;
    // We'll store the last position so we can compute angles
    let lastX = 0, lastY = 0;
  
    const getPointerPos = (e) => {
      // Get pointer coords relative to center of the element
      const rect = element.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const x = e.clientX - rect.left - centerX;
      const y = e.clientY - rect.top - centerY;
      return { x, y };
    };
  
    const onPointerDown = (e) => {
      e.preventDefault();
      isDragging = true;
  
      const { x, y } = getPointerPos(e);
      // Convert to polar angle
      lastAngle = Math.atan2(y, x);
      lastX = x;
      lastY = y;
    };
  
    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
  
      const { x, y } = getPointerPos(e);
      const newAngle = Math.atan2(y, x);
  
      // Delta angle
      let deltaAngle = newAngle - lastAngle;
  
      // Keep it in a -PI..PI range so there’s no “jump” crossing boundaries
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
  
      // Apply to rotation. Negative sign so that moving clockwise rotates one way
      this.wheelGroup.rotation.y -= deltaAngle;
  
      lastAngle = newAngle;
      lastX = x;
      lastY = y;
    };
  
    const onPointerUp = (e) => {
      e.preventDefault();
      isDragging = false;
    };
  
    element.addEventListener("pointerdown", onPointerDown, { passive: false });
    element.addEventListener("pointermove", onPointerMove, { passive: false });
    element.addEventListener("pointerup", onPointerUp, { passive: false });
    element.addEventListener("pointercancel", onPointerUp, { passive: false });
  }
  

  update() {
    // If you want text to remain upright in WORLD space, do:
    this.objects.forEach((obj) => {
      // Check if it's a text mesh (crudely by geometry type)
      if (obj.isMesh && obj.geometry?.type === "TextGeometry") {
        // get world position
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);

        // force it to look at y=100 in world coords
        obj.lookAt(worldPos.x, 100, worldPos.z);
      }
    });
  }
}

export { Game };
