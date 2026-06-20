import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { EffectComposer } from "/modules/EffectComposer.js";
import { RenderPass } from "/modules/RenderPass.js";
import { UnrealBloomPass } from "/modules/UnrealBloomPass.js";
import { Game } from "./Game.js";

let camera, scene, renderer, controls, game, composer;
let guiParams = {
  timeScale: 1.5,
  showTrails: true,
  showZodiacBelt: true,
  bloomStrength: 1.8,
  bloomRadius: 0.7,
  bloomThreshold: 0.05,
};

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initBloom();
  _initControls();
  _initGUI();

  game = new Game(scene, guiParams);
  _initClickHandler();
}

function update() {
  controls.update();
  game.update();

  // Update bloom params live from GUI
  composer.passes[1].strength = guiParams.bloomStrength;
  composer.passes[1].radius   = guiParams.bloomRadius;
  composer.passes[1].threshold = guiParams.bloomThreshold;

  composer.render();
}

function _initCamera() {
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.01, 50000
  );
  camera.position.set(0, 80, 160);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);

  scene.add(new THREE.AmbientLight(0x111122, 2.0));

  const sunLight = new THREE.PointLight(0xffddaa, 6, 3000);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(15000 * 3);
  for (let i = 0; i < starPos.length; i++)
    starPos[i] = (Math.random() - 0.5) * 8000;
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })
    )
  );
}

function _initRenderer() {
  const container = document.getElementById("threejs");
  if (!container) return;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setAnimationLoop(update);
  container.appendChild(renderer.domElement);

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  window.addEventListener("resize", () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}

function _initBloom() {
  const container = document.getElementById("threejs");
  const w = container.clientWidth, h = container.clientHeight;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    guiParams.bloomStrength,   // strength
    guiParams.bloomRadius,     // radius
    guiParams.bloomThreshold   // threshold
  );
  composer.addPass(bloom);
}

function _initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 5;
  controls.maxDistance = 2000;
}

function _initGUI() {
  const container = document.getElementById("threejs");
  if (!container) return;

  const guiContainer = document.createElement("div");
  guiContainer.style.cssText = "position:absolute;top:10px;right:10px;z-index:10;";
  container.appendChild(guiContainer);

  const gui = new GUI({ container: guiContainer, title: "Orrery" });

  const sim = gui.addFolder("Simulation");
  sim.add(guiParams, "timeScale", 0, 10, 0.1).name("Time Scale");
  sim.add(guiParams, "showTrails").name("Trails").onChange(v => { if (game) game.setTrails(v); });
  sim.add(guiParams, "showZodiacBelt").name("Zodiac Belt").onChange(v => { if (game) game.setZodiacBelt(v); });

  const bloom = gui.addFolder("Bloom");
  bloom.add(guiParams, "bloomStrength", 0, 5, 0.05).name("Strength");
  bloom.add(guiParams, "bloomRadius",   0, 2, 0.05).name("Radius");
  bloom.add(guiParams, "bloomThreshold",0, 1, 0.01).name("Threshold");

  // Info panel
  const infoDiv = document.createElement("div");
  infoDiv.id = "body-info";
  infoDiv.style.cssText = `
    position:absolute;bottom:40px;left:20px;z-index:10;
    background:rgba(4,2,16,0.88);border:1px solid rgba(140,80,255,0.4);
    border-radius:12px;padding:18px 22px;color:#d8c8ff;
    font-family:Georgia,serif;max-width:290px;display:none;
    backdrop-filter:blur(12px);
  `;
  container.appendChild(infoDiv);
  window._orreryInfoDiv = infoDiv;
}

function _initClickHandler() {
  const container = document.getElementById("threejs");
  if (!container || !renderer) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener("click", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(game ? game.getMeshes() : [], true);
    const infoDiv = window._orreryInfoDiv;
    if (hits.length > 0) {
      const body = hits[0].object.userData.bodyData;
      if (body && infoDiv) {
        infoDiv.style.display = "block";
        const vel  = Math.sqrt(body.vx**2 + body.vy**2 + body.vz**2);
        infoDiv.innerHTML = `
          <div style="font-size:22px;margin-bottom:4px;">${body.symbol} <strong>${body.name}</strong></div>
          <div style="color:#ffd966;font-size:10px;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">Rules · ${body.sign}</div>
          <div style="font-size:12px;color:#9888bb;line-height:1.7;margin-bottom:10px;">${body.desc}</div>
          <div style="font-size:11px;color:#7766aa;border-top:1px solid rgba(140,80,255,0.2);padding-top:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span>Mass (M☉)</span><span style="color:#c8a8ff;">${body.mass>=1?"1.000":body.mass.toExponential(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span>Velocity</span><span style="color:#c8a8ff;">${vel.toFixed(4)} AU/yr</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Semi-major axis</span><span style="color:#c8a8ff;">${body.a>0?(body.a/10).toFixed(2)+" AU":"—"}</span>
            </div>
          </div>
          <div style="margin-top:10px;text-align:right;font-size:10px;color:rgba(140,80,255,0.5);cursor:pointer;"
               onclick="this.parentElement.style.display='none'">✕ close</div>
        `;
      }
    }
  });
}
