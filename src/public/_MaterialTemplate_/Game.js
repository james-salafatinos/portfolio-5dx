import * as THREE from "/modules/three.webgpu.js";
import { GLTFLoader } from "/modules/GLTFLoader.js";

class Game {

  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  create() {

    
    // Add plane geometry as the floor
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Add a cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-2, 0.5, 0); // Position the cube above the floor
    this.scene.add(cube);
    this.objects.push({ mesh: cube, axis: new THREE.Vector3(0, 1, 0) });

    // Add a sphere
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0.5, 0); // Position the sphere above the floor
    this.scene.add(sphere);
    this.objects.push({ mesh: sphere, axis: new THREE.Vector3(0, 1, 0) });

    // Load a GLTF model
    const loader = new GLTFLoader();
    loader.load("/resources/duck.glb", (gltf) => {
      const model = gltf.scene;
      model.position.set(2, 0.00, 0); // Position the model above the floor
      this.scene.add(model);
      this.objects.push({ mesh: model, axis: new THREE.Vector3(0, 1, 0) });
    });
  }

  update() {
    // Rotate all objects
    const delta = 0.01; // Adjust rotation speed as needed
    this.objects.forEach(({ mesh, axis }) => {
      mesh.rotateOnWorldAxis(axis, delta);
    });
  }

}

export { Game };
