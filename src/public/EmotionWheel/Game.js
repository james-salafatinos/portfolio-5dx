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

    this.trayContainer = document.getElementById("html-tray"); // Get the tray container

    this.mediaRecorder = null; // For MediaRecorder
    this.audioChunks = []; // For storing recorded audio chunks
    this.apiKey = localStorage.getItem("openai_api_key") || null; // Directly set the stored API Key

    this.create();
    this.setupInteractivity();
    this.setupDragToRotate();
  }

  async setupMicrophoneHandler() {
    const micButton = document.getElementById("mic-btn");
    const submitButton = document.getElementById("submit-btn");

    micButton.addEventListener("click", async () => {
      if (!this.apiKey) {
        const userKey = prompt("Please enter your OpenAI API key:");
        if (!userKey) {
          alert("API key is required for transcription.");
          return;
        }
        this.apiKey = userKey;
        alert("API Key saved!");
      }

      if (!this.mediaRecorder) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];

          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.audioChunks.push(event.data);
            }
          };

          this.mediaRecorder.onstop = async () => {
            // Show loading indicator
            micButton.textContent = "⏳";
            micButton.disabled = true;

            const audioBlob = new Blob(this.audioChunks, {
              type: "audio/webm",
            });
            const audioFile = new File([audioBlob], "recording.webm");

            // Transcribe audio
            const transcription = await this.transcribeAudio(audioFile);

            // Hide loading indicator
            micButton.textContent = "🎤";
            micButton.disabled = false;

            // Stage transcription for submission
            this.transcription = transcription;
            this.stageTranscription(transcription);
          };

          this.mediaRecorder.start();
          console.log("Recording started...");
        } catch (error) {
          console.error("Error accessing microphone:", error);
        }
      } else if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
        console.log("Recording stopped.");
        this.mediaRecorder = null;
      }
    });
  }

  stageTranscription(transcription) {
    const transcriptionDisplay = document.createElement("div");
    transcriptionDisplay.textContent = `Transcription: ${transcription}`;
    transcriptionDisplay.style.cssText = `
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 8px;
    margin: 5px;
    background-color: #f9f9f9;
`;

    if (this.trayContainer) {
      // Clear any previous transcription
      const oldTranscription = this.trayContainer.querySelector(
        ".staged-transcription"
      );
      if (oldTranscription) {
        this.trayContainer.removeChild(oldTranscription);
      }

      transcriptionDisplay.classList.add("staged-transcription");
      this.trayContainer.appendChild(transcriptionDisplay);
    }
  }

  clearStagedData() {
    // Clear emotions and transcription
    this.database = {};
    this.transcription = null;

    // Remove transcription display
    const oldTranscription = this.trayContainer.querySelector(
      ".staged-transcription"
    );
    if (oldTranscription) {
      oldTranscription.remove();
    }

    // Remove emotion buttons except specific ones
    Array.from(this.trayContainer.children).forEach((child) => {
      console.log(child)
      if (child.id !== "mic-btn" && child.id !== "submit-btn" && child.id !== "api-key-container") {
        child.remove();
      }
    });


    console.log("Staged data cleared.");
  }
  async transcribeAudio(audioFile) {
    if (!this.apiKey) {
      alert("API key is required! Please save your API key.");
      return "No API key provided.";
    }

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    try {
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Transcription:", data.text);
      return data.text;
    } catch (error) {
      console.error("Error during transcription:", error);
      return "Transcription failed.";
    }
  }

  async create() {
    this.font = await this.loadFont();

    const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.001;
    const ringWidth = 0.9;

    // Define your ring arrays
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

        // Wedge geometry
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
        this.wheelGroup.add(wedgeMesh);
        this.objects.push(wedgeMesh);

        // Text label
        const labelAngle = startAngle + wedgeAngle / 2;
        const textMesh = this.createTextMesh(
          emotion.name,
          labelAngle,
          innerR,
          outerR
        );
        this.wheelGroup.add(textMesh);
        this.objects.push(textMesh);
      }
    }
  }

  // Create a button and add it to the tray container
  addTrayButton(emotionName) {
    const button = document.createElement("button");
    button.textContent = emotionName;
    button.style.cssText = `
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 8px;
      margin: 5px;
      padding: 5px 10px;
      cursor: pointer;
      display: inline-block;
    `;

    button.onclick = () => {
      console.log(`Tray button clicked: ${emotionName}`);
      // Perform additional game-specific logic
    };

    if (this.trayContainer) {
      this.trayContainer.appendChild(button);
    }
  }

  // Create text meshes for each wedge
  createTextMesh(text, angle, innerRadius, outerRadius) {
    const radius = (innerRadius + outerRadius) / 2;
    const screenScale =
      Math.min(window.innerWidth, window.innerHeight) * 0.0008;
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    if (!this.font) {
      return new THREE.Group(); // Empty placeholder if font not loaded yet
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

  // Load font using the FontLoader
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

  // Set up interactivity (pointer events, raycasting, etc.)
  setupInteractivity() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const element = document.querySelector("#threejs");

    // Submit button logic to send emotions and transcription to the server
    const submitButton = document.getElementById("submit-btn");
    submitButton.addEventListener("click", async () => {
      const stagedEmotions = this.getStagedEmotions();
      const stagedTranscription = this.transcription || null;

      if (stagedEmotions.length === 0) {
        alert("Please select at least one emotion to submit.");
        return;
      }

      // Submit the staged data
      await this.handleDatabaseSubmission(stagedEmotions, stagedTranscription);
    });

    // Microphone Button Behavior
    const micButton = document.getElementById("mic-btn");
    micButton.addEventListener("click", async () => {
      console.log("Microphone button clicked.");
      // Start the microphone logic, which will handle transcription and save it in this.transcription
    });

    // Pointer and hover logic for the emotion wheel
    let pointerDownX = 0;
    let pointerDownY = 0;
    const draggingThreshold = 5; // Pixel threshold

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

            // Add button to the tray
            this.addTrayButton(emotion);

            // Animate darken/lighten transition
            const originalColor = new THREE.Color(
              intersectedObject.userData.color
            );
            const darkenedColor = new THREE.Color(0.2, 0.2, 0.2);
            let progress = 0;
            const duration = 0.7;
            const clock = new THREE.Clock();

            const animateColor = () => {
              const delta = clock.getDelta();
              progress += delta / duration;

              if (progress < 0.5) {
                // First half of the animation: darkening
                const t = progress / 0.5;
                intersectedObject.material.color.lerpColors(
                  originalColor,
                  darkenedColor,
                  t
                );
              } else if (progress < 1) {
                // Second half of the animation: lightening
                const t = (progress - 0.5) / 0.5;
                intersectedObject.material.color.lerpColors(
                  darkenedColor,
                  originalColor,
                  t
                );
              } else {
                // End of animation
                intersectedObject.material.color.copy(originalColor);
                return;
              }

              requestAnimationFrame(animateColor);
            };

            clock.start();
            requestAnimationFrame(animateColor);
          }
        }
      }
    };

    // Hover effect on desktop (mouse pointer)
    const onPointerMove = (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }

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
          if (this.hoveredObject && this.hoveredObject.material) {
            this.hoveredObject.material.color.set(
              this.hoveredObject.userData.color
            );
          }
          intersectedObject.material.color.set(0x888888);
          this.hoveredObject = intersectedObject;
        }
      } else {
        if (this.hoveredObject && this.hoveredObject.material) {
          this.hoveredObject.material.color.set(
            this.hoveredObject.userData.color
          );
        }
        this.hoveredObject = null;
      }
    };

    element.addEventListener("pointerdown", onPointerDown, { passive: false });
    element.addEventListener("pointerup", onPointerUp, { passive: false });
    element.addEventListener("pointermove", onPointerMove, { passive: false });
    this.setupMicrophoneHandler(); // Ensure microphone handler is initialized
  }

  // Setup dragging to rotate the wheelGroup
  setupDragToRotate() {
    const element = document.querySelector("#threejs");
    element.style.touchAction = "none";
    element.style.userSelect = "none";

    let isDragging = false;
    let lastAngle = 0;
    let lastX = 0;
    let lastY = 0;

    const getPointerPos = (e) => {
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
      lastAngle = Math.atan2(y, x);
      lastX = x;
      lastY = y;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const { x, y } = getPointerPos(e);
      const newAngle = Math.atan2(y, x);

      let deltaAngle = newAngle - lastAngle;
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

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

  async handleDatabaseSubmission(emotions, transcription) {
    if (!emotions || emotions.length === 0) {
      console.error("Missing emotions data for submission");
      alert("Please select at least one emotion.");
      return;
    }

    const submissionData = {
      emotions,
      transcription: transcription || "", // Allow empty transcription
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Submission successful:", result);
      alert("Data submitted successfully!");
    } catch (error) {
      console.error("Error during database submission:", error);
      alert("Failed to submit data. Please try again.");
    } finally {
      // Always clear staged data after submission attempt
      this.clearStagedData();
    }
  }

  // Add a helper method to get the staged emotion
  getStagedEmotions() {
    return Object.keys(this.database) || null;
  }

  // Keep text upright in WORLD space
  update() {
    this.objects.forEach((obj) => {
      if (obj.isMesh && obj.geometry?.type === "TextGeometry") {
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        obj.lookAt(worldPos.x, 100, worldPos.z);
      }
    });
  }
}

export { Game };
