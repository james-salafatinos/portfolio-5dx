import * as THREE from "/modules/webgpu/three.webgpu.js";

class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.apiKey = localStorage.getItem("openai_api_key") || null;
    this.transcript = "";

    // We’ll store references to important DOM elements
    this.micBtn = document.getElementById("mic-btn");
    this.copyBtn = document.getElementById("copy-btn");
    this.transcriptContainer = document.getElementById("transcript-container");
    this.fileUpload = document.getElementById("audio-upload");
    this.fileUploadBtn = document.getElementById("upload-btn");


    this.setupFileUploadButton();
    this.setupMicButton();
    this.setupCopyButton();
  }

  setupMicButton() {
    if (!this.micBtn) return;

    this.micBtn.addEventListener("click", async () => {
      // If we do not have an API key yet, prompt user for one
      if (!this.apiKey) {
        const userKey = prompt("Please enter your OpenAI API key:");
        if (!userKey) {
          alert("API key is required for transcription.");
          return;
        }
        this.apiKey = userKey;
        localStorage.setItem("openai_api_key", userKey);
        alert("API Key saved!");
      }

      // Toggle between start/stop recording
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];

          // Data available event
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };

          // On stop, send to Whisper
          this.mediaRecorder.onstop = async () => {
            this.micBtn.textContent = "⏳"; // Show transcribing
            const audioBlob = new Blob(this.audioChunks, {
              type: "audio/webm",
            });
            const audioFile = new File([audioBlob], "recording.webm");
            const result = await this.transcribeAudio(audioFile);

            // Display transcribed text
            this.transcript = result;
            this.transcriptContainer.textContent = result || "No result.";
            this.micBtn.textContent = "🎤"; // Reset to microphone icon
          };

          // Update the UI to show recording state
          this.micBtn.textContent = "🔴 Recording";
          this.mediaRecorder.start();
        } catch (error) {
          console.error("Error accessing microphone:", error);
          alert("Could not access microphone.");
        }
      } else if (this.mediaRecorder.state === "recording") {
        // Stop recording
        this.mediaRecorder.stop();
        this.micBtn.textContent = "🎙️ Start Recrording";
      }
    });
  }

  async transcribeAudio(audioFile) {
    if (!this.apiKey) {
      console.warn("No API key provided. Cannot transcribe.");
      return "No API key provided.";
    }

    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

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
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text || "Transcription empty.";
    } catch (error) {
      console.error("Error during transcription:", error);
      return "Transcription failed.";
    }
  }
  setupCopyButton() {
    if (!this.copyBtn) return;

    this.copyBtn.addEventListener("click", () => {
      if (!this.transcript) {
        this.copyBtn.textContent = "No text to copy!";
        this.copyBtn.style.backgroundColor = "#ff4d4d"; // Set to red for error
        setTimeout(() => {
          this.copyBtn.textContent = "Copy Transcript";
          this.copyBtn.style.backgroundColor = ""; // Reset to default
        }, 2000);
        return;
      }

      navigator.clipboard
        .writeText(this.transcript)
        .then(() => {
          this.copyBtn.textContent = "Copied!";
          this.copyBtn.style.backgroundColor = "#28a745"; // Set to green for success
          setTimeout(() => {
            this.copyBtn.textContent = "Copy";
            this.copyBtn.style.backgroundColor = ""; // Reset to default
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          this.copyBtn.textContent = "Failed to copy!";
          this.copyBtn.style.backgroundColor = "#ff4d4d"; // Set to red for error
          setTimeout(() => {
            this.copyBtn.textContent = "Copy";
            this.copyBtn.style.backgroundColor = ""; // Reset to default
          }, 2000);
        });
    });
  }
  // 2) Define the new setupFileUploadButton method:
  setupFileUploadButton() {
    if (!this.fileUploadBtn || !this.fileUpload) return;

    this.fileUploadBtn.addEventListener("click", async () => {
      // If no API key yet, prompt user for one
      if (!this.apiKey) {
        const userKey = prompt("Please enter your OpenAI API key:");
        if (!userKey) {
          alert("API key is required for transcription.");
          return;
        }
        this.apiKey = userKey;
        localStorage.setItem("openai_api_key", userKey);
        alert("API Key saved!");
      }

      const file = this.fileUpload.files[0];
      if (!file) {
        alert("Please select an .m4a file first.");
        return;
      }

      // Indicate that transcription is happening
      this.fileUploadBtn.textContent = "⏳ Transcribing...";

      // Use the same transcribeAudio function
      const result = await this.transcribeAudio(file);
      this.transcript = result;
      this.transcriptContainer.textContent = result || "No result.";

      // Reset button text
      this.fileUploadBtn.textContent = "Transcribe File";
    });
  }
  update() {
    // If you have any animations or real-time updates, handle them here.
    // Called each frame from your main app loop, if you choose to have one.
  }
}

export { Game };
