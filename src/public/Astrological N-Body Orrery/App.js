import * as THREE from "/modules/three.module.js";
import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { Game } from "./Game.js";

let camera, scene, renderer, controls, game, gui;
let guiParams = {
  timeScale: 1.5,
  showTrails: true,
  showZodiacBelt: true,
  selectedBody: "None",
};

create();

function create() {
  _initCamera();
  _initScene();
  _initRenderer();
  _initControls();
  _initGUI();

  game = new Game(scene, guiParams);
  _initClickHandler();
}

function update() {
  controls.update();
  game.update();
  renderer.render(scene, camera);
}

function _initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    50000
  );
  camera.position.set(0, 80, 160);
}

function _initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);

  const ambient = new THREE.AmbientLight(0x111122, 2.0);
  scene.add(ambient);

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
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.3,
        sizeAttenuation: true,
      })
    )
  );
}

function _initRenderer() {
  const container = document.getElementById("threejs");
  if (!container) return;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setAnimationLoop(update);
  container.appendChild(renderer.domElement);

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
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
  guiContainer.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:10;";
  container.appendChild(guiContainer);

  gui = new GUI({ container: guiContainer, title: "Orrery Controls" });
  gui.add(guiParams, "timeScale", 0, 10, 0.1).name("Time Scale");
  gui.add(guiParams, "showTrails").name("Trails").onChange((v) => {
    if (game) game.setTrails(v);
  });
  gui.add(guiParams, "showZodiacBelt").name("Zodiac Belt").onChange((v) => {
    if (game) game.setZodiacBelt(v);
  });

  // Info panel
  const infoDiv = document.createElement("div");
  infoDiv.id = "body-info";
  infoDiv.style.cssText = `
    position:absolute;bottom:40px;left:20px;z-index:10;
    background:rgba(4,2,16,0.85);border:1px solid rgba(140,80,255,0.35);
    border-radius:12px;padding:18px 22px;color:#d8c8ff;
    font-family:Georgia,serif;max-width:280px;display:none;
    backdrop-filter:blur(10px);
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
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = game ? game.getMeshes() : [];
    const hits = raycaster.intersectObjects(meshes, true);

    const infoDiv = window._orreryInfoDiv;
    if (hits.length > 0) {
      const body = hits[0].object.userData.bodyData;
      if (body && infoDiv) {
        infoDiv.style.display = "block";
        const vel = Math.sqrt(body.vx ** 2 + body.vy ** 2 + body.vz ** 2);
        const dist = Math.sqrt(body.px ** 2 + body.py ** 2 + body.pz ** 2);
        infoDiv.innerHTML = `
          <div style="font-size:22px;margin-bottom:4px;">${body.symbol} <strong>${body.name}</strong></div>
          <div style="color:#ffd966;font-size:10px;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">Rules · ${body.sign}</div>
          <div style="font-size:12px;color:#9888bb;line-height:1.7;margin-bottom:10px;">${body.desc}</div>
          <div style="font-size:11px;color:#7766aa;border-top:1px solid rgba(140,80,255,0.2);padding-top:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span>Mass (M☉)</span><span style="color:#c8a8ff;">${body.mass >= 1 ? "1.000" : body.mass.toExponential(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span>Velocity</span><span style="color:#c8a8ff;">${vel.toFixed(4)} AU/yr</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Semi-major axis</span><span style="color:#c8a8ff;">${body.a > 0 ? (body.a / 10).toFixed(2) + " AU" : "—"}</span>
            </div>
          </div>
          <div style="margin-top:10px;text-align:right;font-size:10px;color:rgba(140,80,255,0.5);cursor:pointer;" onclick="this.parentElement.style.display='none'">✕ close</div>
        `;
      }
    }
  });
}
