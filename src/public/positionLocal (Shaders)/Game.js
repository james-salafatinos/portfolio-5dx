import * as THREE from "/modules/three.webgpu.js";
import { GLTFLoader } from "/modules/GLTFLoader.js";
import {
  texture,
  uv,
  mix,
  time,
  sin,
  vec4,
  vec3,
  cos,
  uniform,
  modelWorldMatrix,
  positionLocal,
  positionWorld,
  positionView,
  positionViewDirection,
  positionWorldDirection,
  positionGeometry,
} from "/modules/three.tsl.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }



  _createTestCustomMaterial1() {
    const material = new THREE.MeshBasicNodeMaterial();

    material.positionNode = positionLocal.add(vec3(sin(time),0,0));


    material.colorNode = vec4(positionWorld, 1);

    return material;
  }


  _createTestCustomMaterial2() {
    const material = new THREE.MeshBasicNodeMaterial();

    material.positionNode = positionLocal.add(vec3(-2,0,0));


    material.colorNode = vec4(positionLocal, 1);

    return material;
  }


  create() {
    const customTestMaterial1 = this._createTestCustomMaterial1();
    const customTestMaterial2 = this._createTestCustomMaterial2();

    const sphereGeometry = new THREE.SphereGeometry(1, 8);
    const sphere = new THREE.Mesh(sphereGeometry, customTestMaterial1);
    sphere.receiveShadow = true;

    this.scene.add(sphere);
    this.objects.push(sphere)


    const sphere2 = new THREE.Mesh(sphereGeometry, customTestMaterial2);
    sphere2.receiveShadow = true;

    this.scene.add(sphere2);
    this.objects.push(sphere2)
  }

  update() {
    const delta = 0.01; // Adjust rotation speed as needed
    this.objects.forEach((mesh) => {
      mesh.rotation.x += .01
      console.log(mesh)
    });
  }
}

export { Game };
